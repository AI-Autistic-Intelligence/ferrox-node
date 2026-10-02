const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');
const yalcDir = path.join(rootDir, 'node-yalc');

function getAllTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsFiles = [
  ...getAllTsFiles(packagesDir),
  ...getAllTsFiles(yalcDir)
];

const deepImportRegex = /from\s+['"]@node-yalc\/([a-zA-Z0-9_-]+)\/(.+?)['"]/g;
const requiredExports = {}; // package -> Set of relative paths

let replacedCount = 0;

for (const file of allTsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  content = content.replace(deepImportRegex, (match, pkgName, deepPath) => {
    hasChanges = true;
    replacedCount++;
    if (!requiredExports[pkgName]) {
      requiredExports[pkgName] = new Set();
    }
    
    // Normalize deepPath to ensure it has .js extension for the export
    let exportPath = deepPath;
    if (!exportPath.endsWith('.js') && !exportPath.endsWith('.ts')) {
        exportPath += '.js';
    }
    
    requiredExports[pkgName].add(exportPath);
    return `from '@node-yalc/${pkgName}'`;
  });
  
  if (hasChanges) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in ${path.relative(rootDir, file)}`);
  }
}

console.log(`\nReplaced ${replacedCount} deep imports.`);

// Now update the index.ts of each modified node-yalc package
for (const [pkgName, exportsSet] of Object.entries(requiredExports)) {
  const indexTsPath = path.join(yalcDir, pkgName, 'src', 'index.ts');
  if (fs.existsSync(indexTsPath)) {
    let indexContent = fs.readFileSync(indexTsPath, 'utf8');
    let indexChanges = false;
    
    for (const exportPath of exportsSet) {
      const exportStatement = `export * from './${exportPath}';`;
      if (!indexContent.includes(exportStatement) && !indexContent.includes(`'./${exportPath}'`)) {
        indexContent += `\n${exportStatement}`;
        indexChanges = true;
      }
    }
    
    if (indexChanges) {
      // Clean up multiple newlines just in case
      indexContent = indexContent.replace(/\n{3,}/g, '\n\n');
      fs.writeFileSync(indexTsPath, indexContent.trim() + '\n', 'utf8');
      console.log(`Added missing exports to ${pkgName}/src/index.ts`);
    }
  } else {
    console.warn(`Warning: ${indexTsPath} does not exist, creating it...`);
    let newContent = '';
    for (const exportPath of exportsSet) {
      newContent += `export * from './${exportPath}';\n`;
    }
    const dir = path.dirname(indexTsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(indexTsPath, newContent, 'utf8');
  }
}

// Now clean up tsconfig.json in packages/*
const packages = fs.readdirSync(packagesDir);
for (const pkg of packages) {
  const tsconfigPath = path.join(packagesDir, pkg, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    let content = fs.readFileSync(tsconfigPath, 'utf8');
    
    // Remove "paths": { ... } entirely
    const pathsRegex = /\s*"paths"\s*:\s*\{[^}]+\},?/g;
    if (pathsRegex.test(content)) {
      content = content.replace(pathsRegex, '');
      fs.writeFileSync(tsconfigPath, content, 'utf8');
      console.log(`Cleaned paths from packages/${pkg}/tsconfig.json`);
    }
  }
}

console.log('Enterprise refactoring complete!');
