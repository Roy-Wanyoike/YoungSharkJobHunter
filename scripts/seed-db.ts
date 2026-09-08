import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const db = new PrismaClient();

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted random pick: [{ value, weight }] */
function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

// ============================================================================
// SEED DATA — JOB SOURCES (from mock-data.ts)
// ============================================================================

const JOB_SOURCES_RAW = [
  { id: 'src-outlier', name: 'Outlier', type: 'ai_training', website: 'https://outlier.ai', isActive: true, jobsCount: 38, lastScraped: '2026-07-08T12:00:00Z' },
  { id: 'src-alignerr', name: 'Alignerr', type: 'ai_training', website: 'https://alignerr.com', isActive: true, jobsCount: 22, lastScraped: '2026-07-08T11:30:00Z' },
  { id: 'src-invisible', name: 'Invisible Technologies', type: 'ai_training', website: 'https://invisible.tech', isActive: true, jobsCount: 15, lastScraped: '2026-07-08T10:00:00Z' },
  { id: 'src-dataannotation', name: 'DataAnnotation', type: 'ai_training', website: 'https://dataannotation.tech', isActive: true, jobsCount: 41, lastScraped: '2026-07-08T12:15:00Z' },
  { id: 'src-scaleai', name: 'Scale AI', type: 'ai_training', website: 'https://scale.com', isActive: true, jobsCount: 29, lastScraped: '2026-07-08T09:45:00Z' },
  { id: 'src-surgeai', name: 'Surge AI', type: 'ai_training', website: 'https://surgehq.ai', isActive: true, jobsCount: 8, lastScraped: '2026-07-08T08:00:00Z' },
  { id: 'src-appen', name: 'Appen', type: 'ai_training', website: 'https://appen.com', isActive: true, jobsCount: 33, lastScraped: '2026-07-08T11:00:00Z' },
  { id: 'src-telus', name: 'TELUS Digital', type: 'ai_training', website: 'https://telusinternational.com', isActive: true, jobsCount: 19, lastScraped: '2026-07-08T07:30:00Z' },
  { id: 'src-toloka', name: 'Toloka', type: 'ai_training', website: 'https://toloka.ai', isActive: true, jobsCount: 11, lastScraped: '2026-07-07T23:00:00Z' },
  { id: 'src-turing', name: 'Turing', type: 'ai_training', website: 'https://turing.com', isActive: true, jobsCount: 27, lastScraped: '2026-07-08T10:30:00Z' },
  { id: 'src-mercor', name: 'Mercor', type: 'ai_training', website: 'https://mercor.com', isActive: true, jobsCount: 14, lastScraped: '2026-07-08T09:00:00Z' },
  { id: 'src-prolific', name: 'Prolific', type: 'ai_training', website: 'https://prolific.com', isActive: true, jobsCount: 6, lastScraped: '2026-07-07T22:00:00Z' },
  { id: 'src-rws', name: 'RWS', type: 'ai_training', website: 'https://rws.com', isActive: true, jobsCount: 9, lastScraped: '2026-07-07T20:00:00Z' },
  { id: 'src-welocalize', name: 'Welocalize', type: 'ai_training', website: 'https://welocalize.com', isActive: true, jobsCount: 12, lastScraped: '2026-07-07T18:00:00Z' },
  { id: 'src-remotasks', name: 'Remotasks', type: 'ai_training', website: 'https://remotasks.com', isActive: true, jobsCount: 17, lastScraped: '2026-07-08T06:00:00Z' },
  { id: 'src-mindrift', name: 'Mindrift', type: 'ai_training', website: 'https://mindrift.ai', isActive: true, jobsCount: 10, lastScraped: '2026-07-08T05:00:00Z' },
  { id: 'src-g2i', name: 'G2i', type: 'ai_training', website: 'https://g2i.co', isActive: true, jobsCount: 7, lastScraped: '2026-07-07T21:00:00Z' },
  { id: 'src-pareto', name: 'Pareto AI', type: 'ai_training', website: 'https://pareto.ai', isActive: true, jobsCount: 13, lastScraped: '2026-07-08T04:00:00Z' },
  { id: 'src-cloudfactory', name: 'CloudFactory', type: 'ai_training', website: 'https://cloudfactory.com', isActive: true, jobsCount: 8, lastScraped: '2026-07-07T19:00:00Z' },
  { id: 'src-sama', name: 'Sama', type: 'ai_training', website: 'https://sama.com', isActive: true, jobsCount: 5, lastScraped: '2026-07-07T17:00:00Z' },
  { id: 'src-defined', name: 'Defined.ai', type: 'ai_training', website: 'https://defined.ai', isActive: true, jobsCount: 9, lastScraped: '2026-07-07T16:00:00Z' },
  { id: 'src-lionbridge', name: 'Lionbridge AI', type: 'ai_training', website: 'https://lionbridge.com', isActive: true, jobsCount: 11, lastScraped: '2026-07-07T15:00:00Z' },
  { id: 'src-imerit', name: 'iMerit', type: 'ai_training', website: 'https://imerit.net', isActive: true, jobsCount: 7, lastScraped: '2026-07-07T14:00:00Z' },
  { id: 'src-clickworker', name: 'Clickworker', type: 'ai_training', website: 'https://clickworker.com', isActive: true, jobsCount: 14, lastScraped: '2026-07-07T13:00:00Z' },
  { id: 'src-oneforma', name: 'OneForma', type: 'ai_training', website: 'https://oneforma.com', isActive: true, jobsCount: 10, lastScraped: '2026-07-07T12:00:00Z' },
  { id: 'src-hive', name: 'Hive', type: 'ai_training', website: 'https://thehive.ai', isActive: true, jobsCount: 6, lastScraped: '2026-07-07T11:00:00Z' },
  { id: 'src-snorkel', name: 'Snorkel AI', type: 'ai_training', website: 'https://snorkel.ai', isActive: true, jobsCount: 8, lastScraped: '2026-07-07T10:00:00Z' },
  { id: 'src-labelbox', name: 'Labelbox', type: 'ai_training', website: 'https://labelbox.com', isActive: true, jobsCount: 12, lastScraped: '2026-07-08T01:00:00Z' },
  { id: 'src-openai', name: 'OpenAI', type: 'research_lab', website: 'https://openai.com/careers', isActive: true, jobsCount: 34, lastScraped: '2026-07-08T12:00:00Z' },
  { id: 'src-anthropic', name: 'Anthropic', type: 'research_lab', website: 'https://anthropic.com/careers', isActive: true, jobsCount: 21, lastScraped: '2026-07-08T11:00:00Z' },
  { id: 'src-deepmind', name: 'Google DeepMind', type: 'research_lab', website: 'https://deepmind.google/careers', isActive: true, jobsCount: 28, lastScraped: '2026-07-08T10:00:00Z' },
  { id: 'src-metaai', name: 'Meta AI', type: 'research_lab', website: 'https://metacareers.com', isActive: true, jobsCount: 25, lastScraped: '2026-07-08T09:00:00Z' },
  { id: 'src-xai', name: 'xAI', type: 'research_lab', website: 'https://x.ai/careers', isActive: true, jobsCount: 16, lastScraped: '2026-07-08T08:00:00Z' },
  { id: 'src-cohere', name: 'Cohere', type: 'research_lab', website: 'https://cohere.com/careers', isActive: true, jobsCount: 11, lastScraped: '2026-07-08T07:00:00Z' },
  { id: 'src-mistral', name: 'Mistral AI', type: 'research_lab', website: 'https://mistral.ai/careers', isActive: true, jobsCount: 9, lastScraped: '2026-07-08T06:00:00Z' },
  { id: 'src-huggingface', name: 'Hugging Face', type: 'research_lab', website: 'https://huggingface.co/jobs', isActive: true, jobsCount: 13, lastScraped: '2026-07-08T05:00:00Z' },
  { id: 'src-togetherai', name: 'Together AI', type: 'research_lab', website: 'https://together.ai/careers', isActive: true, jobsCount: 8, lastScraped: '2026-07-08T04:00:00Z' },
  { id: 'src-groq', name: 'Groq', type: 'research_lab', website: 'https://groq.com/careers', isActive: true, jobsCount: 6, lastScraped: '2026-07-08T03:00:00Z' },
  { id: 'src-google', name: 'Google', type: 'big_tech', website: 'https://careers.google.com', isActive: true, jobsCount: 42, lastScraped: '2026-07-08T12:00:00Z' },
  { id: 'src-microsoft', name: 'Microsoft', type: 'big_tech', website: 'https://careers.microsoft.com', isActive: true, jobsCount: 38, lastScraped: '2026-07-08T11:00:00Z' },
  { id: 'src-amazon', name: 'Amazon', type: 'big_tech', website: 'https://amazon.jobs', isActive: true, jobsCount: 45, lastScraped: '2026-07-08T10:00:00Z' },
  { id: 'src-apple', name: 'Apple', type: 'big_tech', website: 'https://jobs.apple.com', isActive: true, jobsCount: 31, lastScraped: '2026-07-08T09:00:00Z' },
  { id: 'src-meta', name: 'Meta', type: 'big_tech', website: 'https://metacareers.com', isActive: true, jobsCount: 35, lastScraped: '2026-07-08T08:00:00Z' },
  { id: 'src-nvidia', name: 'NVIDIA', type: 'big_tech', website: 'https://nvidia.com/careers', isActive: true, jobsCount: 29, lastScraped: '2026-07-08T07:00:00Z' },
  { id: 'src-linkedin', name: 'LinkedIn', type: 'job_board', website: 'https://linkedin.com/jobs', isActive: true, jobsCount: 120, lastScraped: '2026-07-08T12:00:00Z' },
  { id: 'src-indeed', name: 'Indeed', type: 'job_board', website: 'https://indeed.com', isActive: true, jobsCount: 95, lastScraped: '2026-07-08T11:30:00Z' },
  { id: 'src-remoteok', name: 'RemoteOK', type: 'remote', website: 'https://remoteok.com', isActive: true, jobsCount: 55, lastScraped: '2026-07-08T10:00:00Z' },
  { id: 'src-wellfound', name: 'Wellfound', type: 'startup', website: 'https://wellfound.com', isActive: true, jobsCount: 67, lastScraped: '2026-07-08T09:00:00Z' },
  { id: 'src-wwr', name: 'We Work Remotely', type: 'remote', website: 'https://weworkremotely.com', isActive: true, jobsCount: 43, lastScraped: '2026-07-08T08:00:00Z' },
  { id: 'src-greenhouse', name: 'Greenhouse', type: 'ats', website: 'https://greenhouse.io', isActive: true, jobsCount: 180, lastScraped: '2026-07-08T12:00:00Z' },
  { id: 'src-lever', name: 'Lever', type: 'ats', website: 'https://lever.co', isActive: true, jobsCount: 145, lastScraped: '2026-07-08T11:00:00Z' },
  { id: 'src-ashby', name: 'Ashby', type: 'ats', website: 'https://ashbyhq.com', isActive: true, jobsCount: 98, lastScraped: '2026-07-08T10:00:00Z' },
  { id: 'src-workday', name: 'Workday', type: 'ats', website: 'https://workday.com', isActive: true, jobsCount: 110, lastScraped: '2026-07-08T09:00:00Z' },
];

// ============================================================================
// SEED DATA — MOCK JOBS (loaded from pre-extracted JSON)
// ============================================================================

// Load jobs from the JSON file extracted from mock-data.ts
const MOCK_JOBS_RAW = JSON.parse(
  readFileSync(resolve(__dirname, '../tmp/mock-jobs.json'), 'utf-8')
) as Array<Record<string, unknown>>;

// ============================================================================
// SEED DATA — MOCK RESUME (from mock-data.ts)
// ============================================================================

const MOCK_RESUME_PARSED_DATA = {
  name: 'Alex Chen',
  email: 'alex.chen@email.com',
  phone: '+1 (555) 123-4567',
  linkedin: 'linkedin.com/in/alexchen',
  github: 'github.com/alexchen',
  website: 'alexchen.dev',
  summary: 'AI/ML engineer with 4+ years of experience in NLP, prompt engineering, and model evaluation. Proven track record of building production-ready AI systems including RAG pipelines, chatbot frameworks, and sentiment analysis tools. Passionate about AI safety and making AI systems more reliable and helpful.',
  experience: [
    {
      company: 'TechCorp AI', title: 'ML Engineer', startDate: '2023-01', endDate: null, current: true,
      description: 'Built and deployed NLP pipelines processing 10M+ documents daily. Led the development of a RAG-based enterprise search system that improved information retrieval accuracy by 40%. Designed and implemented prompt engineering strategies for customer-facing AI features, achieving 95% user satisfaction scores.',
      technologies: ['Python', 'PyTorch', 'Hugging Face', 'LangChain', 'FastAPI', 'Docker', 'AWS'],
    },
    {
      company: 'DataLab Inc', title: 'Data Scientist', startDate: '2021-06', endDate: '2022-12', current: false,
      description: 'Developed ML models for customer churn prediction with 89% accuracy. Built real-time sentiment analysis pipeline processing 50K+ social media posts daily. Created automated reporting dashboards that reduced manual analysis time by 60%.',
      technologies: ['Python', 'TensorFlow', 'scikit-learn', 'SQL', 'Spark', 'Tableau', 'GCP'],
    },
    {
      company: 'StartupXYZ', title: 'Junior Developer', startDate: '2019-09', endDate: '2021-05', current: false,
      description: 'Full-stack development of customer-facing web applications serving 100K+ users. Implemented REST APIs and database optimization that improved response times by 3x. Collaborated with design team on responsive UI implementations.',
      technologies: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    },
  ],
  education: [
    { institution: 'University of Technology', degree: 'M.S.', field: 'Computer Science', startDate: '2019', endDate: '2021', gpa: '3.8' },
    { institution: 'State University', degree: 'B.S.', field: 'Mathematics', startDate: '2015', endDate: '2019', gpa: '3.6' },
  ],
  projects: [
    {
      name: 'AI Chatbot Framework',
      description: 'Built a production-ready RAG chatbot using LangChain and OpenAI, with Pinecone vector store and FastAPI backend. Supports multi-turn conversations, document upload, and citation tracking. Deployed for 3 enterprise clients.',
      technologies: ['LangChain', 'OpenAI', 'Pinecone', 'FastAPI', 'React', 'Docker'],
      url: 'github.com/alexchen/chatbot-framework',
    },
    {
      name: 'Sentiment Analysis Platform',
      description: 'Real-time social media sentiment analysis tool with BERT-based models and Spark streaming. Processes 50K+ posts daily with sub-second latency. Includes interactive dashboard for trend visualization.',
      technologies: ['Python', 'BERT', 'Spark', 'Docker', 'PostgreSQL', 'Grafana'],
      url: 'github.com/alexchen/sentiment-platform',
    },
  ],
  certifications: ['AWS Machine Learning Specialty', 'Google Cloud Professional ML Engineer', 'Deep Learning Specialization (Coursera)'],
  languages: ['English (Native)', 'Mandarin (Native)'],
  skills: ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'PyTorch', 'TensorFlow', 'Hugging Face', 'LangChain', 'OpenAI API', 'Prompt Engineering', 'RLHF', 'NLP', 'Transformer Models', 'Docker', 'PostgreSQL', 'Redis', 'FastAPI', 'Git', 'AWS', 'GCP'],
};

const RESUME_SKILLS = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'PyTorch', 'TensorFlow', 'Hugging Face', 'LangChain', 'OpenAI API', 'Prompt Engineering', 'RLHF', 'NLP', 'Transformer Models', 'Docker', 'PostgreSQL', 'Redis', 'FastAPI', 'Git', 'AWS', 'GCP'];
const RESUME_EXPERIENCE = MOCK_RESUME_PARSED_DATA.experience;
const RESUME_EDUCATION = MOCK_RESUME_PARSED_DATA.education;
const RESUME_PROJECTS = MOCK_RESUME_PARSED_DATA.projects;
const RESUME_CERTIFICATIONS = MOCK_RESUME_PARSED_DATA.certifications;
const RESUME_LANGUAGES = MOCK_RESUME_PARSED_DATA.languages;

// ============================================================================
// SEED DATA — MOCK APPLICATIONS (from mock-data.ts)
// ============================================================================

const MOCK_APPLICATIONS_RAW = [
  { jobIdIdx: 0, status: 'submitted', appliedAt: '2026-07-07T15:00:00Z', atsScore: 94, coverLetter: 'Dear Outlier Team, I am excited to apply for the AI Trainer position. With my 4+ years of ML engineering experience and deep expertise in Python and NLP, I am well-positioned to create high-quality training data for your AI models.', notes: 'Strong match - Python and NLP skills align perfectly' },
  { jobIdIdx: 3, status: 'interview', appliedAt: '2026-07-05T17:00:00Z', atsScore: 91, coverLetter: 'Dear Scale AI, As an experienced prompt engineer with production LLM deployments, I am eager to contribute to your enterprise solutions team.', notes: 'Phone screen scheduled for Jul 10' },
  { jobIdIdx: 9, status: 'reviewing', appliedAt: '2026-07-03T11:00:00Z', atsScore: 88, coverLetter: 'Dear Anthropic, My research background in AI alignment and hands-on experience with RLHF make me a strong candidate for this role.', notes: 'Application under review - high match on safety research' },
  { jobIdIdx: 11, status: 'offer', appliedAt: '2026-07-02T15:00:00Z', atsScore: 96, coverLetter: 'Dear Mercor Team, I am thrilled to apply for the Prompt Engineering Lead position. My experience leading prompt optimization initiatives...', notes: 'Received offer - $185K base + equity. Negotiating.', recruiterName: 'Sarah Kim', recruiterEmail: 'sarah@mercor.com' },
  { jobIdIdx: 17, status: 'submitted', appliedAt: '2026-07-06T11:00:00Z', atsScore: 93, coverLetter: 'Dear Turing, With 4+ years of software development and ML experience, I am confident in my ability to evaluate AI-generated code effectively.', notes: 'Applied with tailored resume emphasizing code review experience' },
  { jobIdIdx: 19, status: 'interview', appliedAt: '2026-07-05T09:00:00Z', atsScore: 92, coverLetter: 'Dear Welocalize, As a native Mandarin and English speaker with NLP expertise, I am uniquely qualified for this multilingual AI training role.', notes: 'Technical interview on Jul 12 - prepare NLP evaluation examples' },
  { jobIdIdx: 22, status: 'assessment', appliedAt: '2026-07-04T09:00:00Z', atsScore: 95, coverLetter: 'Dear DeepMind, My applied ML experience with NLP systems and strong publication aspirations align well with this role.', notes: 'Take-home assessment due Jul 10' },
  { jobIdIdx: 26, status: 'submitted', appliedAt: '2026-07-07T13:00:00Z', atsScore: 97, coverLetter: 'Dear Hugging Face, As an active open-source contributor with deep expertise in the Transformers ecosystem, I am excited about this opportunity.', notes: 'Perfect match - open source + Transformers + Python' },
  { jobIdIdx: 34, status: 'submitted', appliedAt: '2026-07-07T11:00:00Z', atsScore: 90, coverLetter: 'Dear Hiring Team, I am eager to join your early-stage startup and own the full ML pipeline. My experience building production RAG systems...', notes: 'Startup role - high upside potential' },
  { jobIdIdx: 38, status: 'rejected', appliedAt: '2026-07-05T17:00:00Z', atsScore: 87, coverLetter: 'Dear TechCorp, With my background in building NLP-powered SaaS features, I am well-suited for this AI Engineer role.', notes: 'Rejected - they wanted more C++ experience', feedback: 'Strong candidate but looking for more systems-level programming experience' },
  { jobIdIdx: 51, status: 'submitted', appliedAt: '2026-07-07T07:00:00Z', atsScore: 94, coverLetter: 'Dear Together AI, My experience with LLM fine-tuning using LoRA and QLoRA techniques makes me an ideal fit for this specialist role.', notes: 'Applied - strong fine-tuning experience match' },
  { jobIdIdx: 55, status: 'interview', appliedAt: '2026-07-08T08:00:00Z', atsScore: 98, coverLetter: 'Dear DevTools AI, As a full-stack developer with AI/ML expertise, I am excited about building developer tools that make AI accessible.', notes: 'Initial call on Jul 11 - prepare portfolio of AI projects', recruiterName: 'Mike Torres', recruiterEmail: 'mike@devtools.ai' },
  { jobIdIdx: 62, status: 'submitted', appliedAt: '2026-07-03T09:00:00Z', atsScore: 89, coverLetter: 'Dear OpenAI, My experience with ML evaluation frameworks and benchmark design aligns perfectly with this role.', notes: 'Dream company - very strong alignment' },
  { jobIdIdx: 32, status: 'ghosted', appliedAt: '2026-07-01T15:00:00Z', atsScore: 86, coverLetter: 'Dear Meta, My research interests in open-source LLM development make me passionate about contributing to LLaMA.', notes: 'No response after 7 days - followed up on Jul 8' },
  { jobIdIdx: 4, status: 'rejected', appliedAt: '2026-07-08T11:00:00Z', atsScore: 82, coverLetter: 'Dear Remotasks, I would like to contribute my software engineering expertise to your code review team.', notes: 'Auto-rejected - minimum experience requirement not met for this specific project' },
];

// ============================================================================
// SEED DATA — INTERVIEWS
// ============================================================================

const INTERVIEWS_DATA = [
  { applicationIdx: 1, round: 1, type: 'phone', date: daysAgo(-3).toISOString(), duration: 30, interviewer: 'James Wilson', status: 'completed', notes: 'Phone screen went well. Discussed prompt engineering experience and RLHF background. Asked about scale of projects.', feedback: 'Positive - candidate demonstrates strong understanding of prompt engineering methodologies', prepNotes: 'Review recent RLHF papers, prepare examples of production prompt optimization' },
  { applicationIdx: 1, round: 2, type: 'video', date: daysAgo(2).toISOString(), duration: 60, interviewer: 'Lisa Chen', status: 'scheduled', notes: 'Technical interview with engineering team. Will include live coding exercise.', prepNotes: 'Practice prompt chain design, prepare system architecture examples for LLM evaluation pipeline' },
  { applicationIdx: 5, round: 1, type: 'video', date: daysAgo(-1).toISOString(), duration: 45, interviewer: 'Maria Garcia', status: 'completed', notes: 'Discussed multilingual NLP evaluation challenges. Covered experience with Chinese and English text processing.', feedback: 'Very positive. Impressed by bilingual NLP expertise and practical experience with multilingual models.', prepNotes: 'Prepare examples of cross-lingual transfer learning challenges' },
  { applicationIdx: 11, round: 1, type: 'technical', date: daysAgo(1).toISOString(), duration: 90, interviewer: 'Alex Rivera', status: 'scheduled', notes: 'Full-stack AI engineering assessment. Will cover system design for AI developer tools.', prepNotes: 'Prepare architecture diagrams for AI tool platform, review API design patterns for ML systems' },
];

// ============================================================================
// SEED DATA — SKILL CATEGORIES
// ============================================================================

function classifySkill(skill: string): string {
  const languageKeywords = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Scala', 'Go', 'C++', 'Swift', 'SQL', 'Chinese', 'Japanese', 'Korean'];
  const frameworkKeywords = [
    'React', 'Next.js', 'Node.js', 'FastAPI', 'Docker', 'Kubernetes', 'LangChain', 'LangGraph',
    'AutoGPT', 'CrewAI', 'Hugging Face', 'Transformers', 'PyTorch', 'TensorFlow', 'Spark',
    'Kafka', 'Labelbox', 'Snorkel', 'OpenAI API', 'Pinecone', 'Grafana', 'Tableau',
    'Redis', 'PostgreSQL', 'TPU', 'CUDA', 'TensorRT', 'Azure AI',
  ];
  const toolKeywords = [
    'Git', 'AWS', 'GCP', 'CI/CD', 'Monitoring', 'Testing', 'Testing Frameworks',
    'A/B Testing', 'Data Visualization', 'Dashboarding', 'LoRA', 'QLoRA',
    'ML Pipelines', 'ETL', 'API Design', 'API Integration', 'API Documentation',
    'Developer Documentation', 'Documentation', 'Tutorials', 'Editing', 'Markdown',
    'Documentation-as-Code', 'Microservices', 'ML Serving', 'Model Serving',
    'Quantization', 'Model Optimization', 'Vector Databases', 'Embeddings',
  ];
  const domainKeywords = [
    'Machine Learning', 'NLP', 'Deep Learning', 'Machine Learning', 'AI Safety',
    'RLHF', 'Constitutional AI', 'Red Teaming', 'Alignment Research', 'AI Ethics',
    'Fairness', 'Privacy', 'LLM', 'Transformer Architecture', 'Foundation Models',
    'Generative AI', 'Multimodal AI', 'Computer Vision', 'Speech Recognition',
    'Voice AI', 'Conversational AI', 'Recommendation Systems', 'Sentiment Analysis',
    'Named Entity Recognition', 'Text Classification', 'Image Generation',
    'Image Segmentation', 'Vision Transformers', 'Agentic AI', 'AI Agents',
    'RAG', 'Information Retrieval', 'Prompt Engineering', 'Evaluation Frameworks',
    'AI Training', 'Data Annotation', 'Data Labeling', 'AI Evaluation',
    'Benchmark Design', 'ML Evaluation', 'Model Evaluation', 'Medical AI',
    'Clinical Knowledge', 'Legal AI', 'Contract Analysis', 'Adversarial Testing',
    'Security Research', 'Bias Detection', 'Privacy-Preserving ML', 'On-Device ML',
    'Mobile AI', 'LLM Research', 'LLM Alignment', 'LLM Inference',
    'Personalization', 'Real-Time ML', 'MLOps', 'Production ML', 'ML Research',
    'Distributed Training', 'Large-Scale Systems', 'Distributed Systems',
    'Distributed Computing', 'Data Engineering', 'Large-Scale Data', 'Data Lakes',
    'Platform Engineering', 'Cloud Infrastructure', 'Responsible AI',
    'Full Stack ML', 'Full Stack', 'Startup', 'AI/ML', 'AI/ML Products',
    'SaaS', 'Healthcare', 'Regulatory Compliance', 'Enterprise AI',
  ];

  if (languageKeywords.includes(skill)) return 'language';
  if (frameworkKeywords.includes(skill)) return 'framework';
  if (toolKeywords.includes(skill)) return 'tool';
  if (domainKeywords.includes(skill)) return 'domain';
  return 'soft';
}

// Extract all unique skills from jobs
const allJobSkills = new Set<string>();
for (const job of MOCK_JOBS_RAW) {
  const skills = job.skills as string[];
  if (Array.isArray(skills)) {
    for (const s of skills) allJobSkills.add(s);
  }
}

// ============================================================================
// SEED DATA — SCRAPING LOGS
// ============================================================================

const SCRAPING_LOGS_DATA = [
  { sourceIdIdx: 0, source: 'Outlier', status: 'success', jobsFound: 42, jobsNew: 5, duration: 3200 },
  { sourceIdIdx: 1, source: 'Alignerr', status: 'success', jobsFound: 24, jobsNew: 2, duration: 2800 },
  { sourceIdIdx: 2, source: 'Invisible Technologies', status: 'success', jobsFound: 16, jobsNew: 1, duration: 4100 },
  { sourceIdIdx: 3, source: 'DataAnnotation', status: 'success', jobsFound: 45, jobsNew: 8, duration: 5600 },
  { sourceIdIdx: 4, source: 'Scale AI', status: 'partial', jobsFound: 31, jobsNew: 3, duration: 8200, errors: 'Rate limited on 2 endpoints. Retried successfully for most pages.' },
  { sourceIdIdx: 6, source: 'Appen', status: 'success', jobsFound: 35, jobsNew: 4, duration: 3900 },
  { sourceIdIdx: 29, source: 'OpenAI', status: 'success', jobsFound: 37, jobsNew: 6, duration: 4500 },
  { sourceIdIdx: 30, source: 'Anthropic', status: 'partial', jobsFound: 22, jobsNew: 1, duration: 7800, errors: 'CAPTCHA encountered on 3 pages. Partial data retrieved.' },
  { sourceIdIdx: 31, source: 'Google DeepMind', status: 'success', jobsFound: 30, jobsNew: 4, duration: 5100 },
  { sourceIdIdx: 42, source: 'LinkedIn', status: 'success', jobsFound: 135, jobsNew: 22, duration: 12400 },
  { sourceIdIdx: 43, source: 'Indeed', status: 'failed', jobsFound: 0, jobsNew: 0, duration: 15000, errors: 'Authentication token expired. Could not refresh session.' },
  { sourceIdIdx: 48, source: 'Greenhouse', status: 'success', jobsFound: 192, jobsNew: 15, duration: 8900 },
  { sourceIdIdx: 49, source: 'Lever', status: 'success', jobsFound: 158, jobsNew: 12, duration: 9200 },
  { sourceIdIdx: 50, source: 'Ashby', status: 'success', jobsFound: 102, jobsNew: 7, duration: 6100 },
  { sourceIdIdx: 44, source: 'RemoteOK', status: 'success', jobsFound: 58, jobsNew: 9, duration: 3200 },
];

// ============================================================================
// SEED DATA — NOTIFICATIONS
// ============================================================================

const NOTIFICATIONS_DATA = [
  { type: 'success', title: 'New Interview Scheduled', message: 'Scale AI has scheduled a video interview for Jul 12. Check your calendar for details.', link: '/applications' },
  { type: 'info', title: 'New Jobs Found', message: '12 new AI/ML positions matched your profile from 5 sources. Review them now.', link: '/jobs' },
  { type: 'warning', title: 'Follow-up Reminder', message: 'You applied to Meta 7 days ago with no response. Consider sending a follow-up.', link: '/applications' },
  { type: 'success', title: 'Offer Received!', message: 'Congratulations! Mercor has extended an offer for the Prompt Engineering Lead position.', link: '/applications' },
  { type: 'info', title: 'Resume Score Improved', message: 'Your primary resume ATS score improved to 94 after recent optimizations.', link: '/resume' },
  { type: 'warning', title: 'Assessment Due Tomorrow', message: 'Your take-home assessment for Google DeepMind is due Jul 10. Don\'t forget to submit.', link: '/applications' },
  { type: 'info', title: 'Scraping Complete', message: 'Job source scraping cycle completed. 847 total jobs found, 127 new positions.', link: '/sources' },
  { type: 'info', title: 'Weekly Summary', message: 'This week: 5 applications submitted, 2 interviews completed, 1 offer received.', link: '/dashboard' },
];

// ============================================================================
// SEED DATA — SALARY DATA (30 points for common AI/ML roles)
// ============================================================================

const SALARY_DATA_RAW = [
  { role: 'AI/ML Engineer', level: 'entry', location: 'Remote', source: 'LinkedIn', salaryMin: 85000, salaryMax: 120000, sampleSize: 234 },
  { role: 'AI/ML Engineer', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 120000, salaryMax: 170000, sampleSize: 456 },
  { role: 'AI/ML Engineer', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 170000, salaryMax: 250000, sampleSize: 312 },
  { role: 'AI/ML Engineer', level: 'lead', location: 'San Francisco, CA', source: 'Levels.fyi', salaryMin: 220000, salaryMax: 340000, sampleSize: 89 },
  { role: 'Prompt Engineer', level: 'entry', location: 'Remote', source: 'Indeed', salaryMin: 60000, salaryMax: 90000, sampleSize: 156 },
  { role: 'Prompt Engineer', level: 'mid', location: 'Remote', source: 'Indeed', salaryMin: 90000, salaryMax: 140000, sampleSize: 278 },
  { role: 'Prompt Engineer', level: 'senior', location: 'Remote', source: 'Indeed', salaryMin: 140000, salaryMax: 200000, sampleSize: 98 },
  { role: 'NLP Engineer', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 130000, salaryMax: 180000, sampleSize: 167 },
  { role: 'NLP Engineer', level: 'senior', location: 'San Francisco, CA', source: 'Levels.fyi', salaryMin: 180000, salaryMax: 270000, sampleSize: 73 },
  { role: 'Data Scientist', level: 'entry', location: 'Remote', source: 'LinkedIn', salaryMin: 75000, salaryMax: 110000, sampleSize: 523 },
  { role: 'Data Scientist', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 110000, salaryMax: 155000, sampleSize: 678 },
  { role: 'Data Scientist', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 155000, salaryMax: 220000, sampleSize: 389 },
  { role: 'MLOps Engineer', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 130000, salaryMax: 175000, sampleSize: 145 },
  { role: 'MLOps Engineer', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 175000, salaryMax: 240000, sampleSize: 87 },
  { role: 'AI Research Scientist', level: 'mid', location: 'Remote', source: 'Levels.fyi', salaryMin: 150000, salaryMax: 220000, sampleSize: 112 },
  { role: 'AI Research Scientist', level: 'senior', location: 'San Francisco, CA', source: 'Levels.fyi', salaryMin: 220000, salaryMax: 380000, sampleSize: 67 },
  { role: 'AI Trainer', level: 'entry', location: 'Remote', source: 'Indeed', salaryMin: 20, salaryMax: 45, salaryType: 'hourly', sampleSize: 1245 },
  { role: 'AI Trainer', level: 'mid', location: 'Remote', source: 'Indeed', salaryMin: 35, salaryMax: 65, salaryType: 'hourly', sampleSize: 876 },
  { role: 'AI Product Manager', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 140000, salaryMax: 190000, sampleSize: 94 },
  { role: 'AI Product Manager', level: 'senior', location: 'San Francisco, CA', source: 'Levels.fyi', salaryMin: 190000, salaryMax: 280000, sampleSize: 42 },
  { role: 'Computer Vision Engineer', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 125000, salaryMax: 175000, sampleSize: 134 },
  { role: 'Computer Vision Engineer', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 175000, salaryMax: 260000, sampleSize: 78 },
  { role: 'AI Solutions Architect', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 190000, salaryMax: 280000, sampleSize: 56 },
  { role: 'AI Safety Researcher', level: 'mid', location: 'Remote', source: 'Levels.fyi', salaryMin: 140000, salaryMax: 210000, sampleSize: 34 },
  { role: 'AI Safety Researcher', level: 'senior', location: 'San Francisco, CA', source: 'Levels.fyi', salaryMin: 210000, salaryMax: 350000, sampleSize: 18 },
  { role: 'Full Stack AI Engineer', level: 'mid', location: 'Remote', source: 'Wellfound', salaryMin: 120000, salaryMax: 170000, sampleSize: 203 },
  { role: 'Full Stack AI Engineer', level: 'senior', location: 'Remote', source: 'Wellfound', salaryMin: 170000, salaryMax: 240000, sampleSize: 112 },
  { role: 'Data Engineer', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 120000, salaryMax: 160000, sampleSize: 389 },
  { role: 'Data Engineer', level: 'senior', location: 'Remote', source: 'LinkedIn', salaryMin: 160000, salaryMax: 210000, sampleSize: 234 },
  { role: 'DevOps Engineer (AI)', level: 'mid', location: 'Remote', source: 'LinkedIn', salaryMin: 125000, salaryMax: 170000, sampleSize: 87 },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ==========================================================================
  // STEP 0: Clear all tables in reverse dependency order
  // ==========================================================================
  console.log('🗑️  Clearing existing data...');

  await db.interview.deleteMany();
  console.log('   ✓ Interviews cleared');

  await db.application.deleteMany();
  console.log('   ✓ Applications cleared');

  await db.notification.deleteMany();
  console.log('   ✓ Notifications cleared');

  await db.scrapingLog.deleteMany();
  console.log('   ✓ ScrapingLogs cleared');

  await db.salaryData.deleteMany();
  console.log('   ✓ SalaryData cleared');

  await db.skill.deleteMany();
  console.log('   ✓ Skills cleared');

  await db.resumeVersion.deleteMany();
  console.log('   ✓ ResumeVersions cleared');

  await db.resume.deleteMany();
  console.log('   ✓ Resumes cleared');

  await db.job.deleteMany();
  console.log('   ✓ Jobs cleared');

  await db.company.deleteMany();
  console.log('   ✓ Companies cleared');

  await db.jobSource.deleteMany();
  console.log('   ✓ JobSources cleared');

  await db.user.deleteMany();
  console.log('   ✓ Users cleared');

  console.log('');

  // ==========================================================================
  // STEP 1: Create User
  // ==========================================================================
  console.log('👤 Creating user...');

  const user = await db.user.create({
    data: {
      email: 'alex.chen@email.com',
      name: 'Alex Chen',
      role: 'applicant',
      preferences: JSON.stringify({
        preferredLocations: ['Remote', 'San Francisco, CA', 'New York, NY'],
        preferredJobTypes: ['full_time', 'contract'],
        salaryRange: { min: 120000, max: 250000, currency: 'USD' },
        preferredSources: ['Outlier', 'Anthropic', 'OpenAI', 'Hugging Face', 'Scale AI'],
        alertsEnabled: true,
        autoApply: false,
      }),
    },
  });
  console.log(`   ✓ User created: ${user.email} (id: ${user.id})\n`);

  // ==========================================================================
  // STEP 2: Create JobSources
  // ==========================================================================
  console.log('🔗 Creating job sources...');

  const sourceIdMap = new Map<string, string>(); // original id -> new db id

  const jobSources = await Promise.all(
    JOB_SOURCES_RAW.map((src) => {
      const connectorName = src.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const healthStatus = weightedPick([
        { value: 'healthy', weight: 80 },
        { value: 'degraded', weight: 15 },
        { value: 'down', weight: 5 },
      ]);
      const avgResponseMs = randomInt(120, 450);
      const errorRate = randomFloat(0, 0.08);

      return db.jobSource.create({
        data: {
          name: src.name,
          type: src.type,
          website: src.website,
          logoUrl: (src as Record<string, unknown>).logoUrl as string | null || null,
          isActive: src.isActive,
          lastScraped: src.lastScraped ? new Date(src.lastScraped) : null,
          jobsCount: src.jobsCount,
          connectorName,
          healthStatus,
          avgResponseMs,
          errorRate,
        },
      });
    })
  );

  for (let i = 0; i < JOB_SOURCES_RAW.length; i++) {
    sourceIdMap.set(JOB_SOURCES_RAW[i].id, jobSources[i].id);
  }

  console.log(`   ✓ ${jobSources.length} job sources created\n`);

  // ==========================================================================
  // STEP 3: Create Companies
  // ==========================================================================
  console.log('🏢 Creating companies...');

  const uniqueCompanies = [...new Set(MOCK_JOBS_RAW.map((j) => j.company as string))];

  const companyData: Record<string, string> = {};
  const companies = await Promise.all(
    uniqueCompanies.map((name) =>
      db.company.create({
        data: {
          name,
          website: null,
          logoUrl: null,
          industry: pick([
            'Artificial Intelligence', 'Machine Learning', 'Technology',
            'Data Science', 'Cloud Computing', 'Software Development',
            'Natural Language Processing', 'Computer Vision', 'AI Research',
          ]),
          size: pick(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+']),
          description: `${name} is a technology company operating in the AI/ML space.`,
          location: pick(['Remote', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'London, UK', 'Berlin, Germany']),
        },
      }).then((c) => {
        companyData[name] = c.id;
        return c;
      })
    )
  );

  console.log(`   ✓ ${companies.length} companies created\n`);

  // ==========================================================================
  // STEP 4: Create Jobs
  // ==========================================================================
  console.log('💼 Creating jobs...');

  const jobIdMap = new Map<string, string>(); // original id -> new db id

  // Map source names to source IDs
  const sourceNameToId = new Map<string, string>();
  for (let i = 0; i < JOB_SOURCES_RAW.length; i++) {
    sourceNameToId.set(JOB_SOURCES_RAW[i].name, jobSources[i].id);
  }

  const jobs = await Promise.all(
    MOCK_JOBS_RAW.map((job) => {
      const sourceName = job.source as string;
      const companyId = companyData[job.company as string] || null;
      const sourceId = sourceNameToId.get(sourceName) || null;
      const skills = job.skills as string[];

      return db.job.create({
        data: {
          title: job.title as string,
          company: job.company as string,
          companyId,
          source: sourceName,
          sourceId,
          sourceType: job.sourceType as string,
          sourceUrl: job.sourceUrl as string,
          location: (job.location as string) || null,
          remote: (job.remote as boolean) ?? false,
          salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
          salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
          salaryCurrency: (job.salaryCurrency as string) || 'USD',
          salaryType: (job.salaryType as string) || null,
          description: job.description as string,
          requirements: (job.requirements as string) || null,
          skills: JSON.stringify(skills),
          experienceLevel: (job.experienceLevel as string) || null,
          jobType: (job.jobType as string) || null,
          postedAt: job.postedAt ? new Date(job.postedAt as string) : null,
          matchScore: job.matchScore != null ? Number(job.matchScore) : null,
          isActive: (job.isActive as boolean) ?? true,
          isApplied: (job.isApplied as boolean) ?? false,
          isSaved: Math.random() < 0.2,
        },
      });
    })
  );

  for (let i = 0; i < MOCK_JOBS_RAW.length; i++) {
    jobIdMap.set(MOCK_JOBS_RAW[i].id as string, jobs[i].id);
  }

  console.log(`   ✓ ${jobs.length} jobs created\n`);

  // ==========================================================================
  // STEP 5: Create Resume
  // ==========================================================================
  console.log('📄 Creating resume...');

  const resume = await db.resume.create({
    data: {
      userId: user.id,
      fileName: 'alex_chen_resume.pdf',
      fileData: null,
      fileType: 'pdf',
      isPrimary: true,
      parsedData: JSON.stringify(MOCK_RESUME_PARSED_DATA),
      skills: JSON.stringify(RESUME_SKILLS),
      experience: JSON.stringify(RESUME_EXPERIENCE),
      education: JSON.stringify(RESUME_EDUCATION),
      projects: JSON.stringify(RESUME_PROJECTS),
      certifications: JSON.stringify(RESUME_CERTIFICATIONS),
      languages: JSON.stringify(RESUME_LANGUAGES),
    },
  });

  console.log(`   ✓ Resume created: ${resume.fileName} (id: ${resume.id})\n`);

  // ==========================================================================
  // STEP 6: Create Applications
  // ==========================================================================
  console.log('📋 Creating applications...');

  const applications = await Promise.all(
    MOCK_APPLICATIONS_RAW.map((app) => {
      const jobIdx = app.jobIdIdx;
      const originalJobId = MOCK_JOBS_RAW[jobIdx].id as string;
      const newJobId = jobIdMap.get(originalJobId)!;

      return db.application.create({
        data: {
          userId: user.id,
          jobId: newJobId,
          resumeId: resume.id,
          status: app.status,
          coverLetter: app.coverLetter,
          notes: app.notes,
          appliedAt: new Date(app.appliedAt),
          atsScore: app.atsScore,
          recruiterName: app.recruiterName || null,
          recruiterEmail: app.recruiterEmail || null,
          feedback: app.feedback || null,
        },
      });
    })
  );

  console.log(`   ✓ ${applications.length} applications created\n`);

  // ==========================================================================
  // STEP 7: Create Interviews
  // ==========================================================================
  console.log('🎤 Creating interviews...');

  const interviews = await Promise.all(
    INTERVIEWS_DATA.map((interview) => {
      const application = applications[interview.applicationIdx];
      return db.interview.create({
        data: {
          applicationId: application.id,
          round: interview.round,
          type: interview.type,
          date: new Date(interview.date),
          duration: interview.duration,
          interviewer: interview.interviewer,
          status: interview.status,
          notes: interview.notes,
          feedback: interview.feedback || null,
          prepNotes: interview.prepNotes || null,
        },
      });
    })
  );

  console.log(`   ✓ ${interviews.length} interviews created\n`);

  // ==========================================================================
  // STEP 8: Create Skills
  // ==========================================================================
  console.log('🎯 Creating skills...');

  const skillsList = [...allJobSkills];
  const skills = await Promise.all(
    skillsList.map((skillName) =>
      db.skill.create({
        data: {
          name: skillName,
          category: classifySkill(skillName),
          demandScore: randomFloat(30, 95, 0),
        },
      })
    )
  );

  console.log(`   ✓ ${skills.length} skills created\n`);

  // ==========================================================================
  // STEP 9: Create ScrapingLogs
  // ==========================================================================
  console.log('📜 Creating scraping logs...');

  const scrapingLogs = await Promise.all(
    SCRAPING_LOGS_DATA.map((log, idx) => {
      const sourceId = JOB_SOURCES_RAW[log.sourceIdIdx]?.id;
      const newSourceId = sourceId ? sourceIdMap.get(sourceId) || null : null;

      return db.scrapingLog.create({
        data: {
          sourceId: newSourceId,
          source: log.source,
          status: log.status,
          jobsFound: log.jobsFound,
          jobsNew: log.jobsNew,
          errors: log.errors || null,
          duration: log.duration,
          createdAt: hoursAgo(idx * 3 + randomInt(0, 120)),
        },
      });
    })
  );

  console.log(`   ✓ ${scrapingLogs.length} scraping logs created\n`);

  // ==========================================================================
  // STEP 10: Create Notifications
  // ==========================================================================
  console.log('🔔 Creating notifications...');

  const notifications = await Promise.all(
    NOTIFICATIONS_DATA.map((notif, idx) =>
      db.notification.create({
        data: {
          userId: user.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: idx < 3, // first 3 are read
          link: notif.link || null,
          createdAt: hoursAgo(idx * 5 + randomInt(0, 60)),
        },
      })
    )
  );

  console.log(`   ✓ ${notifications.length} notifications created\n`);

  // ==========================================================================
  // STEP 11: Create SalaryData
  // ==========================================================================
  console.log('💰 Creating salary data...');

  const salaryRecords = await Promise.all(
    SALARY_DATA_RAW.map((sal) =>
      db.salaryData.create({
        data: {
          role: sal.role,
          level: sal.level || null,
          location: sal.location || null,
          source: sal.source || null,
          salaryMin: sal.salaryMin,
          salaryMax: sal.salaryMax,
          salaryType: (sal as Record<string, unknown>).salaryType as string || 'yearly',
          currency: 'USD',
          sampleSize: sal.sampleSize || 1,
        },
      })
    )
  );

  console.log(`   ✓ ${salaryRecords.length} salary data points created\n`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Database seeding completed successfully!');
  console.log('═══════════════════════════════════════════════');
  console.log(`   User:            ${1}`);
  console.log(`   Job Sources:     ${jobSources.length}`);
  console.log(`   Companies:       ${companies.length}`);
  console.log(`   Jobs:            ${jobs.length}`);
  console.log(`   Resumes:         1`);
  console.log(`   Applications:    ${applications.length}`);
  console.log(`   Interviews:      ${interviews.length}`);
  console.log(`   Skills:          ${skills.length}`);
  console.log(`   Scraping Logs:   ${scrapingLogs.length}`);
  console.log(`   Notifications:   ${notifications.length}`);
  console.log(`   Salary Data:     ${salaryRecords.length}`);
  console.log('═══════════════════════════════════════════════');
}

// ============================================================================
// RUN
// ============================================================================

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });