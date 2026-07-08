'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, SendHorizontal, Sparkles, Search, Briefcase, FileText, BarChart3, Zap, User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Find AI Trainer jobs', icon: Search, message: 'Find AI Trainer jobs' },
  { label: 'Show remote jobs over $40/hr', icon: Briefcase, message: 'Show remote jobs over $40/hr' },
  { label: 'What skills am I missing?', icon: Zap, message: 'What skills am I missing?' },
  { label: 'Show my application status', icon: BarChart3, message: 'Show my application status' },
  { label: 'Generate resumes for top matches', icon: FileText, message: 'Generate resumes for top matches' },
  { label: 'Show Outlier jobs', icon: Sparkles, message: 'Show Outlier jobs' },
];

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function AIAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const vp = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { id: genId(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const botMsg: ChatMessage = { id: genId(), role: 'assistant', content: data.response ?? 'No response received.', timestamp: new Date() };
      setMessages((p) => [...p, botMsg]);
    } catch {
      const errMsg: ChatMessage = { id: genId(), role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: new Date() };
      setMessages((p) => [...p, errMsg]);
    } finally { setLoading(false); }
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const hasMessages = messages.length > 0;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold leading-tight">AI Assistant</div>
            <p className="text-[11px] text-muted-foreground font-normal">Your employment agent</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0 flex flex-col overflow-hidden">
        {!hasMessages && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
            <div className="rounded-2xl bg-primary/10 p-5 mb-4">
              <Bot className="size-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1">AI Employment Agent</h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              I can help you find jobs, generate resumes, track applications, and more.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => sendMessage(a.message)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="py-4 space-y-1">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex items-end gap-3 px-4 py-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="size-7 rounded-lg shrink-0">
                      <AvatarFallback className={`rounded-lg text-xs ${isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[80%] space-y-1">
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted'}`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                        )}
                      </div>
                      <p className={`text-[10px] text-muted-foreground px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {fmtTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex items-end gap-3 px-4 py-2">
                  <Avatar className="size-7 rounded-lg shrink-0">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      <Bot className="size-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="border-t p-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your job search..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading} className="shrink-0 rounded-xl" aria-label="Send message">
              <SendHorizontal className="size-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}