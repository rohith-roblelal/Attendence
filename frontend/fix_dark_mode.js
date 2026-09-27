const fs = require('fs');
const path = require('path');

function replaceColors(content) {
  let newContent = content;
  
  // Backgrounds and cards
  newContent = newContent.replace(/\bbg-white\b/g, 'bg-card text-card-foreground');
  newContent = newContent.replace(/\bbg-gray-50\b/g, 'bg-muted/50');
  newContent = newContent.replace(/\bbg-gray-100\b/g, 'bg-muted');
  newContent = newContent.replace(/\bbg-gray-200\b/g, 'bg-muted');
  
  // Text colors
  newContent = newContent.replace(/\btext-gray-900\b/g, 'text-foreground');
  newContent = newContent.replace(/\btext-gray-800\b/g, 'text-foreground');
  newContent = newContent.replace(/\btext-gray-700\b/g, 'text-foreground');
  newContent = newContent.replace(/\btext-gray-600\b/g, 'text-muted-foreground');
  newContent = newContent.replace(/\btext-gray-500\b/g, 'text-muted-foreground');
  newContent = newContent.replace(/\btext-gray-400\b/g, 'text-muted-foreground');
  
  // Borders
  newContent = newContent.replace(/\bborder-gray-100\b/g, 'border-border');
  newContent = newContent.replace(/\bborder-gray-200\b/g, 'border-border');
  newContent = newContent.replace(/\bborder-gray-300\b/g, 'border-border/60');
  newContent = newContent.replace(/\bdivide-gray-100\b/g, 'divide-border');
  newContent = newContent.replace(/\bdivide-gray-200\b/g, 'divide-border');
  
  // Inputs/focus
  newContent = newContent.replace(/\bfocus:ring-blue-500\b/g, 'focus:ring-ring');
  newContent = newContent.replace(/\bfocus:border-blue-500\b/g, 'focus:border-primary');
  
  return newContent;
}

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = replaceColors(content);
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Fixed dark mode colors in ${entry.name}`);
      }
    }
  }
}

const componentsDir = path.join(__dirname, 'components');
if (fs.existsSync(componentsDir)) {
  processDir(componentsDir);
}
