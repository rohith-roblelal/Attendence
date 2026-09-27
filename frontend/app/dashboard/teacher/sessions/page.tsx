'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { RefreshCw, Clock, Calendar, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Session {
  id: number;
  session_date: string;
  period_number: number;
  status: string;
  class_name: string;
  subject_name: string;
  subject_code: string;
  total_attendance: number;
}

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/teacher/sessions');
      setSessions(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'TUTOR', 'HOD']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Sessions</h1>
            <p className="text-muted-foreground mt-1">Recent class sessions you have conducted.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchSessions}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Sessions
                </CardTitle>
                <Badge variant="secondary">{sessions.length} Sessions</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              {sessions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">You have not conducted any sessions yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Attendance Marked</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(s => {
                      const dateObj = new Date(s.session_date);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Period {s.period_number}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{s.class_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{s.subject_name}</span>
                              <span className="text-xs text-muted-foreground">{s.subject_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-sm">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{s.total_attendance}</span> students
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.status === 'CONDUCTED' ? (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Conducted
                              </Badge>
                            ) : s.status === 'CANCELLED' ? (
                              <Badge variant="destructive">Cancelled</Badge>
                            ) : (
                              <Badge variant="secondary">{s.status}</Badge>
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
        )}
      </div>
    </ProtectedRoute>
  );
}
