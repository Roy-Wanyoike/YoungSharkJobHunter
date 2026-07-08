'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Activity, Search, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface SourceData {
  id: string;
  name: string;
  type: string;
  website: string;
  isActive: boolean;
  lastScraped: string | null;
  jobsCount: number;
  healthStatus: string;
  avgResponseMs: number | null;
  errorRate: number;
  connectorName: string | null;
}

interface GroupedSources {
  [key: string]: SourceData[];
}

interface SourcesResponse {
  sources: SourceData[];
  groupedByType: GroupedSources;
}

interface ScrapeResult {
  source: string;
  status: string;
  jobsFound: number;
  jobsNew: number;
  duration: number;
}

const SOURCE_TYPE_ORDER = ['ai_training', 'research_lab', 'big_tech', 'job_board', 'remote', 'ats', 'startup', 'freelance', 'government', 'university'];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  ai_training: 'AI Training',
  research_lab: 'Research Lab',
  big_tech: 'Big Tech',
  job_board: 'Job Board',
  remote: 'Remote',
  ats: 'ATS Platform',
  startup: 'Startup',
  freelance: 'Freelance',
  government: 'Government',
  university: 'University',
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  ai_training: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  research_lab: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  big_tech: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  job_board: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  remote: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  ats: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  startup: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  freelance: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  government: 'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
  university: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HealthDot({ status }: { status: string }) {
  if (status === 'healthy') return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
  if (status === 'degraded') return <div className="w-2 h-2 rounded-full bg-amber-500" />;
  return <div className="w-2 h-2 rounded-full bg-red-500" />;
}

export default function SourcesPanel() {
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult[] | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json.data || json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleScrape = async (aiOnly: boolean) => {
    setScraping(true);
    setScrapeResults(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiOnly ? { aiOnly: true } : {}),
      });
      if (!res.ok) throw new Error('Scraping failed');
      const json = await res.json();
      const results = json.results || json.data?.results || [];
      setScrapeResults(results);
      toast.success(`Scraped ${results.length} sources, found ${json.totalJobsFound || 0} jobs`);
      fetchSources();
    } catch {
      toast.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const filteredSources = (data?.sources || []).filter(s => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: GroupedSources = {};
  for (const s of filteredSources) {
    if (!grouped[s.type]) grouped[s.type] = [];
    grouped[s.type].push(s);
  }

  const sortedTypes = Object.keys(grouped).sort((a, b) =>
    SOURCE_TYPE_ORDER.indexOf(a) - SOURCE_TYPE_ORDER.indexOf(b)
  );

  const healthy = (data?.sources || []).filter(s => s.healthStatus === 'healthy').length;
  const degraded = (data?.sources || []).filter(s => s.healthStatus === 'degraded').length;
  const down = (data?.sources || []).filter(s => s.healthStatus === 'down').length;
  const totalJobs = (data?.sources || []).reduce((sum, s) => sum + s.jobsCount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <div className="flex gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}</div>
        <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div><p className="text-2xl font-bold">{healthy}</p><p className="text-xs text-muted-foreground">Healthy</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div><p className="text-2xl font-bold">{degraded}</p><p className="text-xs text-muted-foreground">Degraded</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div><p className="text-2xl font-bold">{down}</p><p className="text-xs text-muted-foreground">Down</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => handleScrape(false)} disabled={scraping} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />Scrape All
          </Button>
          <Button onClick={() => handleScrape(true)} disabled={scraping} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />AI Training Only
          </Button>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{data?.sources.length || 0} sources</span>
          <span>{totalJobs} jobs indexed</span>
        </div>
      </div>

      {scrapeResults && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scraping Results</span>
              <Button variant="ghost" size="sm" onClick={() => setScrapeResults(null)}>✕</Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
              {scrapeResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{r.source}</span>
                  <span className="text-muted-foreground">{r.jobsFound} found · {r.jobsNew} new · {r.duration}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search sources..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={typeFilter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTypeFilter('all')}>All</Badge>
          {SOURCE_TYPE_ORDER.filter(t => (data?.sources || []).some(s => s.type === t)).map(t => (
            <Badge key={t} variant={typeFilter === t ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTypeFilter(t)}>
              {SOURCE_TYPE_LABELS[t] || t}
            </Badge>
          ))}
        </div>
      </div>

      {sortedTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Globe className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No sources found</p>
        </div>
      ) : (
        sortedTypes.map(type => {
          const sources = grouped[type];
          const isCollapsed = collapsedGroups.has(type);
          return (
            <Card key={type}>
              <CardHeader className="py-3 cursor-pointer" onClick={() => toggleGroup(type)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <CardTitle className="text-sm font-semibold">{SOURCE_TYPE_LABELS[type] || type}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{sources.length}</Badge>
                  </div>
                  <Badge className={SOURCE_TYPE_COLORS[type] || ''}>{SOURCE_TYPE_LABELS[type] || type}</Badge>
                </div>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="pt-0 pb-3 space-y-2">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <HealthDot status={source.healthStatus} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{source.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{source.healthStatus}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {source.lastScraped && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{relativeTime(source.lastScraped)}</span>}
                            {source.avgResponseMs != null && <span>{source.avgResponseMs}ms</span>}
                            {source.errorRate > 0 && <span className="text-red-500">{(source.errorRate * 100).toFixed(1)}% err</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-xs">{source.jobsCount} jobs</Badge>
                        {source.website && (
                          <a href={source.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Activity className={`w-3.5 h-3.5 ${source.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}