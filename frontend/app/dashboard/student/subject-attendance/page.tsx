'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../../../../lib/api/client";
import { BookOpen, PieChart, Clock } from 'lucide-react';

export default function MyAttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/student');
        setData(response.data.data);
      } catch (err: any) {
        console.error("Failed to fetch attendance data", err);
        setError(err.response?.data?.message || 'Failed to load attendance records.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
        <div className="h-96 bg-muted rounded-lg animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
        <Card className="mt-6 border-red-200 bg-red-50 text-red-800">
          <CardContent className="pt-6">{error || 'No data available.'}</CardContent>
        </Card>
      </div>
    );
  }

  const requiredPercentage = data.attendanceOverview?.required_percentage || 75;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Attendance</h1>
        <p className="text-muted-foreground mt-2">Detailed breakdown of your subject-wise attendance and recent history.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
        <Card className="shadow-sm border border-border/50">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject Breakdown
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
                      <TableHead className="text-center">Absent</TableHead>
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
                          <TableCell className="text-center text-red-600 font-medium">{sub.absent_sessions}</TableCell>
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

        <Card className="shadow-sm border border-border/50">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent History
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
