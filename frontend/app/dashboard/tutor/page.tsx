'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../lib/api/client";
import { Users, CheckCircle, Calendar, Percent } from 'lucide-react';

export default function TutorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/tutor');
        setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tutor Dashboard</h1>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {[1,2,3,4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
              <CardContent><div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tutor Dashboard</h1>
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      </div>
    );
  }

  const activeStudents = data.counts?.active_students || 0;
  const totalRecords = data.attendanceOverview?.total_records || 0;
  const presentRecords = data.attendanceOverview?.present_records || 0;
  const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tutor Dashboard</h1>
        <p className="text-muted-foreground mt-2">Here is a live overview of your assigned class based on real database records.</p>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-blue-100">Total Active Students</CardTitle>
            <Users className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{activeStudents}</div>
            <p className="text-xs text-blue-200 mt-1">Currently enrolled in your class</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-green-100">Overall Attendance</CardTitle>
            <Percent className="h-4 w-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{attendancePercentage}%</div>
            <p className="text-xs text-green-200 mt-1">Average across all subjects</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-indigo-100">Present Marks</CardTitle>
            <CheckCircle className="h-4 w-4 text-indigo-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{presentRecords}</div>
            <p className="text-xs text-indigo-200 mt-1">Total recorded presence</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-purple-100">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalRecords}</div>
            <p className="text-xs text-purple-200 mt-1">Cumulative attendance marks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
