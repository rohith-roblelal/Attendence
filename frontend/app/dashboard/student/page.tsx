'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../lib/api/client";
import { CheckCircle, Calendar, Percent, AlertTriangle, BookOpen, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StudentPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/student');
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
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
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
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      </div>
    );
  }

  const totalRecords = data.attendanceOverview?.total_records || 0;
  const presentRecords = data.attendanceOverview?.present_records || 0;
  const currentPercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
  const requiredPercentage = data.attendanceOverview?.required_percentage || 75; // Fallback to 75 if not present in the payload
  const warningStatus = data.attendanceOverview?.warning_status || currentPercentage < requiredPercentage;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground mt-2">Here is a live overview of your academic performance and attendance.</p>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card className={`overflow-hidden border-none shadow-md text-white ${warningStatus ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={`text-sm font-medium ${warningStatus ? 'text-red-100' : 'text-green-100'}`}>Current Attendance</CardTitle>
            <Percent className={`h-4 w-4 ${warningStatus ? 'text-red-100' : 'text-green-100'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{currentPercentage}%</div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${warningStatus ? 'text-red-200' : 'text-green-200'}`}>
              {warningStatus && <AlertTriangle className="h-3 w-3" />}
              {warningStatus ? `Warning: Below ${requiredPercentage}% threshold` : `Safely above ${requiredPercentage}% requirement`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-indigo-100">Present Marks</CardTitle>
            <CheckCircle className="h-4 w-4 text-indigo-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{presentRecords}</div>
            <p className="text-xs text-indigo-200 mt-1">Classes attended</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-purple-100">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalRecords}</div>
            <p className="text-xs text-purple-200 mt-1">Total recorded sessions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-8">
        {/* Subject Attendance Breakdown */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject-wise Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.subjectAttendance && data.subjectAttendance.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.subjectAttendance.map((sub: any, idx: number) => {
                      const pct = sub.total_sessions > 0 ? Math.round((sub.present_sessions / sub.total_sessions) * 100) : 0;
                      return (
                        <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="font-medium text-sm">
                            {sub.subject_name}
                            <div className="text-xs text-muted-foreground">{sub.subject_code}</div>
                          </TableCell>
                          <TableCell className="text-center">{sub.total_sessions}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{sub.present_sessions}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={pct < requiredPercentage ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}>
                              {pct}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No subject data found.</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance Log */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentAttendance && data.recentAttendance.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentAttendance.map((rec: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(rec.session_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{rec.subject_name}</TableCell>
                        <TableCell>P{rec.period_number}</TableCell>
                        <TableCell className="text-right">
                          {rec.status === 'PRESENT' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none shadow-none">Present</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none shadow-none">Absent</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No recent attendance records found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
