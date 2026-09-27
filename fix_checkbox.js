const fs = require('fs');
const files = [
  'frontend/components/timetable/RegularTimetable.tsx',
  'frontend/components/academic/Subjects.tsx',
  'frontend/components/academic/Departments.tsx',
  'frontend/components/academic/Specializations.tsx',
  'frontend/components/academic/Classes.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import \{ Checkbox \} from "@\/components\/ui\/checkbox";\n/, '');
  c = c.replace(/<Checkbox id="([^"]+)" \{\.\.\.register\('is_active'\)\} \/>/g, '<input type="checkbox" id="$1" {...register(\'is_active\')} className="h-4 w-4 text-primary focus:ring-primary border-input rounded" />');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
