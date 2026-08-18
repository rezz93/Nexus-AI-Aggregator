import { FeedSource } from '../types';

export const INITIAL_FEEDS: FeedSource[] = [
  // National News
  {
    id: 'abc-news-us',
    name: 'ABC News US',
    url: 'https://abcnews.go.com/abcnews/usheadlines',
    category: 'National',
    enabled: true,
  },
  {
    id: 'cbs-news-us',
    name: 'CBS News US',
    url: 'https://www.cbsnews.com/latest/rss/us',
    category: 'National',
    enabled: true,
  },
  {
    id: 'nyt-us',
    name: 'New York Times US',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
    category: 'National',
    enabled: true,
  },
  {
    id: 'bbc-us-canada',
    name: 'BBC US & Canada',
    url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    category: 'National',
    enabled: true,
  },
  {
    id: 'nbc-news-top',
    name: 'NBC News',
    url: 'https://feeds.nbcnews.com/nbcnews/public/news',
    category: 'National',
    enabled: true,
  },

  // Politics
  {
    id: 'politico-top',
    name: 'Politico Top News',
    url: 'https://rss.politico.com/politics-news.xml',
    category: 'Politics',
    enabled: true,
  },
  {
    id: 'the-hill',
    name: 'The Hill',
    url: 'https://thehill.com/feed/',
    category: 'Politics',
    enabled: true,
  },
  {
    id: 'abc-politics',
    name: 'ABC Politics',
    url: 'https://abcnews.go.com/abcnews/politicsheadlines',
    category: 'Politics',
    enabled: true,
  },

  // Fishing & Outdoors
  {
    id: 'bassmaster',
    name: 'Bassmaster',
    url: 'https://www.bassmaster.com/news/feed/',
    category: 'Fishing',
    enabled: true,
  },
  {
    id: 'wired2fish',
    name: 'Wired2Fish',
    url: 'https://wired2fish.com/feed/',
    category: 'Fishing',
    enabled: true,
  },
  {
    id: 'field-and-stream-fish',
    name: 'Field & Stream',
    url: 'https://www.fieldandstream.com/feed/',
    category: 'Fishing',
    enabled: true,
  },
  {
    id: 'onthewater-fish',
    name: 'On The Water',
    url: 'https://www.onthewater.com/feed',
    category: 'Fishing',
    enabled: true,
  },
  {
    id: 'outdoorlife-fish',
    name: 'Outdoor Life',
    url: 'https://www.outdoorlife.com/feed/',
    category: 'Fishing',
    enabled: true,
  },

  // Tech & AI
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'Tech & AI',
    enabled: true,
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Tech & AI',
    enabled: true,
  },
];
