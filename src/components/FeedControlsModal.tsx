import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Layers,
  Filter,
  ShieldAlert,
  ArrowDownUp,
  LayoutGrid,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info,
  Flame,
  Plus,
  Trash2,
} from 'lucide-react';
import { FeedPreferences, FeedSource } from '../types';

interface FeedControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: FeedPreferences;
  onChangePreferences: (updated: Partial<FeedPreferences>) => void;
  sources: FeedSource[];
  onToggleSource: (id: string) => void;
}

export const FeedControlsModal: React.FC<FeedControlsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onChangePreferences,
  sources,
  onToggleSource,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'how-it-works' | 'sources'>('controls');
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [newIncludedWord, setNewIncludedWord] = useState('');

  if (!isOpen) return null;

  const handleAddBlocked = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedWord.trim()) return;
    const word = newBlockedWord.trim().toLowerCase();
    if (!preferences.blockedKeywords.includes(word)) {
      onChangePreferences({
        blockedKeywords: [...preferences.blockedKeywords, word],
      });
    }
    setNewBlockedWord('');
  };

  const handleRemoveBlocked = (word: string) => {
    onChangePreferences({
      blockedKeywords: preferences.blockedKeywords.filter((w) => w !== word),
    });
  };

  const handleAddIncluded = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncludedWord.trim()) return;
    const word = newIncludedWord.trim().toLowerCase();
    if (!preferences.includedKeywords.includes(word)) {
      onChangePreferences({
        includedKeywords: [...preferences.includedKeywords, word],
      });
    }
    setNewIncludedWord('');
  };

  const handleRemoveIncluded = (word: string) => {
    onChangePreferences({
      includedKeywords: preferences.includedKeywords.filter((w) => w !== word),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0F0F13] border border-[#222228] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F1F24] flex items-center justify-between bg-[#131318]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
                CURATION & FEED CONTROLS
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Control What is Shown on Your Front Page
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1E1E24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-[#111116] border-b border-[#1F1F24] flex items-center gap-2">
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'controls'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Feed Controls & Limits
          </button>

          <button
            onClick={() => setActiveTab('how-it-works')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'how-it-works'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            How Stories Are Selected & Processed
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'sources'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Active Publishers ({sources.filter((s) => s.enabled).length}/{sources.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B0B0E] space-y-6">
          {/* TAB 1: CONTROLS & LIMITS */}
          {activeTab === 'controls' && (
            <div className="space-y-6 max-w-3xl">
              {/* 1. Max Articles Per Source Limit */}
              <div className="bg-[#121217] border border-[#1E1E24] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                        SOURCE BALANCE (ANTI-MONOPOLY)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      Limit Number of Articles from One Source
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Prevents high-volume wire feeds (like The Hill or Outdoor Life) from drowning out other publishers. Only the freshest N stories per outlet are displayed.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-blue-400 px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      {preferences.maxArticlesPerSource === 0
                        ? 'Unlimited'
                        : `Max ${preferences.maxArticlesPerSource} / source`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {[
                    { label: 'Max 2 / source', val: 2 },
                    { label: 'Max 3 / source', val: 3 },
                    { label: 'Max 5 / source', val: 5 },
                    { label: 'Max 10 / source', val: 10 },
                    { label: 'Unlimited (All)', val: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => onChangePreferences({ maxArticlesPerSource: opt.val })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        preferences.maxArticlesPerSource === opt.val
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[#181820] text-gray-400 hover:text-white hover:bg-[#20202A] border border-[#22222A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Sorting & Stream Arrangement */}
              <div className="bg-[#121217] border border-[#1E1E24] rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                    FEED ARRANGEMENT
                  </span>
                  <h3 className="text-sm font-bold text-white">Story Ordering & Interleaving</h3>
                  <p className="text-xs text-gray-400">
                    Choose how stories are ordered across your publishers.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'newest',
                      title: '⚡ Pure Chronological',
                      desc: 'Freshest breaking stories at the very top by timestamp.',
                    },
                    {
                      id: 'balanced',
                      title: '⚖️ Balanced Interleaved',
                      desc: 'Alternates sources so consecutive cards are from different outlets.',
                    },
                    {
                      id: 'category',
                      title: '📂 Category Prioritized',
                      desc: 'Organized by topical balance and impact.',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onChangePreferences({ sortBy: mode.id as any })}
                      className={`p-3.5 rounded-xl text-left border transition-all ${
                        preferences.sortBy === mode.id
                          ? 'bg-blue-500/10 border-blue-500/40 text-white shadow-xs'
                          : 'bg-[#16161D] border-[#22222A] text-gray-400 hover:text-gray-200 hover:bg-[#1A1A24]'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-white mb-1">{mode.title}</h4>
                      <p className="text-[11px] text-gray-400 leading-snug">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Keyword Blocklist (Exclude unwanted topics) */}
              <div className="bg-[#121217] border border-[#1E1E24] rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-mono font-bold text-red-400 uppercase">
                      EXCLUDE / BLOCKLIST
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Hide Stories with Specific Words</h3>
                  <p className="text-xs text-gray-400">
                    Filter out noisy topics, gossip, or unwanted keywords from your front page.
                  </p>
                </div>

                <form onSubmit={handleAddBlocked} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. crypto, horoscope, celebrity..."
                    value={newBlockedWord}
                    onChange={(e) => setNewBlockedWord(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#0C0C0F] text-white border border-[#22222A] rounded-lg focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Block Keyword
                  </button>
                </form>

                {preferences.blockedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {preferences.blockedKeywords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-red-500/10 text-red-300 border border-red-500/25 rounded-md"
                      >
                        🚫 {word}
                        <button
                          onClick={() => handleRemoveBlocked(word)}
                          className="text-red-400 hover:text-red-200 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 italic font-mono">
                    No blocked keywords currently active.
                  </p>
                )}
              </div>

              {/* 4. Keyword Whitelist (Must-include terms) */}
              <div className="bg-[#121217] border border-[#1E1E24] rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                      MUST-INCLUDE TOPICS (TOPIC PINNING)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Focus on Specific Keywords</h3>
                  <p className="text-xs text-gray-400">
                    If added, the feed will prioritize or restrict to stories that match these words.
                  </p>
                </div>

                <form onSubmit={handleAddIncluded} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. tournament, bass, elections, semiconductors..."
                    value={newIncludedWord}
                    onChange={(e) => setNewIncludedWord(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#0C0C0F] text-white border border-[#22222A] rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Require Keyword
                  </button>
                </form>

                {preferences.includedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {preferences.includedKeywords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-md"
                      >
                        ✓ {word}
                        <button
                          onClick={() => handleRemoveIncluded(word)}
                          className="text-emerald-400 hover:text-emerald-200 ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 italic font-mono">
                    All topics included (open feed mode).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HOW IT WORKS (EXPLAINING THE PROCESS) */}
          {activeTab === 'how-it-works' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-[#121217] border border-[#1E1E24] rounded-xl p-5 space-y-3">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                  THE EDITORIAL PIPELINE
                </span>
                <h3 className="text-base font-bold text-white">
                  How Articles Are Selected & Added to Your Front Page
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Unlike algorithmic social feeds that manipulate attention with engagement loops, Nexus uses an <strong>objective 5-stage curation pipeline</strong> that puts you in complete control:
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {[
                  {
                    step: '01',
                    title: 'Direct Multi-Source Fetching',
                    desc: 'The server proxy issues parallel GET requests to all enabled newsrooms (ABC, CBS, Politico, Bassmaster, Ars Technica, etc.) fetching unadulterated wire items in real-time.',
                    badge: 'Zero Middlemen',
                  },
                  {
                    step: '02',
                    title: 'Headline Normalization & Media Extraction',
                    desc: 'Cleans noisy XML entities, removes tracking parameters, extracts high-res lead photography, and automatically enhances vague live-update headlines (e.g. NYT "Here\'s the latest") with descriptive context.',
                    badge: 'Smart Parsing',
                  },
                  {
                    step: '03',
                    title: 'Source Balancing & Anti-Monopoly Filter',
                    desc: 'Applies your configured "Max Articles per Source" rule. If a high-frequency publisher posts 50 articles in an hour, only the top N most recent are admitted to maintain equal voice for specialized outdoors and tech outlets.',
                    badge: 'Equal Representation',
                  },
                  {
                    step: '04',
                    title: 'Keyword Blocklist & Whitelist Evaluation',
                    desc: 'Scans titles and story excerpts against your personal blocklist to silently filter out unwanted topics or prioritize must-read subjects.',
                    badge: 'User Controlled',
                  },
                  {
                    step: '05',
                    title: 'Front Page Curation & Presentation',
                    desc: 'Selects the top lead breaking story to anchor the Front Page hero view, then generates the responsive multi-column feed arranged by your selected sorting mode.',
                    badge: 'Clean UI',
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="bg-[#13131A] border border-[#1F1F27] rounded-xl p-4.5 flex items-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{s.title}</h4>
                        <span className="text-[10px] font-mono bg-[#1E1E28] text-gray-400 px-2 py-0.5 rounded">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ways to control */}
              <div className="bg-[#101016] border border-blue-500/20 rounded-xl p-5 space-y-2">
                <h4 className="text-xs font-mono font-bold text-blue-400 uppercase">
                  YOUR CONTROLS SUMMARY
                </h4>
                <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                  <li><strong>Limit # per source:</strong> Set to 2, 3, 5, or 10 to balance the wire.</li>
                  <li><strong>Enable/Disable Publishers:</strong> Turn on or off specific newsrooms in the Publishers tab.</li>
                  <li><strong>Category Filters:</strong> Switch between National, Politics, Fishing, Tech & AI, or Bookmarked.</li>
                  <li><strong>Add Custom Feeds:</strong> Plug in any custom RSS feed or add direct portals.</li>
                  <li><strong>Keyword Blocklist:</strong> Completely eliminate specific keywords from appearing.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: PUBLISHERS LIST */}
          {activeTab === 'sources' && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Enable or Disable Specific Publishers</h3>
                  <p className="text-xs text-gray-400">
                    Toggle individual outlets to instantly include or exclude them from your front page.
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-500">
                  {sources.filter((s) => s.enabled).length} of {sources.length} Active
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      source.enabled
                        ? 'bg-[#121218] border-[#22222B]'
                        : 'bg-[#0E0E12]/50 border-[#1A1A20] opacity-60'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{source.name}</span>
                        <span className="text-[10px] font-mono text-gray-500">
                          ({source.category})
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-500 truncate">{source.url}</p>
                    </div>

                    <button
                      onClick={() => onToggleSource(source.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                        source.enabled
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
                          : 'bg-[#1E1E24] text-gray-400 hover:text-white'
                      }`}
                    >
                      {source.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#111116] border-t border-[#1F1F24] flex items-center justify-between text-xs text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Changes applied live to Front Page</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
