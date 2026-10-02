const glob = require('glob');
const fs = require('fs');

glob.sync('packages/*/tsconfig.json').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let obj = JSON.parse(c);
  if (obj.include) obj.include = obj.include.filter(i => !i.includes('node-yalc'));
  if (obj.exclude) obj.exclude = obj.exclude.filter(e => !e.includes('node-yalc'));
  
  if (obj.compilerOptions && obj.compilerOptions.paths) {
      delete obj.compilerOptions.paths; // Remove paths if they are mapping node-yalc
  }

  fs.writeFileSync(f, JSON.stringify(obj, null, 2));
});
