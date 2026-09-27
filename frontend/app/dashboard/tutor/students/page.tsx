'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { Download, RefreshCw, Users, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TutorStudent {
  student_id: number;
  admission_number: string;
  student_name: string;
  total_records: number;
  present_records: number;
}

interface TutorTimetableEntry {
  id: number;
  day_of_week: number;
  period_number: number;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
}

interface TutorStudentsData {
  classId: number;
  students: TutorStudent[];
  timetable: TutorTimetableEntry[];
}

const REQUIRED_PCT = 75;

export default function TutorStudentsPage() {
  const [data, setData] = useState<TutorStudentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/tutor/students');
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const downloadReport = async () => {
    if (!data?.classId) return;
    try {
      const res = await apiClient.get(`/reports/classes/${data.classId}/attendance`);
      const report = res.data.data;
      
      const csvLines = ['Admission No,Name,Total Sessions,Present,Absent,Percentage'];
      report.forEach((r: any) => {
        csvLines.push(`${r.admission_number},"${r.first_name} ${r.last_name || ''}",${r.total_sessions},${r.present_sessions},${r.absent_sessions},${r.percentage}%`);
      });
      
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class_attendance_report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TUTOR']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Students</h1>
            <p className="text-muted-foreground mt-1">Manage and view attendance for your assigned class.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={downloadReport} disabled={isLoading || !data?.classId} className="gap-2">
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Student List */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Class Students
                    </CardTitle>
                    <CardDescription>Overview of all students in your class</CardDescription>
                  </div>
                  <Badge variant="secondary">{data.students.length} Students</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                {data.students.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No students assigned to this class.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Admission No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Total Sessions</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.students.map(s => {
                        const pct = s.total_records > 0 ? (s.present_records / s.total_records) * 100 : null;
                        const isLow = pct !== null && pct < REQUIRED_PCT;
                        return (
                          <TableRow key={s.student_id} className={isLow ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{s.admission_number}</TableCell>
                            <TableCell className="font-medium">{s.student_name.trim()}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{s.total_records}</TableCell>
                            <TableCell className="text-center text-green-600 font-medium">{s.present_records}</TableCell>
                            <TableCell className="text-right">
                              {pct !== null ? (
                                <span className={`font-semibold text-sm ${isLow ? 'text-red-600' : pct < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {pct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {pct === null ? (
                                <Badge variant="secondary" className="font-normal">No Data</Badge>
                              ) : isLow ? (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Low
                                </Badge>
                              ) : (
                                <Badge className="text-xs gap-1 bg-green-600 hover:bg-green-700">
                                  <CheckCircle2 className="w-3 h-3" /> Good
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
