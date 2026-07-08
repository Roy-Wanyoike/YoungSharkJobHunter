'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  TrendingUp,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Application, ApplicationStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Interview', value: 'interview' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Ghosted', value: 'ghosted' },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  interview: 'bg-purple-100 text-purple-700',
  assessment: 'bg-orange-100 text-orange-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ghosted: 'bg-gray-200 text-gray-500',
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

// ---------------------------------------------------------------------------
// ATS Score Circle
// ---------------------------------------------------------------------------

function AtsScoreCircle({ score }: { score?: number }) {
  const value = score ?? 0;
  const color =
    value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${(value / 100) * 97.4} 97.4`}
          className={color}
        />
      </svg>
      <span className={`absolute text-[10px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application Card
// ---------------------------------------------------------------------------

function ApplicationCard({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(false);

  const company = app.job?.company ?? 'Unknown';
  const title = app.job?.title ?? 'Untitled';

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
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[app.status]}`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{formatDate(app.appliedAt)}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function ApplicationsPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'all'>('all');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeFilter === 'all' ? '' : `?status=${activeFilter}`;
      const res = await fetch(`/api/applications${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data.applications ?? []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Count per status for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FILTERS.forEach((f) => {
      counts[f.value] = 0;
    });
    applications.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status]++;
      counts['all']++;
    });
    return counts;
  }, [applications]);

  // Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const responded = applications.filter(
      (a) => !['submitted', 'ghosted', 'draft'].includes(a.status)
    ).length;
    const interviewed = applications.filter(
      (a) => ['interview', 'assessment', 'offer'].includes(a.status)
    ).length;
    const offered = applications.filter((a) => a.status === 'offer').length;

    return {
      total,
      responseRate: total > 0 ? ((responded / total) * 100).toFixed(1) : '0.0',
      interviewRate: total > 0 ? ((interviewed / total) * 100).toFixed(1) : '0.0',
      offerRate: total > 0 ? ((offered / total) * 100).toFixed(1) : '0.0',
    };
  }, [applications]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap px-1 pb-3">
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
          applications.map((app) => <ApplicationCard key={app.id} app={app} />)
        )}
      </ScrollArea>

      {/* Stats summary */}
      <Separator className="mt-2" />
      <div className="grid grid-cols-4 gap-2 px-2 py-3">
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
    </div>
  );
}