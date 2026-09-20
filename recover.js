const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const commit = 'baf6a90493be496d41ea2e1ed6e191097a042585~1';

const modules = [
  'auth', 'config', 'cqrs', 'datagrid', 'guards', 
  'i18n', 'jobs', 'kernel', 'resilience', 'security', 
  'selftest', 'storage', 'tracing', 'transports'
];

modules.forEach(mod => {
  const nodeYalcPath = path.join(rootDir, 'node-yalc', mod, 'src');
  
  // Clean the existing fake stubs
  if (fs.existsSync(nodeYalcPath)) {
    const existing = fs.readdirSync(nodeYalcPath);
    for (const file of existing) {
      if (file.endsWith('.ts')) {
        fs.unlinkSync(path.join(nodeYalcPath, file));
      }
    }
  } else {
    fs.mkdirSync(nodeYalcPath, { recursive: true });
  }

  // Get list of original source files
  const filesOut = execSync(`git ls-tree -r ${commit} src/${mod}/`).toString().trim();
  if (!filesOut) {
    console.log(`No files found for ${mod}`);
    return;
  }

  const lines = filesOut.split('\n');
  const indexExports = [];

  for (const line of lines) {
    if (!line) continue;
    const parts = line.split('\t');
    const filePath = parts[1];
    
    // Only extract .ts files, exclude .d.ts if any (though there shouldn't be source .d.ts unless generated)
    if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
      const fileName = path.basename(filePath);
      const destPath = path.join(nodeYalcPath, fileName);
      
      const fileCode = execSync(`git show ${commit}:${filePath}`).toString();
      fs.writeFileSync(destPath, fileCode);
      
      // If it's not index.ts, add it to indexExports
      if (fileName !== 'index.ts') {
        const basename = path.basename(fileName, '.ts');
        indexExports.push(`export * from './${basename}';`);
      }
    }
  }

  // Generate or overwrite index.ts
  if (indexExports.length > 0) {
    // If the original had its own index.ts, we don't necessarily want to overwrite it if it existed.
    // Wait, let's check if index.ts was extracted from git
    const indexPath = path.join(nodeYalcPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, indexExports.join('\n') + '\n');
    }
  }

  console.log(`Recovered module: ${mod}`);
});
