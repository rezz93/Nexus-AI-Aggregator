import Parser from 'rss-parser';
import { XMLParser } from 'fast-xml-parser';
import { GoogleGenAI } from '@google/genai';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml, */*;q=0.9',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'authorName'],
    ],
  },
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  author?: string;
  sourceTitle: string;
  sourceUrl: string;
  category?: string;
  imageUrl?: string;
  guid?: string;
}

export interface FeedResponse {
  url: string;
  title: string;
  description?: string;
  items: FeedItem[];
  status: 'ok' | 'error';
  errorMessage?: string;
  fetchedAt: string;
  responseTimeMs: number;
}

function extractImage(item: any, rawXml?: string): string | undefined {
  if (item.enclosure?.url && (item.enclosure?.type?.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url))) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$?.url || item.mediaContent?.url) {
    return item.mediaContent?.$?.url || item.mediaContent?.url;
  }
  if (item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url) {
    return item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url;
  }
  // Check in content or description for img tags
  const content = item['content:encoded'] || item.content || item.description || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return undefined;
}

function cleanHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function refineHeadline(rawTitle: string, snippet: string): string {
  const cleaned = cleanHtml(rawTitle);
  const genericTitles = [
    "here's the latest.",
    "here’s the latest.",
    "here's what you need to know.",
    "live updates",
    "live update",
    "latest news",
    "breaking news",
    "news update"
  ];
  
  if (genericTitles.includes(cleaned.toLowerCase()) && snippet) {
    // Grab first sentence of snippet to make title descriptive
    const firstSentence = snippet.split(/(?<=[.?!])\s+/)[0];
    if (firstSentence && firstSentence.length > 15) {
      return `${cleaned.replace(/[.]+$/, '')}: ${firstSentence.slice(0, 95).trim()}${firstSentence.length > 95 ? '...' : ''}`;
    }
  }
  return cleaned;
}

export async function fetchSingleFeed(feedUrl: string, category: string = 'General'): Promise<FeedResponse> {
  const startTime = Date.now();
  try {
    const parsedUrl = new URL(feedUrl);
    
    // Fetch with resilient headers
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error('Received empty response from feed server');
    }

    let parsedFeed;
    try {
      parsedFeed = await parser.parseString(xmlText);
    } catch (parseErr: any) {
      // Fallback to fast-xml-parser if standard rss-parser choked on malformed tags
      const xmlObj = xmlParser.parse(xmlText);
      const channel = xmlObj.rss?.channel || xmlObj.feed || xmlObj['rdf:RDF'];
      if (!channel) {
        throw new Error(`Feed XML parsing failed: ${parseErr.message || 'Invalid XML schema'}`);
      }
      
      const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : Array.isArray(channel.entry) ? channel.entry : channel.entry ? [channel.entry] : [];
      
      const items: FeedItem[] = rawItems.map((raw: any, idx: number) => {
        const title = raw.title?.['#text'] || raw.title || 'Untitled Story';
        const link = typeof raw.link === 'string' ? raw.link : raw.link?.['@_href'] || feedUrl;
        const desc = raw.description || raw.summary || raw.content || '';
        const snippet = cleanHtml(desc).slice(0, 300);
        const pubDate = raw.pubDate || raw.published || raw.updated || new Date().toISOString();
        
        return {
          id: `${feedUrl}-${raw.guid || raw.id || idx}-${Date.now()}`,
          title: refineHeadline(title, snippet),
          link,
          pubDate: new Date(pubDate).toUTCString(),
          isoDate: new Date(pubDate).toISOString(),
          contentSnippet: snippet,
          content: cleanHtml(desc),
          author: raw['dc:creator'] || raw.author?.name || undefined,
          sourceTitle: channel.title || parsedUrl.hostname,
          sourceUrl: feedUrl,
          category,
          imageUrl: undefined,
        };
      });

      return {
        url: feedUrl,
        title: channel.title || parsedUrl.hostname,
        description: channel.description || '',
        items,
        status: 'ok',
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      };
    }

    const seenLinks = new Set<string>();
    const items: FeedItem[] = [];

    (parsedFeed.items || []).forEach((item, idx) => {
      const itemLink = item.link || `${feedUrl}#item-${idx}`;
      const itemTitle = item.title || 'Untitled';
      const dedupKey = `${itemLink.trim().toLowerCase()}-${itemTitle.trim().toLowerCase()}`;
      
      if (seenLinks.has(dedupKey)) {
        return; // Skip duplicate item inside feed
      }
      seenLinks.add(dedupKey);

      const snippet = cleanHtml(item.contentSnippet || item.content || item.summary || '').slice(0, 320);
      const title = refineHeadline(itemTitle, snippet);
      const fullContent = cleanHtml(item.content || item.contentSnippet || item.summary || '');
      const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
      const img = extractImage(item);

      items.push({
        id: `${feedUrl}-${item.guid || item.id || itemLink}-${idx}`,
        title,
        link: itemLink,
        pubDate: item.pubDate ? new Date(item.pubDate).toUTCString() : new Date().toUTCString(),
        isoDate: item.isoDate || new Date(pubDate).toISOString(),
        contentSnippet: snippet,
        content: fullContent,
        author: item.creator || (item as any).authorName || item.author,
        sourceTitle: parsedFeed.title || parsedUrl.hostname,
        sourceUrl: feedUrl,
        category,
        imageUrl: img,
      });
    });

    return {
      url: feedUrl,
      title: parsedFeed.title || parsedUrl.hostname,
      description: parsedFeed.description || '',
      items,
      status: 'ok',
      fetchedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      url: feedUrl,
      title: feedUrl,
      items: [],
      status: 'error',
      errorMessage: error.message || 'Failed to fetch RSS feed',
      fetchedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    };
  }
}

// Smart Local Extraction Debrief Engine (Fallback if Gemini API is unreachable or key not set)
function generateFallbackArticleDebrief(article: {
  title: string;
  source: string;
  content: string;
  link: string;
  category?: string;
}) {
  const text = (article.content || article.title || '').trim();
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.length > 20 && !s.toLowerCase().includes('click here') && !s.toLowerCase().includes('read more'));

  // Extract takeaways
  let takeaways: string[] = [];
  if (sentences.length >= 3) {
    takeaways = [
      sentences[0],
      sentences[1] || `${article.source} reports significant updates regarding ${article.title.toLowerCase()}.`,
      sentences[2] || `Key developments continue to emerge across the ${article.category || 'National'} landscape.`,
    ];
  } else if (sentences.length > 0) {
    takeaways = [
      sentences[0],
      `Reported directly by ${article.source} with real-time updates.`,
      `Contextualized under ${article.category || 'National News'} reporting.`,
    ];
  } else {
    takeaways = [
      article.title,
      `Detailed coverage dispatched by ${article.source}.`,
      `Follow the original wire link for the full unedited report.`,
    ];
  }

  // Determine sentiment
  const lower = text.toLowerCase();
  let sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Urgent' | 'Developing' = 'Neutral';
  if (lower.includes('breaking') || lower.includes('urgent') || lower.includes('alert') || lower.includes('warning')) {
    sentiment = 'Urgent';
  } else if (lower.includes('win') || lower.includes('record') || lower.includes('growth') || lower.includes('success') || lower.includes('boost')) {
    sentiment = 'Positive';
  } else if (lower.includes('crisis') || lower.includes('crash') || lower.includes('decline') || lower.includes('investigation') || lower.includes('death')) {
    sentiment = 'Negative';
  } else if (lower.includes('develops') || lower.includes('ongoing') || lower.includes('continues') || lower.includes('hearings')) {
    sentiment = 'Developing';
  }

  // Extract entities (proper nouns / capitalized keywords)
  const words = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  const freqMap: Record<string, number> = {};
  const ignored = new Set(['The', 'This', 'That', 'These', 'Those', 'There', 'Here', 'According', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
  words.forEach((w) => {
    if (!ignored.has(w) && w.length > 2) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  });
  const entities = Object.keys(freqMap)
    .sort((a, b) => freqMap[b] - freqMap[a])
    .slice(0, 5);

  if (entities.length === 0) {
    entities.push(article.source, article.category || 'General');
  }

  const wordCount = text.split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  return {
    takeaways: takeaways.slice(0, 3),
    whyItMatters: sentences[0]
      ? `This development highlights shifting momentum in ${article.category || 'current events'}, directly impacting public awareness and policy.`
      : `Critical dispatch from ${article.source} offering real-time insight into this developing story.`,
    sentiment,
    entities,
    readingTimeMinutes,
    followUpQuestions: [
      `What are the immediate downstream consequences for ${entities[0] || 'stakeholders'}?`,
      `How will peer institutions or competitors respond over the coming quarter?`,
    ],
    engine: 'Local Intelligence Engine',
  };
}

// AI Summarization & Intelligence with Gemini
export async function summarizeArticleWithGemini(article: {
  title: string;
  source: string;
  content: string;
  link: string;
  category?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.info('GEMINI_API_KEY not found in server environment, using local analytical synthesis engine.');
    return generateFallbackArticleDebrief(article);
  }

  const prompt = `You are a senior news intelligence analyst. Analyze the following news story and produce a rigorous, insightful executive debrief.

Headline: ${article.title}
Source: ${article.source} (${article.category || 'General'})
Story Details / Snippet:
${article.content || article.title}

Respond strictly in valid JSON format matching this schema:
{
  "takeaways": ["Key takeaway point 1", "Key takeaway point 2", "Key takeaway point 3"],
  "whyItMatters": "A concise 1-2 sentence explanation of the broader structural impact or significance.",
  "sentiment": "Positive" | "Neutral" | "Negative" | "Urgent" | "Developing",
  "entities": ["Entity/Person/Org 1", "Entity 2", "Entity 3"],
  "readingTimeMinutes": 2,
  "followUpQuestions": ["Strategic question 1", "Strategic question 2"]
}`;

  const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          engine: model === 'gemini-3.7-flash' ? 'Gemini 3.7 Flash' : `Gemini Intelligence (${model})`,
        };
      }
    } catch (err: any) {
      console.warn(`Summarize model ${model} failed:`, err.message || err);
    }
  }

  return generateFallbackArticleDebrief(article);
}

// AI Daily Executive Briefing
export async function generateDailyBriefing(
  articles: Array<{ title: string; sourceTitle: string; category?: string; contentSnippet?: string }>,
  topic?: string
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const topStories = articles.slice(0, 5);
    return {
      headline: `${topic && topic !== 'All' ? topic : 'Global & National'} Intelligence Briefing: Key Dispatches`,
      executiveSummary: `Today's monitoring stream aggregates ${articles.length} dispatches across major newsrooms. Key headlines center on ongoing policy developments, economic trends, outdoor conservation updates, and technological advancements. Readers should prioritize stories from leading wire desks for comprehensive depth.`,
      topThemes: [
        {
          theme: 'Primary Wire & Policy Trends',
          summary: 'High-frequency reporting across federal agencies and congressional committees.',
          keyStories: topStories.slice(0, 2).map((s) => s.title),
        },
        {
          theme: 'Specialized & Industry Updates',
          summary: 'Targeted updates across tech, markets, and regional outdoor tournaments.',
          keyStories: topStories.slice(2, 4).map((s) => s.title),
        },
      ],
      audioDigestScript: `Here is your executive news digest for ${topic || 'today'}. We are tracking ${articles.length} verified dispatches. The lead story focuses on ${topStories[0]?.title || 'breaking news'}. Stay tuned for ongoing updates throughout the day.`,
      engine: 'Local Intelligence Engine',
    };
  }

  const articleList = articles
    .slice(0, 18)
    .map(
      (a, i) =>
        `${i + 1}. [${a.category || 'General'}] [${a.sourceTitle}] ${a.title}: ${a.contentSnippet || ''}`
    )
    .join('\n');

  const prompt = `You are the lead editor for "SIGNAL / 01", a high-caliber intelligence desk.
Topic Filter: ${topic || 'All Topics'}
Current Live Feeds (${articles.length} stories available):
${articleList}

Generate a sharp, comprehensive editorial news digest. Write strictly in JSON format:
{
  "headline": "A punchy, editorial headline capturing today's defining narrative",
  "executiveSummary": "A cohesive 2-3 paragraph executive summary synthesizing major developments, cross-cutting themes, and what readers need to know right now.",
  "topThemes": [
    {
      "theme": "Theme title",
      "summary": "Short 1-2 sentence breakdown",
      "keyStories": ["Story Title 1", "Story Title 2"]
    }
  ],
  "audioDigestScript": "A concise, engaging 90-second conversational voiceover script suitable for text-to-speech audio briefing."
}`;

  const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          engine: model === 'gemini-3.7-flash' ? 'Gemini 3.7 Flash' : `Gemini (${model})`,
        };
      }
    } catch (err: any) {
      console.warn(`Briefing model ${model} failed:`, err.message || err);
    }
  }

  const topStories = articles.slice(0, 5);
  return {
    headline: `Executive Intelligence Summary: ${topic || 'All Topics'}`,
    executiveSummary: `Monitoring ${articles.length} live stories from verified sources. Top coverage highlights recent events in ${topStories[0]?.sourceTitle || 'major newsrooms'}.`,
    topThemes: [
      {
        theme: 'Breaking Wire Reports',
        summary: 'Live coverage from national and global publications.',
        keyStories: topStories.slice(0, 3).map((s) => s.title),
      },
    ],
    audioDigestScript: `Here is your daily brief. Top story: ${topStories[0]?.title || 'News report'}.`,
    engine: 'Local Intelligence Engine',
  };
}

// Helper to run intelligent local news search & synthesis
function synthesizeLocalNewsAnswer(
  query: string,
  articles: Array<{ title: string; sourceTitle: string; contentSnippet?: string; pubDate?: string; category?: string }>
): string {
  const qClean = query.toLowerCase().trim();
  const qWords = qClean.split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  // Score articles based on query terms
  const scored = articles.map((article) => {
    let score = 0;
    const titleLower = (article.title || '').toLowerCase();
    const contentLower = (article.contentSnippet || '').toLowerCase();
    const sourceLower = (article.sourceTitle || '').toLowerCase();
    const categoryLower = (article.category || '').toLowerCase();

    // Exact phrase match
    if (titleLower.includes(qClean)) score += 20;
    if (contentLower.includes(qClean)) score += 10;

    // Word matches
    for (const w of qWords) {
      if (titleLower.includes(w)) score += 6;
      if (contentLower.includes(w)) score += 3;
      if (categoryLower.includes(w)) score += 4;
      if (sourceLower.includes(w)) score += 2;
    }

    return { article, score };
  });

  const matching = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.article);

  if (matching.length > 0) {
    const top = matching.slice(0, 5);
    const summaryList = top
      .map(
        (m, i) =>
          `**${i + 1}. ${m.title}**\n*Source: ${m.sourceTitle}${m.pubDate ? ` • ${m.pubDate}` : ''}*\n${
            m.contentSnippet ? `${m.contentSnippet.slice(0, 220)}...` : 'Full coverage available in your live feed.'
          }`
      )
      .join('\n\n');

    return (
      `### Executive News Intelligence Report\n` +
      `Here are the top dispatches matching **"${query}"** from your ${articles.length} indexed live feed stories:\n\n` +
      `${summaryList}\n\n` +
      `*Report synthesized from live RSS feeds.*`
    );
  }

  // If no direct keyword match, provide top recent wire stories
  const topWire = articles.slice(0, 4);
  const generalList = topWire
    .map(
      (m, i) =>
        `**${i + 1}. ${m.title}** (${m.sourceTitle})\n${
          m.contentSnippet ? `${m.contentSnippet.slice(0, 180)}...` : ''
        }`
    )
    .join('\n\n');

  return (
    `I reviewed your live monitoring stream of ${articles.length} stories, but found no specific coverage directly referencing **"${query}"** in the current feed batch.\n\n` +
    `Here are the most recent major dispatches currently active across your newsrooms:\n\n` +
    `${generalList}\n\n` +
    `*Tip: You can add new RSS feeds or browse the Direct News Directory to track more specialized topics.*`
  );
}

// Ask AI About Aggregated News
export async function askNewsAssistant(
  query: string,
  articles: Array<{ title: string; sourceTitle: string; contentSnippet?: string; pubDate?: string; category?: string }>
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return synthesizeLocalNewsAnswer(query, articles);
  }

  // Pre-sort articles by query relevance so the top matching stories are passed in context
  const qWords = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const sortedArticles = [...articles].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    const textA = `${a.title} ${a.contentSnippet || ''} ${a.category || ''}`.toLowerCase();
    const textB = `${b.title} ${b.contentSnippet || ''} ${b.category || ''}`.toLowerCase();
    qWords.forEach((w) => {
      if (textA.includes(w)) scoreA += 1;
      if (textB.includes(w)) scoreB += 1;
    });
    return scoreB - scoreA;
  });

  const contextArticles = sortedArticles.slice(0, 25);
  const context = contextArticles
    .map(
      (a, i) =>
        `Story #${i + 1}: ${a.title} (Source: ${a.sourceTitle}, Date: ${a.pubDate || 'Recent'})\nExcerpt: ${
          a.contentSnippet || 'N/A'
        }`
    )
    .join('\n\n');

  const prompt = `You are the Custom AI News Analyst for the SIGNAL / 01 Intelligence Desk.
Use the following live news dispatches from the user's active feeds to answer their question clearly, concisely, and objectively. If the feeds contain matching information, summarize the key findings and cite the source publications. If the feeds only partially address the topic, synthesize what is available and provide helpful objective context.

Live Feeds Context (${contextArticles.length} stories provided):
${context}

User Question: "${query}"

Provide an authoritative, clear response formatted with markdown headings/bullet points when helpful.`;

  const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
      }
    } catch (err: any) {
      console.warn(`Model ${model} request failed (${err.message || err}), trying fallback...`);
    }
  }

  // If all Gemini model endpoints are under temporary high demand / 503, fallback to local synthesis
  console.info('All Gemini endpoints unavailable, executing local analytical synthesis for assistant query.');
  return synthesizeLocalNewsAnswer(query, articles);
}
