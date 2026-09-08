'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Search,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobSearchItem {
  id: string;
  title: string;
  company: string;
  matchScore?: number | null;
  skills?: string[];
  requirements?: string | null;
}

interface GeneratedResult {
  jobTitle: string;
  company: string;
  atsScore: number;
  tailoredSkills: string[];
  missingKeywords: string[];
  recommendations: string[];
  summary: string;
  experienceRewrite: Array<{
    title: string;
    company: string;
    bullets: string[];
    tech: string[];
  }>;
}

// ─── ATS Score Circle (pure CSS / SVG) ─────────────────────────────────────────

function AtsScoreCircle({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r="36" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
        <circle
          cx="48"
          cy="48"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="block text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResumeGeneratorPanel() {
  /* ----- state ----- */
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<JobSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState<JobSearchItem | null>(null);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);

  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);

  /* ----- debounced job search ----- */
  useEffect(() => {
    if (!search.trim()) {
      setJobs([]);
      setDropdownOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/jobs?search=${encodeURIComponent(search.trim())}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const items: JobSearchItem[] = data?.jobs ?? (Array.isArray(data) ? data : []);
          setJobs(items);
          setDropdownOpen(true);
        }
      } catch {
        setJobs([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ----- generate resume ----- */
  const handleGenerate = async () => {
    if (!selectedJob) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJob.id }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data: GeneratedResult = await res.json();
      setResult(data);
      toast.success('Resume generated successfully!');
    } catch {
      toast.error('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ----- generate cover letter via chat API ----- */
  const handleGenerateCoverLetter = async () => {
    if (!selectedJob || !result) return;
    setGeneratingCover(true);
    setCoverLetter('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a professional cover letter for the ${selectedJob.title} position at ${selectedJob.company}. Use the following ATS-optimized summary and experience:\n\nSummary: ${result.summary}\n\nExperience: ${result.experienceRewrite.map((e) => `${e.title} at ${e.company}: ${e.bullets.join(' ')}`).join('\n')}`,
          history: [],
        }),
      });
      if (!res.ok) throw new Error('Failed to generate cover letter');
      const data = await res.json();
      setCoverLetter(data.response ?? '');
      toast.success('Cover letter generated!');
    } catch {
      toast.error('Failed to generate cover letter.');
    } finally {
      setGeneratingCover(false);
    }
  };

  /* ----- download as text blob ----- */
  const handleDownload = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push(`RESUME - ${result.jobTitle} at ${result.company}`);
    lines.push(`ATS Score: ${result.atsScore}/100`);
    lines.push('');
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(result.summary);
    lines.push('');
    lines.push('EXPERIENCE');
    for (const exp of result.experienceRewrite) {
      lines.push(`${exp.title} — ${exp.company}`);
      for (const bullet of exp.bullets) {
        lines.push(`  • ${bullet}`);
      }
      if (exp.tech.length > 0) {
        lines.push(`  Technologies: ${exp.tech.join(', ')}`);
      }
      lines.push('');
    }
    lines.push('KEY SKILLS');
    lines.push(result.tailoredSkills.join(', '));

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_${result.company.toLowerCase().replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Resume downloaded!');
  };

  /* ----- derived ----- */
  const requirementsLines = selectedJob?.requirements?.split('\n').filter(Boolean).slice(0, 2) ?? [];

  /* ======================================================================== */
  /*  Render                                                                   */
  /* ======================================================================== */

  return (
    <div className="space-y-6">
      {/* ---- 1. Job Search ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Select a Job
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or company…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => jobs.length > 0 && setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown */}
          {dropdownOpen && jobs.length > 0 && (
            <div className="rounded-md border bg-popover shadow-md" role="listbox" aria-label="Job suggestions">
              <ScrollArea className="max-h-60">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    role="option"
                    aria-selected={selectedJob?.id === job.id}
                    onMouseDown={() => {
                      setSelectedJob(job);
                      setDropdownOpen(false);
                      setResult(null);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                    </div>
                    {job.matchScore != null && (
                      <Badge
                        variant={job.matchScore >= 70 ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {job.matchScore}%
                      </Badge>
                    )}
                  </button>
                ))}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- 2. Selected Job Card ---- */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{selectedJob.company}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {requirementsLines.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Requirements
                </p>
                {requirementsLines.map((line, i) => (
                  <p key={i} className="text-sm">{line}</p>
                ))}
              </div>
            )}
            {selectedJob.skills && selectedJob.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedJob.skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            )}

            <Separator className="my-3" />

            <Button className="w-full" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {generating ? 'Generating…' : 'Generate ATS-Optimized Resume'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---- 3. Loading Skeleton ---- */}
      {generating && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex justify-center py-4">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Separator />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---- 4. Results ---- */}
      {result && !generating && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left – ATS Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  ATS Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Score circle */}
                <div className="flex justify-center">
                  <AtsScoreCircle score={result.atsScore} />
                </div>

                {/* Matched Skills */}
                {result.tailoredSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <CheckCircle className="mr-1 inline h-3 w-3 text-green-500" />
                      Matched Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.tailoredSkills.map((s) => (
                        <Badge key={s} className="bg-green-600 hover:bg-green-700 text-white">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Keywords */}
                {result.missingKeywords.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <XCircle className="mr-1 inline h-3 w-3 text-red-500" />
                      Missing Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missingKeywords.map((s) => (
                        <Badge key={s} variant="destructive">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Lightbulb className="mr-1 inline h-3 w-3 text-yellow-500" />
                      Recommendations
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right – Resume Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Resume Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Optimized Summary
                  </p>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>

                <Separator />

                {/* Rewritten Experience */}
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Experience
                  </p>
                  {result.experienceRewrite.map((exp, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-sm font-semibold">
                        {exp.title}{' '}
                        <span className="font-normal text-muted-foreground">— {exp.company}</span>
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                        {exp.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                      {exp.tech.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {exp.tech.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ---- 5. Bottom Actions ---- */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Resume
            </Button>
            <Button variant="secondary" onClick={() => { setCoverLetterOpen(true); handleGenerateCoverLetter(); }}>
              <Send className="mr-2 h-4 w-4" />
              Generate Cover Letter
            </Button>
          </div>
        </>
      )}

      {/* ---- 6. Cover Letter Dialog ---- */}
      <Dialog open={coverLetterOpen} onOpenChange={setCoverLetterOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cover Letter
            </DialogTitle>
            <DialogDescription>
              AI-generated cover letter for {selectedJob?.title ?? 'this position'} at{' '}
              {selectedJob?.company ?? 'the company'}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            {generatingCover ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : coverLetter ? (
              <div className="whitespace-pre-line text-sm leading-relaxed py-2">
                {coverLetter}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Click &quot;Generate Cover Letter&quot; to create one.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Empty state when nothing selected */}
      {!selectedJob && !generating && (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              Search and select a job above to generate a tailored resume.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}