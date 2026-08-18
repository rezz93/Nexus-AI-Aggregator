import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Bookmark,
  Sparkles,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  Copy,
  Check,
  RefreshCw,
  Clock,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { StoryItem } from '../types';
import { getAiArticleSummary } from '../services/feedClient';

interface ArticleReaderModalProps {
  story: StoryItem | null;
  onClose: () => void;
  onToggleBookmark: (storyId: string) => void;
  isBookmarked: boolean;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  story,
  onClose,
  onToggleBookmark,
  isBookmarked,
}) => {
  const [aiData, setAiData] = useState<{
    takeaways: string[];
    whyItMatters: string;
    sentiment: string;
    entities: string[];
    readingTimeMinutes: number;
    followUpQuestions?: string[];
    engine?: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (story) {
      setAiData(null);
      setErrorAi(null);
      loadAiSummary(story);
    }
  }, [story?.id]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!story) return null;

  const loadAiSummary = async (targetStory: StoryItem = story) => {
    setLoadingAi(true);
    setErrorAi(null);
    try {
      const res = await getAiArticleSummary(targetStory);
      setAiData(res);
    } catch (e: any) {
      console.warn('AI summary error:', e);
      setErrorAi(e.message || 'Failed to generate intelligence debrief');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const summaryText = aiData
        ? `${story.title}. Executive Takeaways: ${aiData.takeaways.join('. ')}. Why this matters: ${aiData.whyItMatters}`
        : `${story.title}. ${story.content || story.contentSnippet}`;

      const utter = new SpeechSynthesisUtterance(summaryText);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.onend = () => setIsPlayingAudio(false);
      utter.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utter);
      setIsPlayingAudio(true);
    }
  };

  const handleCopyDebrief = () => {
    if (!aiData) return;
    const debriefText = `SIGNAL / 01 AI INTELLIGENCE DEBRIEF\nStory: ${story.title}\nSource: ${story.sourceTitle} (${story.pubDate})\n\nKEY TAKEAWAYS:\n${aiData.takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nWHY THIS MATTERS:\n${aiData.whyItMatters}\n\nSENTIMENT: ${aiData.sentiment}\nENTITIES: ${aiData.entities?.join(', ') || 'N/A'}`;
    navigator.clipboard.writeText(debriefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSentimentBadgeClass = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positive':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Developing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Negative':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F0F13] border border-[#22222A] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 border-b border-[#1F1F24] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
              {story.category}
            </span>
            <span className="text-gray-600 text-xs">•</span>
            <span className="text-xs font-medium text-gray-300 font-mono">{story.sourceTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVoice}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isPlayingAudio
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-[#1A1A20] hover:bg-[#24242A] text-gray-300 border border-[#2A2A30]'
              }`}
              title={isPlayingAudio ? 'Stop speech' : 'Read debrief aloud'}
            >
              {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isPlayingAudio ? 'Stop Voice' : 'Read Aloud'}</span>
            </button>

            <button
              onClick={() => onToggleBookmark(story.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-400 hover:text-white border-[#2A2A30] hover:bg-[#1A1A20]'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <a
              href={story.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <span>Original Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid md:grid-cols-12 overflow-y-auto flex-1 divide-y md:divide-y-0 md:divide-x divide-[#1F1F24]">
          {/* Main Story Content */}
          <div className="md:col-span-7 p-6 sm:p-8 space-y-6 overflow-y-auto bg-[#0B0B0E]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif-display font-bold text-white leading-snug">
                {story.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-400 font-mono mt-3 pb-4 border-b border-[#1E1E24]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> {story.pubDate}
                </span>
                {story.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-500" /> {story.author}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {aiData?.readingTimeMinutes || 2} min read
                </span>
              </div>
            </div>

            {story.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-[#1E1E24] max-h-80 bg-[#141418]">
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
              </div>
            )}

            <div className="space-y-4 font-sans text-gray-300 text-sm sm:text-base leading-relaxed">
              {(story.content || story.contentSnippet || '').split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="pt-6 border-t border-[#1E1E24] flex items-center justify-between">
              <a
                href={story.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141418] hover:bg-[#1C1C22] border border-[#22222A] text-white text-xs font-semibold transition-all"
              >
                <span>Read Full Article at {story.sourceTitle}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </a>

              <span className="text-[11px] font-mono text-gray-500">
                Direct RSS Dispatch
              </span>
            </div>
          </div>

          {/* AI Intelligence Debrief Sidebar */}
          <div className="md:col-span-5 p-6 bg-[#111116] space-y-5 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1E1E24]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                      AI Executive Debrief
                    </h3>
                    <p className="text-[10px] font-mono text-gray-500">
                      {aiData?.engine || 'Gemini 3.7 Intelligence'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {aiData && (
                    <button
                      onClick={handleCopyDebrief}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors text-xs"
                      title="Copy debrief to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => loadAiSummary(story)}
                    disabled={loadingAi}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors text-xs disabled:opacity-50"
                    title="Regenerate debrief"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* State Handling: Loading */}
              {loadingAi ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <p className="text-xs font-bold text-white">Synthesizing Executive Debrief...</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Extracting strategic takeaways, significance analysis, and entity mappings with Gemini.
                  </p>
                </div>
              ) : aiData ? (
                /* Debrief Content */
                <div className="space-y-4 text-[#E0E0E6]">
                  {/* Sentiment & Metadata Pill */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#16161D] border border-[#22222A] text-xs">
                    <span className="text-gray-400 font-mono text-[11px]">DISPATCH TONE:</span>
                    <span
                      className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${getSentimentBadgeClass(
                        aiData.sentiment
                      )}`}
                    >
                      {aiData.sentiment || 'Neutral'}
                    </span>
                  </div>

                  {/* Key Takeaways */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Key Takeaways
                    </h4>
                    <div className="space-y-2">
                      {aiData.takeaways.map((point, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#14141A] border border-[#1E1E26] text-xs leading-relaxed text-gray-200"
                        >
                          <span className="text-blue-400 font-mono font-bold mr-1.5">#{idx + 1}</span>
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Why It Matters */}
                  {aiData.whyItMatters && (
                    <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Why This Matters
                      </h4>
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        {aiData.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* Key Entities & Tags */}
                  {aiData.entities && aiData.entities.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
                        Key Entities & References
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {aiData.entities.map((ent, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-[#181820] border border-[#242430] text-gray-300 rounded text-[11px] font-mono"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up / Strategic Questions */}
                  {aiData.followUpQuestions && aiData.followUpQuestions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#1E1E24]">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                        Strategic Inquiries
                      </h4>
                      <ul className="space-y-1 text-xs text-gray-400">
                        {aiData.followUpQuestions.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback / Retry Prompt */
                <div className="p-6 bg-[#16161D] border border-[#22222A] rounded-xl text-center space-y-3 my-4">
                  <Sparkles className="w-8 h-8 text-blue-400 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Generate Executive Debrief</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Extract core takeaways and impact analysis for this article.
                    </p>
                  </div>
                  <button
                    onClick={() => loadAiSummary(story)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Analyze with Gemini 3.7
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="pt-4 mt-4 border-t border-[#1E1E24] flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>SIGNAL / 01 Executive Desk</span>
              <button
                onClick={handleToggleVoice}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                {isPlayingAudio ? 'Pause Voice' : 'Listen to Brief'} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
