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

  const renderValue = (val: any) => {
    if (typeof val !== 'object' || val === null) {
      return <span className="text-2xl font-bold">{String(val)}</span>;
    }
    
    if (Array.isArray(val)) {
      return (
        <ul className="space-y-1 mt-2 text-sm">
          {val.slice(0, 5).map((item, i) => (
            <li key={i} className="text-muted-foreground">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
          ))}
          {val.length > 5 && <li className="text-muted-foreground italic">+{val.length - 5} more</li>}
        </ul>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{k.replace(/_/g, ' ')}</span>
            <span className="text-lg font-medium">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  };

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {Object.entries(data).map(([key, value]) => (
            <Card key={key} className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardDescription className="uppercase font-bold tracking-wider text-sm text-foreground/80">
                  {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {renderValue(value)}
              </CardContent>
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
    console.log(`Updated ${role.path} dashboard to render nested objects beautifully.`);
  }
});
