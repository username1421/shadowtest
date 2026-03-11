#!/usr/bin/env node
/**
 * Shadow DOM test server
 *
 * Usage:
 *   node server.js [port]
 *
 * Open in browser:
 *   http://localhost:3000/?id=46dd4a26-8ff2-49bb-873f-5f6d43c6cd54
 *
 * Query params:
 *   id  — Elfsight widget ID (UUID after "elfsight-app-")
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT      = parseInt(process.argv[2] || process.env.PORT || '3000', 10);
const TEMPLATE  = path.join(__dirname, 'base.html');

const PLATFORM_URL = 'https://elfsightcdn.com/platform.js';

// ── Build the widget embed snippet ───────────────────────────────────────────
function buildEmbed(widgetId) {
  return [
    `<script src="${PLATFORM_URL}" async><\/script>`,
    `<div class="elfsight-app-${widgetId}" data-elfsight-app-lazy></div>`,
  ].join('\n        ');
}

// ── Render the template ───────────────────────────────────────────────────────
function renderPage(widgetId) {
  let html = fs.readFileSync(TEMPLATE, 'utf8');

  const embed = widgetId
    ? buildEmbed(widgetId)
    : '<p style="color:#aaa; font-size:13px; border:none; padding:0; margin:0;">No widget ID provided. Add <code>?id=&lt;widget-id&gt;</code> to the URL.</p>';

  html = html.replace('{{WIDGET_EMBED}}', embed);

  return html;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed  = url.parse(req.url, true);
  const widgetId = (parsed.query.id || '').trim();

  // Serve only GET /
  if (req.method !== 'GET' || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  let html;
  try {
    html = renderPage(widgetId);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error reading template: ' + err.message);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    // Disable caching so template changes are picked up immediately
    'Cache-Control': 'no-store',
  });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Shadow DOM test server running at http://localhost:${PORT}/`);
  console.log('');
  console.log('Example:');
  console.log(`  http://localhost:${PORT}/?id=46dd4a26-8ff2-49bb-873f-5f6d43c6cd54`);
  console.log('');
  console.log('Press Ctrl+C to stop.');
});
