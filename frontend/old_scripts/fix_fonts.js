const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      
      // Add bg-background and text-foreground to inputs and selects that don't have it
      newContent = newContent.replace(/<input([^>]+className=")([^"]+)"/g, (match, prefix, classes) => {
        if (!classes.includes('bg-') && !classes.includes('text-')) {
          return `<input${prefix}${classes} bg-background text-foreground"`;
        }
        return match;
      });
      newContent = newContent.replace(/<select([^>]+className=")([^"]+)"/g, (match, prefix, classes) => {
        if (!classes.includes('bg-') && !classes.includes('text-')) {
          return `<select${prefix}${classes} bg-background text-foreground"`;
        }
        return match;
      });

      // Fix specific hardcoded Tailwind colors to theme variables
      newContent = newContent.replace(/\btext-red-[56]00\b/g, 'text-destructive');
      newContent = newContent.replace(/\bbg-red-[56]00\b/g, 'bg-destructive');
      newContent = newContent.replace(/\btext-blue-[569]00\b/g, 'text-primary');
      newContent = newContent.replace(/\bbg-blue-[56]00\b/g, 'bg-primary text-primary-foreground');
      newContent = newContent.replace(/\bhover:bg-blue-700\b/g, 'hover:bg-primary/90');
      newContent = newContent.replace(/\btext-gray-[56]00\b/g, 'text-muted-foreground');
      newContent = newContent.replace(/\bbg-gray-50\b/g, 'bg-muted/50');
      newContent = newContent.replace(/\bbg-gray-[12]00\b/g, 'bg-muted');

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Polished fonts & inputs in ${entry.name}`);
      }
    }
  }
}

const componentsDir = path.join(__dirname, 'components');
if (fs.existsSync(componentsDir)) {
  processDir(componentsDir);
}
