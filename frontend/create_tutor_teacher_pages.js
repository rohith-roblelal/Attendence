const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, 'app', 'dashboard');

const filesToCreate = [
  {
    path: path.join(dashboardDir, 'tutor', 'students'),
    content: `'use client';\n\nimport Students from '../../../components/people/Students';\n\nexport default function TutorStudentsPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">My Students</h1>\n        <p className="text-muted-foreground">Manage and view the students assigned to your class.</p>\n      </div>\n      <Students />\n    </div>\n  );\n}\n`
  },
  {
    path: path.join(dashboardDir, 'tutor', 'reports'),
    content: `'use client';\n\nimport ClassAttendanceReport from '../../../components/reports/ClassAttendanceReport';\n\nexport default function TutorReportsPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">Class Reports</h1>\n        <p className="text-muted-foreground">View attendance and performance reports for your class.</p>\n      </div>\n      <ClassAttendanceReport />\n    </div>\n  );\n}\n`
  },
  {
    path: path.join(dashboardDir, 'teacher', 'take-attendance'),
    content: `'use client';\n\nimport QuickAttendance from '../../../components/operations/QuickAttendance';\n\nexport default function TakeAttendancePage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">Take Attendance</h1>\n        <p className="text-muted-foreground">Quickly mark attendance for your current sessions.</p>\n      </div>\n      <QuickAttendance />\n    </div>\n  );\n}\n`
  },
  {
    path: path.join(dashboardDir, 'teacher', 'sessions'),
    content: `'use client';\n\nimport ClassSessions from '../../../components/operations/ClassSessions';\n\nexport default function MySessionsPage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>\n        <p className="text-muted-foreground">Manage your scheduled class sessions.</p>\n      </div>\n      <ClassSessions />\n    </div>\n  );\n}\n`
  },
  {
    path: path.join(dashboardDir, 'teacher', 'timetable'),
    content: `'use client';\n\nimport RegularTimetable from '../../../components/timetable/RegularTimetable';\n\nexport default function TeacherTimetablePage() {\n  return (\n    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">\n      <div>\n        <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>\n        <p className="text-muted-foreground">View your weekly teaching schedule.</p>\n      </div>\n      <RegularTimetable />\n    </div>\n  );\n}\n`
  }
];

filesToCreate.forEach(file => {
  if (!fs.existsSync(file.path)) {
    fs.mkdirSync(file.path, { recursive: true });
  }
  fs.writeFileSync(path.join(file.path, 'page.tsx'), file.content);
  console.log(`Created page at ${file.path}`);
});
