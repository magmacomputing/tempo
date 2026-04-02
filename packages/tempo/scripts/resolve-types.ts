import fs from 'node:fs';
import path from 'node:path';

/**
 * resolve-types.ts
 * 
 * Post-build utility to handle Type Definitions (#library -> lib/)
 * - Synchronizes used library types into dist/lib/
 * - Rewrites path aliases in all .d.ts files
 */

const DIST_DIR = path.resolve('dist');
const LIB_SRC_DIR = path.resolve('../library/dist/common');
const LIB_DEST_DIR = path.resolve(DIST_DIR, 'lib');

console.log('Resolving type definitions...');

// 1. Ensure lib directory exists
if (!fs.existsSync(LIB_DEST_DIR)) {
  fs.mkdirSync(LIB_DEST_DIR, { recursive: true });
}

// 2. Identify used library modules from Rollup's JS output
const usedModules = fs.readdirSync(LIB_DEST_DIR)
  .filter(f => f.endsWith('.js'))
  .map(f => f.slice(0, -3));

// 3. Copy corresponding .d.ts files from library
usedModules.forEach(mod => {
  const src = path.join(LIB_SRC_DIR, `${mod}.d.ts`);
  const dest = path.join(LIB_DEST_DIR, `${mod}.d.ts`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

// 4. Walk through all .d.ts files in dist/ to rewrite aliases
function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.d.ts')) {
      rewrite(fullPath);
    }
  }
}

function rewrite(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relToDist = path.relative(DIST_DIR, filePath);
  const depth = relToDist.split(path.sep).length - 1;
  const isInsideLib = relToDist.startsWith('lib');

  let replacement: string;
  if (isInsideLib) {
    // If inside lib/, #library/ becomes ./
    replacement = './';
  } else {
    // If at root (or elsewhere), #library/ becomes ./lib/ (with relative prefix)
    let prefix = './';
    for (let i = 0; i < depth; i++) prefix = '../' + prefix;
    replacement = `${prefix}lib/`;
  }

  const updatedContent = content
    .replace(/#library\//g, replacement)
    .replace(/#library(['"])/g, (match, quote) => `${replacement}index.js${quote}`);

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
  }
}

walk(DIST_DIR);
console.log('Type resolution complete.');
