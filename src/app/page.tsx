'use client';

import { useState, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Search, FileText, Sparkles, ClipboardList,
  Bot, ChevronLeft, ChevronRight, Menu, Zap, Globe, Brain,
  GraduationCap, DollarSign, Plug, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DashboardPanel = lazy(() => import('@/components/panels/DashboardPanel'));
const JobsPanel = lazy(() => import('@/components/panels/JobsPanel'));
const ResumeVaultPanel = lazy(() => import('@/components/panels/ResumeVaultPanel'));
const ResumeGeneratorPanel = lazy(() => import('@/components/panels/ResumeGeneratorPanel'));
const ApplicationsPanel = lazy(() => import('@/components/panels/ApplicationsPanel'));
const AIAssistantPanel = lazy(() => import('@/components/panels/AIAssistantPanel'));
const SkillsPanel = lazy(() => import('@/components/panels/SkillsPanel'));
const SalaryPanel = lazy(() => import('@/components/panels/SalaryPanel'));
const SourcesPanel = lazy(() => import('@/components/panels/SourcesPanel'));

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & analytics' },
  { id: 'jobs', label: 'Job Discovery', icon: Search, description: 'Find & scrape jobs', badge: '65' },
  { id: 'resume-vault', label: 'Resume Vault', icon: FileText, description: 'Upload & manage resumes' },
  { id: 'resume-generator', label: 'Resume Generator', icon: Sparkles, description: 'AI-powered resume tailoring' },
  { id: 'applications', label: 'Applications', icon: ClipboardList, description: 'Track & manage applications', badge: '15' },
  { id: 'assistant', label: 'AI Assistant', icon: Bot, description: 'Chat with your agent' },
  { id: 'skills', label: 'Skills & Learning', icon: GraduationCap, description: 'Skill ontology & gaps', badge: '266' },
  { id: 'salary', label: 'Salary Intelligence', icon: DollarSign, description: 'Compensation insights' },
  { id: 'sources', label: 'Sources & Connectors', icon: Plug, description: 'Manage job sources' },
];

function PanelFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Home() {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard': return <DashboardPanel />;
      case 'jobs': return <JobsPanel />;
      case 'resume-vault': return <ResumeVaultPanel />;
      case 'resume-generator': return <ResumeGeneratorPanel />;
      case 'applications': return <ApplicationsPanel />;
      case 'assistant': return <AIAssistantPanel />;
      case 'skills': return <SkillsPanel />;
      case 'salary': return <SalaryPanel />;
      case 'sources': return <SourcesPanel />;
      default: return <DashboardPanel />;
    }
  };

  const currentNav = navItems.find(n => n.id === activePanel);

  const handleNavClick = (id: string) => {
    setActivePanel(id);
    setMobileOpen(false);
  };

  const navContent = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = activePanel === item.id;
        const Icon = item.icon;
        return (
          <Tooltip key={item.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={() => handleNavClick(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                {(!sidebarCollapsed || undefined) && <span className="truncate">{item.label}</span>}
                {(!sidebarCollapsed || undefined) && item.badge && (<Badge variant={isActive ? 'default' : 'secondary'} className={`ml-auto text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center ${isActive ? 'bg-emerald-600 text-white hover:bg-emerald-600' : ''}`}>{item.badge}</Badge>)}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (<TooltipContent side="right"><span className="font-semibold">{item.label}</span><span className="text-xs text-muted-foreground">{item.description}</span></TooltipContent>)}
          </Tooltip>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col border-r border-border bg-card shrink-0 sticky top-0 h-screen transition-all duration-300" style={{ width: sidebarCollapsed ? 64 : 260 }}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-white" /></div>
            {!sidebarCollapsed && (<div className="overflow-hidden"><h1 className="font-bold text-sm leading-tight">YoungShark</h1><p className="text-xs text-muted-foreground">Job Hunter</p></div>)}
          </div>
          <Separator />
          <ScrollArea className="flex-1 px-2 py-3">
            {navContent}
          </ScrollArea>
          <Separator />
          <div className="p-3">
            {!sidebarCollapsed && (
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-3 mb-3">
                <div className="flex items-center gap-2 mb-1.5"><Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">9 AI Agents Active</span></div>
                <p className="text-xs text-muted-foreground leading-relaxed">Discovery, Resume, ATS, Interview, Learning, Market Intel, Career Coach, Cover Letter, Recruiter CRM</p>
                <div className="flex items-center gap-1.5 mt-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs text-emerald-600 dark:text-emerald-400">53 sources monitored</span></div>
              </div>
            )}
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
              {!sidebarCollapsed && (<div className="overflow-hidden"><p className="text-sm font-medium truncate">Alex Chen</p><p className="text-xs text-muted-foreground truncate">alex.chen@email.com</p></div>)}
            </div>
          </div>
        </div>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors z-50">
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-50 bg-card border border-border shadow-sm"><Menu className="w-5 h-5" /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="p-4 flex items-center gap-3 border-b">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-bold text-sm leading-tight">YoungShark</h1><p className="text-xs text-muted-foreground">Job Hunter</p></div>
          </div>
          <ScrollArea className="flex-1 px-2 py-3 h-full">
            {navContent}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3 pl-10 lg:pl-0">
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground"><Globe className="w-3.5 h-3.5" /><span>Job Intelligence Network</span><span className="text-border">|</span></div>
              <h2 className="font-semibold text-sm">{currentNav?.label}</h2>
              {currentNav?.description && (<span className="hidden sm:inline text-xs text-muted-foreground">— {currentNav?.description}</span>)}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />9 Agents Online</Badge>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-6">
          <Suspense fallback={<PanelFallback />}>
            {renderPanel()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}