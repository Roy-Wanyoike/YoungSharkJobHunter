/**
 * Connector Interface Types for YoungSharkJobHunter
 *
 * Defines the contract that all job source connectors must implement.
 * These types ensure a uniform interface regardless of the underlying
 * source type (AI training platform, ATS, job board, etc.).
 */

// ─── Normalized Job ─────────────────────────────────────────────────────────

/**
 * A job listing normalized from any source into a common shape.
 * All connectors must produce this format.
 */
export interface NormalizedJob {
  /** Job title (e.g. "AI Trainer", "Software Engineer") */
  title: string;
  /** Company name */
  company: string;
  /** Physical location, if applicable */
  location?: string;
  /** Whether the position is fully remote */
  remote: boolean;
  /** Minimum salary (in USD) */
  salaryMin?: number;
  /** Maximum salary (in USD) */
  salaryMax?: number;
  /** Salary period: "hourly", "monthly", or "yearly" */
  salaryType?: string;
  /** Full job description */
  description: string;
  /** Formatted requirements section */
  requirements?: string;
  /** List of required/preferred skills */
  skills: string[];
  /** Experience level: "entry", "mid", "senior", "lead", "executive" */
  experienceLevel?: string;
  /** Employment type: "full_time", "part_time", "contract", "freelance" */
  jobType?: string;
  /** URL to the original listing */
  sourceUrl: string;
}

// ─── Connector Health ───────────────────────────────────────────────────────

/**
 * Health check result for a connector.
 */
export interface ConnectorHealth {
  /** Current health status */
  status: 'healthy' | 'degraded' | 'down';
  /** ISO timestamp of the last health check */
  lastCheck: string;
  /** Average response time in milliseconds */
  avgResponseMs: number;
  /** Error rate as a decimal (0.0 – 1.0) */
  errorRate: number;
}

// ─── Job Source Connector ───────────────────────────────────────────────────

/**
 * The contract that every job source connector must implement.
 */
export interface JobSourceConnector {
  /** Unique identifier for this connector (e.g. "outlier", "greenhouse") */
  sourceId: string;
  /** Human-readable name (e.g. "Outlier", "Greenhouse") */
  sourceName: string;
  /** Category of the source (e.g. "ai_training", "ats", "big_tech") */
  sourceType: string;

  /**
   * Discover jobs from this source.
   * Returns an array of normalized job listings.
   */
  discover(): Promise<NormalizedJob[]>;

  /**
   * Perform a health check on this connector.
   * Returns current status and performance metrics.
   */
  getHealth(): ConnectorHealth;
}