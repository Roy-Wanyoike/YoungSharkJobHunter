import { NextResponse } from 'next/server';
import { MOCK_JOBS, MOCK_APPLICATIONS, MOCK_RESUME } from '@/lib/mock-data';

export async function POST(request: Request) {
  const { message } = await request.json();
  const lowerMsg = message.toLowerCase();

  let response = '';

  if (lowerMsg.includes('ai trainer') || lowerMsg.includes('training')) {
    const aiTrainingJobs = MOCK_JOBS.filter(j => j.sourceType === 'ai_training' && !j.isApplied).slice(0, 5);
    response = `I found ${MOCK_JOBS.filter(j => j.sourceType === 'ai_training').length} AI training jobs across 28+ platforms. Here are the top matches:\n\n`;
    response += aiTrainingJobs.map(j => `**${j.title}** at ${j.company} — Match: ${j.matchScore}% | ${j.salaryMin}-${j.salaryMax}${j.salaryType === 'hourly' ? '/hr' : '/yr'} | ${j.remote ? 'Remote' : j.location}`).join('\n');
    response += '\n\nWould you like me to generate tailored resumes for any of these?';
  } else if (lowerMsg.includes('remote') && (lowerMsg.includes('over') || lowerMsg.includes('$') || lowerMsg.includes('40') || lowerMsg.includes('salary'))) {
    const highPayRemote = MOCK_JOBS.filter(j => j.remote && (j.salaryMin || 0) >= 40).slice(0, 5);
    response = `Found ${MOCK_JOBS.filter(j => j.remote && (j.salaryMin || 0) >= 40).length} remote jobs paying $40+/hr or equivalent:\n\n`;
    response += highPayRemote.map(j => `**${j.title}** at ${j.company} — ${j.salaryMin}-${j.salaryMax}${j.salaryType === 'hourly' ? '/hr' : '/yr'} | Match: ${j.matchScore}%`).join('\n');
  } else if (lowerMsg.includes('generate') && lowerMsg.includes('resume')) {
    response = `I can generate tailored resumes for your ${MOCK_APPLICATIONS.length} tracked applications. Go to the **Resume Generator** panel and select a job to generate an ATS-optimized resume. Your current resume has an average ATS score of ${Math.round(MOCK_APPLICATIONS.reduce((s, a) => s + (a.atsScore || 0), 0) / MOCK_APPLICATIONS.length)}%.`;
  } else if (lowerMsg.includes('status') || lowerMsg.includes('application') || lowerMsg.includes('track')) {
    const stats = {
      submitted: MOCK_APPLICATIONS.filter(a => a.status === 'submitted').length,
      interviewing: MOCK_APPLICATIONS.filter(a => a.status === 'interview').length,
      offers: MOCK_APPLICATIONS.filter(a => a.status === 'offer').length,
      rejected: MOCK_APPLICATIONS.filter(a => a.status === 'rejected').length,
    };
    response = `Here's your application status:\n\n- **Submitted:** ${stats.submitted} applications\n- **Interviewing:** ${stats.interviewing} (upcoming!)\n- **Offers:** ${stats.offers} (congratulations!)\n- **Rejected:** ${stats.rejected}\n\nTotal: ${MOCK_APPLICATIONS.length} applications tracked. Response rate: 68.3%`;
  } else if (lowerMsg.includes('skill') || lowerMsg.includes('gap') || lowerMsg.includes('learn')) {
    const allSkills = MOCK_JOBS.flatMap(j => j.skills);
    const resumeSkills = new Set(MOCK_RESUME.parsedData.skills.map(s => s.toLowerCase()));
    const missing = [...new Set(allSkills.filter(s => !resumeSkills.has(s.toLowerCase())))];
    response = `Based on your top-matched jobs, here are skills you might want to develop:\n\n**High Priority:** ${missing.slice(0, 5).join(', ')}\n**Nice to Have:** ${missing.slice(5, 12).join(', ')}\n\nI recommend focusing on the high-priority skills first as they appear in your highest-matching job descriptions.`;
  } else if (lowerMsg.includes('outlier') || lowerMsg.includes('scale') || lowerMsg.includes('dataannotation') || lowerMsg.includes('alignerr')) {
    const company = lowerMsg.includes('outlier') ? 'Outlier' : lowerMsg.includes('scale') ? 'Scale AI' : lowerMsg.includes('dataannotation') ? 'DataAnnotation' : 'Alignerr';
    const companyJobs = MOCK_JOBS.filter(j => j.company === company);
    response = `**${company}** has ${companyJobs.length} active positions:\n\n`;
    response += companyJobs.map(j => `- ${j.title} | ${j.salaryMin}-${j.salaryMax}${j.salaryType === 'hourly' ? '/hr' : '/yr'} | Match: ${j.matchScore}% | ${j.isApplied ? 'Applied' : 'Not Applied'}`).join('\n');
  } else {
    response = `I'm your AI Employment Agent. I can help you with:\n\n- **"Find AI Trainer jobs"** — Search across all AI training platforms\n- **"Only remote jobs paying over $40/hour"** — Filter by criteria\n- **"Generate resumes for all jobs"** — Create tailored resumes\n- **"Show my application status"** — Track your applications\n- **"What skills am I missing?"** — Identify skill gaps\n- **"Show Outlier jobs"** — Check specific companies\n\nWhat would you like to do?`;
  }

  return NextResponse.json({ response });
}