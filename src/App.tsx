import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Bookmark,
  Activity,
  SlidersHorizontal,
  Compass,
  MessageSquare,
  HelpCircle,
  Inbox,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Volume2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Star,
  ShieldAlert,
  Layers,
  ArrowDownUp,
  LayoutGrid,
} from 'lucide-react';
import { FeedSource, StoryItem, DirectNewsSource, FeedPreferences } from './types';
import { INITIAL_FEEDS } from './data/defaultFeeds';
import { DIRECT_SOURCES_CATALOG } from './data/directSourcesCatalog';
import { fetchAllFeeds } from './services/feedClient';
import { StoryCard } from './components/StoryCard';
import { ArticleReaderModal } from './components/ArticleReaderModal';
import { AddFeedModal } from './components/AddFeedModal';
import { RssDiagnosticDrawer } from './components/RssDiagnosticDrawer';
import { AiBriefingModal } from './components/AiBriefingModal';
import { AskAiDrawer } from './components/AskAiDrawer';
import { DiagnosticBanner } from './components/DiagnosticBanner';
import { ExplanationModal } from './components/ExplanationModal';
import { DirectSourcesCatalogModal } from './components/DirectSourcesCatalogModal';
import { FeedControlsModal } from './components/FeedControlsModal';

const LOCAL_STORAGE_KEY_FEEDS = 'signal_01_feeds_v3';
const LOCAL_STORAGE_KEY_BOOKMARKS = 'signal_01_bookmarks_v3';
const LOCAL_STORAGE_KEY_PREFS = 'signal_01_prefs_v1';
const LOCAL_STORAGE_KEY_CUSTOM_DIRECT = 'signal_01_custom_direct_v1';

const DEFAULT_PREFERENCES: FeedPreferences = {
  maxArticlesPerSource: 5, // Default max 5 stories per publisher to avoid monopolization
  sortBy: 'newest',
  layoutMode: 'editorial',
  blockedKeywords: [],
  includedKeywords: [],
  pinnedDirectSourceIds: ['ap-news', 'reuters', 'bassmaster-direct', 'techcrunch'],
};

export default function App() {
  // Feed Sources State
  const [sources, setSources] = useState<FeedSource[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_FEEDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_FEEDS;
  });

  // User Preferences (Max articles per source, keywords blocklist, sorting, etc.)
  const [preferences, setPreferences] = useState<FeedPreferences>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFS);
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  // Custom Direct Web Sources (No RSS needed)
  const [customDirectSources, setCustomDirectSources] = useState<DirectNewsSource[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_DIRECT);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Stories & Statuses
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<
    Record<string, { status: 'ok' | 'error'; itemCount: number; errorMessage?: string; latencyMs: number }>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // UI Filtering & Navigation State
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_BOOKMARKS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Modals & Drawers
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [isAddFeedOpen, setIsAddFeedOpen] = useState<boolean>(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [isDirectSourcesOpen, setIsDirectSourcesOpen] = useState<boolean>(false);
  const [isFeedControlsOpen, setIsFeedControlsOpen] = useState<boolean>(false);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_FEEDS, JSON.stringify(sources));
    } catch {}
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarkedIds));
    } catch {}
  }, [bookmarkedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFS, JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_DIRECT, JSON.stringify(customDirectSources));
    } catch {}
  }, [customDirectSources]);

  // Load feeds on mount
  useEffect(() => {
    loadNews(false);
  }, []);

  const loadNews = async (isManualRefresh: boolean = true) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { stories: loadedStories, sourceStatuses: statuses } = await fetchAllFeeds(sources);
      setStories(loadedStories);
      setSourceStatuses(statuses);

      const now = new Date();
      setLastUpdated(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
          ', ' +
          now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add RSS Feed Handler
  const handleAddFeed = (newFeedData: Omit<FeedSource, 'id'>) => {
    const newFeed: FeedSource = {
      ...newFeedData,
      id: `custom-${Date.now()}`,
    };
    const updated = [newFeed, ...sources];
    setSources(updated);
    setTimeout(() => loadNews(true), 100);
  };

  // Toggle Feed
  const handleToggleFeed = (id: string) => {
    const updated = sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSources(updated);
  };

  // Delete Feed
  const handleDeleteFeed = (id: string) => {
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
  };

  // Toggle Bookmark
  const handleToggleBookmark = (storyId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  };

  // Preference Update Handler
  const handleUpdatePreferences = (updated: Partial<FeedPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updated }));
  };

  // Toggle Direct Source Pin
  const handleToggleDirectPin = (sourceId: string) => {
    setPreferences((prev) => {
      const current = prev.pinnedDirectSourceIds || [];
      const updated = current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId];
      return { ...prev, pinnedDirectSourceIds: updated };
    });
  };

  // Add Custom Direct Web Source
  const handleAddCustomDirect = (source: DirectNewsSource) => {
    setCustomDirectSources((prev) => [source, ...prev]);
  };

  // Delete Custom Direct Web Source
  const handleDeleteCustomDirect = (sourceId: string) => {
    setCustomDirectSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  // Categories list extracted from sources
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    sources.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [sources]);

  // Combined Direct Sources List
  const allDirectSources = useMemo(() => {
    return [...customDirectSources, ...DIRECT_SOURCES_CATALOG];
  }, [customDirectSources]);

  // Pinned Direct Sources for quick access bar
  const pinnedDirectSources = useMemo(() => {
    const pinSet = new Set(preferences.pinnedDirectSourceIds || []);
    return allDirectSources.filter((s) => pinSet.has(s.id));
  }, [allDirectSources, preferences.pinnedDirectSourceIds]);

  // Curation Pipeline: Apply Filters, Search, Keyword Exclusions, Source Limits & Sorting
  const filteredStories = useMemo(() => {
    // 1. Initial Filtering
    const searchTokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const preliminary = stories.filter((story) => {
      // Category filter
      if (activeCategory !== 'All' && story.category !== activeCategory) {
        return false;
      }
      // Bookmark filter
      if (onlyBookmarked && !bookmarkedIds.includes(story.id)) {
        return false;
      }
      // Search filter with multi-token support
      if (searchTokens.length > 0) {
        const fullSearchable = `${story.title} ${story.contentSnippet || ''} ${story.sourceTitle} ${story.author || ''} ${story.category}`.toLowerCase();
        const matchesAllTokens = searchTokens.every((tok) => fullSearchable.includes(tok));
        if (!matchesAllTokens) return false;
      }

      const textToScan = `${story.title} ${story.contentSnippet || ''}`.toLowerCase();

      // Blocked Keywords (Exclude)
      if (preferences.blockedKeywords && preferences.blockedKeywords.length > 0) {
        const hasBlocked = preferences.blockedKeywords.some((word) =>
          textToScan.includes(word.toLowerCase())
        );
        if (hasBlocked) return false;
      }

      // Included Keywords (Must Contain)
      if (preferences.includedKeywords && preferences.includedKeywords.length > 0) {
        const hasIncluded = preferences.includedKeywords.some((word) =>
          textToScan.includes(word.toLowerCase())
        );
        if (!hasIncluded) return false;
      }

      return true;
    });

    // 2. Apply "Max Articles Per Source" limit
    const maxPerSource = preferences.maxArticlesPerSource;
    let sourceLimitedStories: StoryItem[] = [];

    if (maxPerSource && maxPerSource > 0) {
      const sourceCounts: Record<string, number> = {};
      for (const story of preliminary) {
        const srcKey = story.sourceTitle || 'Unknown';
        const currentCount = sourceCounts[srcKey] || 0;
        if (currentCount < maxPerSource) {
          sourceLimitedStories.push(story);
          sourceCounts[srcKey] = currentCount + 1;
        }
      }
    } else {
      sourceLimitedStories = preliminary;
    }

    // 3. Sorting & Arrangement
    if (preferences.sortBy === 'balanced') {
      // Interleave sources so no single publisher clusters together
      const groups: Record<string, StoryItem[]> = {};
      for (const s of sourceLimitedStories) {
        if (!groups[s.sourceTitle]) groups[s.sourceTitle] = [];
        groups[s.sourceTitle].push(s);
      }
      const interleaved: StoryItem[] = [];
      let added = true;
      let depth = 0;
      const groupKeys = Object.keys(groups);
      while (added) {
        added = false;
        for (const k of groupKeys) {
          if (groups[k][depth]) {
            interleaved.push(groups[k][depth]);
            added = true;
          }
        }
        depth++;
      }
      return interleaved;
    } else if (preferences.sortBy === 'source') {
      return [...sourceLimitedStories].sort((a, b) =>
        a.sourceTitle.localeCompare(b.sourceTitle)
      );
    } else if (preferences.sortBy === 'category') {
      return [...sourceLimitedStories].sort((a, b) =>
        a.category.localeCompare(b.category)
      );
    }

    // Final deduplication pass to ensure strictly unique stories & React keys
    const seen = new Set<string>();
    const finalUnique: StoryItem[] = [];
    for (const story of sourceLimitedStories) {
      const dedupKey = `${story.id}-${story.link}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        finalUnique.push(story);
      }
    }

    return finalUnique;
  }, [stories, activeCategory, onlyBookmarked, searchQuery, bookmarkedIds, preferences]);

  // Calculate status numbers
  const unreachableSources = useMemo(() => {
    return sources.filter((s) => s.enabled && sourceStatuses[s.id]?.status === 'error');
  }, [sources, sourceStatuses]);

  // Top Lead Story for Editorial Front Page View
  const leadStory = useMemo(() => {
    if (preferences.layoutMode !== 'compact' && filteredStories.length > 0 && activeCategory === 'All' && !searchQuery) {
      return filteredStories[0];
    }
    return null;
  }, [filteredStories, preferences.layoutMode, activeCategory, searchQuery]);

  const secondaryStories = useMemo(() => {
    if (leadStory) {
      return filteredStories.slice(1);
    }
    return filteredStories;
  }, [filteredStories, leadStory]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E6] flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0F0F12]/95 backdrop-blur-md border-b border-[#1F1F23] px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                SIGNAL / 01
              </span>
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight leading-none">
              Nexus<span className="text-blue-500">AI</span> Aggregator
            </h1>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsDirectSourcesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all shadow-xs"
            title="Browse and launch news websites directly without using RSS"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Direct</span> News Directory
          </button>

          <button
            onClick={() => setIsFeedControlsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 bg-[#141418] hover:bg-[#1C1C22] border border-[#1F1F23] rounded-lg transition-colors shadow-xs"
            title="Adjust max articles per source, keyword blocklists, and front page curation"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Feed</span> Controls
            {preferences.maxArticlesPerSource > 0 && (
              <span className="hidden lg:inline text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded ml-0.5">
                Max {preferences.maxArticlesPerSource}/src
              </span>
            )}
          </button>

          <button
            onClick={() => setIsBriefingOpen(true)}
            disabled={stories.length === 0}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Briefing</span>
          </button>

          <button
            onClick={() => setIsAskAiOpen(true)}
            disabled={stories.length === 0}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 bg-[#141418] hover:bg-[#1C1C22] border border-[#1F1F23] rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <span>Intelligence Desk</span>
          </button>

          <button
            onClick={() => setIsAddFeedOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add feed</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {/* Editorial Hero Section */}
        <section className="mb-6 sm:mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              YOUR DAILY INTELLIGENCE DESK
            </p>
            {lastUpdated && (
              <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                Updated {lastUpdated}
              </span>
            )}
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif-display font-medium text-white tracking-tight leading-[1.1]">
            The stories worth <span className="italic font-editorial text-blue-400">your attention.</span>
          </h2>

          <p className="text-gray-400 font-sans text-sm sm:text-base max-w-2xl leading-relaxed">
            A focused stream of news, balanced across publishers and filtered by what matters to you.
          </p>
        </section>

        {/* Pinned Direct Sources Quick-Bar (No RSS Needed) */}
        {pinnedDirectSources.length > 0 && (
          <div className="mb-6 p-3.5 bg-[#121217] border border-[#1E1E24] rounded-2xl flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-gray-400 flex items-center gap-1.5 pr-2 border-r border-[#22222A]">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              DIRECT PORTALS:
            </span>

            {pinnedDirectSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-[#181820] hover:bg-[#20202A] border border-[#242430] hover:border-blue-500/30 rounded-lg transition-all"
                title={`${source.name} - ${source.description}`}
              >
                <span>{source.name}</span>
                <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
              </a>
            ))}

            <button
              onClick={() => setIsDirectSourcesOpen(true)}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline px-2"
            >
              + Browse 35+ Outlets
            </button>
          </div>
        )}

        {/* Categories Bar & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-[#1F1F23]">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => {
                setActiveCategory('All');
                setOnlyBookmarked(false);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'All' && !onlyBookmarked
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#141418] text-gray-400 hover:text-white hover:bg-[#1A1A20] border border-[#1F1F23]'
              }`}
            >
              All stories <span className="ml-1 opacity-70 font-mono">{stories.length}</span>
            </button>

            {availableCategories.map((cat) => {
              const count = stories.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setOnlyBookmarked(false);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat && !onlyBookmarked
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[#141418] text-gray-400 hover:text-white hover:bg-[#1A1A20] border border-[#1F1F23]'
                  }`}
                >
                  {cat} {count > 0 && <span className="ml-1 opacity-70 font-mono">({count})</span>}
                </button>
              );
            })}

            {bookmarkedIds.length > 0 && (
              <button
                onClick={() => setOnlyBookmarked(true)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  onlyBookmarked
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[#141418] text-gray-400 hover:text-white hover:bg-[#1A1A20] border border-[#1F1F23]'
                }`}
              >
                <Bookmark className="w-3 h-3" /> Saved ({bookmarkedIds.length})
              </button>
            )}
          </div>

          {/* Search Input & Refresh Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search your feed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0F0F12] text-[#E0E0E6] placeholder-gray-500 border border-[#1F1F23] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => loadNews(true)}
              disabled={refreshing}
              className="p-2.5 text-gray-300 bg-[#0F0F12] hover:bg-[#1A1A20] border border-[#1F1F23] rounded-xl transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh feeds"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Curation Toolbar: Max per source limit quick selector & stats */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#1A1A20] mb-6">
          <div className="flex items-center gap-3 font-mono text-gray-400">
            <span>
              <strong className="text-white">{filteredStories.length}</strong> STORIES IN VIEW
            </span>
            {searchQuery && <span className="text-blue-400 font-sans">matching "{searchQuery}"</span>}
            {preferences.blockedKeywords.length > 0 && (
              <span className="text-red-400 text-[11px]">
                ({preferences.blockedKeywords.length} keywords blocked)
              </span>
            )}
          </div>

          {/* Quick Limiter & Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
              CAP PER PUBLISHER:
            </span>
            <div className="flex items-center bg-[#121217] border border-[#1F1F24] p-0.5 rounded-lg">
              {[
                { label: 'Max 2', val: 2 },
                { label: 'Max 3', val: 3 },
                { label: 'Max 5', val: 5 },
                { label: 'All', val: 0 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleUpdatePreferences({ maxArticlesPerSource: opt.val })}
                  className={`px-2 py-1 text-[11px] font-mono rounded font-semibold transition-all ${
                    preferences.maxArticlesPerSource === opt.val
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsFeedControlsOpen(true)}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#16161D] rounded-lg border border-[#1F1F24] transition-colors"
              title="Open full Curation & Feed Control center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Diagnostic Banner */}
        <DiagnosticBanner
          unreachableCount={unreachableSources.length}
          totalCount={sources.filter((s) => s.enabled).length}
          onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
          onRetry={() => loadNews(true)}
          isRefreshing={refreshing}
          onShowExplanation={() => setIsExplanationOpen(true)}
        />

        {/* Stories Grid / States */}
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-200 font-serif-display">
              Connecting to live RSS feeds & compiling dispatches...
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
              Fetching National, Politics, Fishing, and Tech news streams securely through our server proxy.
            </p>
          </div>
        ) : filteredStories.length > 0 ? (
          <div className="space-y-6">
            {/* Front Page Lead Story Card (When on All Stories and Lead exists) */}
            {leadStory && (
              <div
                onClick={() => setSelectedStory(leadStory)}
                className="group relative bg-[#0F0F14] hover:bg-[#14141A] border border-[#22222A] hover:border-blue-500/40 rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-200 shadow-md"
              >
                <div className="grid md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                        ⭐ FRONT PAGE LEAD
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {leadStory.category}
                      </span>
                      <span className="text-gray-600 text-xs">•</span>
                      <span className="font-mono text-gray-400 text-xs font-semibold">
                        {leadStory.sourceTitle}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-serif-display font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">
                      {leadStory.title}
                    </h3>

                    {leadStory.contentSnippet && (
                      <p className="text-sm text-gray-300 font-sans leading-relaxed line-clamp-3">
                        {leadStory.contentSnippet}
                      </p>
                    )}

                    <div className="pt-2 flex items-center gap-4 text-xs text-gray-500 font-mono">
                      <span>{leadStory.pubDate}</span>
                      <span className="text-blue-400 font-sans font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Read Story <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {leadStory.imageUrl && (
                    <div className="md:col-span-4 rounded-xl overflow-hidden border border-[#22222A] aspect-video md:aspect-4/3 bg-[#181820]">
                      <img
                        src={leadStory.imageUrl}
                        alt={leadStory.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grid of Stories */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {secondaryStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onSelect={(s) => setSelectedStory(s)}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarked={bookmarkedIds.includes(story.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="border border-dashed border-[#1F1F23] rounded-2xl p-12 text-center space-y-4 bg-[#0F0F12]/60 my-6">
            <div className="w-12 h-12 rounded-full bg-[#141418] border border-[#1F1F23] text-gray-400 flex items-center justify-center mx-auto text-xl">
              🎣
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No stories found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No news matching "${searchQuery}". Try clearing search or adjusting your source limit.`
                  : preferences.blockedKeywords.length > 0
                  ? 'All stories were filtered by your keyword blocklist. Try easing your filters in Feed Controls.'
                  : 'Try selecting a different topic, enabling more feeds, or browsing the Direct News Directory.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 text-xs font-semibold bg-[#1A1A1E] hover:bg-[#24242A] rounded-lg text-gray-300 transition-colors border border-[#1F1F23]"
                >
                  Clear search
                </button>
              )}
              <button
                onClick={() => setIsDirectSourcesOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" /> Browse Direct News Directory
              </button>
              <button
                onClick={() => setIsFeedControlsOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-[#141418] border border-[#1F1F23] hover:bg-[#1A1A20] rounded-lg text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Feed Controls
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F1F23] bg-[#0F0F12] py-6 px-4 sm:px-8 text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div>
            <span className="text-gray-400">SIGNAL / 01</span> • <span>NEXUS AI NEWS</span> •{' '}
            <span className="text-blue-400">GEMINI 3.7</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDirectSourcesOpen(true)}
              className="hover:text-emerald-400 underline transition-colors"
            >
              Direct News Directory
            </button>
            <button
              onClick={() => setIsFeedControlsOpen(true)}
              className="hover:text-blue-400 underline transition-colors"
            >
              Curation & Limits
            </button>
            <button
              onClick={() => setIsDiagnosticOpen(true)}
              className="hover:text-gray-300 underline transition-colors"
            >
              Live Feed Health
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ArticleReaderModal
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
        onToggleBookmark={handleToggleBookmark}
        isBookmarked={selectedStory ? bookmarkedIds.includes(selectedStory.id) : false}
      />

      <DirectSourcesCatalogModal
        isOpen={isDirectSourcesOpen}
        onClose={() => setIsDirectSourcesOpen(false)}
        pinnedIds={preferences.pinnedDirectSourceIds || []}
        onTogglePin={handleToggleDirectPin}
        customSources={customDirectSources}
        onAddCustomSource={handleAddCustomDirect}
        onDeleteCustomSource={handleDeleteCustomDirect}
      />

      <FeedControlsModal
        isOpen={isFeedControlsOpen}
        onClose={() => setIsFeedControlsOpen(false)}
        preferences={preferences}
        onChangePreferences={handleUpdatePreferences}
        sources={sources}
        onToggleSource={handleToggleFeed}
      />

      <AddFeedModal
        isOpen={isAddFeedOpen}
        onClose={() => setIsAddFeedOpen(false)}
        onAddFeed={handleAddFeed}
      />

      <RssDiagnosticDrawer
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        sources={sources}
        sourceStatuses={sourceStatuses}
        onToggleFeed={handleToggleFeed}
        onDeleteFeed={handleDeleteFeed}
        onRefreshAll={() => loadNews(true)}
      />

      <AiBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        stories={stories}
        activeCategory={activeCategory}
      />

      <AskAiDrawer
        isOpen={isAskAiOpen}
        onClose={() => setIsAskAiOpen(false)}
        stories={stories}
      />

      <ExplanationModal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
      />
    </div>
  );
}

