import fs from 'fs';
import path from 'path';

const distClient = path.resolve('dist/client');

let jsEntry = '';
const manifestPath = path.join(distClient, 'vinext-client-entry-manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.appBrowserEntry) {
      jsEntry = '/' + manifest.appBrowserEntry.replace(/^\//, '');
    }
  } catch (err) {
    console.error('Failed to parse manifest:', err);
  }
}

if (!jsEntry) {
  // Fallback: look for index-*.js chunk in _next/static/chunks
  const chunksDir = path.join(distClient, '_next/static/chunks');
  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    const indexChunk = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    if (indexChunk) {
      jsEntry = `/_next/static/chunks/${indexChunk}`;
    }
  }
}

let cssLink = '';
const cssDir = path.join(distClient, '_next/static/css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    cssLink = `<link rel="stylesheet" href="/_next/static/css/${cssFiles[0]}" />`;
  }
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StockUp — Warehouse Fulfilment OS</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
    ${cssLink}
  </head>
  <body class="min-h-screen bg-[#f4f7fa]">
    <div id="root"></div>
    <script type="module" src="${jsEntry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distClient, 'index.html'), htmlContent, 'utf8');
console.log('Successfully generated dist/client/index.html');
console.log('  JS Entry:', jsEntry);
console.log('  CSS Link:', cssLink);
