'use client';
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20">
          <h3 className="text-red-700 font-semibold mb-2">Component Error</h3>
          <pre className="text-xs text-red-600 overflow-auto max-h-40 whitespace-pre-wrap">{this.state.error?.message}</pre>
          <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-60 whitespace-pre-wrap">{this.state.error?.stack?.substring(0, 500)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}