/**
 * Matching Service for YoungSharkJobHunter
 *
 * Provides skill-based job matching, gap analysis, job ranking,
 * and salary insight aggregation. All methods are pure functions
 * suitable for server-side use.
 */

import { eventBus, DomainEvents } from './events';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MatchResult {
  matched: string[];
  missing: string[];
}

export interface RankedJob {
  id: string;
  score: number;
}

export interface SalaryInput {
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  title: string;
  company: string;
  sourceType: string;
}

export interface SalaryRoleInsight {
  role: string;
  sampleSize: number;
  salaryMin: number;
  salaryMax: number;
  salaryMedian: number;
  salaryType: string;
  salaryRange: number;
}

export interface SalarySourceInsight {
  sourceType: string;
  sampleSize: number;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  roles: SalaryRoleInsight[];
}

export interface SalaryInsightsResult {
  byRole: SalaryRoleInsight[];
  bySourceType: SalarySourceInsight[];
  overallMin: number;
  overallMax: number;
  overallMedian: number;
  totalSampleSize: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize a skill string for comparison.
 * Lowercases, trims, and collapses internal whitespace.
 */
function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build a frequency map from an array of skills (normalized).
 */
function buildFrequencyMap(skills: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const s of skills) {
    const key = normalizeSkill(s);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return freq;
}

/**
 * Compute the median of a sorted numeric array.
 */
function median(sorted: number[]): number {
  const len = sorted.length;
  if (len === 0) return 0;
  const mid = Math.floor(len / 2);
  return len % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Calculate a 0–100 match score between resume skills and job skills
 * using Jaccard similarity weighted by skill frequency.
 *
 * The weighting scheme gives more importance to rarer skills (higher
 * frequency → slightly lower weight per occurrence) while still
 * rewarding common skill matches.
 *
 * @returns A number between 0 and 100, rounded to one decimal place.
 */
export function calculateMatchScore(
  resumeSkills: string[],
  jobSkills: string[]
): number {
  if (resumeSkills.length === 0 && jobSkills.length === 0) return 100;
  if (resumeSkills.length === 0 || jobSkills.length === 0) return 0;

  const normalizedResume = resumeSkills.map(normalizeSkill);
  const normalizedJob = jobSkills.map(normalizeSkill);

  const resumeFreq = buildFrequencyMap(normalizedResume);
  const jobFreq = buildFrequencyMap(normalizedJob);

  // Build frequency maps for the *other* list (to penalize common skills)
  const resumeSet = new Set(normalizedResume);
  const jobSet = new Set(normalizedJob);

  const allSkills = new Set([...resumeSet, ...jobSet]);
  const unionSize = allSkills.size;

  let weightedIntersection = 0;
  let weightedUnion = 0;

  for (const skill of allSkills) {
    const inResume = resumeSet.has(skill);
    const inJob = jobSet.has(skill);

    // Inverse frequency weight: rarer skills are worth more
    // Using log-based IDF-like weighting
    const resumeCount = resumeFreq.get(skill) ?? 0;
    const jobCount = jobFreq.get(skill) ?? 0;

    // Weight: log(1 + N/count) where N is total unique skills in that set
    const resumeWeight = inResume
      ? Math.log(1 + resumeSet.size / Math.max(resumeCount, 1))
      : 0;
    const jobWeight = inJob
      ? Math.log(1 + jobSet.size / Math.max(jobCount, 1))
      : 0;

    const weight = (resumeWeight + jobWeight) / 2;

    if (inResume && inJob) {
      weightedIntersection += weight;
    }
    weightedUnion += weight;
  }

  if (weightedUnion === 0) return 0;

  const rawScore = (weightedIntersection / weightedUnion) * 100;

  // Apply a bonus for high absolute overlap (rewards matching many skills)
  const overlapCount = normalizedResume.filter((s) => jobSet.has(s)).length;
  const overlapBonus = Math.min(overlapCount / Math.max(jobSet.size, 1), 1) * 10;

  const finalScore = Math.min(rawScore + overlapBonus, 100);

  return Math.round(finalScore * 10) / 10;
}

/**
 * Find which skills from the job are matched by the resume and which are missing.
 *
 * @returns An object with `matched` (skills present in both) and `missing`
 *          (skills required by the job but absent from the resume).
 */
export function findSkillGaps(
  resumeSkills: string[],
  jobSkills: string[]
): MatchResult {
  const resumeSet = new Set(resumeSkills.map(normalizeSkill));

  // Preserve original casing from jobSkills for display
  const matched: string[] = [];
  const missing: string[] = [];

  for (const jobSkill of jobSkills) {
    if (resumeSet.has(normalizeSkill(jobSkill))) {
      matched.push(jobSkill);
    } else {
      missing.push(jobSkill);
    }
  }

  return { matched, missing };
}

/**
 * Rank an array of jobs by their match score against the given resume skills.
 * Results are sorted descending by score.
 *
 * @returns Array of `{ id, score }` sorted from highest to lowest match.
 */
export function rankJobs(
  jobs: Array<{ id: string; skills: string[] }>,
  resumeSkills: string[]
): RankedJob[] {
  return jobs
    .map((job) => ({
      id: job.id,
      score: calculateMatchScore(resumeSkills, job.skills),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Aggregate salary data across jobs to produce insights by role,
 * source type, and overall statistics.
 *
 * Jobs without salary data are silently excluded.
 */
export function getSalaryInsights(
  jobs: SalaryInput[]
): SalaryInsightsResult {
  type JobWithSalary = Required<Pick<SalaryInput, 'salaryMin' | 'salaryMax'>> & Omit<SalaryInput, 'salaryMin' | 'salaryMax'>;

  const withSalary = jobs.filter(
    (j): j is JobWithSalary =>
      j.salaryMin != null && j.salaryMax != null && j.salaryMin > 0 && j.salaryMax > 0
  );

  if (withSalary.length === 0) {
    return {
      byRole: [],
      bySourceType: [],
      overallMin: 0,
      overallMax: 0,
      overallMedian: 0,
      totalSampleSize: 0,
    };
  }

  // ── Aggregate by role ──
  const roleMap = new Map<
    string,
    { mins: number[]; maxes: number[]; medians: number[] }
  >();

  for (const job of withSalary) {
    const role = job.title.trim().toLowerCase();
    if (!roleMap.has(role)) {
      roleMap.set(role, { mins: [], maxes: [], medians: [] });
    }
    const entry = roleMap.get(role)!;
    entry.mins.push(job.salaryMin!);
    entry.maxes.push(job.salaryMax!);
    entry.medians.push((job.salaryMin! + job.salaryMax!) / 2);
  }

  const byRole: SalaryRoleInsight[] = Array.from(roleMap.entries())
    .map(([role, data]) => {
      const sortedMins = [...data.mins].sort((a, b) => a - b);
      const sortedMaxes = [...data.maxes].sort((a, b) => a - b);
      const sortedMedians = [...data.medians].sort((a, b) => a - b);

      return {
        role,
        sampleSize: data.mins.length,
        salaryMin: sortedMins[0]!,
        salaryMax: sortedMaxes[sortedMaxes.length - 1]!,
        salaryMedian: median(sortedMedians),
        salaryType: 'yearly',
        salaryRange: sortedMaxes[sortedMaxes.length - 1]! - sortedMins[0]!,
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  // ── Aggregate by source type ──
  const sourceMap = new Map<
    string,
    {
      mins: number[];
      maxes: number[];
      medians: number[];
      roleMap: Map<string, { mins: number[]; maxes: number[]; medians: number[] }>;
    }
  >();

  for (const job of withSalary) {
    const src = job.sourceType || 'unknown';
    if (!sourceMap.has(src)) {
      sourceMap.set(src, { mins: [], maxes: [], medians: [], roleMap: new Map() });
    }
    const srcEntry = sourceMap.get(src)!;
    srcEntry.mins.push(job.salaryMin!);
    srcEntry.maxes.push(job.salaryMax!);
    srcEntry.medians.push((job.salaryMin! + job.salaryMax!) / 2);

    const role = job.title.trim().toLowerCase();
    if (!srcEntry.roleMap.has(role)) {
      srcEntry.roleMap.set(role, { mins: [], maxes: [], medians: [] });
    }
    const roleEntry = srcEntry.roleMap.get(role)!;
    roleEntry.mins.push(job.salaryMin);
    roleEntry.maxes.push(job.salaryMax);
    roleEntry.medians.push((job.salaryMin + job.salaryMax) / 2);
  }

  const bySourceType: SalarySourceInsight[] = Array.from(sourceMap.entries())
    .map(([sourceType, data]) => {
      const sortedMedians = [...data.medians].sort((a, b) => a - b);
      const roles: SalaryRoleInsight[] = Array.from(data.roleMap.entries())
        .map(([role, rd]) => {
          const rSortedMedians = [...rd.medians].sort((a, b) => a - b);
          return {
            role,
            sampleSize: rd.mins.length,
            salaryMin: Math.min(...rd.mins),
            salaryMax: Math.max(...rd.maxes),
            salaryMedian: median(rSortedMedians),
            salaryType: 'yearly',
            salaryRange: Math.max(...rd.maxes) - Math.min(...rd.mins),
          };
        })
        .sort((a, b) => b.sampleSize - a.sampleSize);

      return {
        sourceType,
        sampleSize: data.mins.length,
        avgMin: Math.round(data.mins.reduce((s, v) => s + v, 0) / data.mins.length),
        avgMax: Math.round(data.maxes.reduce((s, v) => s + v, 0) / data.maxes.length),
        avgMedian: median(sortedMedians),
        roles,
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  // ── Overall stats ──
  const allMedians = withSalary.map((j) => (j.salaryMin + j.salaryMax) / 2);
  allMedians.sort((a, b) => a - b);

  const allMins = withSalary.map((j) => j.salaryMin).sort((a, b) => a - b);
  const allMaxes = withSalary.map((j) => j.salaryMax).sort((a, b) => a - b);

  return {
    byRole,
    bySourceType,
    overallMin: allMins[0] ?? 0,
    overallMax: allMaxes[allMaxes.length - 1] ?? 0,
    overallMedian: median(allMedians),
    totalSampleSize: withSalary.length,
  };
}

/**
 * Convenience: compute match score, find gaps, and emit domain events.
 * Useful when processing a single job against a resume.
 */
export function analyzeJobMatch(
  jobId: string,
  resumeSkills: string[],
  jobSkills: string[]
): { score: number; gaps: MatchResult } {
  const score = calculateMatchScore(resumeSkills, jobSkills);
  const gaps = findSkillGaps(resumeSkills, jobSkills);

  eventBus.emit(DomainEvents.JOB_MATCH_SCORED, {
    jobId,
    score,
    matchedCount: gaps.matched.length,
    missingCount: gaps.missing.length,
  });

  if (gaps.missing.length > 0) {
    eventBus.emit(DomainEvents.SKILL_GAP_DETECTED, {
      jobId,
      missingSkills: gaps.missing,
      matchedSkills: gaps.matched,
    });
  }

  return { score, gaps };
}