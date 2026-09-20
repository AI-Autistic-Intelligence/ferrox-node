const fs = require('fs');
const path = require('path');

const modules = [
  'auth', 'config', 'cqrs', 'datagrid', 'guards', 'i18n', 'jobs', 
  'kernel', 'resilience', 'security', 'selftest', 'storage', 'tracing', 'transports'
];

const basePath = path.join('C:', 'Users', 'nn', 'Desktop', 'code', 'ferrox-node', 'node-yalc');

for (const mod of modules) {
  const modPath = path.join(basePath, mod);
  const srcPath = path.join(modPath, 'src');
  
  if (!fs.existsSync(modPath)) {
    fs.mkdirSync(modPath, { recursive: true });
  }
  if (!fs.existsSync(srcPath)) {
    fs.mkdirSync(srcPath, { recursive: true });
  }
  
  // Create index.ts
  let indexTsContent = `export * from './stub';\n`;
  if (mod === 'config') {
    indexTsContent += `export class ConfigManager<T = any> {\n  constructor(engine?: any, alias?: string) {}\n}\n`;
  }
  
  fs.writeFileSync(path.join(srcPath, 'index.ts'), indexTsContent);
  fs.writeFileSync(path.join(srcPath, 'stub.ts'), `export const stub_${mod} = true;\n`);
  
  // Create package.json
  const packageJson = {
    "name": `@node-yalc/${mod}`,
    "version": "0.0.1",
    "main": "dist/index.js",
    "types": "dist/index.d.ts"
  };
  fs.writeFileSync(path.join(modPath, 'package.json'), JSON.stringify(packageJson, null, 2));
}

console.log('Scaffolded missing node-yalc modules');
