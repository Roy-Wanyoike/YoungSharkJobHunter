'use server';

/**
 * AI Chat Service for YoungSharkJobHunter
 *
 * Provides an LLM-powered conversational interface for career assistance.
 * Uses the z-ai-web-dev-sdk for LLM completions. Server-side only.
 */

import ZAI from 'z-ai-web-dev-sdk';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatHistoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  /** Current resume skills, if available */
  resumeSkills?: string[];
  /** Current job data being discussed */
  jobData?: {
    title: string;
    company: string;
    skills: string[];
    description?: string;
    salary?: string;
  };
  /** Application statistics */
  applicationStats?: {
    total: number;
    submitted: number;
    interviewing: number;
    offers: number;
    rejected: number;
  };
  /** Recent scraping results */
  scrapingInfo?: {
    totalJobsFound: number;
    sourcesScraped: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are YoungSharkJobHunter, an AI career agent. You help users find jobs, optimize resumes, track applications, and provide career advice. Be concise and actionable. Use markdown formatting.

You have access to the following capabilities that you can reference for the user:

- **Job Search**: Search across 14+ job sources including AI training platforms (Outlier, Scale AI, DataAnnotation, Alignerr), job boards (LinkedIn, RemoteOK), ATS platforms (Greenhouse, Lever), research labs (OpenAI, Anthropic, DeepMind), and big tech companies (Google, Microsoft, Amazon).
- **Resume Generation**: Generate ATS-optimized, tailored resumes for specific job applications. Analyze job descriptions and optimize resume content for maximum ATS scoring.
- **Skill Gap Analysis**: Compare a user's current skills against job requirements and identify gaps. Provide prioritized learning recommendations.
- **Application Tracking**: Track application statuses across all applied positions (draft, submitted, reviewing, interview, assessment, offer, rejected, ghosted).
- **Salary Insights**: Provide aggregated salary data by role, source type, and experience level. Help users understand market rates.
- **Interview Prep**: Help users prepare for upcoming interviews with role-specific questions, company research, and strategy advice.

When responding:
- Keep responses focused and actionable
- Use bullet points and markdown formatting for readability
- Reference specific data when available (match scores, salary ranges, skill counts)
- Suggest next steps when appropriate
- Be encouraging but realistic`;

// ─── LLM Instance ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null;

/**
 * Lazily create and cache the ZAI SDK instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getZAI(): Promise<any> {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
    } catch (error) {
      console.error('[Chat] Failed to initialize ZAI SDK:', error);
      throw new Error(
        'AI service is currently unavailable. Please try again later.'
      );
    }
  }
  return zaiInstance;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a context summary string from the optional context object.
 */
function buildContextSummary(context?: ChatContext): string {
  if (!context) return '';

  const parts: string[] = [];

  if (context.resumeSkills && context.resumeSkills.length > 0) {
    parts.push(
      `User's current skills: ${context.resumeSkills.join(', ')}`
    );
  }

  if (context.jobData) {
    parts.push(
      `Currently viewing: ${context.jobData.title} at ${context.jobData.company}`
    );
    if (context.jobData.skills.length > 0) {
      parts.push(
        `Job requires: ${context.jobData.skills.join(', ')}`
      );
    }
    if (context.jobData.salary) {
      parts.push(`Salary: ${context.jobData.salary}`);
    }
  }

  if (context.applicationStats) {
    const s = context.applicationStats;
    parts.push(
      `Application stats: ${s.total} total, ${s.submitted} submitted, ${s.interviewing} interviewing, ${s.offers} offers, ${s.rejected} rejected`
    );
  }

  if (context.scrapingInfo) {
    parts.push(
      `Last scrape: ${context.scrapingInfo.totalJobsFound} jobs found across ${context.scrapingInfo.sourcesScraped} sources`
    );
  }

  return parts.length > 0 ? `\n\nCurrent context:\n${parts.join('\n')}` : '';
}

/**
 * Validate that history entries have the expected shape.
 */
function sanitizeHistory(
  history: Array<{ role: string; content: string }>
): ChatHistoryEntry[] {
  return history
    .filter(
      (msg): msg is ChatHistoryEntry =>
        typeof msg.role === 'string' &&
        typeof msg.content === 'string' &&
        ['user', 'assistant', 'system'].includes(msg.role)
    )
    .slice(-20); // Keep last 20 messages for context window management
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Send a chat message to the LLM with conversation history and optional context.
 *
 * @param message - The user's current message.
 * @param history - Previous conversation turns (role + content).
 * @param context - Optional domain context (resume, job data, stats, etc.)
 * @returns The assistant's text response.
 */
export async function chat(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  context?: ChatContext
): Promise<string> {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return 'Please provide a message to get a response.';
  }

  try {
    const zai = await getZAI();

    // Build the context-aware system prompt
    const contextBlock = buildContextSummary(context);
    const systemMessage: ChatHistoryEntry = {
      role: 'system',
      content: contextBlock ? `${SYSTEM_PROMPT}${contextBlock}` : SYSTEM_PROMPT,
    };

    // Prepare messages array
    const sanitizedHistory = sanitizeHistory(history);
    const messages: ChatHistoryEntry[] = [
      systemMessage,
      ...sanitizedHistory,
      { role: 'user' as const, content: message.trim() },
    ];

    const response = await zai.chat.completions.create({
      messages,
    });

    // Extract the assistant's reply
    if (response?.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }

    // Handle alternative response shapes
    if (typeof response === 'string') {
      return response;
    }

    if (response?.content) {
      return String(response.content);
    }

    console.warn('[Chat] Unexpected response shape:', JSON.stringify(response).slice(0, 200));
    return "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('[Chat] Error generating response:', error);

    // Reset the instance on error so it gets recreated on next call
    zaiInstance = null;

    if (error instanceof Error && error.message.includes('unavailable')) {
      return error.message;
    }

    return "I'm experiencing technical difficulties. Please try again in a moment. If the issue persists, check the system status.";
  }
}

/**
 * Quick helper: generate a resume summary from raw resume text.
 * Calls the ZAI SDK directly with a specialized system prompt,
 * bypassing the empty-message guard in the `chat` function.
 */
export async function summarizeResume(resumeText: string): Promise<string> {
  if (!resumeText || resumeText.trim().length === 0) {
    return 'Please provide resume text to summarize.';
  }

  try {
    const zai = await getZAI();

    const messages: ChatHistoryEntry[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nThe user is providing their resume text. Extract and summarize: 1) A professional summary, 2) All technical skills mentioned, 3) Years of experience, 4) Key achievements. Format as a structured markdown list.`,
      },
      {
        role: 'user',
        content: `Here is my resume:\n\n${resumeText}`,
      },
    ];

    const response = await zai.chat.completions.create({
      messages,
    });

    if (response?.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }

    if (typeof response === 'string') {
      return response;
    }

    if (response?.content) {
      return String(response.content);
    }

    console.warn('[Chat/summarizeResume] Unexpected response shape:', JSON.stringify(response).slice(0, 200));
    return 'Unable to generate resume summary. Please try again.';
  } catch (error) {
    console.error('[Chat/summarizeResume] Error:', error);
    zaiInstance = null;
    return 'Failed to summarize resume. Please try again later.';
  }
}