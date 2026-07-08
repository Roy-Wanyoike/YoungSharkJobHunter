import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { findSkillGaps } from '@/services/matching';
import { chat } from '@/services/chat';
import { eventBus, DomainEvents } from '@/services/events';

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId } = body as { jobId?: string };

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'jobId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch the job
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', message: 'The specified job does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse job skills
    const jobSkills: string[] = safeParseJson(job.skills, []);

    // Fetch user's primary resume
    const user = await db.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json(
        { error: 'No user found', message: 'Please create a user account first', code: 'NO_USER' },
        { status: 400 }
      );
    }

    let resume = await db.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
    });
    if (!resume) {
      resume = await db.resume.findFirst({ where: { userId: user.id } });
    }
    if (!resume) {
      return NextResponse.json(
        { error: 'No resume found', message: 'Please upload a resume first', code: 'NO_RESUME' },
        { status: 400 }
      );
    }

    const resumeSkills: string[] = safeParseJson(resume.skills, []);
    const parsedData = safeParseJson<Record<string, unknown>>(resume.parsedData, {});

    // Find skill gaps
    const { matched, missing } = findSkillGaps(resumeSkills, jobSkills);

    // Calculate deterministic ATS score based on skill match ratio
    const totalJobSkills = jobSkills.length;
    const matchRatio = totalJobSkills > 0 ? matched.length / totalJobSkills : 0;
    const atsScore = Math.round(matchRatio * 95 + (matched.length > 0 ? 5 : 0));
    const clampedAtsScore = Math.min(Math.max(atsScore, 0), 99);

    // Use the chat service to generate tailored content
    const prompt = `You are an expert ATS resume optimizer. I need you to generate a tailored resume for the following job application.

Job Title: ${job.title}
Company: ${job.company}
Job Skills: ${jobSkills.join(', ')}
Job Description (excerpt): ${job.description.slice(0, 500)}

User's Current Skills: ${resumeSkills.join(', ')}

Matched Skills: ${matched.join(', ')}
Missing Skills: ${missing.join(', ')}

Please respond with ONLY valid JSON in this exact format (no markdown fences, no extra text):
{
  "summary": "A 2-3 sentence professional summary tailored to this job",
  "experienceRewrite": [
    {
      "title": "Original job title",
      "company": "Original company name",
      "description": "Rewritten description emphasizing relevant skills",
      "technologies": ["list", "of", "technologies"]
    }
  ],
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3"
  ]
}`;

    let aiResponse: string;
    try {
      aiResponse = await chat(prompt, []);
    } catch {
      aiResponse = '';
    }

    // Parse the AI response as JSON, fallback to defaults
    let parsed: {
      summary?: string;
      experienceRewrite?: Array<{
        title: string;
        company: string;
        description: string;
        technologies: string[];
      }>;
      recommendations?: string[];
    } = {};

    try {
      // Try to extract JSON from the response (handle markdown fences)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall through to defaults
    }

    const summary =
      parsed.summary ||
      `Experienced professional with expertise in ${matched.slice(0, 3).join(', ')} seeking the ${job.title} position at ${job.company}. Proven track record of delivering high-quality results.`;

    const experienceRewrite =
      parsed.experienceRewrite ||
      (Array.isArray(parsedData.experience)
        ? (parsedData.experience as Array<Record<string, unknown>>).map((exp) => ({
            title: String(exp.title || ''),
            company: String(exp.company || ''),
            description: String(exp.description || ''),
            technologies: Array.isArray(exp.technologies) ? exp.technologies.map(String) : [],
          }))
        : []);

    const recommendations = parsed.recommendations || [
      ...(matched.length > 0
        ? [`Highlight your ${matched.slice(0, 3).join(', ')} experience prominently`]
        : []),
      ...(missing.length > 0
        ? [`Consider gaining experience with: ${missing.slice(0, 3).join(', ')}`]
        : []),
      `Tailor your cover letter to emphasize your fit for ${job.title} at ${job.company}`,
      `Include keywords: ${jobSkills.slice(0, 5).join(', ')}`,
    ];

    // Count existing versions for this resume
    const versionCount = await db.resumeVersion.count({
      where: { resumeId: resume.id },
    });

    // Create a ResumeVersion record
    await db.resumeVersion.create({
      data: {
        resumeId: resume.id,
        jobId: job.id,
        fileName: `tailored_${job.title.replace(/\s+/g, '_')}_${resume.fileName}`,
        fileType: 'pdf',
        version: versionCount + 1,
        atsScore: clampedAtsScore,
        matchedSkills: JSON.stringify(matched),
        missingKeywords: JSON.stringify(missing),
        changes: JSON.stringify({ summary, experienceRewrite, recommendations }),
      },
    });

    // Emit event
    eventBus.emit(DomainEvents.RESUME_GENERATED, {
      resumeId: resume.id,
      jobId: job.id,
      atsScore: clampedAtsScore,
      matchedCount: matched.length,
      missingCount: missing.length,
    });

    return NextResponse.json({
      data: {
        jobTitle: job.title,
        company: job.company,
        atsScore: clampedAtsScore,
        tailoredSkills: matched,
        missingKeywords: missing,
        summary,
        experienceRewrite,
        recommendations,
      },
    });
  } catch (error) {
    console.error('[API /generate-resume] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate resume', message, code: 'RESUME_GENERATE_ERROR' },
      { status: 500 }
    );
  }
}