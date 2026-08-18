import { FeedSource, StoryItem, FeedDiagnosis, DailyDigest } from '../types';

export async function fetchAllFeeds(sources: FeedSource[]): Promise<{
  stories: StoryItem[];
  sourceStatuses: Record<string, { status: 'ok' | 'error'; itemCount: number; errorMessage?: string; latencyMs: number }>;
}> {
  const activeSources = sources.filter(s => s.enabled);
  const sourceStatuses: Record<string, { status: 'ok' | 'error'; itemCount: number; errorMessage?: string; latencyMs: number }> = {};
  const allStories: StoryItem[] = [];

  // Try backend batch endpoint first
  try {
    const res = await fetch('/api/feeds/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeds: activeSources.map(s => ({ url: s.url, category: s.category, name: s.name })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.feeds)) {
        for (let i = 0; i < data.feeds.length; i++) {
          const feedRes = data.feeds[i];
          const matchingSource = activeSources.find(s => s.url === feedRes.url) || activeSources[i];
          const sourceId = matchingSource ? matchingSource.id : feedRes.url;

          if (feedRes.status === 'ok' && Array.isArray(feedRes.items)) {
            sourceStatuses[sourceId] = {
              status: 'ok',
              itemCount: feedRes.items.length,
              latencyMs: feedRes.responseTimeMs || 150,
            };
            allStories.push(...feedRes.items);
          } else {
            sourceStatuses[sourceId] = {
              status: 'error',
              itemCount: 0,
              errorMessage: feedRes.errorMessage || 'Feed unreachable',
              latencyMs: feedRes.responseTimeMs || 0,
            };
          }
        }

        // Deduplicate stories by ID / link
        const uniqueStoriesMap = new Map<string, StoryItem>();
        for (const story of allStories) {
          const key = story.id || story.link || `${story.title}-${story.pubDate}`;
          if (!uniqueStoriesMap.has(key)) {
            uniqueStoriesMap.set(key, story);
          }
        }
        const deduplicatedStories = Array.from(uniqueStoriesMap.values());

        // Sort stories descending by publication date
        deduplicatedStories.sort((a, b) => {
          const timeA = new Date(a.isoDate || a.pubDate).getTime() || 0;
          const timeB = new Date(b.isoDate || b.pubDate).getTime() || 0;
          return timeB - timeA;
        });

        return { stories: deduplicatedStories, sourceStatuses };
      }
    }
  } catch (err) {
    console.warn('Batch fetch via backend failed, falling back to per-feed fetch', err);
  }

  // Fallback to per-feed fetch
  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const start = Date.now();
      try {
        // Try backend proxy
        const directProxyRes = await fetch(`/api/feed?url=${encodeURIComponent(source.url)}&category=${encodeURIComponent(source.category)}`);
        if (directProxyRes.ok) {
          const data = await directProxyRes.json();
          if (data.status === 'ok' && Array.isArray(data.items)) {
            return {
              sourceId: source.id,
              items: data.items,
              status: 'ok' as const,
              latencyMs: Date.now() - start,
            };
          }
        }

        // Fallback to public CORS proxy if backend is unavailable
        const corsRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(source.url)}`);
        if (corsRes.ok) {
          const xmlText = await corsRes.text();
          const items = parseXmlInBrowser(xmlText, source);
          return {
            sourceId: source.id,
            items,
            status: 'ok' as const,
            latencyMs: Date.now() - start,
          };
        }

        throw new Error('All proxy strategies exhausted');
      } catch (err: any) {
        return {
          sourceId: source.id,
          items: [],
          status: 'error' as const,
          errorMessage: err.message || 'CORS / Network Error',
          latencyMs: Date.now() - start,
        };
      }
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { sourceId, items, status, errorMessage, latencyMs } = r.value;
      sourceStatuses[sourceId] = {
        status,
        itemCount: items.length,
        errorMessage,
        latencyMs,
      };
      allStories.push(...items);
    }
  }

  const uniqueStoriesMap = new Map<string, StoryItem>();
  for (const story of allStories) {
    const key = story.id || story.link || `${story.title}-${story.pubDate}`;
    if (!uniqueStoriesMap.has(key)) {
      uniqueStoriesMap.set(key, story);
    }
  }
  const deduplicatedStories = Array.from(uniqueStoriesMap.values());

  deduplicatedStories.sort((a, b) => {
    const timeA = new Date(a.isoDate || a.pubDate).getTime() || 0;
    const timeB = new Date(b.isoDate || b.pubDate).getTime() || 0;
    return timeB - timeA;
  });

  return { stories: deduplicatedStories, sourceStatuses };
}

function parseXmlInBrowser(xmlText: string, source: FeedSource): StoryItem[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = Array.from(xmlDoc.querySelectorAll('item, entry'));

  return items.map((el, i) => {
    const title = el.querySelector('title')?.textContent || 'Untitled';
    const link = el.querySelector('link')?.textContent || el.querySelector('link')?.getAttribute('href') || `${source.url}#${i}`;
    const desc = el.querySelector('description, summary, content')?.textContent || '';
    const pubDate = el.querySelector('pubDate, published, updated')?.textContent || new Date().toISOString();

    const cleanText = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      id: `${source.id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      link,
      pubDate: new Date(pubDate).toUTCString(),
      isoDate: new Date(pubDate).toISOString(),
      contentSnippet: cleanText.slice(0, 300),
      content: cleanText,
      sourceTitle: source.name,
      sourceUrl: source.url,
      category: source.category,
    };
  });
}

// AI Services
export async function getAiArticleSummary(story: StoryItem) {
  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: story.title,
        source: story.sourceTitle,
        content: story.content || story.contentSnippet || story.title,
        link: story.link,
        category: story.category,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Network call to /api/ai/summarize failed, using client fallback debrief:', e);
  }

  // Client-side instant fallback synthesis if server endpoint is unreachable
  const text = (story.content || story.contentSnippet || story.title || '').trim();
  const sentences = text.split(/(?<=[.?!])\s+/).filter((s) => s.length > 15);
  
  return {
    takeaways: [
      sentences[0] || story.title,
      sentences[1] || `Key dispatch reported by ${story.sourceTitle}.`,
      `Filed under ${story.category || 'National News'} coverage.`,
    ],
    whyItMatters: `Crucial update from ${story.sourceTitle} providing key insights into developments in this sector.`,
    sentiment: 'Neutral',
    entities: [story.sourceTitle, story.category || 'News'],
    readingTimeMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 180)),
    followUpQuestions: [
      `What are the immediate follow-on implications?`,
      `How will other industry leaders respond?`,
    ],
    engine: 'Local Intelligence Engine',
  };
}

export async function getDailyBriefing(stories: StoryItem[], topic: string): Promise<DailyDigest> {
  const res = await fetch('/api/ai/briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articles: stories.slice(0, 20),
      topic,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate briefing');
  }

  const data = await res.json();
  return {
    ...data,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    topic,
  };
}

export async function askAiAboutNews(query: string, stories: StoryItem[]): Promise<string> {
  const qWords = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  
  // Prioritize articles matching keywords in the query
  const scored = stories.map((s) => {
    let score = 0;
    const text = `${s.title} ${s.content || ''} ${s.contentSnippet || ''} ${s.category || ''} ${s.sourceTitle || ''}`.toLowerCase();
    for (const w of qWords) {
      if (text.includes(w)) score += 2;
    }
    return { story: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const prioritizedStories = scored.slice(0, 35).map((item) => ({
    title: item.story.title,
    sourceTitle: item.story.sourceTitle,
    contentSnippet: item.story.contentSnippet || item.story.content,
    pubDate: item.story.pubDate,
    category: item.story.category,
  }));

  try {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        articles: prioritizedStories,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.answer) {
        return data.answer;
      }
    }
  } catch (e) {
    console.warn('Network call to /api/ai/ask failed, running local browser synthesis:', e);
  }

  // Client-side instant synthesis if server unreachable
  const matching = stories.filter((s) => {
    const text = `${s.title} ${s.content || ''} ${s.contentSnippet || ''}`.toLowerCase();
    return qWords.some((w) => text.includes(w));
  });

  if (matching.length > 0) {
    const top = matching.slice(0, 4);
    const list = top
      .map(
        (m, i) =>
          `**${i + 1}. ${m.title}** (${m.sourceTitle})\n${
            m.contentSnippet ? `${m.contentSnippet.slice(0, 200)}...` : 'Full article available on source.'
          }`
      )
      .join('\n\n');

    return `Here are the relevant stories found in your live feeds matching **"${query}"**:\n\n${list}`;
  }

  return `I analyzed your live feeds of ${stories.length} stories, but found no active dispatches referencing "${query}". You can try broadening your search or checking the Direct News Directory.`;
}

export async function diagnoseFeedUrl(url: string): Promise<FeedDiagnosis> {
  const res = await fetch(`/api/diagnose?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error('Diagnosis server failed');
  }
  return await res.json();
}
