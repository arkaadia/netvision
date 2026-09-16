import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isEn?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      const isEn = this.props.isEn !== undefined ? this.props.isEn : true;

      return (
        <div className="flex flex-col items-center justify-center min-h-[220px] p-6 m-4 bg-slate-900/90 text-slate-100 rounded-2xl border border-rose-500/30 shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="text-base font-bold text-white text-center mb-1">
            {this.props.fallbackTitle || (isEn ? 'Component Rendering Interrupted' : 'خطای غیرمنتظره در بارگذاری کامپوننت')}
          </h3>

          <p className="text-xs text-slate-400 text-center max-w-md mb-4 leading-relaxed font-mono">
            {this.state.error?.message || (isEn ? 'An unexpected UI error occurred.' : 'یک خطای سیستمی رخ داد.')}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
            >
              {isEn ? 'Retry Component' : 'تلاش مجدد'}
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isEn ? 'Reload Page' : 'بارگذاری مجدد صفحه'}
            </button>

            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isEn ? 'Details' : 'جزئیات'}
            </button>
          </div>

          {this.state.showDetails && (
            <div className="mt-4 w-full max-w-xl text-left bg-black/60 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-48 select-text">
              <div className="font-bold text-rose-400 mb-1">{this.state.error?.name}: {this.state.error?.message}</div>
              <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{this.state.error?.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
