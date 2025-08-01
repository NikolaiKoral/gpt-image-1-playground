#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to replace
const replacements = [
    { from: /console\.log\(/g, to: 'logger.log(' },
    { from: /console\.error\(/g, to: 'logger.error(' },
    { from: /console\.warn\(/g, to: 'logger.warn(' },
    { from: /console\.info\(/g, to: 'logger.info(' },
    { from: /console\.debug\(/g, to: 'logger.debug(' },
];

// Import statement to add
const importStatement = "import { logger } from '@/lib/logger';";

// Files to process
const files = glob.sync('src/**/*.{ts,tsx}', {
    ignore: [
        'src/lib/logger.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'node_modules/**',
    ]
});

let totalReplacements = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasConsole = false;
    let modified = content;
    
    // Check if file has console statements
    replacements.forEach(({ from }) => {
        if (from.test(content)) {
            hasConsole = true;
        }
    });
    
    if (!hasConsole) return;
    
    // Apply replacements
    replacements.forEach(({ from, to }) => {
        const matches = modified.match(from);
        if (matches) {
            totalReplacements += matches.length;
            modified = modified.replace(from, to);
        }
    });
    
    // Add import if not already present and file was modified
    if (modified !== content && !modified.includes("from '@/lib/logger'")) {
        // Find the last import statement
        const importMatch = modified.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            const lastImportIndex = modified.lastIndexOf(lastImport);
            modified = modified.slice(0, lastImportIndex + lastImport.length) + 
                      '\n' + importStatement + 
                      modified.slice(lastImportIndex + lastImport.length);
        } else {
            // No imports found, add at the beginning
            modified = importStatement + '\n\n' + modified;
        }
    }
    
    // Write back if modified
    if (modified !== content) {
        fs.writeFileSync(file, modified);
        console.log(`✅ Updated ${file}`);
    }
});

console.log(`\n🎉 Total replacements: ${totalReplacements}`);