'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, DollarSign, Clock, Briefcase, Star,
  RefreshCw, ExternalLink, FileText, CheckCircle, Zap, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Job, JobSourceType } from '@/lib/types';

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ai_training', label: 'AI Training' },
  { value: 'research_lab', label: 'Research Lab' },
  { value: 'big_tech', label: 'Big Tech' },
  { value: 'job_board', label: 'Job Board' },
  { value: 'remote', label: 'Remote' },
  { value: 'ats', label: 'ATS' },
  { value: 'startup', label: 'Startup' },
  { value: 'freelance', label: 'Freelance' },
];

const sourceTypeBadgeClass: Record<string, string> = {
  ai_training: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  research_lab: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  big_tech: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  remote: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  ats: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
  startup: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  job_board: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400',
  freelance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

function formatSalary(job: Job): string | null {
  const { salaryMin, salaryMax, salaryType } = job;
  if (!salaryMin && !salaryMax) return null;
  const min = salaryMin ?? 0;
  const max = salaryMax ?? 0;
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
  const suffix = salaryType === 'hourly' ? '/hr' : salaryType === 'monthly' ? '/mo' : '/yr';
  const prefix = '$';
  if (min && max && min !== max) return `${prefix}${fmt(min)}-${fmt(max)}${suffix}`;
  return `${prefix}${fmt(max || min)}${suffix}`;
}

function relativeDate(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function matchScoreColor(score: number): string {
  if (score > 85) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (score > 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const salary = formatSalary(job);
  const posted = relativeDate(job.postedAt);
  const score = job.matchScore ?? 0;
  const visibleSkills = job.skills.slice(0, 5);
  const extraCount = job.skills.length - 5;

  return (
    <div className="transition-all duration-200 hover:shadow-md">
      <Card className="hover:border-border transition-all cursor-pointer group" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">{job.company}</span>
                <Badge variant="outline" className={`text-[10px] ${sourceTypeBadgeClass[job.sourceType] ?? ''}`}>
                  {job.sourceType === 'ai_training' ? 'AI Training' : job.sourceType === 'research_lab' ? 'Research' : job.sourceType.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1">{job.title}</h3>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${matchScoreColor(score)}`}>
              {score}%
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
            {salary && (<span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{salary}</span>)}
            <span className="flex items-center gap-1">
              {job.remote ? (<><MapPin className="w-3 h-3" />Remote</>) : job.location ? (<><MapPin className="w-3 h-3" />{job.location}</>) : null}
            </span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{posted}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">{skill}</Badge>
            ))}
            {extraCount > 0 && <span className="text-[10px] text-muted-foreground">+{extraCount} more</span>}
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onClick(); }}>
              View Details
            </Button>
            {job.isApplied && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs">
                <CheckCircle className="w-3 h-3 mr-0.5" /> Applied
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState('matchScore');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<{ source: string; jobsFound: number; jobsNew: number }[]>([]);
  const [scrapeVisible, setScrapeVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      try {
        const params = new URLSearchParams({ sortBy, sortOrder: 'desc', limit: '50' });
        const res = await fetch(`/api/jobs?${params}`);
        const json = await res.json();
        if (!cancelled) { setJobs(json.jobs || []); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    }
    fetchJobs();
    return () => { cancelled = true; };
  }, [sortBy]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q)));
    }
    if (activeFilter !== 'all') result = result.filter(j => j.sourceType === activeFilter);
    if (remoteOnly) result = result.filter(j => j.remote);
    return result;
  }, [jobs, searchQuery, activeFilter, remoteOnly]);

  const handleScrape = async (aiOnly: boolean) => {
    setIsScraping(true);
    setScrapeVisible(false);
    try {
      const body = aiOnly ? {} : {};
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      setScrapeResults(json.results || []);
      setScrapeVisible(true);
      setTimeout(() => setScrapeVisible(false), 5000);
      // Refresh jobs
      const params = new URLSearchParams({ sortBy, sortOrder: 'desc', limit: '50' });
      const jobRes = await fetch(`/api/jobs?${params}`);
      const jobJson = await jobRes.json();
      setJobs(jobJson.jobs || []);
    } catch {}
    setIsScraping(false);
  };

  return (
    <div className="space-y-4">
      {/* Scrape Bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleScrape(false)} disabled={isScraping} className="text-xs">
          {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Scrape All Sources
        </Button>
        <Button variant="outline" onClick={() => handleScrape(true)} disabled={isScraping} className="text-xs">
          Scrape AI Training Only
        </Button>
      </div>

      {scrapeVisible && scrapeResults.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">Scraping Results</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="text-left py-1 pr-4 font-medium text-muted-foreground text-xs">Source</th><th className="text-right py-1 px-4 font-medium text-muted-foreground text-xs">Jobs Found</th><th className="text-right py-1 pl-4 font-medium text-muted-foreground text-xs">New Jobs</th></tr></thead>
                <tbody>{scrapeResults.map((r, i) => (<tr key={i} className="border-b border-border/50 last:border-0"><td className="py-1.5 pr-4 text-sm">{r.source}</td><td className="py-1.5 px-4 text-sm text-right tabular-nums">{r.jobsFound}</td><td className="py-1.5 pl-4 text-sm text-right tabular-nums text-emerald-600 font-medium">+{r.jobsNew}</td></tr>))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by title, company, or skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="matchScore">Match Score</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="date">Date Posted</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Remote</span>
            <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SOURCE_FILTER_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setActiveFilter(activeFilter === opt.value ? 'all' : opt.value)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${activeFilter === opt.value ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Showing {filteredJobs.length} of {jobs.length} jobs</p>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No jobs match your filters.</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-3 pr-1">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => { setSelectedJob(job); setDialogOpen(true); }} />
          ))}
        </div>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[10px] ${sourceTypeBadgeClass[selectedJob.sourceType] ?? ''}`}>{selectedJob.sourceType.replace('_', ' ')}</Badge>
                  {selectedJob.remote && <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700">Remote</Badge>}
                </div>
                <DialogTitle className="text-lg">{selectedJob.title}</DialogTitle>
                <DialogDescription>{selectedJob.company} {selectedJob.location && `— ${selectedJob.location}`}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedJob.description}</p>
                </div>
                {selectedJob.requirements && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Requirements</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedJob.requirements}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="text-xs" onClick={() => window.open(selectedJob.sourceUrl, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> View on {selectedJob.source}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setDialogOpen(false); }}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}