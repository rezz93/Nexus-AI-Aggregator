import React from 'react';
import { X, ShieldAlert, CheckCircle2, Server, Globe, Cpu, RefreshCw, ArrowRight } from 'lucide-react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/80 backdrop-blur-sm">
      <div className="bg-[#0F0F12] border border-[#1F1F23] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F1F23] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Why Your Original App Showed This Error</h2>
              <p className="text-xs text-gray-400 font-mono">
                Root Cause Analysis: "6 sources could not be reached"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#E0E0E6] text-sm">
          <div className="p-4 bg-[#191114] border border-[#3B1E24] rounded-xl text-xs space-y-2 text-rose-300">
            <span className="font-bold text-sm block text-rose-200">1. Browser CORS Restrictions (Cross-Origin Resource Sharing)</span>
            <p className="leading-relaxed">
              When a client-side React app executes <code>fetch('https://feeds.npr.org/...')</code> or other news RSS feeds directly from the visitor's browser, web browsers block the request because news servers do not include the <code>Access-Control-Allow-Origin: *</code> header.
            </p>
          </div>

          <div className="p-4 bg-[#1F1B12] border border-[#3B321E] rounded-xl text-xs space-y-2 text-amber-300">
            <span className="font-bold text-sm block text-amber-200">2. Public CORS Proxy Fragility or Missing User-Agent</span>
            <p className="leading-relaxed">
              If your app used free public CORS proxies (like <code>allorigins</code>, <code>corsproxy.io</code>, or <code>cors-anywhere</code>), major news outlets like NYT, Politico, Reuters, and Bassmaster quickly rate-limit, IP-ban, or present Cloudflare anti-bot verification challenges to those shared proxy IPs. Additionally, requests without a desktop <code>User-Agent</code> header get an instant 403 Forbidden response.
            </p>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-2 text-blue-200">
            <span className="font-bold text-sm block flex items-center gap-1.5 text-blue-400">
              <CheckCircle2 className="w-4 h-4 text-blue-400" /> How We Solved It in This App
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-gray-300 leading-relaxed">
              <li>
                <strong className="text-white">Server-Side Proxy with Custom Headers:</strong> We created <code>/api/feed</code> and <code>/api/feeds/batch</code> with full browser User-Agent headers, gzip decompression, and isolated concurrency.
              </li>
              <li>
                <strong className="text-white">Robust Dual XML Parser:</strong> Handles RSS 2.0, Atom, Media RSS (thumbnails), CDATA sections, and malformed tags seamlessly.
              </li>
              <li>
                <strong className="text-white">Resilient Fallback Pipeline:</strong> If any single feed has network blips, the rest of the feed stays loaded, and automatic retry mechanisms run in the background.
              </li>
              <li>
                <strong className="text-white">Gemini 2.5 Flash AI Engine:</strong> Added instant 3-bullet debriefs, "Why this matters", executive audio digests, and an interactive intelligence desk.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141418] border-t border-[#1F1F23] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Got It, Back to News Stream
          </button>
        </div>
      </div>
    </div>
  );
};
