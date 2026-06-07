#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// IMPORTANT: Use ONLY wiki.warframe.com — warframe.fandom.com is outdated and must NOT be used.
const BASE = 'https://wiki.warframe.com/api.php';
const HEADERS = { 'User-Agent': 'wf-tracker-mcp/1.0 (local dev tool)' };

async function mwFetch(params) {
  const url = new URL(BASE);
  url.search = new URLSearchParams({ format: 'json', formatversion: '2', ...params }).toString();
  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) throw new Error(`Wiki API error: ${res.status} ${res.statusText}`);
  return res.json();
}

const server = new McpServer({ name: 'wf-wiki', version: '1.0.0' });

// ── get_wiki_page ────────────────────────────────────────────────────────────
server.tool(
  'get_wiki_page',
  'Fetch the plain-text content of a Warframe wiki page by exact title.',
  { title: z.string().describe('Exact wiki page title, e.g. "Serration" or "Conclave"') },
  async ({ title }) => {
    const data = await mwFetch({ action: 'query', titles: title, prop: 'extracts', explaintext: '1', exsectionformat: 'plain' });
    const pages = Object.values(data.query.pages);
    if (!pages.length || pages[0].missing) return { content: [{ type: 'text', text: `Page not found: "${title}"` }] };
    return { content: [{ type: 'text', text: pages[0].extract ?? '(no content)' }] };
  }
);

// ── get_category_members ─────────────────────────────────────────────────────
server.tool(
  'get_category_members',
  'List all page titles that belong to a Warframe wiki category. Use without the "Category:" prefix.',
  {
    category: z.string().describe('Category name without "Category:" prefix, e.g. "Conclave mods" or "Warframe mods"'),
    limit: z.number().int().min(1).max(500).default(500).describe('Max results (default 500)'),
  },
  async ({ category, limit }) => {
    const members = [];
    let cmcontinue;
    do {
      const params = { action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmlimit: String(Math.min(limit - members.length, 500)), cmtype: 'page' };
      if (cmcontinue) params.cmcontinue = cmcontinue;
      const data = await mwFetch(params);
      members.push(...data.query.categorymembers.map(m => m.title));
      cmcontinue = data.continue?.cmcontinue;
    } while (cmcontinue && members.length < limit);

    const text = members.length ? members.join('\n') : `No members found in category "${category}"`;
    return { content: [{ type: 'text', text: `${members.length} pages in Category:${category}:\n\n${text}` }] };
  }
);

// ── search_wiki ──────────────────────────────────────────────────────────────
server.tool(
  'search_wiki',
  'Full-text search across the Warframe wiki.',
  {
    query: z.string().describe('Search terms'),
    limit: z.number().int().min(1).max(50).default(20).describe('Max results'),
  },
  async ({ query, limit }) => {
    const data = await mwFetch({ action: 'query', list: 'search', srsearch: query, srlimit: String(limit), srinfo: 'totalhits', srprop: 'snippet' });
    const hits = data.query.search;
    if (!hits.length) return { content: [{ type: 'text', text: `No results for "${query}"` }] };
    const lines = hits.map(h => `• ${h.title}\n  ${h.snippet.replace(/<[^>]+>/g, '')}`);
    return { content: [{ type: 'text', text: `${data.query.searchinfo.totalhits} total hits. Showing ${hits.length}:\n\n${lines.join('\n\n')}` }] };
  }
);

// ── get_pages_categories ─────────────────────────────────────────────────────
server.tool(
  'get_pages_categories',
  'Fetch the wiki categories for up to 50 pages in a single request. Returns a map of page title → category list. Use this for bulk mod auditing instead of calling get_wiki_page 1489 times.',
  {
    titles: z.array(z.string()).min(1).max(50).describe('List of exact wiki page titles (max 50 per call)'),
  },
  async ({ titles }) => {
    const data = await mwFetch({
      action: 'query',
      titles: titles.join('|'),
      prop: 'categories',
      cllimit: '500',
      clshow: '!hidden',
    });
    const pages = Object.values(data.query.pages);
    const results = pages.map(p => {
      const cats = (p.categories ?? []).map(c => c.title.replace(/^Category:/, ''));
      const missing = p.missing ? ' [NOT FOUND]' : '';
      return `${p.title}${missing}: ${cats.length ? cats.join(', ') : '(no categories)'}`;
    });
    return { content: [{ type: 'text', text: results.join('\n') }] };
  }
);

// ── start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
