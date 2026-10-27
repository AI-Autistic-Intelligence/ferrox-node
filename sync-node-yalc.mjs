import fs from 'node:fs/promises';
import path from 'node:path';

const packages = ['resilience', 'storage', 'transports', 'security', 'utils'];
const sourceRoot = 'c:/Users/nn/Desktop/code/node-yalc';
const targetRoot = 'c:/Users/nn/Desktop/code/ferrox-node/node_modules/@node-yalc';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

for (const pkg of packages) {
  const srcDist = path.join(sourceRoot, pkg, 'dist');
  const destDist = path.join(targetRoot, pkg, 'dist');
  await copyDir(srcDist, destDist);
  console.log(`Synced @node-yalc/${pkg} dist.`);
}
