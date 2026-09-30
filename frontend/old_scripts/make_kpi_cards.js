const fs = require('fs');
const path = require('path');

const roles = ['administration', 'hod', 'student', 'teacher', 'tutor'];
const dashboardDir = path.join(__dirname, 'app', 'dashboard');

roles.forEach(role => {
  const pagePath = path.join(dashboardDir, role, 'page.tsx');
  if (fs.existsSync(pagePath)) {
    const pageContent = `'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../lib/api/client";

export default function ${role.charAt(0).toUpperCase() + role.slice(1)}Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/${role}');
        
        // Flatten the nested data object to extract all individual metrics
        const flattenObj = (ob: any) => {
          let result: any = {};
          for (const i in ob) {
            if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
              const temp = flattenObj(ob[i]);
              for (const j in temp) {
                result[j] = temp[j];
              }
            } else {
              result[i] = ob[i];
            }
          }
          return result;
        };
        
        setData(flattenObj(response.data.data));
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight capitalize">${role} Dashboard</h1>
      <p className="text-muted-foreground">Here is your live overview of key metrics.</p>
      
      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
              <CardContent><div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {Object.entries(data).map(([key, value]) => {
            if (Array.isArray(value)) return null; // Skip lists for KPI grid
            return (
              <Card key={key} className="overflow-hidden hover:bg-muted/10 transition-colors">
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {formatKey(key)}
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{String(value)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      )}
    </div>
  );
}
`;
    fs.writeFileSync(pagePath, pageContent);
    console.log(`Updated ${role} to individual KPI cards.`);
  }
});
