'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Trophy,
  Bookmark,
  TrendingUp,
  BarChart3,
  Activity,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Briefcase,
  Send,
  Zap,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalJobsFound: number;
  jobsToday: number;
  totalApplications: number;
  applicationsToday: number;
  interviews: number;
  offers: number;
  rejected: number;
  ghosted: number;
  avgMatchScore: number;
  responseRate: number;
  savedJobs: number;
}

interface DailyApplication {
  date: string;
  count: number;
}

interface MatchDistributionItem {
  range: string;
  count: number;
}

interface SourceDistributionItem {
  sourceType: string;
  count: number;
}

type StatusBreakdown = Record<string, number>;

interface ScrapingHealth {
  healthy: number;
  degraded: number;
  down: number;
  lastScraped: string | null;
}

interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  stats: DashboardStats;
  dailyApplications: DailyApplication[];
  matchDistribution: MatchDistributionItem[];
  sourceDistribution: SourceDistributionItem[];
  statusBreakdown: StatusBreakdown;
  scrapingHealth: ScrapingHealth;
  recentNotifications: DashboardNotification[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  delta: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, delta, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="rounded-lg p-2" style={{ backgroundColor: iconBg }}>
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          {delta > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              +{delta} today
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CSS Bar Chart (14 days) ─────────────────────────────────────────────────

function DailyAppsChart({ data }: { data: DailyApplication[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Applications (14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No data yet</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {data.map((d) => {
              const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <TooltipProvider key={d.date}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors cursor-default min-h-[4px]"
                          style={{ height: `${Math.max(height, 3)}%` }}
                        />
                        <span className="text-[9px] text-muted-foreground leading-tight">
                          {formatShortDate(d.date).replace(' ', '\n')}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {formatShortDate(d.date)}: <strong>{d.count}</strong> applications
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Match Distribution (horizontal bars) ─────────────────────────────────────

function MatchDistribution({ data }: { data: MatchDistributionItem[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const barColor = (range: string): string => {
    if (range === '80-100') return 'bg-green-500';
    if (range === '60-80') return 'bg-yellow-500';
    if (range === '40-60') return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Match Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
        ) : (
          data.map((item) => (
            <div key={item.range} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{item.range}%</span>
                <span className="text-muted-foreground tabular-nums">{item.count}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(item.range)}`}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Source Distribution ──────────────────────────────────────────────────────

function SourceDistribution({ data }: { data: SourceDistributionItem[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Source Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
        ) : (
          data.map((item) => (
            <div key={item.sourceType} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium capitalize">{item.sourceType.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground tabular-nums">
                  {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Application Pipeline ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  interview: 'Interview',
  assessment: 'Assessment',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  reviewing: 'bg-yellow-500',
  interview: 'bg-purple-500',
  assessment: 'bg-orange-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-500',
  ghosted: 'bg-gray-300',
};

function PipelineView({ breakdown }: { breakdown: StatusBreakdown }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const maxVal = Math.max(...Object.values(breakdown), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" />
          Application Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Stacked bar */}
        {total > 0 && (
          <div className="flex h-4 w-full rounded-full overflow-hidden">
            {Object.entries(breakdown).map(([status, count]) => {
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className={`${STATUS_COLORS[status] ?? 'bg-gray-400'} transition-all duration-500`}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${STATUS_LABELS[status] ?? status}: ${count}`}
                />
              );
            })}
          </div>
        )}

        {/* Status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(breakdown).map(([status, count]) => (
            <div
              key={status}
              className="rounded-lg border px-3 py-2 flex items-center gap-2"
            >
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums">{count}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {STATUS_LABELS[status] ?? status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Scraping Health ──────────────────────────────────────────────────────────

function ScrapingHealthSection({ health }: { health: ScrapingHealth }) {
  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Scraping Health
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-4">
          {/* Healthy */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Healthy</span>
            <span className="text-sm font-semibold">{health.healthy}</span>
          </div>
          {/* Degraded */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">Degraded</span>
            <span className="text-sm font-semibold">{health.degraded}</span>
          </div>
          {/* Down */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Down</span>
            <span className="text-sm font-semibold">{health.down}</span>
          </div>
        </div>

        {health.lastScraped && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Last scraped: {relativeTime(health.lastScraped)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Stats ──────────────────────────────────────────────────────────────

function QuickStats({ stats }: { stats: DashboardStats }) {
  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Avg Match Score</span>
          <span className="font-semibold">{stats.avgMatchScore}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stats.avgMatchScore >= 80 ? 'bg-green-500' : stats.avgMatchScore >= 60 ? 'bg-yellow-500' : 'bg-red-400'
            }`}
            style={{ width: `${stats.avgMatchScore}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm pt-1">
          <span className="text-muted-foreground">Response Rate</span>
          <span className="font-semibold">{stats.responseRate}%</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rejected</span>
          <span className="font-semibold text-red-500">{stats.rejected}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ghosted</span>
          <span className="font-semibold text-muted-foreground">{stats.ghosted}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent Notifications ─────────────────────────────────────────────────────

function NotificationsSection({
  notifications,
  onMarkRead,
}: {
  notifications: DashboardNotification[];
  onMarkRead: (id: string) => void;
}) {
  const notifIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Recent Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-1">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No notifications</p>
          ) : (
            notifications.slice(0, 5).map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkRead(notif.id);
                }}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 flex items-start gap-2.5 ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">{notifIcon(notif.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notif.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{relativeTime(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Row 4 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentNotifications: prev.recentNotifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        };
      });
    } catch {
      toast.error('Failed to mark notification as read');
    }
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) {
    return (
      <Card className="py-16">
        <CardContent className="text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Failed to load dashboard data.</p>
          <Button variant="outline" className="mt-3" onClick={fetchDashboard}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { stats, dailyApplications, matchDistribution, sourceDistribution, statusBreakdown, scrapingHealth, recentNotifications } = data;

  return (
    <div className="space-y-6">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Jobs Found"
          value={stats.totalJobsFound}
          delta={stats.jobsToday}
          icon={Search}
          iconBg="rgba(59, 130, 246, 0.1)"
          iconColor="#3b82f6"
        />
        <StatCard
          label="Applications"
          value={stats.totalApplications}
          delta={stats.applicationsToday}
          icon={Send}
          iconBg="rgba(168, 85, 247, 0.1)"
          iconColor="#a855f7"
        />
        <StatCard
          label="Interviews"
          value={stats.interviews}
          delta={0}
          icon={Briefcase}
          iconBg="rgba(34, 197, 94, 0.1)"
          iconColor="#22c55e"
        />
        <StatCard
          label="Offers"
          value={stats.offers}
          delta={0}
          icon={Trophy}
          iconBg="rgba(234, 179, 8, 0.1)"
          iconColor="#eab308"
        />
        <StatCard
          label="Saved Jobs"
          value={stats.savedJobs}
          delta={0}
          icon={Bookmark}
          iconBg="rgba(249, 115, 22, 0.1)"
          iconColor="#f97316"
        />
      </div>

      {/* Row 2: Daily Applications Chart + Match Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DailyAppsChart data={dailyApplications} />
        <MatchDistribution data={matchDistribution} />
      </div>

      {/* Row 3: Source Distribution + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourceDistribution data={sourceDistribution} />
        <PipelineView breakdown={statusBreakdown} />
      </div>

      {/* Row 4: Scraping Health + Quick Stats + Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScrapingHealthSection health={scrapingHealth} />
        <QuickStats stats={stats} />
        <NotificationsSection notifications={recentNotifications} onMarkRead={handleMarkRead} />
      </div>
    </div>
  );
}