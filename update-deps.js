const fs = require('fs');
const glob = require('glob');

const files = glob.sync('packages/*/package.json');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/("@node-yalc\/[^"]+"): "\*"/g, '$1: "^0.1.4"');
  fs.writeFileSync(file, content);
});

let rootPkg = fs.readFileSync('package.json', 'utf8');
const rootPkgJson = JSON.parse(rootPkg);
if (rootPkgJson.workspaces) {
  rootPkgJson.workspaces = rootPkgJson.workspaces.filter(w => !w.startsWith('node-yalc'));
  fs.writeFileSync('package.json', JSON.stringify(rootPkgJson, null, 4));
}
