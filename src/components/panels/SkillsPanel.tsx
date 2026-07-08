'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, Cpu, Database, Globe, Layers, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillItem {
  id: string;
  name: string;
  category: string;
  demandScore: number;
}

interface SkillsResponse {
  skills: SkillItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Programming', value: 'programming' },
  { label: 'AI / ML', value: 'ai_ml' },
  { label: 'Web Dev', value: 'web_dev' },
  { label: 'DevOps', value: 'devops' },
  { label: 'Data', value: 'data' },
  { label: 'Design', value: 'design' },
  { label: 'Soft Skills', value: 'soft_skills' },
];

const CATEGORY_COLORS: Record<string, string> = {
  programming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ai_ml: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  web_dev: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  devops: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  data: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  design: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  soft_skills: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground';
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'ai_ml':
      return Sparkles;
    case 'programming':
      return Cpu;
    case 'web_dev':
      return Globe;
    case 'devops':
      return Layers;
    case 'data':
      return Database;
    default:
      return TrendingUp;
  }
}

// ─── Skill Card ───────────────────────────────────────────────────────────────

function SkillCard({ skill, icon: Icon }: { skill: SkillItem; icon: React.ElementType }) {
  const colorClass = getCategoryColor(skill.category);
  const barColor =
    skill.demandScore >= 80
      ? 'bg-green-500'
      : skill.demandScore >= 60
        ? 'bg-yellow-500'
        : skill.demandScore >= 40
          ? 'bg-orange-400'
          : 'bg-red-400';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg bg-muted p-1.5 shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm truncate">{skill.name}</h3>
          </div>
          <span className="text-lg font-bold tabular-nums shrink-0">{skill.demandScore}</span>
        </div>

        <Badge variant="secondary" className={`text-[10px] font-medium mb-3 ${colorClass}`}>
          {skill.category.replace(/_/g, ' ')}
        </Badge>

        {/* Demand score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Demand Score</span>
            <span>{skill.demandScore}/100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${skill.demandScore}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkillsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-8" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SkillsPanel() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/skills${query}`);
      if (res.ok) {
        const data: SkillsResponse = await res.json();
        setSkills(data.skills);
      } else {
        setSkills([]);
      }
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkills();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSkills]);

  return (
    <div className="space-y-6">
      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search skills…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={category === opt.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategory(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <SkillsSkeleton />
      ) : skills.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {search || category
                ? 'No skills found matching your filters.'
                : 'No skills data available yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} icon={getCategoryIcon(skill.category)} />
          ))}
        </div>
      )}
    </div>
  );
}