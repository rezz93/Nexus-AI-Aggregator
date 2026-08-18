import React, { useState } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, Loader2, Link2, Tag, Compass } from 'lucide-react';
import { FeedSource } from '../types';
import { diagnoseFeedUrl } from '../services/feedClient';

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFeed: (feed: Omit<FeedSource, 'id'>) => void;
}

const POPULAR_PRESETS = [
  { name: 'Field & Stream', url: 'https://www.fieldandstream.com/feed/', category: 'Fishing' as const },
  { name: 'Bassmaster', url: 'https://www.bassmaster.com/feed/', category: 'Fishing' as const },
  { name: 'Fly Fisherman', url: 'https://www.flyfisherman.com/feed/', category: 'Fishing' as const },
  { name: 'Reuters Top News', url: 'https://www.reutersagency.com/feed/?best-topics=political-general-news&post_type=best', category: 'National' as const },
  { name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'Finance' as const },
  { name: 'Hacker News Frontpage', url: 'https://hnrss.org/frontpage', category: 'Tech & AI' as const },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'Tech & AI' as const },
];

export const AddFeedModal: React.FC<AddFeedModalProps> = ({ isOpen, onClose, onAddFeed }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<FeedSource['category']>('National');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!url) return;
    setTesting(true);
    setTestResult(null);
    try {
      const diag = await diagnoseFeedUrl(url);
      if (diag.reachable && diag.isXml) {
        setTestResult({
          ok: true,
          message: `Valid RSS/Atom Feed detected (${diag.latencyMs}ms response time).`,
        });
        if (!name) {
          try {
            const parsed = new URL(url);
            setName(parsed.hostname.replace('www.', '').split('.')[0].toUpperCase());
          } catch {}
        }
      } else {
        setTestResult({
          ok: false,
          message: diag.probableIssue || `Feed returned status ${diag.httpStatus}`,
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Failed to reach feed URL' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onAddFeed({
      name: name.trim() || new URL(url).hostname,
      url: url.trim(),
      category,
      enabled: true,
    });
    setName('');
    setUrl('');
    setTestResult(null);
    onClose();
  };

  const handleSelectPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    setName(preset.name);
    setUrl(preset.url);
    setCategory(preset.category);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/80 backdrop-blur-sm">
      <div className="bg-[#0F0F12] border border-[#1F1F23] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F23] bg-[#141418]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              +
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Add Custom RSS Feed</h2>
              <p className="text-xs text-gray-400">Subscribe to any website, blog, Substack, or news source</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Feed RSS/Atom URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  required
                  placeholder="https://example.com/feed.xml"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#141418] text-white border border-[#2A2A30] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                />
              </div>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !url}
                className="px-3.5 py-2 text-xs font-medium text-gray-300 bg-[#1A1A20] hover:bg-[#24242A] border border-[#2A2A30] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : 'Validate'}
              </button>
            </div>
            {testResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  testResult.ok ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Source Name (Display Label)
            </label>
            <input
              type="text"
              placeholder="e.g. Bassmaster, Politico, Daily Journal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#141418] text-white border border-[#2A2A30] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['National', 'Politics', 'Fishing', 'Tech & AI', 'Science', 'Finance', 'Custom'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                    category === cat
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-[#141418] text-gray-300 border-[#2A2A30] hover:border-gray-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1F1F23]">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5" /> Quick Add Suggestions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 text-xs bg-[#141418] hover:bg-[#1E1E24] hover:text-white hover:border-blue-500/40 border border-[#2A2A30] rounded-md text-gray-300 transition-colors"
                >
                  + {p.name} ({p.category})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
