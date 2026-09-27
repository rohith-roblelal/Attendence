'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { BookOpen, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubjectRecord {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  total_sessions: number;
  present_sessions: number;
  absent_sessions: number;
}

interface StatsResponse {
  subjectAttendance: SubjectRecord[];
  attendance: { required_percentage: number };
}

const REQUIRED = 75;

export default function StudentSubjectAttendancePage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/student');
      setSubjects(res.data.data.subjectAttendance || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Subject Attendance</h1>
            <p className="text-muted-foreground mt-1">Your attendance breakdown per subject.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2 shrink-0">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Unable to load data</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : subjects.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No attendance records available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-base">All Subjects</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Conducted</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map(s => {
                      const pct = s.total_sessions > 0 ? (s.present_sessions / s.total_sessions) * 100 : 0;
                      const isLow = pct < REQUIRED;
                      return (
                        <TableRow key={s.subject_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{s.subject_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{s.subject_code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{s.total_sessions}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{s.present_sessions}</TableCell>
                          <TableCell className="text-center text-red-500 font-medium">{s.absent_sessions}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-semibold text-sm ${isLow ? 'text-red-600' : pct < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                {s.total_sessions > 0 ? `${pct.toFixed(1)}%` : 'N/A'}
                              </span>
                              {s.total_sessions > 0 && (
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : pct < 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.total_sessions === 0 ? (
                              <Badge variant="secondary">No Data</Badge>
                            ) : isLow ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertTriangle className="w-3 h-3" /> Low
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="w-3 h-3" /> Good
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
