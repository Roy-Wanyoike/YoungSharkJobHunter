'use server';

/**
 * Discovery Service for YoungSharkJobHunter
 *
 * Orchestrates job discovery across registered connectors.
 * Reads source metadata from the database, triggers scraping
 * via connectors, persists scraping logs, and emits domain events.
 */

import { db } from '@/lib/db';
import { eventBus, DomainEvents } from './events';
import { connectorRegistry } from './connectors/registry';
import type { NormalizedJob } from './connectors/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConnectorSourceView {
  id: string;
  name: string;
  type: string;
  status: string;
  lastScraped: string | null;
  jobsCount: number;
}

export interface ScrapingResult {
  source: string;
  status: string;
  jobsFound: number;
  jobsNew: number;
  duration: number;
}

export interface ScrapingHealth {
  healthy: number;
  degraded: number;
  down: number;
  lastScraped: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize a DB JobSource record into the public view shape.
 */
function toSourceView(source: {
  id: string;
  name: string;
  type: string;
  healthStatus: string;
  lastScraped: Date | null;
  jobsCount: number;
}): ConnectorSourceView {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.healthStatus,
    lastScraped: source.lastScraped?.toISOString() ?? null,
    jobsCount: source.jobsCount,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch all registered connector sources from the database.
 * Falls back to the in-memory connector registry when the DB
 * has no sources seeded yet.
 */
export async function getConnectorSources(): Promise<ConnectorSourceView[]> {
  try {
    const sources = await db.jobSource.findMany({
      orderBy: { name: 'asc' },
    });

    // If DB has sources, return them
    if (sources.length > 0) {
      return sources.map(toSourceView);
    }

    // Fallback: seed from the connector registry
    const connectors = connectorRegistry.getAll();
    if (connectors.length === 0) return [];

    const seedData = connectors.map((c) => ({
      id: c.sourceId,
      name: c.sourceName,
      type: c.sourceType,
      website: '',
      isActive: true,
      healthStatus: c.getHealth().status,
      avgResponseMs: c.getHealth().avgResponseMs,
      errorRate: c.getHealth().errorRate,
    }));

    for (const item of seedData) {
      await db.jobSource.create({ data: item }).catch((e) => {
        console.error('[discovery] source seed failed:', e instanceof Error ? e.message : String(e));
      });
    }

    const fresh = await db.jobSource.findMany({ orderBy: { name: 'asc' } });
    return fresh.map(toSourceView);
  } catch (error) {
    console.error('[Discovery] Failed to fetch connector sources:', error);
    // Ultimate fallback: return data from the in-memory registry
    return connectorRegistry.getAll().map((c) => {
      const health = c.getHealth();
      return {
        id: c.sourceId,
        name: c.sourceName,
        type: c.sourceType,
        status: health.status,
        lastScraped: null,
        jobsCount: 0,
      };
    });
  }
}

/**
 * Trigger scraping for the given source IDs (or all active sources).
 *
 * Each source is scraped sequentially with a simulated delay.
 * Scraping logs are persisted and domain events are emitted.
 */
export async function triggerScraping(
  sourceIds?: string[]
): Promise<ScrapingResult[]> {
  const results: ScrapingResult[] = [];

  // Determine which connectors to scrape
  let connectors = connectorRegistry.getAll();
  if (sourceIds && sourceIds.length > 0) {
    connectors = connectors.filter((c) => sourceIds.includes(c.sourceId));
  }

  for (const connector of connectors) {
    const startTime = Date.now();
    let jobsFound = 0;
    let jobsNew = 0;
    let status = 'completed';

    try {
      // Simulate network latency (100–500ms)
      const delay = Math.floor(Math.random() * 400) + 100;
      await sleep(delay);

      const discovered: NormalizedJob[] = await connector.discover();
      jobsFound = discovered.length;

      // Simulate new vs existing (randomly mark 30–70% as new)
      const newRatio = Math.random() * 0.4 + 0.3;
      jobsNew = Math.round(jobsFound * newRatio);

      // Persist discovered jobs to DB in batches
      if (discovered.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < discovered.length; i += BATCH_SIZE) {
          const batch = discovered.slice(i, i + BATCH_SIZE);
          const batchData = batch.map((job) => ({
            title: job.title,
            company: job.company,
            source: connector.sourceName,
            sourceId: connector.sourceId,
            sourceType: connector.sourceType,
            sourceUrl: job.sourceUrl,
            location: job.location ?? null,
            remote: job.remote,
            salaryMin: job.salaryMin ?? null,
            salaryMax: job.salaryMax ?? null,
            salaryType: job.salaryType ?? null,
            description: job.description,
            requirements: job.requirements ?? null,
            skills: JSON.stringify(job.skills),
            experienceLevel: job.experienceLevel ?? null,
            jobType: job.jobType ?? null,
          }));

          try {
            await db.job.createMany({ data: batchData });
          } catch (e) {
            // Fallback: insert one-by-one for SQLite constraint errors
            for (const data of batchData) {
              await db.job.create({ data }).catch((err) => {
                console.error('[discovery] job insert failed:', err instanceof Error ? err.message : String(err));
              });
            }
          }
        }

        // Emit discovery event for each job
        for (const job of discovered) {
          eventBus.emit(DomainEvents.JOB_DISCOVERED, {
            title: job.title,
            company: job.company,
            source: connector.sourceName,
            sourceType: connector.sourceType,
            skills: job.skills,
          });
        }
      }

      // Update source metadata
      await db.jobSource.update({
        where: { id: connector.sourceId },
        data: {
          lastScraped: new Date(),
          jobsCount: { increment: jobsNew },
          healthStatus: 'healthy',
          avgResponseMs: delay,
        },
      });
    } catch (error) {
      status = 'failed';
      console.error(
        `[Discovery] Scraping failed for ${connector.sourceName}:`,
        error
      );

      // Mark source as degraded on failure
      try {
        await db.jobSource.update({
          where: { id: connector.sourceId },
          data: { healthStatus: 'degraded' },
        });
      } catch {
        // Ignore update errors
      }
    }

    const duration = Date.now() - startTime;

    results.push({
      source: connector.sourceName,
      status,
      jobsFound,
      jobsNew,
      duration,
    });

    // Persist scraping log
    try {
      await db.scrapingLog.create({
        data: {
          sourceId: connector.sourceId,
          source: connector.sourceName,
          status,
          jobsFound,
          jobsNew,
          duration,
        },
      });
    } catch {
      // Log persistence is best-effort
    }

    // Emit scraping completed event
    eventBus.emit(DomainEvents.SCRAPING_COMPLETED, {
      source: connector.sourceName,
      sourceId: connector.sourceId,
      status,
      jobsFound,
      jobsNew,
      duration,
    });
  }

  return results;
}

/**
 * Get the aggregated health status of all scraping sources.
 */
export async function getScrapingHealth(): Promise<ScrapingHealth> {
  try {
    const sources = await db.jobSource.findMany({
      select: {
        healthStatus: true,
        lastScraped: true,
      },
    });

    if (sources.length === 0) {
      // Fallback to connector registry
      const connectors = connectorRegistry.getAll();
      const healthCounts = { healthy: 0, degraded: 0, down: 0 };
      for (const c of connectors) {
        const h = c.getHealth().status;
        healthCounts[h as keyof typeof healthCounts]++;
      }
      return { ...healthCounts, lastScraped: null };
    }

    let healthy = 0;
    let degraded = 0;
    let down = 0;
    let latestScraped: Date | null = null;

    for (const source of sources) {
      switch (source.healthStatus) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'down':
          down++;
          break;
        default:
          degraded++;
      }

      if (
        source.lastScraped &&
        (!latestScraped || source.lastScraped > latestScraped)
      ) {
        latestScraped = source.lastScraped;
      }
    }

    return {
      healthy,
      degraded,
      down,
      lastScraped: latestScraped?.toISOString() ?? null,
    };
  } catch (error) {
    console.error('[Discovery] Failed to fetch scraping health:', error);
    return {
      healthy: 0,
      degraded: 0,
      down: 0,
      lastScraped: null,
    };
  }
}