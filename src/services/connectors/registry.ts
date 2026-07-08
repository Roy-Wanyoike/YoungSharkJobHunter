/**
 * Connector Registry for YoungSharkJobHunter
 *
 * Central registry for all job source connectors.
 * Provides lookup by ID, filtering by health, and bulk access.
 * Pre-initializes with all supported connectors.
 */

import type { JobSourceConnector } from './types';
import { BaseConnector } from './base-connector';

// ─── Registry ───────────────────────────────────────────────────────────────

class ConnectorRegistry {
  private connectors: Map<string, JobSourceConnector> = new Map();

  /**
   * Register a connector. Overwrites any existing connector with the same ID.
   */
  register(connector: JobSourceConnector): void {
    this.connectors.set(connector.sourceId, connector);
  }

  /**
   * Retrieve a connector by its source ID.
   */
  get(sourceId: string): JobSourceConnector | undefined {
    return this.connectors.get(sourceId);
  }

  /**
   * Get all registered connectors.
   */
  getAll(): JobSourceConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get only connectors that are currently healthy.
   */
  getHealthy(): JobSourceConnector[] {
    return this.getAll().filter((c) => c.getHealth().status === 'healthy');
  }

  /**
   * Get the total count of registered connectors.
   */
  get size(): number {
    return this.connectors.size;
  }

  /**
   * Check if a connector with the given ID is registered.
   */
  has(sourceId: string): boolean {
    return this.connectors.has(sourceId);
  }

  /**
   * Remove a connector by ID.
   */
  remove(sourceId: string): boolean {
    return this.connectors.delete(sourceId);
  }

  /**
   * Remove all connectors.
   */
  clear(): void {
    this.connectors.clear();
  }
}

// ─── Singleton + Auto-Registration ──────────────────────────────────────────

export const connectorRegistry = new ConnectorRegistry();

// Register all supported connectors
const REGISTRATIONS: Array<{
  id: string;
  name: string;
  type: string;
}> = [
  // AI Training platforms
  { id: 'outlier', name: 'Outlier', type: 'ai_training' },
  { id: 'scaleai', name: 'Scale AI', type: 'ai_training' },
  { id: 'dataannotation', name: 'DataAnnotation', type: 'ai_training' },
  { id: 'alignerr', name: 'Alignerr', type: 'ai_training' },

  // ATS / Hiring platforms
  { id: 'greenhouse', name: 'Greenhouse', type: 'ats' },
  { id: 'lever', name: 'Lever', type: 'ats' },

  // Remote & Job Boards
  { id: 'remoteok', name: 'RemoteOK', type: 'remote' },
  { id: 'linkedin', name: 'LinkedIn', type: 'job_board' },

  // Research Labs
  { id: 'openai', name: 'OpenAI', type: 'research_lab' },
  { id: 'anthropic', name: 'Anthropic', type: 'research_lab' },
  { id: 'deepmind', name: 'DeepMind', type: 'research_lab' },

  // Big Tech
  { id: 'google', name: 'Google', type: 'big_tech' },
  { id: 'microsoft', name: 'Microsoft', type: 'big_tech' },
  { id: 'amazon', name: 'Amazon', type: 'big_tech' },
];

for (const entry of REGISTRATIONS) {
  connectorRegistry.register(
    new BaseConnector(entry.id, entry.name, entry.type)
  );
}