#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
console.log(`Ferrox-Node Core CLI v${pkg.version}`);
