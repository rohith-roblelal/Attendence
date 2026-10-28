const fs = require('fs');
const path = require('path');

const roles = [
  { path: 'administration', title: 'Administration Dashboard', endpoint: '/dashboard/administration' },
  { path: 'hod', title: 'HOD Dashboard', endpoint: '/dashboard/hod' },
  { path: 'student', title: 'Student Dashboard', endpoint: '/dashboard/student' },
  { path: 'teacher', title: 'Teacher Dashboard', endpoint: '/dashboard/teacher' },
  { path: 'tutor', title: 'Tutor Dashboard', endpoint: '/dashboard/tutor' }
];

const dashboardDir = path.join(__dirname, 'app', 'dashboard');

roles.forEach(role => {
  const roleDir = path.join(dashboardDir, role.path);
  const pagePath = path.join(roleDir, 'page.tsx');

  if (fs.existsSync(pagePath)) {
    const pageContent = `'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../lib/api/client";

export default function ${role.path.charAt(0).toUpperCase() + role.path.slice(1)}Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('${role.endpoint}');
        setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">${role.title}</h1>
      <p className="text-muted-foreground">Welcome back! Here is your live overview.</p>
      
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          <Card>
            <CardHeader><CardTitle className="h-6 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
            <CardContent><div className="h-10 bg-muted rounded animate-pulse"></div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="h-6 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
            <CardContent><div className="h-10 bg-muted rounded animate-pulse"></div></CardContent>
          </Card>
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {Object.entries(data).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase font-semibold tracking-wider text-xs">
                  {key.replace(/_/g, ' ')}
                </CardDescription>
                <CardTitle className="text-2xl">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      )}
    </div>
  );
}
`;
    fs.writeFileSync(pagePath, pageContent);
    console.log(`Updated ${role.path} dashboard with live data fetching.`);
  }
});
