import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Bot, User, RotateCcw } from 'lucide-react';
import { StoryItem } from '../types';
import { askAiAboutNews } from '../services/feedClient';

interface AskAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoryItem[];
}

export const AskAiDrawer: React.FC<AskAiDrawerProps> = ({
  isOpen,
  onClose,
  stories,
}) => {
  const defaultGreeting = (count: number) => ({
    role: 'assistant' as const,
    text: `Hello! I'm your SIGNAL intelligence analyst. I have indexed ${count} live dispatches from your active feeds. Ask me anything—such as "What are the latest fishing updates?", "Any severe weather or thunderstorm alerts?", "Summarize today's political debates", or "What major national headlines broke today?"`,
  });

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    defaultGreeting(stories.length),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Update initial greeting if stories load after mount and user hasn't started asking questions yet
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant' && stories.length > 0) {
      setMessages([defaultGreeting(stories.length)]);
    }
  }, [stories.length]);

  if (!isOpen) return null;

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    const userQ = promptText.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);

    try {
      const answer = await askAiAboutNews(userQ, stories);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I synthesized your live news feeds, but encountered temporary latency connecting to the cloud model. Please try asking again or select one of the suggested topics below.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendPrompt(input);
  };

  const handleResetChat = () => {
    setMessages([defaultGreeting(stories.length)]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0A0A0C]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0F0F12] border-l border-[#1F1F23] w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1F1F23] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">SIGNAL Intelligence Desk</h2>
              <p className="text-[11px] text-blue-400 font-mono">Gemini 3.7 • {stories.length} Live Feeds</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1A1A20] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-xs font-sans'
                    : 'bg-[#141418] text-[#E0E0E6] border border-[#1F1F23] rounded-bl-none shadow-xs text-xs font-sans leading-relaxed'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-[#2A2A34] text-gray-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-gray-400 italic text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Synthesizing live news feeds with Gemini...</span>
            </div>
          )}
        </div>

        {/* Prompt Suggestions */}
        <div className="px-4 py-2.5 border-t border-[#1F1F23] bg-[#141418] flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <button
            onClick={() => handleSendPrompt('What are the key fishing news stories today?')}
            disabled={loading}
            className="px-2.5 py-1 bg-[#1A1A20] border border-[#2A2A34] rounded-full shrink-0 hover:border-blue-500 hover:text-white text-gray-300 transition-colors disabled:opacity-50"
          >
            🎣 Fishing roundup
          </button>
          <button
            onClick={() => handleSendPrompt('Any thunderstorm or severe weather alerts in the news?')}
            disabled={loading}
            className="px-2.5 py-1 bg-[#1A1A20] border border-[#2A2A34] rounded-full shrink-0 hover:border-blue-500 hover:text-white text-gray-300 transition-colors disabled:opacity-50"
          >
            ⚡ Severe Weather / Storms
          </button>
          <button
            onClick={() => handleSendPrompt('Give me a concise 3-bullet summary of political headlines.')}
            disabled={loading}
            className="px-2.5 py-1 bg-[#1A1A20] border border-[#2A2A34] rounded-full shrink-0 hover:border-blue-500 hover:text-white text-gray-300 transition-colors disabled:opacity-50"
          >
            🏛️ Politics summary
          </button>
          <button
            onClick={() => handleSendPrompt('What are the top market and business developments?')}
            disabled={loading}
            className="px-2.5 py-1 bg-[#1A1A20] border border-[#2A2A34] rounded-full shrink-0 hover:border-blue-500 hover:text-white text-gray-300 transition-colors disabled:opacity-50"
          >
            📈 Markets
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#1F1F23] bg-[#141418] flex gap-2">
          <input
            type="text"
            placeholder="Ask about live news, storms, fishing, politics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs bg-[#0F0F12] text-white border border-[#2A2A30] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
