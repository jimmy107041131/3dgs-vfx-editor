// Post-build: convert dist/index.html for file:// compatibility
// Run after `vite build`: node scripts/postbuild.js

import { readFileSync, writeFileSync } from 'fs';

const file = 'dist/index.html';
let html = readFileSync(file, 'utf-8');

// 1. Remove crossorigin attribute
html = html.replace(/ crossorigin(="[^"]*")?/g, '');

// 2. Replace import.meta.url → location.href
//    Use split/join to avoid $ replacement issues
html = html.split('import.meta.url').join('location.href');

// 3. Move <script type="module"> to before </body> as plain <script>
const openTag = '<script type="module">';
const closeTag = '</script>';
const openPos = html.indexOf(openTag);
if (openPos !== -1) {
  const closePos = html.indexOf(closeTag, openPos);
  if (closePos !== -1) {
    const scriptBody = html.substring(openPos + openTag.length, closePos);
    html = html.substring(0, openPos) + html.substring(closePos + closeTag.length);
    const bodyEnd = html.lastIndexOf('</body>');
    html = html.substring(0, bodyEnd) + '<script>' + scriptBody + closeTag + '\n' + html.substring(bodyEnd);
  }
}

writeFileSync(file, html);
console.log('postbuild: file:// compatibility transforms applied');
