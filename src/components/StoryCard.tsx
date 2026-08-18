import React from 'react';
import { ExternalLink, Bookmark, Sparkles, Clock, Globe } from 'lucide-react';
import { StoryItem } from '../types';

interface StoryCardProps {
  story: StoryItem;
  onSelect: (story: StoryItem) => void;
  onToggleBookmark: (storyId: string) => void;
  isBookmarked: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onToggleBookmark,
  isBookmarked,
}) => {
  // Format relative or date string
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHrs = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffHrs < 48) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Fishing':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Politics':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'National':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Tech & AI':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-[#1A1A1E] text-gray-300 border-[#2A2A30]';
    }
  };

  return (
    <article
      onClick={() => onSelect(story)}
      className="group relative bg-[#0F0F12] hover:bg-[#141418] border border-[#1F1F23] hover:border-[#2E2E36] rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xs flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Source & Category Header */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryColor(story.category)}`}>
              {story.category}
            </span>
            <span className="text-gray-600 text-[10px]">•</span>
            <span className="font-mono text-gray-400 font-medium text-xs truncate max-w-[130px]">
              {story.sourceTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-[11px] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatTime(story.pubDate)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(story.id);
              }}
              className={`p-1 rounded-md transition-colors ${
                isBookmarked
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-gray-600 hover:text-gray-300'
              }`}
              title="Save story"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif-display font-semibold text-lg sm:text-xl text-white group-hover:text-blue-400 transition-colors leading-snug">
          {story.title}
        </h3>

        {/* Snippet */}
        {story.contentSnippet && (
          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed font-sans">
            {story.contentSnippet}
          </p>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-4 mt-3 border-t border-[#1F1F23] flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 group-hover:underline">
          <Sparkles className="w-3 h-3 text-blue-400" /> AI Debrief & Read
        </span>

        <a
          href={story.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          title="Open original link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
};
