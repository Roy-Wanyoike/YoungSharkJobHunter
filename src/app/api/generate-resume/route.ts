import { NextResponse } from 'next/server';
import { MOCK_RESUME, MOCK_JOBS } from '@/lib/mock-data';

export async function POST(request: Request) {
  const { jobId } = await request.json();
  const job = MOCK_JOBS.find(j => j.id === jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Simulate AI-generated tailored resume
  const tailoredSkills = [...new Set([...MOCK_RESUME.parsedData.skills.filter(s =>
    job.skills.some(js => s.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(s.toLowerCase()))
  ), ...job.skills.slice(0, 5)])];

  const atsScore = Math.min(98, 75 + Math.floor(Math.random() * 20));
  const missingKeywords = job.skills.filter(js =>
    !MOCK_RESUME.parsedData.skills.some(rs => rs.toLowerCase().includes(js.toLowerCase()))
  );

  return NextResponse.json({
    jobTitle: job.title,
    company: job.company,
    atsScore,
    tailoredSkills,
    missingKeywords,
    summary: `AI/ML engineer with 4+ years of experience in ${job.skills.slice(0, 3).join(', ')}. Proven track record of building production-ready AI systems. Passionate about contributing to ${job.company}'s mission.`,
    experienceRewrite: MOCK_RESUME.parsedData.experience.map(exp => ({
      ...exp,
      description: exp.description + ` This experience directly applies to the ${job.title} role at ${job.company}, demonstrating capability in ${job.skills.slice(0, 4).join(', ')}.`,
      technologies: [...new Set([...exp.technologies, ...job.skills.filter(s => exp.technologies.some(t => t.toLowerCase().includes(s.toLowerCase()))).slice(0, 3)])]
    })),
    recommendations: [
      `Add "${job.skills[0]}" to your skills section prominently`,
      `Reorder experience to highlight ${job.title.toLowerCase()} relevant projects first`,
      `Include keywords: ${job.skills.slice(0, 5).join(', ')}`,
      ...(missingKeywords.length > 0 ? [`Consider gaining experience with: ${missingKeywords.slice(0, 3).join(', ')}`] : []),
    ],
  });
}