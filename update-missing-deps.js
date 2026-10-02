const fs = require('fs');
const glob = require('glob');
const path = require('path');

const pkgs = glob.sync('packages/*');
pkgs.forEach(p => {
  const pJsonPath = path.join(p, 'package.json');
  if (!fs.existsSync(pJsonPath)) return;
  
  let pJson = JSON.parse(fs.readFileSync(pJsonPath, 'utf8'));
  const deps = new Set();
  
  // glob requires forward slashes even on Windows
  const searchPattern = p + '/**/*.ts';
  const tsFiles = glob.sync(searchPattern);
  tsFiles.forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    const matches = c.match(/@node-yalc\/[a-zA-Z0-9-]+/g);
    if (matches) {
      matches.forEach(m => deps.add(m));
    }
  });

  if (deps.size > 0) {
    pJson.dependencies = pJson.dependencies || {};
    deps.forEach(d => {
      pJson.dependencies[d] = '^0.1.4';
    });
    fs.writeFileSync(pJsonPath, JSON.stringify(pJson, null, 4));
  }
});
