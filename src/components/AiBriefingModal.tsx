import React, { useState, useEffect } from 'react';
import { X, Sparkles, Volume2, VolumeX, Loader2, Play, Pause, Compass, Share2, Check } from 'lucide-react';
import { DailyDigest, StoryItem } from '../types';
import { getDailyBriefing } from '../services/feedClient';

interface AiBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoryItem[];
  activeCategory: string;
}

export const AiBriefingModal: React.FC<AiBriefingModalProps> = ({
  isOpen,
  onClose,
  stories,
  activeCategory,
}) => {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !digest && stories.length > 0) {
      loadBriefing();
    }
  }, [isOpen, stories]);

  // Clean up speech synthesis if modal closes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const loadBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDailyBriefing(stories, activeCategory);
      setDigest(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate briefing.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const textToRead = digest?.audioDigestScript || `${digest?.headline}. ${digest?.executiveSummary}`;
      if (!textToRead) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleCopy = () => {
    if (!digest) return;
    const text = `SIGNAL / 01 EXECUTIVE INTELLIGENCE BRIEFING\n\n${digest.headline}\n\n${digest.executiveSummary}\n\nKey Themes:\n${digest.topThemes.map(t => `• ${t.theme}: ${t.summary}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/80 backdrop-blur-sm">
      <div className="bg-[#0F0F12] border border-[#1F1F23] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F1F23] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
                  INTELLIGENCE DESK
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400 font-mono">Gemini 3.7 Flash</span>
              </div>
              <h2 className="text-base font-bold text-white">Executive Daily Briefing</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {digest && (
              <>
                <button
                  onClick={handleToggleAudio}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isPlayingAudio
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : 'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20'
                  }`}
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {isPlayingAudio ? 'Pause Audio' : 'Play Briefing Audio'}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
                  title="Copy digest"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">Synthesizing live news stories...</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Analyzing incoming RSS dispatches across {stories.length} articles to extract macro trends and key narratives.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm space-y-2">
              <p className="font-semibold">Unable to compile briefing:</p>
              <p className="text-xs">{error}</p>
              <button
                onClick={loadBriefing}
                className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {digest && !loading && (
            <div className="space-y-6">
              {/* Headline */}
              <div className="border-b border-[#1F1F23] pb-5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 mb-2">
                  <span>CATEGORY: {digest.topic.toUpperCase()}</span>
                  <span>•</span>
                  <span>SYNTHESIZED AT {digest.generatedAt}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif-display font-semibold text-white leading-tight">
                  {digest.headline}
                </h1>
              </div>

              {/* Executive Summary */}
              <div className="space-y-3 text-[#E0E0E6] leading-relaxed font-serif-display text-base sm:text-lg">
                {digest.executiveSummary.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {/* Top Themes */}
              {digest.topThemes && digest.topThemes.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-[#1F1F23]">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
                    KEY THEMATIC BREAKDOWNS
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {digest.topThemes.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#141418] border border-[#1F1F23] rounded-xl space-y-1.5 shadow-xs"
                      >
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {item.theme}
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio digest script preview */}
              {digest.audioDigestScript && (
                <div className="p-4 bg-[#141418] border border-[#2A2A34] text-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-blue-400">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> VOICE SCRIPT OVERVIEW
                    </span>
                    <button
                      onClick={handleToggleAudio}
                      className="text-blue-300 underline hover:text-white"
                    >
                      {isPlayingAudio ? 'Stop' : 'Listen Now'}
                    </button>
                  </div>
                  <p className="text-xs italic text-gray-300 font-serif-display leading-relaxed">
                    "{digest.audioDigestScript}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#141418] border-t border-[#1F1F23] flex items-center justify-between text-xs text-gray-400">
          <span>Synthesized from {stories.length} live RSS dispatches</span>
          <button
            onClick={loadBriefing}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-300 bg-[#1A1A20] hover:bg-[#24242A] border border-[#2A2A30] rounded-lg transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
};
