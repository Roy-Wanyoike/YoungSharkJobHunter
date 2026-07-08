'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, BarChart3, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface SalaryRoleInsight {
  role: string;
  sampleSize: number;
  salaryMin: number;
  salaryMax: number;
  salaryMedian: number;
  salaryType: string;
  salaryRange: number;
}

interface SalarySourceInsight {
  sourceType: string;
  sampleSize: number;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  roles: SalaryRoleInsight[];
}

interface SalaryData {
  byRole: SalaryRoleInsight[];
  bySourceType: SalarySourceInsight[];
  overallMin: number;
  overallMax: number;
  overallMedian: number;
  totalSampleSize: number;
}

function formatSalary(val: number, type: string): string {
  if (type === 'hourly') return `$${val}/hr`;
  return `$${val >= 1000 ? `${Math.round(val / 1000)}K` : val}/yr`;
}

function titleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function SalaryPanel() {
  const [data, setData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleSearch, setRoleSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const fetchSalary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleSearch) params.set('role', roleSearch);
      if (levelFilter !== 'all') params.set('level', levelFilter);
      const res = await fetch(`/api/salary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch salary data');
      const json = await res.json();
      setData(json.data || json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [roleSearch, levelFilter]);

  useEffect(() => { fetchSalary(); }, [fetchSalary]);

  const filteredRoles = data?.byRole.filter(r =>
    !roleSearch || r.role.toLowerCase().includes(roleSearch.toLowerCase())
  ) || [];

  const sourceTypeColors: Record<string, string> = {
    ai_training: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    research_lab: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    big_tech: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    job_board: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    remote: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    ats: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    startup: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!data || data.totalSampleSize === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <DollarSign className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">No salary data available</p>
        <p className="text-sm mt-1">Start scraping jobs to collect salary information</p>
      </div>
    );
  }

  const overallRange = data.overallMax - data.overallMin || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-red-500" /><span className="text-xs text-muted-foreground">Min Salary</span></div>
            <p className="text-xl font-bold">{formatSalary(data.overallMin, 'hourly')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Max Salary</span></div>
            <p className="text-xl font-bold">{formatSalary(data.overallMax, data.byRole[0]?.salaryType || 'hourly')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-teal-500" /><span className="text-xs text-muted-foreground">Median Salary</span></div>
            <p className="text-xl font-bold">{formatSalary(Math.round(data.overallMedian), data.byRole[0]?.salaryType || 'hourly')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Sample Size</span></div>
            <p className="text-xl font-bold">{data.totalSampleSize}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search roles..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Experience Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="entry">Entry Level</SelectItem>
            <SelectItem value="mid">Mid Level</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Salary by Role</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {filteredRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No roles match your search</p>
          ) : (
            filteredRoles.map(role => {
              const leftPct = ((role.salaryMin - data.overallMin) / overallRange) * 100;
              const widthPct = Math.max((role.salaryRange / overallRange) * 100, 4);
              const medianPct = ((role.salaryMedian - data.overallMin) / overallRange) * 100;
              return (
                <div key={role.role} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{titleCase(role.role)}</span>
                      <Badge variant="outline" className="text-xs">{role.salaryType === 'hourly' ? '/hr' : '/yr'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">n={role.sampleSize}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatSalary(Math.round(role.salaryMedian), role.salaryType)}</span>
                    </div>
                  </div>
                  <div className="relative h-6 bg-muted rounded-full">
                    <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                    <div className="absolute inset-y-0 w-0.5 bg-foreground rounded-full" style={{ left: `${medianPct}%` }} />
                    <div className="absolute inset-y-0 flex items-center text-xs text-muted-foreground" style={{ left: `${leftPct}%`, transform: 'translateX(-100%)' }}>
                      <span className="pr-2">${role.salaryMin}</span>
                    </div>
                    <div className="absolute inset-y-0 flex items-center text-xs text-muted-foreground" style={{ left: `${leftPct + widthPct}%` }}>
                      <span className="pl-2">${role.salaryMax}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Salary by Source Type</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {data.bySourceType.map(src => (
            <div key={src.sourceType} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{titleCase(src.sourceType)}</span>
                  <Badge variant="outline" className="text-xs">{src.sampleSize} jobs</Badge>
                  <Badge className={sourceTypeColors[src.sourceType] || 'bg-gray-100 text-gray-700'}>{titleCase(src.sourceType)}</Badge>
                </div>
                <span className="text-sm font-semibold">Median: {formatSalary(Math.round(src.avgMedian), 'hourly')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground text-xs">Avg Min</p><p className="font-semibold">${src.avgMin}</p></div>
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground text-xs">Avg Max</p><p className="font-semibold">${src.avgMax}</p></div>
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground text-xs">Avg Median</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">${Math.round(src.avgMedian)}</p></div>
              </div>
              {src.roles.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  {src.roles.slice(0, 4).map(r => (
                    <div key={r.role} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{titleCase(r.role)}</span>
                      <span>${r.salaryMin} – ${r.salaryMax}</span>
                    </div>
                  ))}
                  {src.roles.length > 4 && <p className="text-xs text-muted-foreground">+{src.roles.length - 4} more roles</p>}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}