import React, { useState, useMemo } from 'react';
import {
  X,
  ExternalLink,
  Search,
  Globe,
  Compass,
  Star,
  Plus,
  Bookmark,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { DirectNewsSource } from '../types';
import { DIRECT_SOURCES_CATALOG } from '../data/directSourcesCatalog';

interface DirectSourcesCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedIds: string[];
  onTogglePin: (sourceId: string) => void;
  customSources: DirectNewsSource[];
  onAddCustomSource: (source: DirectNewsSource) => void;
  onDeleteCustomSource: (sourceId: string) => void;
}

export const DirectSourcesCatalogModal: React.FC<DirectSourcesCatalogModalProps> = ({
  isOpen,
  onClose,
  pinnedIds,
  onTogglePin,
  customSources,
  onAddCustomSource,
  onDeleteCustomSource,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyPinned, setOnlyPinned] = useState<boolean>(false);
  const [previewSource, setPreviewSource] = useState<DirectNewsSource | null>(null);

  // Add custom source form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<DirectNewsSource['category']>('National');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customTag, setCustomTag] = useState<string>('Direct Web Portal');

  // Combined sources
  const allSources = useMemo(() => {
    return [...customSources, ...DIRECT_SOURCES_CATALOG];
  }, [customSources]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>(['All', 'National', 'Politics', 'Fishing', 'Tech & AI', 'Finance', 'Science', 'Sports']);
    allSources.forEach((s) => cats.add(s.category));
    return Array.from(cats);
  }, [allSources]);

  // Helper to normalize strings for robust fuzzy searching
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Robust Search Matcher
  const isMatch = (source: DirectNewsSource, query: string) => {
    if (!query.trim()) return true;
    const rawQuery = query.toLowerCase().trim();
    const cleanQuery = normalize(query);
    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    // 1. Direct name / domain / description / tag matching
    const nameLower = source.name.toLowerCase();
    const domainLower = source.domain.toLowerCase();
    const descLower = source.description.toLowerCase();
    const tagLower = source.focusTag.toLowerCase();
    const categoryLower = source.category.toLowerCase();

    const normalizedCombined = normalize(`${source.name} ${source.domain} ${source.focusTag} ${source.category}`);

    // Exact or normalized match
    if (normalizedCombined.includes(cleanQuery)) return true;

    // Aliases matching (e.g. 'la times', 'latimes', 'los angeles times', 'wsj', 'nyt', 'wapo', 'mlf')
    if (source.aliases && source.aliases.length > 0) {
      for (const alias of source.aliases) {
        const aliasLower = alias.toLowerCase();
        const aliasNorm = normalize(alias);
        if (
          aliasLower.includes(rawQuery) ||
          rawQuery.includes(aliasLower) ||
          aliasNorm.includes(cleanQuery) ||
          cleanQuery.includes(aliasNorm)
        ) {
          return true;
        }
      }
    }

    // Multi-token match: every word in query must appear in at least one field or alias
    const allSearchable = `${nameLower} ${domainLower} ${descLower} ${tagLower} ${categoryLower} ${(source.aliases || []).join(' ')}`;
    const allTokensMatch = tokens.every((token) => allSearchable.includes(token) || normalize(allSearchable).includes(normalize(token)));
    if (allTokensMatch) return true;

    return false;
  };

  // Global search matches across all categories
  const globalMatches = useMemo(() => {
    if (!searchQuery.trim()) return allSources;
    return allSources.filter((s) => isMatch(s, searchQuery));
  }, [allSources, searchQuery]);

  // Filtered sources considering activeCategory and pinned filter
  const filteredSources = useMemo(() => {
    return allSources.filter((source) => {
      if (onlyPinned && !pinnedIds.includes(source.id)) return false;
      if (activeCategory !== 'All' && source.category !== activeCategory) return false;
      return isMatch(source, searchQuery);
    });
  }, [allSources, activeCategory, searchQuery, onlyPinned, pinnedIds]);

  // Check if matches exist in other categories when current tab yields 0
  const otherCategoryMatches = useMemo(() => {
    if (!searchQuery.trim() || activeCategory === 'All' || filteredSources.length > 0) return [];
    return globalMatches;
  }, [searchQuery, activeCategory, filteredSources.length, globalMatches]);

  const handleCreateCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customName.trim()) return;

    let cleanUrl = customUrl.trim();
    if (!cleanUrl) {
      // Auto-construct URL if user only typed name
      const domainGuess = customName.toLowerCase().replace(/[^a-z0-9]/g, '');
      cleanUrl = `https://www.${domainGuess}.com`;
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let domain = '';
    try {
      domain = new URL(cleanUrl).hostname.replace('www.', '');
    } catch {
      domain = cleanUrl;
    }

    const newSource: DirectNewsSource = {
      id: `direct-custom-${Date.now()}`,
      name: customName.trim(),
      url: cleanUrl,
      domain: domain || 'web',
      category: customCategory,
      focusTag: customTag.trim() || 'Custom Portal',
      description: customDescription.trim() || `Direct web news portal for ${customName.trim()}.`,
      custom: true,
      aliases: [customName.toLowerCase(), domain.toLowerCase()],
    };

    onAddCustomSource(newSource);
    onTogglePin(newSource.id); // Auto-favorite custom sources for convenience

    // Reset form
    setCustomName('');
    setCustomUrl('');
    setCustomDescription('');
    setShowAddForm(false);
  };

  // Quick 1-click add from search query
  const handleQuickAddFromSearch = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    const isUrl = q.includes('.') || q.startsWith('http');
    let targetName = q;
    let targetUrl = '';

    if (isUrl) {
      targetUrl = q.startsWith('http') ? q : `https://${q}`;
      try {
        const hostname = new URL(targetUrl).hostname.replace('www.', '');
        targetName = hostname.split('.')[0].toUpperCase();
      } catch {
        targetName = q;
      }
    } else {
      targetName = q
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const normDomain = normalize(q);
      targetUrl = `https://www.${normDomain}.com`;
    }

    setCustomName(targetName);
    setCustomUrl(targetUrl);
    setCustomCategory(activeCategory !== 'All' ? (activeCategory as any) : 'National');
    setShowAddForm(true);
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Fishing':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Politics':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'National':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Tech & AI':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Finance':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Science':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Sports':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-[#1F1F24] text-gray-300 border-[#2E2E36]';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0F0F13] border border-[#222228] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F1F24] flex items-center justify-between bg-[#131318]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
                  DIRECT NEWS PORTALS (NO RSS REQUIRED)
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-[#1C1C22] px-2 py-0.5 rounded-full border border-[#2A2A34]">
                  {allSources.length} Outlets Available
                </span>
              </div>
              <h2 className="text-lg font-serif-display font-bold text-white tracking-tight">
                Curated News Sources Directory
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Close Form' : 'Add Custom Site'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Custom Source Drawer / Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateCustom}
            className="p-5 bg-[#16161D] border-b border-[#24242E] space-y-4 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Add Any News Website (No RSS needed)
              </h3>
              <span className="text-[11px] text-gray-500">
                Instantly accessible via direct link & live web previews
              </span>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  OUTLET NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chicago Sun-Times"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0F0F14] text-white border border-[#262632] rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  WEBSITE URL *
                </label>
                <input
                  type="text"
                  placeholder="e.g. suntimes.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0F0F14] text-white border border-[#262632] rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  CATEGORY
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#0F0F14] text-white border border-[#262632] rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="National">National</option>
                  <option value="Politics">Politics</option>
                  <option value="Fishing">Fishing</option>
                  <option value="Tech & AI">Tech & AI</option>
                  <option value="Finance">Finance</option>
                  <option value="Science">Science</option>
                  <option value="Sports">Sports</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  EDITORIAL TAG
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midwest Daily"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0F0F14] text-white border border-[#262632] rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                DESCRIPTION (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="Brief description of what this publication covers..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0F0F14] text-white border border-[#262632] rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-transparent rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
              >
                Save & Pin to Favorites
              </button>
            </div>
          </form>
        )}

        {/* Categories Bar & Search Toolbar */}
        <div className="px-6 py-3 border-b border-[#1E1E24] bg-[#0E0E12] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const count =
                cat === 'All'
                  ? allSources.length
                  : allSources.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setOnlyPinned(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat && !onlyPinned
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[#141418] text-gray-400 hover:text-white hover:bg-[#1A1A20] border border-[#1F1F24]'
                  }`}
                >
                  {cat}
                  <span className="ml-1 opacity-70 font-mono text-[10px]">({count})</span>
                </button>
              );
            })}

            <button
              onClick={() => setOnlyPinned(!onlyPinned)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                onlyPinned
                  ? 'bg-amber-500 text-black shadow-xs font-bold'
                  : 'bg-[#141418] text-amber-400 hover:bg-[#1A1A20] border border-amber-500/20'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyPinned ? 'fill-current' : ''}`} />
              Favorites ({pinnedIds.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search e.g. LA Times, WSJ, Fishing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#0A0A0E] text-[#E0E0E6] placeholder-gray-500 border border-[#22222A] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-300 text-xs p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search Results Summary & Cross-Category Banner */}
        {searchQuery.trim() && (
          <div className="px-6 py-2 bg-[#121217] border-b border-[#1E1E24] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="font-mono text-gray-500">SEARCH:</span>
              <span>
                Found <strong className="text-white">{globalMatches.length}</strong> matching outlets
                {activeCategory !== 'All' && (
                  <span className="text-gray-400 font-mono">
                    {' '}
                    ({filteredSources.length} in {activeCategory})
                  </span>
                )}
              </span>
            </div>

            {otherCategoryMatches.length > 0 && activeCategory !== 'All' && (
              <button
                onClick={() => setActiveCategory('All')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline"
              >
                Show all {otherCategoryMatches.length} results across all categories →
              </button>
            )}
          </div>
        )}

        {/* Sources Grid Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0B0E]">
          {filteredSources.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSources.map((source) => {
                const isPinned = pinnedIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    className="bg-[#121217] hover:bg-[#16161D] border border-[#1E1E24] hover:border-[#2A2A34] rounded-xl p-4 flex flex-col justify-between transition-all duration-150 group shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadgeClass(
                              source.category
                            )}`}
                          >
                            {source.category}
                          </span>
                          {source.featured && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              TOP OUTLET
                            </span>
                          )}
                          {source.custom && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onTogglePin(source.id)}
                          className={`p-1 rounded-md transition-colors ${
                            isPinned
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-gray-600 hover:text-gray-400'
                          }`}
                          title={isPinned ? 'Remove from favorites' : 'Pin to favorites'}
                        >
                          <Star className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                          {source.name}
                        </h3>
                        <p className="text-[11px] font-mono text-gray-500 flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3 text-gray-600" />
                          {source.domain}
                        </p>
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {source.description}
                      </p>

                      <div className="pt-1">
                        <span className="inline-block text-[10px] font-mono text-gray-500 bg-[#181820] px-2 py-0.5 rounded border border-[#22222A]">
                          🏷️ {source.focusTag}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 mt-3 border-t border-[#1C1C22] flex items-center justify-between gap-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-colors"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => setPreviewSource(source)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-[#181820] hover:bg-[#20202A] border border-[#22222A] rounded-lg transition-colors"
                        title="Live web preview & direct reader"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {source.custom && (
                        <button
                          onClick={() => onDeleteCustomSource(source.id)}
                          className="px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete custom source"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-[#22222A] text-gray-400 flex items-center justify-center mx-auto text-xl">
                🔍
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No publications found</h3>
                <p className="text-xs text-gray-400">
                  {searchQuery
                    ? `No existing outlet matches "${searchQuery}" in ${activeCategory === 'All' ? 'the directory' : activeCategory}.`
                    : 'No publications found in this view.'}
                </p>
              </div>

              {/* Instant 1-Click Add Prompt */}
              {searchQuery.trim() && (
                <div className="p-4 bg-[#14141A] border border-[#242430] rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> QUICK-ADD TO DIRECT SOURCES
                  </div>
                  <p className="text-xs text-gray-300">
                    Want to add <strong className="text-white">"{searchQuery}"</strong> to your directory?
                  </p>
                  <button
                    onClick={handleQuickAddFromSearch}
                    className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add "{searchQuery}" in 1-Click</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All');
                    setOnlyPinned(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#1C1C24] text-gray-300 rounded-lg hover:bg-[#242430] border border-[#262632]"
                >
                  Reset Filters
                </button>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 border border-blue-500/30"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Web Preview Sub-modal */}
        {previewSource && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col p-4 sm:p-8 animate-in fade-in duration-150">
            <div className="bg-[#111116] border border-[#22222A] rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-6xl mx-auto w-full">
              {/* Preview Header */}
              <div className="px-5 py-3.5 bg-[#16161D] border-b border-[#202028] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getCategoryBadgeClass(
                      previewSource.category
                    )}`}
                  >
                    {previewSource.category}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {previewSource.name}
                      <span className="text-xs font-mono text-gray-500 font-normal">
                        ({previewSource.domain})
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs"
                  >
                    <span>Open in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setPreviewSource(null)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#22222C] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content / Iframe / Direct Fallback */}
              <div className="flex-1 bg-white relative flex flex-col">
                <iframe
                  src={previewSource.url}
                  title={previewSource.name}
                  className="w-full h-full border-0 flex-1"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />

                {/* Iframe Notice Overlay Bar (in case publisher site headers disallow embedding) */}
                <div className="bg-[#141418] border-t border-[#202028] px-4 py-2 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Direct Portal URL: <span className="text-white">{previewSource.url}</span>
                  </span>
                  <a
                    href={previewSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    If page is blocked by publisher policy, click here to open directly{' '}
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1F1F24] bg-[#0E0E12] flex items-center justify-between text-xs text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Direct Web Directory • Independent of RSS Feeds</span>
          </div>
          <div>
            Showing {filteredSources.length} of {allSources.length} Publications
          </div>
        </div>
      </div>
    </div>
  );
};
