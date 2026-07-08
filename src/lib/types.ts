export type JobSourceType = 'ai_training' | 'ats' | 'job_board' | 'remote' | 'startup' | 'research_lab' | 'big_tech' | 'freelance' | 'government' | 'university';

export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'interview' | 'assessment' | 'offer' | 'rejected' | 'ghosted';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance';

export type SalaryType = 'hourly' | 'monthly' | 'yearly';

export interface JobSource {
  id: string;
  name: string;
  type: JobSourceType;
  website: string;
  logoUrl?: string;
  isActive: boolean;
  lastScraped?: string;
  jobsCount: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyId?: string;
  source: string;
  sourceId?: string;
  sourceType: JobSourceType;
  sourceUrl: string;
  location?: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryType?: SalaryType;
  description: string;
  requirements?: string;
  skills: string[];
  experienceLevel?: ExperienceLevel;
  jobType?: JobType;
  postedAt?: string;
  expiresAt?: string;
  matchScore?: number;
  isActive: boolean;
  isApplied: boolean;
  createdAt: string;
}

export interface Resume {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'docx';
  isPrimary: boolean;
  parsedData: ParsedResume;
  skills: string[];
  createdAt: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  languages: string[];
  skills: string[];
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
}

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  resumeId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  notes?: string;
  appliedAt?: string;
  lastFollowUp?: string;
  nextFollowUp?: string;
  salaryOffered?: number;
  recruiterName?: string;
  recruiterEmail?: string;
  feedback?: string;
  atsScore?: number;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  round: number;
  type?: string;
  date?: string;
  duration?: number;
  interviewer?: string;
  status: string;
  notes?: string;
  feedback?: string;
}

export interface DashboardStats {
  totalJobsFound: number;
  jobsToday: number;
  totalApplications: number;
  applicationsToday: number;
  interviews: number;
  offers: number;
  rejected: number;
  ghosted: number;
  avgMatchScore: number;
  responseRate: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ScrapingSession {
  id: string;
  source: string;
  status: 'running' | 'completed' | 'failed';
  jobsFound: number;
  jobsNew: number;
  startedAt: string;
  completedAt?: string;
}