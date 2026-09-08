'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  User,
  Calendar,
  Clock,
  Plus,
  Video,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ApplicationStatus, Interview } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobBrief {
  id: string;
  title: string;
  company: string;
}

interface ApplicationItem {
  id: string;
  jobId: string;
  job: JobBrief;
  resumeId: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt?: string;
  feedback?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  atsScore?: number;
  createdAt: string;
}

interface ApplicationsResponse {
  applications: ApplicationItem[];
  total: number;
  counts: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Interview', value: 'interview' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Ghosted', value: 'ghosted' },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  reviewing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  assessment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ghosted: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['submitted'],
  submitted: ['reviewing', 'interview', 'rejected'],
  reviewing: ['interview', 'assessment', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  assessment: ['interview', 'offer', 'rejected'],
  offer: [],
  rejected: [],
  ghosted: [],
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── ATS Score Circle ─────────────────────────────────────────────────────────

function AtsScoreCircle({ score }: { score?: number }) {
  const value = score ?? 0;
  const color =
    value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${(value / 100) * 113.1} 113.1`}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[11px] font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onStatusChange,
  onScheduleInterview,
}: {
  app: ApplicationItem;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onScheduleInterview: (app: ApplicationItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [interviewsExpanded, setInterviewsExpanded] = useState(false);

  const company = app.job?.company ?? 'Unknown';
  const title = app.job?.title ?? 'Untitled';

  const fetchInterviews = useCallback(async () => {
    setLoadingInterviews(true);
    try {
      const res = await fetch(`/api/interviews?applicationId=${app.id}`);
      if (res.ok) {
        const data = await res.json();
        setInterviews(Array.isArray(data) ? data : data.interviews ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoadingInterviews(false);
    }
  }, [app.id]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && app.status === 'interview' && interviews.length === 0) {
      fetchInterviews();
    }
  };

  const handleStatusTransition = (newStatus: ApplicationStatus) => {
    onStatusChange(app.id, newStatus);
  };

  const handleCompleteInterview = async (interviewId: string) => {
    try {
      const res = await fetch('/api/interviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, status: 'completed' }),
      });
      if (res.ok) {
        toast.success('Interview marked as completed');
        fetchInterviews();
      }
    } catch {
      toast.error('Failed to update interview');
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(company)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm truncate">{title}</h4>
              <AtsScoreCircle score={app.atsScore} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{company}</p>

            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[app.status]}`}
              >
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(app.appliedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Status Transition Buttons */}
        {NEXT_STATUSES[app.status].length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {NEXT_STATUSES[app.status].map((ns) => (
              <Button
                key={ns}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleStatusTransition(ns)}
              >
                → {ns.charAt(0).toUpperCase() + ns.slice(1)}
              </Button>
            ))}
            {(app.status === 'submitted' || app.status === 'reviewing' || app.status === 'interview') && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => onScheduleInterview(app)}
              >
                <Video className="h-3 w-3 mr-1" />
                Schedule Interview
              </Button>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-xs text-muted-foreground"
          onClick={handleExpand}
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3 mr-1" />
          ) : (
            <ChevronDown className="w-3 h-3 mr-1" />
          )}
          {expanded ? 'Show less' : 'Show more'}
        </Button>

        {expanded && (
          <div className="mt-2 space-y-3 text-sm">
            <Separator />

            {app.notes && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="w-3 h-3" /> Notes
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{app.notes}</p>
              </div>
            )}

            {(app.recruiterName || app.recruiterEmail) && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <User className="w-3 h-3" /> Recruiter
                </div>
                <p className="text-sm">{app.recruiterName ?? '—'}</p>
                {app.recruiterEmail && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {app.recruiterEmail}
                  </p>
                )}
              </div>
            )}

            {app.feedback && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <MessageSquare className="w-3 h-3" /> Feedback
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{app.feedback}</p>
              </div>
            )}

            {/* Interviews section */}
            {app.status === 'interview' && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 hover:text-foreground transition-colors"
                  onClick={() => {
                    if (!interviewsExpanded && interviews.length === 0) fetchInterviews();
                    setInterviewsExpanded((v) => !v);
                  }}
                >
                  <Video className="w-3 h-3" />
                  Interviews ({interviews.length})
                  {interviewsExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {interviewsExpanded && (
                  <div className="space-y-2 pl-2">
                    {loadingInterviews ? (
                      <Skeleton className="h-16 w-full" />
                    ) : interviews.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No interviews scheduled.</p>
                    ) : (
                      interviews.map((iv) => (
                        <div
                          key={iv.id}
                          className="rounded-lg border px-3 py-2 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              Round {iv.round}
                              {iv.type ? ` · ${iv.type}` : ''}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                iv.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : iv.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : ''
                              }`}
                            >
                              {iv.status}
                            </Badge>
                          </div>
                          {iv.date && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(iv.date)}</span>
                              {iv.duration && (
                                <>
                                  <span>·</span>
                                  <Clock className="w-3 h-3" />
                                  <span>{iv.duration} min</span>
                                </>
                              )}
                            </div>
                          )}
                          {iv.interviewer && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{iv.interviewer}</span>
                            </div>
                          )}
                          {iv.feedback && (
                            <p className="text-xs text-muted-foreground mt-1">{iv.feedback}</p>
                          )}
                          {iv.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] mt-1"
                              onClick={() => handleCompleteInterview(iv.id)}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function ApplicationsPanel() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'all'>('all');

  // Add Application dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ jobId: '', notes: '' });
  const [addLoading, setAddLoading] = useState(false);

  // Schedule Interview dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleApp, setScheduleApp] = useState<ApplicationItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    round: 1,
    type: 'technical',
    date: '',
    duration: 60,
    interviewer: '',
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeFilter === 'all' ? '' : `?status=${activeFilter}`;
      const res = await fetch(`/api/applications${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: ApplicationsResponse = await res.json();
      setApplications(data?.applications ?? []);
      setStatusCounts(data?.counts ?? {});
    } catch {
      setApplications([]);
      setStatusCounts({});
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Stats derived from API counts
  const stats = useMemo(() => {
    const total = Object.values(statusCounts).reduce((s, v) => s + v, 0);
    const submitted = (statusCounts['submitted'] ?? 0)
      + (statusCounts['reviewing'] ?? 0)
      + (statusCounts['interview'] ?? 0)
      + (statusCounts['assessment'] ?? 0)
      + (statusCounts['offer'] ?? 0)
      + (statusCounts['rejected'] ?? 0)
      + (statusCounts['ghosted'] ?? 0);
    const responded = submitted - (statusCounts['submitted'] ?? 0);
    const interviewed = (statusCounts['interview'] ?? 0)
      + (statusCounts['assessment'] ?? 0)
      + (statusCounts['offer'] ?? 0);
    const offered = statusCounts['offer'] ?? 0;

    return {
      total,
      responseRate: submitted > 0 ? ((responded / submitted) * 100).toFixed(1) : '0.0',
      interviewRate: submitted > 0 ? ((interviewed / submitted) * 100).toFixed(1) : '0.0',
      offerRate: submitted > 0 ? ((offered / submitted) * 100).toFixed(1) : '0.0',
    };
  }, [statusCounts]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (applicationId: string, status: ApplicationStatus) => {
      try {
        const res = await fetch('/api/applications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId, status }),
        });
        if (res.ok) {
          toast.success(`Status updated to ${status}`);
          fetchApplications();
        } else {
          toast.error('Failed to update status');
        }
      } catch {
        toast.error('Failed to update status');
      }
    },
    [fetchApplications],
  );

  // Handle add application
  const handleAddApplication = async () => {
    if (!addForm.jobId.trim()) {
      toast.error('Please select a job');
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: addForm.jobId,
          notes: addForm.notes || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Application added!');
        setAddDialogOpen(false);
        setAddForm({ jobId: '', notes: '' });
        fetchApplications();
      } else {
        toast.error('Failed to add application');
      }
    } catch {
      toast.error('Failed to add application');
    } finally {
      setAddLoading(false);
    }
  };

  // Handle schedule interview
  const handleScheduleInterview = async () => {
    if (!scheduleApp) return;
    if (!scheduleForm.date) {
      toast.error('Please select a date');
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: scheduleApp.id,
          round: scheduleForm.round,
          type: scheduleForm.type,
          date: scheduleForm.date,
          duration: scheduleForm.duration,
          interviewer: scheduleForm.interviewer || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Interview scheduled!');
        setScheduleDialogOpen(false);
        setScheduleForm({ round: 1, type: 'technical', date: '', duration: 60, interviewer: '' });
        fetchApplications();
      } else {
        toast.error('Failed to schedule interview');
      }
    } catch {
      toast.error('Failed to schedule interview');
    } finally {
      setScheduleLoading(false);
    }
  };

  const openScheduleDialog = async (app: ApplicationItem) => {
    setScheduleApp(app);
    // Calculate next round from existing interviews
    let existingRounds = 0;
    try {
      const res = await fetch(`/api/interviews?applicationId=${app.id}`);
      if (res.ok) {
        const data = await res.json();
        const interviews: Interview[] = Array.isArray(data) ? data : data.interviews ?? [];
        existingRounds = interviews.length;
      }
    } catch {
      // If fetch fails, default to 0
    }
    setScheduleForm((f) => ({ ...f, round: existingRounds + 1 }));
    setScheduleDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top: Filter bar + Add button */}
      <div className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={activeFilter === f.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setActiveFilter(f.value)}
              >
                {f.label}
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 min-w-[18px] flex items-center justify-center text-[10px] px-1"
                >
                  {statusCounts[f.value] ?? 0}
                </Badge>
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Application list */}
      <ScrollArea className="flex-1 px-1">
        {loading ? (
          <LoadingSkeleton />
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Briefcase className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No applications found</p>
          </div>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onScheduleInterview={openScheduleDialog}
            />
          ))
        )}
      </ScrollArea>

      {/* Stats summary */}
      <Separator className="mt-2" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2 py-3">
        <div className="text-center">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{stats.responseRate}%</p>
          <p className="text-[10px] text-muted-foreground">Response Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{stats.interviewRate}%</p>
          <p className="text-[10px] text-muted-foreground">Interview Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{stats.offerRate}%</p>
          <p className="text-[10px] text-muted-foreground">Offer Rate</p>
        </div>
      </div>

      {/* Add Application Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Application</DialogTitle>
            <DialogDescription>Track a new job application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-job-id">Job ID</Label>
              <Input
                id="add-job-id"
                placeholder="Enter job ID…"
                value={addForm.jobId}
                onChange={(e) => setAddForm((f) => ({ ...f, jobId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes (optional)</Label>
              <Textarea
                id="add-notes"
                placeholder="Any notes about this application…"
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddApplication} disabled={addLoading}>
              {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule an interview for {scheduleApp?.job?.title ?? 'this position'} at{' '}
              {scheduleApp?.job?.company ?? 'the company'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iv-round">Round</Label>
                <Input
                  id="iv-round"
                  type="number"
                  min={1}
                  value={scheduleForm.round}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, round: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iv-type">Type</Label>
                <Select
                  value={scheduleForm.type}
                  onValueChange={(v) => setScheduleForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger id="iv-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="system_design">System Design</SelectItem>
                    <SelectItem value="panel">Panel</SelectItem>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iv-date">Date</Label>
                <Input
                  id="iv-date"
                  type="datetime-local"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iv-duration">Duration (min)</Label>
                <Input
                  id="iv-duration"
                  type="number"
                  min={15}
                  step={15}
                  value={scheduleForm.duration}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, duration: parseInt(e.target.value) || 60 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iv-interviewer">Interviewer (optional)</Label>
              <Input
                id="iv-interviewer"
                placeholder="Interviewer name…"
                value={scheduleForm.interviewer}
                onChange={(e) =>
                  setScheduleForm((f) => ({ ...f, interviewer: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview} disabled={scheduleLoading}>
              {scheduleLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}