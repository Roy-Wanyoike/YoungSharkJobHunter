'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Video, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  sub?: string;
  label: string;
  accentClass: string;
  loading?: boolean;
}

function StatCard({ icon, value, sub, label, accentClass, loading }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${accentClass}`}>{icon}</div>
      <div className="min-w-0">
        {loading ? (<><Skeleton className="h-7 w-12 mb-1" /><Skeleton className="h-3.5 w-24" /></>) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {sub && <span className="text-xs text-muted-foreground font-medium">{sub}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

const sourceTypeColor: Record<string, string> = {
  ai_training: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  research_lab: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  big_tech: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  remote: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  startup: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  job_board: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400',
  ats: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
  freelance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

const sourceTypeLabel: Record<string, string> = {
  ai_training: 'AI Training', research_lab: 'Research', big_tech: 'Big Tech',
  remote: 'Remote', startup: 'Startup', job_board: 'Job Board', ats: 'ATS', freelance: 'Freelance',
};

const pipelineColors: Record<string, string> = {
  submitted: 'bg-teal-500', reviewing: 'bg-amber-500', interview: 'bg-emerald-500',
  assessment: 'bg-purple-500', offer: 'bg-green-500', rejected: 'bg-red-400', ghosted: 'bg-gray-400',
};

export default function DashboardPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(json => { if (!cancelled) setData(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = data?.stats;
  const dailyData = data?.dailyApplications ?? [];
  const matchDist = data?.matchScoreDistribution ?? [];
  const topSources = data?.topSources ?? [];
  const pipeline = data?.statusBreakdown
    ? Object.entries(data.statusBreakdown).map(([status, count]) => ({
        status, count: count as number, color: pipelineColors[status] ?? 'bg-gray-400',
      }))
    : [];
  const pipelineTotal = pipeline.reduce((s: number, p: any) => s + p.count, 0);
  const maxDaily = Math.max(...dailyData.map((d: any) => d.count), 1);
  const maxMatch = Math.max(...matchDist.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Search className="w-5 h-5 text-white" />} value={stats?.jobsToday ?? 0} label="Jobs Found Today" accentClass="bg-emerald-500" loading={loading} />
        <StatCard icon={<Send className="w-5 h-5 text-white" />} value={stats?.totalApplications ?? 0} sub={stats ? `+${stats.applicationsToday} today` : undefined} label="Applications" accentClass="bg-teal-500" loading={loading} />
        <StatCard icon={<Video className="w-5 h-5 text-white" />} value={stats?.interviews ?? 0} label="Interviews" accentClass="bg-orange-500" loading={loading} />
        <StatCard icon={<Trophy className="w-5 h-5 text-white" />} value={stats?.offers ?? 0} label="Offers" accentClass="bg-emerald-500" loading={loading} />
      </div>

      {/* Charts Row - CSS Based */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Applications Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (<Skeleton className="h-[260px] w-full" />) : (
              <div className="flex items-end gap-1.5 h-[220px]">
                {dailyData.map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 min-h-[4px]"
                      style={{ height: `${(d.count / maxDaily) * 180}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.date}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Match Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              Match Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (<Skeleton className="h-[260px] w-full" />) : (
              <div className="space-y-3">
                {matchDist.map((d: any, i: number) => {
                  const pct = (d.count / maxMatch) * 100;
                  const color = i === 0 ? 'from-emerald-500 to-emerald-400' : i === 1 ? 'from-teal-500 to-teal-400' : i === 2 ? 'from-amber-500 to-amber-400' : 'from-gray-400 to-gray-300';
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{d.range}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${Math.max(pct, 5)}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Job Sources */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Job Sources</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-16" /></div>))}</div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {topSources.map((source: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium truncate mr-2">{source.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs tabular-nums font-semibold">{source.count}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${sourceTypeColor[source.type] ?? ''}`}>{sourceTypeLabel[source.type] ?? source.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Pipeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Application Pipeline</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4"><Skeleton className="h-4 w-full rounded-full" /><div className="flex justify-between">{Array.from({ length: 7 }).map((_, i) => (<div key={i} className="flex flex-col items-center gap-1.5"><Skeleton className="h-5 w-8" /><Skeleton className="h-3 w-14 rounded-full" /></div>))}</div></div>
            ) : (
              <div className="space-y-6">
                {pipeline.length > 0 && (
                  <>
                    <div className="flex rounded-full overflow-hidden h-4 gap-0.5">
                      {pipeline.map((stage: any, idx: number) => {
                        const pct = pipelineTotal > 0 ? (stage.count / pipelineTotal) * 100 : 0;
                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <div className={`${stage.color} transition-all duration-700 cursor-default`} style={{ width: `${Math.max(pct, 2)}%` }} />
                            </TooltipTrigger>
                            <TooltipContent><p>{stage.status.replace(/_/g, ' ')}: {stage.count} ({pct.toFixed(1)}%)</p></TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                      {pipeline.map((stage: any, idx: number) => {
                        const pct = pipelineTotal > 0 ? (stage.count / pipelineTotal) * 100 : 0;
                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1.5 cursor-default">
                                <span className="text-sm font-semibold tabular-nums">{stage.count}</span>
                                <div className="w-full h-3 rounded-full bg-muted overflow-hidden min-w-[48px]">
                                  <div className={`h-full rounded-full ${stage.color} transition-all duration-500`} style={{ width: `${Math.max(pct, 4)}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate w-full text-center capitalize">{stage.status.replace(/_/g, ' ')}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>{stage.status.replace(/_/g, ' ')}: {stage.count} ({pct.toFixed(1)}%)</p></TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </>
                )}
                {stats && (
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{stats.responseRate}%</p>
                      <p className="text-xs text-muted-foreground">Response Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-teal-600">{stats.avgMatchScore}%</p>
                      <p className="text-xs text-muted-foreground">Avg Match Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">{stats.totalJobsFound}</p>
                      <p className="text-xs text-muted-foreground">Total Jobs Found</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}