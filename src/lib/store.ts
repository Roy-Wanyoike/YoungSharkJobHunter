import { create } from 'zustand';
import type { Job, Application, Resume, DashboardStats, ChatMessage, JobSourceType, ApplicationStatus, ExperienceLevel } from './types';

interface AppState {
  // Navigation
  activePanel: string;
  setActivePanel: (panel: string) => void;

  // Jobs
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
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
  applicationCounts: Record<string, number>;
  setApplicationCounts: (counts: Record<string, number>) => void;
  selectedApplication: Application | null;
  setSelectedApplication: (app: Application | null) => void;

  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats) => void;

  // AI Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  isChatLoading: boolean;
  setChatLoading: (loading: boolean) => void;

  // Scraping
  isScraping: boolean;
  setIsScraping: (scraping: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activePanel: 'dashboard',
  setActivePanel: (panel) => set({ activePanel: panel }),

  // Jobs
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  selectedJob: null,
  setSelectedJob: (job) => set({ selectedJob: job }),
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
  applicationCounts: {},
  setApplicationCounts: (counts) => set({ applicationCounts: counts }),
  selectedApplication: null,
  setSelectedApplication: (app) => set({ selectedApplication: app }),

  // Dashboard
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

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
}));