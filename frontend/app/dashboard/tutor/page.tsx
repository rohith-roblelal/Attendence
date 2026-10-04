'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "../../../lib/api/client";
import { Users, CheckCircle, Calendar, Percent } from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function TutorPage() {
  const [statsData, setStatsData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statsDialog, setStatsDialog] = useState<{ open: boolean; student: any; loading: boolean; data: any }>({
    open: false,
    student: null,
    loading: false,
    data: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, studentsRes] = await Promise.all([
          apiClient.get('/dashboard/tutor'),
          apiClient.get('/dashboard/tutor/students')
        ]);
        setStatsData(statsRes.data.data);
        setStudentsData(studentsRes.data.data);
      } catch (err: any) {
        console.error("Failed to fetch tutor dashboard data", err);
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['TUTOR']}>
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
      </ProtectedRoute>
    );
  }

  if (error || !statsData) {
    return (
      <ProtectedRoute allowedRoles={['TUTOR']}>
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Tutor Dashboard</h1>
          <Card className="mt-6">
            <CardContent className="pt-6">
              {error ? <div className="text-destructive font-medium">{error}</div> : "No data available."}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const activeStudents = statsData.counts?.active_students || 0;
  const totalRecords = statsData.attendanceOverview?.total_records || 0;
  const presentRecords = statsData.attendanceOverview?.present_records || 0;
  const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  const students = studentsData?.students || [];
  const timetable = studentsData?.timetable || [];

  const viewStats = async (student: any) => {
    setStatsDialog({ open: true, student, loading: true, data: null });
    try {
      const id = student.student_id || student.id;
      const res = await apiClient.get(`/dashboard/tutor/students/${id}/stats`);
      setStatsDialog(prev => ({ ...prev, loading: false, data: res.data.data }));
    } catch (err) {
      setStatsDialog(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TUTOR']}>
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

        <Tabs defaultValue="students" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="students">Class Students</TabsTrigger>
            <TabsTrigger value="timetable">Class Timetable</TabsTrigger>
          </TabsList>
          
          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Class Students</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No students are currently enrolled in your class.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Total Sessions</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student: any) => {
                        const sTotal = Number(student.total_records) || 0;
                        const sPresent = Number(student.present_records) || 0;
                        const sPerc = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0;
                        return (
                          <TableRow 
                            key={student.student_id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => viewStats(student)}
                          >
                            <TableCell className="font-medium">{student.admission_number}</TableCell>
                            <TableCell>{student.student_name}</TableCell>
                            <TableCell>{sTotal}</TableCell>
                            <TableCell>{sPresent}</TableCell>
                            <TableCell>
                              <Badge variant={sPerc >= 75 ? "default" : sPerc > 0 ? "destructive" : "secondary"}>
                                {sPerc}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timetable" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Timetable</CardTitle>
              </CardHeader>
              <CardContent>
                {timetable.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No timetable has been assigned to this class.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timetable.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium capitalize">{entry.day_of_week}</TableCell>
                          <TableCell>Period {entry.period_number}</TableCell>
                          <TableCell>{entry.subject_name} ({entry.subject_code})</TableCell>
                          <TableCell>{entry.teacher_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={statsDialog.open} onOpenChange={(open) => setStatsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Student Attendance Details</DialogTitle>
            <DialogDescription>
              {statsDialog.student && `${statsDialog.student.student_name} (${statsDialog.student.admission_number})`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {statsDialog.loading ? (
              <div className="text-center text-muted-foreground py-8">Loading attendance data...</div>
            ) : (statsDialog.data?.subjectAttendance?.length > 0 || statsDialog.data?.length > 0) ? (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Total Sessions</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statsDialog.data?.subjectAttendance || statsDialog.data).map((sub: any) => {
                      const total = Number(sub.total_sessions || 0);
                      const present = Number(sub.present_sessions || 0);
                      const percent = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <TableRow key={sub.subject_id}>
                          <TableCell className="font-medium">
                            <div>{sub.subject_name}</div>
                            <div className="text-xs text-muted-foreground">{sub.subject_code || '-'}</div>
                          </TableCell>
                          <TableCell className="text-center">{total}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{present}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={percent >= 75 ? "default" : "destructive"}>{percent}%</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No attendance records found for this student.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setStatsDialog(prev => ({ ...prev, open: false }))}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
