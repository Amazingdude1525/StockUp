import fs from 'fs';
import path from 'path';

const distClient = path.resolve('dist/client');

let cssLink = '';
const cssDir = path.join(distClient, '_next/static/css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    cssLink = `<link rel="stylesheet" href="/_next/static/css/${cssFiles[0]}" />`;
  }
}

const chunksDir = path.join(distClient, '_next/static/chunks');
let scriptsHtml = '';
if (fs.existsSync(chunksDir)) {
  const files = fs.readdirSync(chunksDir);
  const runtimeChunk = files.find(f => f.startsWith('rolldown-runtime-') && f.endsWith('.js'));
  const frameworkChunk = files.find(f => f.startsWith('framework-') && f.endsWith('.js'));
  const pageChunk = files.find(f => f.startsWith('page-') && f.endsWith('.js'));
  const indexChunk = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

  const scriptFiles = [runtimeChunk, frameworkChunk, pageChunk || indexChunk].filter(Boolean);
  scriptsHtml = scriptFiles.map(f => `<script type="module" src="/_next/static/chunks/${f}"></script>`).join('\n    ');
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
    ${scriptsHtml}
  </body>
</html>
`;

fs.writeFileSync(path.join(distClient, 'index.html'), htmlContent, 'utf8');
console.log('Successfully generated dist/client/index.html with script tags:');
console.log(scriptsHtml);
