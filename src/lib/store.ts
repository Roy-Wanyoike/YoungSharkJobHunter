import { create } from 'zustand';
import type { Job, Application, Resume, DashboardStats, ChatMessage, JobSourceType, ApplicationStatus, ExperienceLevel } from './types';

interface AppState {
  // Navigation
  activePanel: string;
  setActivePanel: (panel: string) => void;

  // Jobs
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  filteredJobs: Job[];
  setFilteredJobs: (jobs: Job[]) => void;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  jobFilters: JobFilters;
  setJobFilters: (filters: Partial<JobFilters>) => void;
  jobSearchQuery: string;
  setJobSearchQuery: (query: string) => void;

  // Resumes
  resumes: Resume[];
  setResumes: (resumes: Resume[]) => void;
  selectedResume: Resume | null;
  setSelectedResume: (resume: Resume | null) => void;

  // Applications
  applications: Application[];
  setApplications: (apps: Application[]) => void;
  selectedApplication: Application | null;
  setSelectedApplication: (app: Application | null) => void;

  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats) => void;
  dailyApplicationData: { date: string; count: number }[];
  setDailyApplicationData: (data: { date: string; count: number }[]) => void;

  // AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  isChatLoading: boolean;
  setChatLoading: (loading: boolean) => void;

  // Scraping
  isScraping: boolean;
  setIsScraping: (scraping: boolean) => void;
  scrapingProgress: ScrapingProgress[];
  setScrapingProgress: (progress: ScrapingProgress[]) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export interface JobFilters {
  sourceTypes: JobSourceType[];
  experienceLevels: ExperienceLevel[];
  remoteOnly: boolean;
  minSalary: number;
  maxSalary: number;
  matchScoreMin: number;
  status: ApplicationStatus | 'all';
}

export interface ScrapingProgress {
  source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  jobsFound: number;
  progress: number;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activePanel: 'dashboard',
  setActivePanel: (panel) => set({ activePanel: panel }),

  // Jobs
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  filteredJobs: [],
  setFilteredJobs: (jobs) => set({ filteredJobs: jobs }),
  selectedJob: null,
  setSelectedJob: (job) => set({ selectedJob: job }),
  jobFilters: {
    sourceTypes: [],
    experienceLevels: [],
    remoteOnly: false,
    minSalary: 0,
    maxSalary: 0,
    matchScoreMin: 0,
    status: 'all',
  },
  setJobFilters: (filters) =>
    set((state) => ({ jobFilters: { ...state.jobFilters, ...filters } })),
  jobSearchQuery: '',
  setJobSearchQuery: (query) => set({ jobSearchQuery: query }),

  // Resumes
  resumes: [],
  setResumes: (resumes) => set({ resumes }),
  selectedResume: null,
  setSelectedResume: (resume) => set({ selectedResume: resume }),

  // Applications
  applications: [],
  setApplications: (apps) => set({ applications: apps }),
  selectedApplication: null,
  setSelectedApplication: (app) => set({ selectedApplication: app }),

  // Dashboard
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  dailyApplicationData: [],
  setDailyApplicationData: (data) => set({ dailyApplicationData: data }),

  // AI Chat
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),
  isChatLoading: false,
  setChatLoading: (loading) => set({ isChatLoading: loading }),

  // Scraping
  isScraping: false,
  setIsScraping: (scraping) => set({ isScraping: scraping }),
  scrapingProgress: [],
  setScrapingProgress: (progress) => set({ scrapingProgress: progress }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));