'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  Info,
  CheckCircle2,
  Briefcase,
  Wifi,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobItem {
  id: string;
  title: string;
  company: string;
  source: string;
  sourceType: string;
  sourceUrl: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryType: string | null;
  description: string;
  requirements: string | null;
  skills: string[];
  experienceLevel: string | null;
  jobType: string | null;
  postedAt: string | null;
  matchScore: number | null;
  isApplied: boolean;
  isSaved: boolean;
  createdAt: string;
}

interface JobsResponse {
  jobs: JobItem[];
  total: number;
  page: number;
  limit: number;
}

interface ScrapeResult {
  status: string;
  sourcesScraped: number;
  totalJobsFound: number;
  totalJobsNew: number;
  results: Array<{ source: string; status: string; jobsFound: number; jobsNew: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_TYPE_OPTIONS = [
  { label: 'All Sources', value: '' },
  { label: 'AI Training', value: 'ai_training' },
  { label: 'Job Board', value: 'job_board' },
  { label: 'Remote', value: 'remote' },
  { label: 'Startup', value: 'startup' },
  { label: 'Big Tech', value: 'big_tech' },
  { label: 'ATS', value: 'ats' },
  { label: 'Research', value: 'research_lab' },
];

const SORT_OPTIONS = [
  { label: 'Match Score', value: 'matchScore' },
  { label: 'Salary', value: 'salary' },
  { label: 'Date Posted', value: 'postedAt' },
];

// ─── Match Score SVG Ring ──────────────────────────────────────────────────────

function MatchScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const color =
    value >= 80 ? '#22c55e' : value >= 60 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ─── Salary Formatter ──────────────────────────────────────────────────────────

function formatSalary(min: number | null, max: number | null, currency: string, type: string | null): string | null {
  if (!min && !max) return null;
  const c = currency === 'USD' ? '$' : `${currency} `;
  const suffix = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : type === 'yearly' ? '/yr' : '';
  if (min && max) return `${c}${min.toLocaleString()} – ${c}${max.toLocaleString()}${suffix}`;
  if (min) return `From ${c}${min.toLocaleString()}${suffix}`;
  return `Up to ${c}${(max ?? 0).toLocaleString()}${suffix}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onToggleSave,
  onViewDetails,
}: {
  job: JobItem;
  onToggleSave: (jobId: string, isSaved: boolean) => void;
  onViewDetails: (job: JobItem) => void;
}) {
  const saving = useRef(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving.current) return;
    saving.current = true;
    const newSaved = !job.isSaved;
    onToggleSave(job.id, newSaved);
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, isSaved: newSaved }),
      });
      if (!res.ok) {
        onToggleSave(job.id, job.isSaved);
        toast.error('Failed to update save status');
      }
    } catch {
      onToggleSave(job.id, job.isSaved);
      toast.error('Failed to update save status');
    } finally {
      saving.current = false;
    }
  };

  const salaryStr = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryType);
  const visibleSkills = job.skills.slice(0, 5);
  const remainingSkills = job.skills.length - 5;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Top: source badge + save */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {job.source}
            </Badge>
            {job.isApplied && (
              <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Applied
              </Badge>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSave}
                  aria-label={job.isSaved ? 'Unsave job' : 'Save job'}
                >
                  {job.isSaved ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{job.isSaved ? 'Unsave' : 'Save'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Title + Company */}
        <h3 className="font-semibold text-sm mb-0.5 line-clamp-1">{job.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{job.company}</p>

        {/* Match Score + Salary + Location */}
        <div className="flex items-center gap-4 mb-3">
          <MatchScoreRing score={job.matchScore} />
          <div className="flex-1 min-w-0 space-y-1">
            {salaryStr && (
              <div className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{salaryStr}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {job.location && (
                <>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{job.location}</span>
                  {job.remote && <span className="shrink-0">·</span>}
                </>
              )}
              {job.remote && (
                <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                  <Wifi className="h-2.5 w-2.5" />
                  Remote
                </Badge>
              )}
            </div>
            {job.postedAt && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{timeAgo(job.postedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {visibleSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {visibleSkills.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] font-normal">
                {s}
              </Badge>
            ))}
            {remainingSkills > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal">
                +{remainingSkills} more
              </Badge>
            )}
          </div>
        )}

        {/* View Details Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onViewDetails(job)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function JobsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-14 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Job Detail Dialog ─────────────────────────────────────────────────────────

function JobDetailDialog({
  job,
  open,
  onClose,
  onToggleSave,
}: {
  job: JobItem | null;
  open: boolean;
  onClose: () => void;
  onToggleSave: (jobId: string, isSaved: boolean) => void;
}) {
  if (!job) return null;

  const salaryStr = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryType);

  const handleApply = () => {
    toast.success(`Application started for "${job.title}" at ${job.company}`);
  };

  const handleSave = async () => {
    const newSaved = !job.isSaved;
    onToggleSave(job.id, newSaved);
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, isSaved: newSaved }),
      });
      if (!res.ok) {
        onToggleSave(job.id, job.isSaved);
        toast.error('Failed to update save status');
        return;
      }
      toast.success(newSaved ? 'Job saved!' : 'Job unsaved');
    } catch {
      onToggleSave(job.id, job.isSaved);
      toast.error('Failed to update save status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">{job.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            {job.company}
            {job.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              </>
            )}
            {job.remote && (
              <>
                <span>·</span>
                <Badge variant="secondary" className="text-[10px]">Remote</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="capitalize">{job.source}</Badge>
              {job.jobType && <Badge variant="outline" className="capitalize">{job.jobType.replace('_', ' ')}</Badge>}
              {job.experienceLevel && <Badge variant="outline" className="capitalize">{job.experienceLevel}</Badge>}
              {job.postedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeAgo(job.postedAt)}
                </span>
              )}
              {job.matchScore !== null && (
                <Badge variant={job.matchScore >= 70 ? 'default' : 'secondary'}>
                  {job.matchScore}% Match
                </Badge>
              )}
            </div>

            {/* Salary */}
            {salaryStr && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">{salaryStr}</span>
              </div>
            )}

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requirements</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={handleApply} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Apply
          </Button>
          <Button variant="outline" onClick={handleSave}>
            {job.isSaved ? <BookmarkCheck className="h-4 w-4 mr-2" /> : <Bookmark className="h-4 w-4 mr-2" />}
            {job.isSaved ? 'Saved' : 'Save'}
          </Button>
          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Source
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobsPanel() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState('matchScore');
  const [sortOrder, setSortOrder] = useState('desc');
  const [detailJob, setDetailJob] = useState<JobItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);

  const limit = 50;

  const buildParams = useCallback((): string => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (sourceType) params.set('sourceType', sourceType);
    if (remoteOnly) params.set('remote', 'true');
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('limit', String(limit));
    params.set('page', String(page));
    return params.toString();
  }, [search, sourceType, remoteOnly, sortBy, sortOrder, page]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildParams();
      const res = await fetch(`/api/jobs?${query}`);
      if (res.ok) {
        const data: JobsResponse = await res.json();
        const jobs = data?.jobs ?? [];
        const total = data?.total ?? 0;
        setJobs((prev) => (page === 1 ? jobs : [...prev, ...jobs]));
        setTotal(total);
      } else {
        toast.error('Failed to load jobs');
      }
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [buildParams, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, sourceType, remoteOnly, sortBy, sortOrder]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasMore = jobs.length < total;

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const handleToggleSave = useCallback((jobId: string, isSaved: boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, isSaved } : j)));
    if (detailJob?.id === jobId) {
      setDetailJob((prev) => (prev ? { ...prev, isSaved } : prev));
    }
  }, [detailJob]);

  const handleViewDetails = useCallback((job: JobItem) => {
    setDetailJob(job);
    setDetailOpen(true);
  }, []);

  const handleScrape = async (aiOnly: boolean) => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const body: { aiOnly?: boolean } = {};
      if (aiOnly) body.aiOnly = true;
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data: ScrapeResult = await res.json();
        setScrapeResult(data);
        toast.success(`Scraping complete: ${data.totalJobsFound} jobs found, ${data.totalJobsNew} new`);
        // Refresh jobs
        setPage(1);
        fetchJobs();
      } else {
        toast.error('Scraping failed');
      }
    } catch {
      toast.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scrape Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleScrape(false)} disabled={scraping} size="sm">
          {scraping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Scrape All Sources
        </Button>
        <Button onClick={() => handleScrape(true)} disabled={scraping} variant="outline" size="sm">
          {scraping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          AI Training Only
        </Button>
      </div>

      {/* Scrape Results Banner */}
      {scrapeResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Scraping Complete
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              {scrapeResult.sourcesScraped} sources scraped · {scrapeResult.totalJobsFound} jobs found · {scrapeResult.totalJobsNew} new jobs
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-green-700 dark:text-green-300 p-0 mt-1"
              onClick={() => setScrapeResult(null)}
            >
              <X className="h-3 w-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                Sort: {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Remote</span>
          <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
        </div>
      </div>

      {/* Source Type Pills */}
      <div className="flex flex-wrap gap-1.5">
        {SOURCE_TYPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={sourceType === opt.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSourceType(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Job Count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {jobs.length} of {total} jobs
        </p>
      )}

      {/* Jobs Grid */}
      {page === 1 && loading ? (
        <JobsSkeleton />
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No jobs found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onToggleSave={handleToggleSave}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {loading && page > 1 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More ({total - jobs.length} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <JobDetailDialog
        job={detailJob}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}