import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        
        if (url.startsWith('/api/')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const {
            fetchSingleFeed,
            summarizeArticleWithGemini,
            generateDailyBriefing,
            askNewsAssistant
          } = await import('./src/server/rssService.ts');

          try {
            // 1. Single feed proxy
            if (url.startsWith('/api/feed?') || url === '/api/feed') {
              const reqUrl = new URL(url, `http://${req.headers.host || 'localhost:3000'}`);
              const feedUrl = reqUrl.searchParams.get('url');
              const category = reqUrl.searchParams.get('category') || 'General';

              if (!feedUrl) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
                return;
              }

              const result = await fetchSingleFeed(feedUrl, category);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            // 2. Batch feeds proxy
            if (url === '/api/feeds/batch' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => (body += chunk));
              req.on('end', async () => {
                try {
                  const { feeds } = JSON.parse(body || '{}') as { feeds: Array<{ url: string; category?: string; name?: string }> };
                  if (!Array.isArray(feeds)) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid feeds array' }));
                    return;
                  }

                  const results = await Promise.allSettled(
                    feeds.map(f => fetchSingleFeed(f.url, f.category || 'General'))
                  );

                  const feedResponses = results.map((r, idx) => {
                    if (r.status === 'fulfilled') return r.value;
                    return {
                      url: feeds[idx].url,
                      title: feeds[idx].name || feeds[idx].url,
                      items: [],
                      status: 'error',
                      errorMessage: r.reason?.message || 'Network error',
                      fetchedAt: new Date().toISOString(),
                      responseTimeMs: 0,
                    };
                  });

                  res.statusCode = 200;
                  res.end(JSON.stringify({ feeds: feedResponses }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }

            // 3. AI Article Summarization
            if (url === '/api/ai/summarize' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => (body += chunk));
              req.on('end', async () => {
                try {
                  const articleData = JSON.parse(body || '{}');
                  const summary = await summarizeArticleWithGemini(articleData);
                  res.statusCode = 200;
                  res.end(JSON.stringify(summary));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'AI summarization failed' }));
                }
              });
              return;
            }

            // 4. AI Daily Briefing
            if (url === '/api/ai/briefing' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => (body += chunk));
              req.on('end', async () => {
                try {
                  const { articles, topic } = JSON.parse(body || '{}');
                  const briefing = await generateDailyBriefing(articles || [], topic);
                  res.statusCode = 200;
                  res.end(JSON.stringify(briefing));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'Briefing generation failed' }));
                }
              });
              return;
            }

            // 5. Ask AI News Assistant
            if (url === '/api/ai/ask' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => (body += chunk));
              req.on('end', async () => {
                try {
                  const { query, articles } = JSON.parse(body || '{}');
                  const answer = await askNewsAssistant(query, articles || []);
                  res.statusCode = 200;
                  res.end(JSON.stringify({ answer }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'AI assistant failed' }));
                }
              });
              return;
            }

            // 6. Diagnostics
            if (url.startsWith('/api/diagnose?') || url === '/api/diagnose') {
              const reqUrl = new URL(url, `http://${req.headers.host || 'localhost:3000'}`);
              const targetUrl = reqUrl.searchParams.get('url');
              if (!targetUrl) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing url' }));
                return;
              }

              const diagnosis = await testFeedDiagnosis(targetUrl);
              res.statusCode = 200;
              res.end(JSON.stringify(diagnosis));
              return;
            }

            next();
          } catch (serverErr: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: serverErr.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

async function testFeedDiagnosis(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    const elapsed = Date.now() - start;
    const contentType = res.headers.get('content-type') || 'unknown';
    const text = await res.text();
    const isXml = text.includes('<rss') || text.includes('<feed') || text.includes('<?xml') || text.includes('<channel');

    return {
      url,
      httpStatus: res.status,
      statusText: res.statusText,
      contentType,
      isXml,
      latencyMs: elapsed,
      sizeBytes: text.length,
      reachable: res.ok,
      probableIssue: !res.ok
        ? res.status === 403
          ? 'Cloudflare / Bot protection blocking direct scraper'
          : `Remote server returned HTTP ${res.status}`
        : !isXml
          ? 'Target URL returned HTML webpage instead of RSS/Atom XML feed'
          : null,
    };
  } catch (err: any) {
    return {
      url,
      httpStatus: 0,
      statusText: 'Network / DNS / Timeout Error',
      reachable: false,
      latencyMs: Date.now() - start,
      probableIssue: err.message.includes('timeout')
        ? 'Connection timed out (8s)'
        : `Network error: ${err.message}`,
    };
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
