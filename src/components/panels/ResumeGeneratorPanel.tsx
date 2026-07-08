'use client';

import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react';
import type { Job } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface GeneratedResult {
  jobTitle: string;
  company: string;
  atsScore: number;
  matchedSkills: string[];
  missingKeywords: string[];
  recommendations: string[];
  summary: string;
  experienceRewrite: Array<{ title: string; company: string; bullets: string[]; tech: string[] }>;
}

/* -------------------------------------------------------------------------- */
/*  Inline toast helper                                                       */
/* -------------------------------------------------------------------------- */

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ResumeGeneratorPanel() {
  /* ----- state ----- */
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);

  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const { toast, show: showToast } = useToast();

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
        const res = await fetch(`/api/jobs?search=${encodeURIComponent(search.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data) ? data : data.jobs ?? []);
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
      const data = await res.json();
      setResult(data);
    } catch {
      showToast('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /* ----- derived ----- */
  const requirementsLines = selectedJob?.requirements?.split('\n').filter(Boolean).slice(0, 2) ?? [];

  /* ======================================================================== */
  /*  Render                                                                   */
  /* ======================================================================== */

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

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
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {/* dropdown */}
          {dropdownOpen && jobs.length > 0 && (
            <div className="rounded-md border bg-popover shadow-md">
              <ScrollArea className="max-h-60">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requirements</p>
                {requirementsLines.map((line, i) => (
                  <p key={i} className="text-sm">{line}</p>
                ))}
              </div>
            )}
            {selectedJob.skills.length > 0 && (
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
          <Card><CardContent className="space-y-3 pt-6"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          <Card><CardContent className="space-y-3 pt-6"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
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
              <CardContent className="space-y-4">
                {/* Score */}
                <div className="space-y-1">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold">{result.atsScore}</span>
                    <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <Progress value={result.atsScore} className="h-2" />
                </div>

                {/* Matched Skills */}
                {result.matchedSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <CheckCircle className="mr-1 inline h-3 w-3 text-green-500" />
                      Matched Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matchedSkills.map((s) => (
                        <Badge key={s} className="bg-green-600 hover:bg-green-700 text-white">{s}</Badge>
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
                    <ol className="list-decimal list-inside space-y-1 text-sm">
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Optimized Summary</p>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>

                <Separator />

                {/* Rewritten Experience */}
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</p>
                  {result.experienceRewrite.map((exp, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-sm font-semibold">{exp.title} <span className="font-normal text-muted-foreground">— {exp.company}</span></p>
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
            <Button variant="outline" onClick={() => showToast('Resume download started!')}>
              <Download className="mr-2 h-4 w-4" />
              Download Resume
            </Button>
            <Button variant="secondary" onClick={() => setCoverLetterOpen(true)}>
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
              AI-generated cover letter for {selectedJob?.title ?? 'this position'} at {selectedJob?.company ?? 'the company'}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="whitespace-pre-line text-sm leading-relaxed">
{`Dear Hiring Manager,

I am excited to apply for the ${selectedJob?.title ?? 'position'} role at ${selectedJob?.company ?? 'your company'}. With a strong background in the required technologies and a passion for building impactful solutions, I believe I would be a valuable addition to your team.

Throughout my career, I have consistently delivered high-quality results by combining technical expertise with a collaborative, results-driven approach. My experience aligns closely with the requirements of this role, and I am eager to contribute to your team's success.

I would welcome the opportunity to discuss how my skills and experiences can benefit ${selectedJob?.company ?? 'your organization'}. Thank you for considering my application.

Best regards,
[Your Name]`}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}