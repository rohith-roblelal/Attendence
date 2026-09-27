const fs = require('fs');
const path = require('path');

const roles = [
  { path: 'administration', title: 'Administration Dashboard' },
  { path: 'hod', title: 'HOD Dashboard' },
  { path: 'student', title: 'Student Dashboard' },
  { path: 'teacher', title: 'Teacher Dashboard' },
  { path: 'tutor', title: 'Tutor Dashboard' }
];

const dashboardDir = path.join(__dirname, 'app', 'dashboard');

if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
}

roles.forEach(role => {
  const roleDir = path.join(dashboardDir, role.path);
  if (!fs.existsSync(roleDir)) {
    fs.mkdirSync(roleDir, { recursive: true });
  }

  const pageContent = `'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ${role.path.charAt(0).toUpperCase() + role.path.slice(1)}Page() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">${role.title}</h1>
      <p className="text-muted-foreground">Welcome back! Here is your overview.</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">No new activity to display.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(roleDir, 'page.tsx'), pageContent);
  console.log(`Created ${role.path} dashboard page.`);
});

// Also create a root dashboard page just in case
const rootDashboardPath = path.join(dashboardDir, 'page.tsx');
if (!fs.existsSync(rootDashboardPath)) {
  fs.writeFileSync(rootDashboardPath, `'use client';

export default function DashboardRoot() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <h1 className="text-2xl font-semibold">Please select a module from the sidebar.</h1>
    </div>
  );
}
`);
  console.log('Created root dashboard page.');
}
