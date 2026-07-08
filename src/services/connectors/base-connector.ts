/**
 * Base Connector for YoungSharkJobHunter
 *
 * Provides a concrete implementation of `JobSourceConnector` that
 * generates realistic mock job listings. Each source type produces
 * domain-appropriate job titles, descriptions, and skill sets.
 *
 * This is intended as the foundation for all connectors until
 * real scraping logic is implemented per platform.
 */

import type {
  JobSourceConnector,
  NormalizedJob,
  ConnectorHealth,
} from './types';

// ─── Source-Type Catalogues ─────────────────────────────────────────────────

interface JobTemplate {
  titles: string[];
  descriptionPrefix: string;
  skills: string[];
  salaryRange: { min: number; max: number; type: string };
  remote: boolean;
  experienceLevel: string;
  jobType: string;
}

const SOURCE_TEMPLATES: Record<string, JobTemplate> = {
  ai_training: {
    titles: [
      'AI Trainer',
      'RLHF Annotator',
      'AI Data Specialist',
      'Prompt Engineer',
      'AI Evaluation Specialist',
      'Machine Learning Data Annotator',
      'AI Content Reviewer',
      'AI Safety Evaluator',
    ],
    descriptionPrefix:
      'Join our AI training team to help improve large language models through high-quality human feedback and data annotation.',
    skills: [
      'Python',
      'NLP',
      'Critical Thinking',
      'Writing',
      'Attention to Detail',
      'Data Annotation',
      'Machine Learning',
      'Research',
    ],
    salaryRange: { min: 20, max: 60, type: 'hourly' },
    remote: true,
    experienceLevel: 'mid',
    jobType: 'contract',
  },

  research_lab: {
    titles: [
      'Research Scientist',
      'ML Engineer',
      'Research Engineer',
      'AI Research Intern',
      'Applied Scientist',
      'Deep Learning Researcher',
    ],
    descriptionPrefix:
      'Conduct cutting-edge research in machine learning and artificial intelligence, contributing to publications and novel model architectures.',
    skills: [
      'PyTorch',
      'TensorFlow',
      'Machine Learning',
      'Deep Learning',
      'Python',
      'Research',
      'Statistics',
      'Paper Writing',
      'CUDA',
      'Transformers',
    ],
    salaryRange: { min: 120000, max: 350000, type: 'yearly' },
    remote: false,
    experienceLevel: 'senior',
    jobType: 'full_time',
  },

  big_tech: {
    titles: [
      'Software Engineer',
      'ML Researcher',
      'Senior Software Engineer',
      'AI/ML Platform Engineer',
      'Staff Software Engineer',
      'Applied ML Engineer',
      'Data Scientist',
      'Engineering Manager',
    ],
    descriptionPrefix:
      'Work on large-scale distributed systems and machine learning infrastructure serving millions of users worldwide.',
    skills: [
      'Python',
      'Java',
      'Go',
      'Distributed Systems',
      'Machine Learning',
      'System Design',
      'SQL',
      'Kubernetes',
      'AWS',
      'TypeScript',
    ],
    salaryRange: { min: 150000, max: 450000, type: 'yearly' },
    remote: true,
    experienceLevel: 'senior',
    jobType: 'full_time',
  },

  ats: {
    titles: [
      'Software Engineer',
      'Senior Developer',
      'Full Stack Engineer',
      'Backend Engineer',
      'Frontend Engineer',
      'DevOps Engineer',
      'Product Manager',
      'Data Engineer',
    ],
    descriptionPrefix:
      'Join a fast-growing team building innovative products in a collaborative, impact-driven environment.',
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'Python',
      'SQL',
      'Git',
      'Agile',
      'REST APIs',
      'Docker',
    ],
    salaryRange: { min: 90000, max: 250000, type: 'yearly' },
    remote: true,
    experienceLevel: 'mid',
    jobType: 'full_time',
  },

  job_board: {
    titles: [
      'Software Developer',
      'Junior Developer',
      'Web Developer',
      'Backend Developer',
      'Mobile Developer',
      'QA Engineer',
      'Technical Writer',
      'IT Support Specialist',
    ],
    descriptionPrefix:
      'We are looking for talented individuals to join our team and contribute to exciting projects.',
    skills: [
      'JavaScript',
      'HTML',
      'CSS',
      'Python',
      'SQL',
      'Git',
      'Problem Solving',
      'Communication',
    ],
    salaryRange: { min: 60000, max: 180000, type: 'yearly' },
    remote: false,
    experienceLevel: 'entry',
    jobType: 'full_time',
  },

  remote: {
    titles: [
      'Remote Software Engineer',
      'Remote Full Stack Developer',
      'Remote Data Analyst',
      'Remote Product Designer',
      'Remote DevOps Engineer',
      'Remote Customer Success Manager',
    ],
    descriptionPrefix:
      'Work from anywhere in the world with a distributed team that values autonomy, communication, and results.',
    skills: [
      'Remote Collaboration',
      'Self-Motivation',
      'JavaScript',
      'Python',
      'Communication',
      'Time Management',
      'Async Communication',
    ],
    salaryRange: { min: 70000, max: 200000, type: 'yearly' },
    remote: true,
    experienceLevel: 'mid',
    jobType: 'full_time',
  },

  startup: {
    titles: [
      'Founding Engineer',
      'Full Stack Engineer',
      'Product Engineer',
      'Growth Engineer',
      'ML Engineer',
      'iOS Developer',
      'Android Developer',
      'Head of Engineering',
    ],
    descriptionPrefix:
      'Join an early-stage startup and ship code that directly impacts millions of users. Equity included.',
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'Node.js',
      'PostgreSQL',
      'AWS',
      'Startup Mindset',
      'Ownership',
      'Shipping Fast',
    ],
    salaryRange: { min: 80000, max: 220000, type: 'yearly' },
    remote: true,
    experienceLevel: 'mid',
    jobType: 'full_time',
  },

  freelance: {
    titles: [
      'Freelance Web Developer',
      'Freelance Mobile Developer',
      'Freelance Data Scientist',
      'Freelance UI/UX Designer',
      'Freelance Technical Writer',
      'Freelance DevOps Consultant',
    ],
    descriptionPrefix:
      'Take on exciting projects with flexible hours. Work with clients across industries on a project basis.',
    skills: [
      'Client Management',
      'Project Management',
      'JavaScript',
      'Python',
      'Communication',
      'Self-Discipline',
      'Invoicing',
    ],
    salaryRange: { min: 50, max: 200, type: 'hourly' },
    remote: true,
    experienceLevel: 'mid',
    jobType: 'freelance',
  },

  government: {
    titles: [
      'IT Specialist',
      'Software Developer',
      'Data Analyst',
      'Cybersecurity Analyst',
      'Systems Administrator',
      'Program Manager',
    ],
    descriptionPrefix:
      'Serve the public through technology. Enjoy excellent benefits, job security, and work-life balance.',
    skills: [
      'Security Clearance',
      'Compliance',
      'SQL',
      'Java',
      'Project Management',
      'Documentation',
      'Agile',
    ],
    salaryRange: { min: 60000, max: 160000, type: 'yearly' },
    remote: false,
    experienceLevel: 'mid',
    jobType: 'full_time',
  },

  university: {
    titles: [
      'Research Assistant',
      'Postdoctoral Researcher',
      'Lecturer in Computer Science',
      'PhD Candidate',
      'Lab Manager',
      'Graduate Teaching Assistant',
    ],
    descriptionPrefix:
      'Pursue academic excellence in a world-class research environment with access to cutting-edge compute resources.',
    skills: [
      'Research',
      'Python',
      'Machine Learning',
      'Academic Writing',
      'Teaching',
      'Statistical Analysis',
      'LaTeX',
      'Publication',
    ],
    salaryRange: { min: 35000, max: 95000, type: 'yearly' },
    remote: false,
    experienceLevel: 'entry',
    jobType: 'full_time',
  },
};

// ─── Descriptions per Source Type ────────────────────────────────────────────

const SOURCE_DESCRIPTIONS: Record<string, string[]> = {
  ai_training: [
    'You will evaluate and improve AI model outputs by providing detailed, accurate feedback on responses across domains including coding, reasoning, and creative writing.',
    'Help train next-generation AI systems by creating high-quality prompts, reviewing model outputs, and annotating data across specialized domains.',
    'Work on the frontier of AI safety by identifying biases, hallucinations, and alignment issues in large language model outputs.',
    'Provide expert-level feedback on AI-generated code, mathematical proofs, and technical content to improve model performance.',
  ],
  research_lab: [
    'Design and implement novel architectures for language modeling, with a focus on efficiency and scalability. Publish at top-tier venues (NeurIPS, ICML, ICLR).',
    'Develop new training techniques for foundation models, including curriculum learning, reinforcement learning from human feedback, and constitutional AI approaches.',
    'Investigate interpretability and alignment of large-scale neural networks. Contribute to open-source research tools and publications.',
    'Build scalable ML infrastructure for training large models on distributed GPU clusters. Optimize training pipelines for speed and cost efficiency.',
  ],
  big_tech: [
    'Design and build highly available services processing millions of requests per second. Collaborate with cross-functional teams across multiple time zones.',
    'Develop machine learning models deployed at massive scale, directly impacting billions of users. Work with petabyte-scale datasets.',
    'Lead technical design and implementation of critical platform features. Mentor junior engineers and drive engineering excellence.',
    'Build and optimize ML inference pipelines serving real-time predictions with strict latency requirements.',
  ],
  ats: [
    'Build scalable web applications using modern frameworks. Participate in code reviews, sprint planning, and continuous improvement initiatives.',
    'Design and implement RESTful APIs and microservices. Work closely with product and design teams in an agile environment.',
    'Develop automated testing strategies and CI/CD pipelines. Ensure high code quality and system reliability.',
    'Create intuitive user interfaces with a focus on performance and accessibility. Collaborate with UX designers and product managers.',
  ],
  job_board: [
    'Develop and maintain web applications using modern technologies. Work in a collaborative team environment with opportunities for growth.',
    'Build responsive front-end interfaces and integrate with back-end services. Participate in all phases of the software development lifecycle.',
    'Design and optimize database schemas and queries. Ensure data integrity and application performance.',
    'Implement new features and maintain existing codebases. Write clean, well-documented code following best practices.',
  ],
  remote: [
    'Join our fully distributed team and work on challenging problems with talented engineers from around the world. Async-first culture.',
    'Build products used by thousands of businesses globally. Enjoy flexible hours, unlimited PTO, and home office stipend.',
    'Lead development of key platform features while mentoring team members across multiple time zones. Quarterly in-person retreats.',
    'Architect and implement cloud-native solutions. Strong emphasis on observability, reliability, and developer experience.',
  ],
  startup: [
    'Be among the first 10 engineers and shape the product from day one. You will own entire features end-to-end.',
    'Build MVP features, iterate based on user feedback, and scale the platform as we grow. Competitive equity package.',
    'Wear multiple hats — frontend, backend, DevOps, and everything in between. Perfect for generalists who love variety.',
    'Join our Series A startup and help us build the future of [domain]. Significant upside potential with stock options.',
  ],
  freelance: [
    'Take on a 3-month project building a customer-facing dashboard. 20-30 hours per week, fully remote.',
    'Help a fast-growing startup scale their data pipeline. Part-time engagement with potential for full-time conversion.',
    'Design and implement a mobile app MVP for a health-tech startup. Weekly check-ins with the founding team.',
    'Provide technical consulting on cloud migration strategy. Short-term engagement with clear deliverables.',
  ],
  government: [
    'Develop and maintain mission-critical systems that serve millions of citizens. Comprehensive benefits package including pension.',
    'Lead cybersecurity initiatives to protect sensitive government data. Active security clearance required.',
    'Manage large-scale IT projects with strict compliance requirements. Federal employee benefits and job security.',
    'Build data analytics platforms to support evidence-based policy decisions. Work-life balance emphasized.',
  ],
  university: [
    'Assist in cutting-edge research on natural language processing. Co-author papers and present at international conferences.',
    'Teach undergraduate courses in computer science while pursuing your own research agenda. Tuition benefits included.',
    'Conduct postdoctoral research in machine learning with access to GPU clusters and collaborative research groups.',
    'Manage daily lab operations, mentor graduate students, and contribute to ongoing research projects in AI.',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ─── Base Connector ─────────────────────────────────────────────────────────

export class BaseConnector implements JobSourceConnector {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: string;

  private _healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  private _lastCheck: string;
  private _avgResponseMs: number;

  constructor(
    sourceId: string,
    sourceName: string,
    sourceType: string,
    initialHealth?: {
      status?: 'healthy' | 'degraded' | 'down';
      avgResponseMs?: number;
    }
  ) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
    this.sourceType = sourceType;
    this._lastCheck = new Date().toISOString();
    this._avgResponseMs = initialHealth?.avgResponseMs ?? Math.floor(Math.random() * 300) + 50;

    // Simulate occasional degraded/down states (10% degraded, 3% down)
    const roll = Math.random();
    if (initialHealth?.status) {
      this._healthStatus = initialHealth.status;
    } else if (roll < 0.03) {
      this._healthStatus = 'down';
    } else if (roll < 0.13) {
      this._healthStatus = 'degraded';
    }
  }

  /**
   * Generate 3–8 realistic mock jobs based on source type.
   */
  async discover(): Promise<NormalizedJob[]> {
    const template = SOURCE_TEMPLATES[this.sourceType] ?? SOURCE_TEMPLATES.job_board;
    const descriptions = SOURCE_DESCRIPTIONS[this.sourceType] ?? SOURCE_DESCRIPTIONS.job_board;

    const count = Math.floor(Math.random() * 6) + 3; // 3–8 jobs
    const jobs: NormalizedJob[] = [];

    const usedTitles = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Pick a unique title if possible
      let title = pickOne(template.titles);
      let attempts = 0;
      while (usedTitles.has(title) && attempts < template.titles.length) {
        title = pickOne(template.titles);
        attempts++;
      }
      usedTitles.add(title);

      // Pick a random subset of skills
      const skillCount = Math.floor(Math.random() * 3) + 3; // 3–5 skills
      const skills = pickRandom(template.skills, skillCount);

      // Salary variation
      const salaryVariance = 0.8 + Math.random() * 0.4; // 0.8x–1.2x
      const salaryMin = Math.round(template.salaryRange.min * salaryVariance);
      const salaryMax = Math.round(template.salaryRange.max * salaryVariance);

      // Random description
      const description = pickOne(descriptions);

      jobs.push({
        title,
        company: this.sourceName,
        location: template.remote ? undefined : this._generateLocation(),
        remote: template.remote || Math.random() > 0.6,
        salaryMin,
        salaryMax,
        salaryType: template.salaryRange.type,
        description: `${template.descriptionPrefix}\n\n${description}`,
        requirements: `Required: ${skills.slice(0, 3).join(', ')}. Preferred: ${skills.slice(3).join(', ') || 'N/A'}.`,
        skills,
        experienceLevel:
          Math.random() > 0.7
            ? 'senior'
            : Math.random() > 0.5
              ? 'mid'
              : 'entry',
        jobType: template.jobType,
        sourceUrl: `https://${this.sourceId.toLowerCase().replace(/\s+/g, '')}.com/jobs/${Date.now()}-${i}`,
      });
    }

    return jobs;
  }

  /**
   * Return simulated health data.
   */
  getHealth(): ConnectorHealth {
    this._lastCheck = new Date().toISOString();
    const errorRate = this._healthStatus === 'healthy' ? Math.random() * 0.05
      : this._healthStatus === 'degraded' ? 0.1 + Math.random() * 0.3
      : 0.8 + Math.random() * 0.2;

    return {
      status: this._healthStatus,
      lastCheck: this._lastCheck,
      avgResponseMs: this._avgResponseMs + Math.floor(Math.random() * 50 - 25),
      errorRate: Math.round(errorRate * 1000) / 1000,
    };
  }

  /**
   * Generate a plausible US-based location.
   */
  private _generateLocation(): string {
    const cities = [
      'San Francisco, CA',
      'New York, NY',
      'Seattle, WA',
      'Austin, TX',
      'Boston, MA',
      'Chicago, IL',
      'Denver, CO',
      'Portland, OR',
      'Atlanta, GA',
      'Miami, FL',
      'Los Angeles, CA',
      'Washington, DC',
      'Pittsburgh, PA',
      'San Diego, CA',
      'Minneapolis, MN',
    ];
    return pickOne(cities);
  }
}