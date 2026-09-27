'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../lib/api/client";
import Link from "next/link";

export default function AdministrationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/administration');
        
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
      <h1 className="text-3xl font-bold tracking-tight capitalize">administration Dashboard</h1>
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

      <div className="pt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Admin Modules</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Link href="/dashboard/administration/academic">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Academic Structure</CardTitle>
                <p className="text-sm text-muted-foreground">Manage years, departments, classes</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/people">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">People</CardTitle>
                <p className="text-sm text-muted-foreground">Manage students and teachers</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/sessions">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Class Sessions</CardTitle>
                <p className="text-sm text-muted-foreground">Assign subjects and sessions</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/timetable">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Timetable</CardTitle>
                <p className="text-sm text-muted-foreground">Manage weekly timetables</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/attendence">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Attendance</CardTitle>
                <p className="text-sm text-muted-foreground">Track and record attendance</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/report">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Reports</CardTitle>
                <p className="text-sm text-muted-foreground">View analytical reports</p>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
