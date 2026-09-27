const fs = require('fs');
const path = require('path');

const filesToFix = [
  path.join(__dirname, 'app', 'dashboard', 'tutor', 'students', 'page.tsx'),
  path.join(__dirname, 'app', 'dashboard', 'tutor', 'reports', 'page.tsx'),
  path.join(__dirname, 'app', 'dashboard', 'teacher', 'take-attendance', 'page.tsx'),
  path.join(__dirname, 'app', 'dashboard', 'teacher', 'sessions', 'page.tsx'),
  path.join(__dirname, 'app', 'dashboard', 'teacher', 'timetable', 'page.tsx')
];

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace ../../../components with ../../../../components
    content = content.replace(/import ([a-zA-Z0-9_]+) from '\.\.\/\.\.\/\.\.\/components/g, "import $1 from '../../../../components");
    fs.writeFileSync(file, content);
    console.log(`Fixed imports in ${file}`);
  }
});
