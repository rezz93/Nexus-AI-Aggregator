import React from 'react';
import { AlertCircle, RefreshCw, Activity, CheckCircle2, ChevronRight, Sparkles, HelpCircle } from 'lucide-react';

interface DiagnosticBannerProps {
  unreachableCount: number;
  totalCount: number;
  onOpenDiagnostics: () => void;
  onRetry: () => void;
  isRefreshing: boolean;
  onShowExplanation: () => void;
}

export const DiagnosticBanner: React.FC<DiagnosticBannerProps> = ({
  unreachableCount,
  totalCount,
  onOpenDiagnostics,
  onRetry,
  isRefreshing,
  onShowExplanation,
}) => {
  if (unreachableCount === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#191114] border border-[#3B1E24] text-rose-300 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-rose-200">
              {unreachableCount} {unreachableCount === 1 ? 'source' : 'sources'} could not be reached.
            </span>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              {totalCount - unreachableCount}/{totalCount} Active
            </span>
          </div>
          <p className="text-xs text-rose-400/80 mt-0.5">
            Likely caused by remote server rate limits or CORS headers. Our server proxy is auto-recovering.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={onShowExplanation}
          className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" /> What happened?
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-[#24171A] hover:bg-[#2E1D22] border border-[#3B1E24] rounded-lg transition-colors flex items-center gap-1"
        >
          <Activity className="w-3.5 h-3.5" /> View Index
        </button>

        <button
          onClick={onRetry}
          disabled={isRefreshing}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Retrying...' : 'Retry All'}
        </button>
      </div>
    </div>
  );
};
