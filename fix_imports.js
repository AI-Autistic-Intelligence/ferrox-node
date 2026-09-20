const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const modules = [
  'auth', 'config', 'cqrs', 'datagrid', 'guards', 
  'i18n', 'jobs', 'kernel', 'resilience', 'security', 
  'selftest', 'storage', 'tracing', 'transports'
];

const rootDir = process.cwd();
const nodeYalcPath = path.join(rootDir, 'node-yalc');

function fixImports(dir, currentMod) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImports(fullPath, currentMod);
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Fix relative imports pointing to sibling modules:
            // e.g. from '../transports/http-adapters' to '@node-yalc/transports'
            // or from '../../core/...' to '@node-yalc/...' 
            
            // Actually, we can just replace `from '../modulename/filename'` with `from '@node-yalc/modulename'`
            // Or since we just recovered them and we know the exact module list, we can just regex it.
            
            for (const targetMod of modules) {
                // e.g. import { x } from '../transports/something' -> import { x } from '@node-yalc/transports'
                const regex1 = new RegExp(`from\\s+['"]\\.\\./${targetMod}/[^'"]+['"]`, 'g');
                if (regex1.test(content)) {
                    content = content.replace(regex1, `from '@node-yalc/${targetMod}'`);
                    modified = true;
                }
                
                const regex2 = new RegExp(`from\\s+['"]\\.\\./\\.\\./${targetMod}/[^'"]+['"]`, 'g');
                if (regex2.test(content)) {
                    content = content.replace(regex2, `from '@node-yalc/${targetMod}'`);
                    modified = true;
                }
                
                // Also check if they try to import something from core which wasn't moved?
                // `ferrox-node/src/core/` wasn't moved to `node-yalc/core`. But wait, `di-container` was in `core`.
                // Let's just fix the known modules first.
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

modules.forEach(mod => {
    fixImports(path.join(nodeYalcPath, mod, 'src'), mod);
});

console.log('Imports fixed.');
