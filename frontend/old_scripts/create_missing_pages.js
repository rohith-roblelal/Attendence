const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'app', 'dashboard', 'administration');

const filesToCreate = {
  'users': `'use client';\n\nimport Users from '../../../../components/people/Users';\n\nexport default function UsersPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>\n        <p className="text-muted-foreground">Manage user accounts and roles.</p>\n      </div>\n      <Users />\n    </div>\n  );\n}\n`,
  
  'subjects': `'use client';\n\nimport Subjects from '../../../../components/academic/Subjects';\n\nexport default function SubjectsPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>\n        <p className="text-muted-foreground">Manage academic subjects and courses.</p>\n      </div>\n      <Subjects />\n    </div>\n  );\n}\n`,
  
  'hod-tutor': `'use client';\n\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";\nimport HodAssignments from '../../../../components/assignments/HodAssignments';\nimport TutorAssignments from '../../../../components/assignments/TutorAssignments';\n\nexport default function HodTutorPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">HOD & Tutors</h1>\n        <p className="text-muted-foreground">Assign Heads of Departments and Class Tutors.</p>\n      </div>\n\n      <Tabs defaultValue="hod">\n        <TabsList>\n          <TabsTrigger value="hod">HOD Assignments</TabsTrigger>\n          <TabsTrigger value="tutors">Tutor Assignments</TabsTrigger>\n        </TabsList>\n        <TabsContent value="hod" className="mt-6"><HodAssignments /></TabsContent>\n        <TabsContent value="tutors" className="mt-6"><TutorAssignments /></TabsContent>\n      </Tabs>\n    </div>\n  );\n}\n`
};

for (const [folder, content] of Object.entries(filesToCreate)) {
  const dirPath = path.join(root, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
  console.log(`Created page for ${folder}`);
}
