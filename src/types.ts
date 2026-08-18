export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: 'National' | 'Politics' | 'Fishing' | 'Tech & AI' | 'Science' | 'Finance' | 'Custom';
  enabled: boolean;
  icon?: string;
  lastStatus?: 'ok' | 'error' | 'pending';
  lastChecked?: string;
  errorMessage?: string;
  itemCount?: number;
}

export interface StoryItem {
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
  category: string;
  imageUrl?: string;
  read?: boolean;
  bookmarked?: boolean;
  aiTakeaways?: string[];
  aiWhyItMatters?: string;
  aiSentiment?: 'Positive' | 'Neutral' | 'Negative' | 'Urgent' | 'Developing';
  aiEntities?: string[];
}

export interface DailyDigest {
  headline: string;
  executiveSummary: string;
  topThemes: Array<{
    theme: string;
    summary: string;
    keyStories: string[];
  }>;
  audioDigestScript?: string;
  generatedAt: string;
  topic: string;
}

export interface FeedDiagnosis {
  url: string;
  httpStatus: number;
  statusText: string;
  contentType: string;
  isXml: boolean;
  latencyMs: number;
  sizeBytes: number;
  reachable: boolean;
  probableIssue: string | null;
}

export interface DirectNewsSource {
  id: string;
  name: string;
  url: string;
  category: 'National' | 'Politics' | 'Fishing' | 'Tech & AI' | 'Finance' | 'Science' | 'World' | 'Sports' | 'Custom';
  description: string;
  domain: string;
  focusTag: string;
  featured?: boolean;
  custom?: boolean;
  aliases?: string[];
}

export interface FeedPreferences {
  maxArticlesPerSource: number; // 0 = unlimited, 1, 2, 3, 5, 10
  sortBy: 'newest' | 'balanced' | 'source' | 'category';
  layoutMode: 'editorial' | 'grid' | 'compact';
  blockedKeywords: string[];
  includedKeywords: string[];
  pinnedDirectSourceIds: string[];
}

