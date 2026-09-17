#!/usr/bin/env node
/**
 * Shadow DOM test server
 *
 * Usage:
 *   node server.js [port]
 *
 * Open in browser:
 *   http://localhost:3000/?id=46dd4a26-8ff2-49bb-873f-5f6d43c6cd54
 *   http://localhost:3000/plain/translator.html?id=<translator-uuid>
 *
 * Query params:
 *   id  — Elfsight widget ID (UUID after "elfsight-app-")
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10);
const TEMPLATE = path.join(__dirname, 'base.html');
const PLAIN_DIR = path.join(__dirname, 'plain');

const PLATFORM_URL = 'https://elfsightcdn.com/platform.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

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

  if (html.includes('{{WIDGET_EMBED}}')) {
    html = html.replace('{{WIDGET_EMBED}}', embed);
  }

  return html;
}

function servePlainFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain',
      });
      res.end(err.code === 'ENOENT' ? 'Not found' : err.message);
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  if (pathname === '/translator' || pathname === '/translator/') {
    const target = path.join(PLAIN_DIR, 'translator.html');
    const query = parsed.search || '';
    res.writeHead(302, { Location: `/plain/translator.html${query}` });
    res.end();
    return;
  }

  if (pathname.startsWith('/plain/')) {
    const relative = pathname.slice('/plain/'.length);
    const safe = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(PLAIN_DIR, safe);

    if (!filePath.startsWith(PLAIN_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    servePlainFile(filePath, res);
    return;
  }

  if (pathname !== '/' && pathname !== '') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const widgetId = (parsed.query.id || '').trim();

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
    'Cache-Control': 'no-store',
  });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Shadow DOM test server running at http://localhost:${PORT}/`);
  console.log('');
  console.log('Examples:');
  console.log(`  http://localhost:${PORT}/?id=46dd4a26-8ff2-49bb-873f-5f6d43c6cd54`);
  console.log(
    `  http://localhost:${PORT}/plain/translator.html?id=<translator-uuid>`
  );
  console.log(`  http://localhost:${PORT}/translator?id=<translator-uuid>`);
  console.log('');
  console.log('Press Ctrl+C to stop.');
});
