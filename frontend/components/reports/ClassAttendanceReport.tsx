'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { classesApi } from '../../lib/api/classes';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart2 } from 'lucide-react';

export default function ClassAttendanceReport() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATION';
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statsDialog, setStatsDialog] = useState<{ open: boolean; student: any; loading: boolean; data: any }>({
    open: false,
    student: null,
    loading: false,
    data: null,
  });

  const fetchClasses = async () => {
    try {
      if (isAdmin) {
        const res = await classesApi.getClasses();
        setClasses(res.data.data.filter((c: any) => c.status === 'ACTIVE'));
      } else if (user?.role === 'TUTOR') {
        const res = await apiClient.get('/dashboard/tutor');
        if (res.data?.data?.classInfo?.id) {
          setSelectedClassId(res.data.data.classInfo.id);
        }
      }
    } catch (err) {
      setError('Failed to load classes or tutor assignment');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  
  useEffect(() => {
    if (selectedClassId) {
      fetchReport(selectedClassId);
    } else {
      setReportData([]);
    }
  }, [selectedClassId]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getClassAttendance(id);
      setReportData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  const viewStats = async (student: any) => {
    setStatsDialog({ open: true, student, loading: true, data: null });
    try {
      // If tutor, use the tutor endpoint to fetch subject-wise stats
      const endpoint = user?.role === 'TUTOR' 
        ? `/dashboard/tutor/students/${student.student_id}/stats`
        : `/reports/student/${student.student_id}`; 
        
      const res = await apiClient.get(endpoint);
      setStatsDialog(prev => ({ ...prev, loading: false, data: res.data.data }));
    } catch (err) {
      setStatsDialog(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <select 
                value={selectedClassId} 
                onChange={(e) => setSelectedClassId(Number(e.target.value))} 
                className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={0}>Choose a class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.class_code || c.section_name}
                  </option>
                ))}
              </select>
              {loadingList && <p className="text-xs text-muted-foreground mt-1">Loading classes...</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

      {selectedClassId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission Number</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReport ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Generating report...</TableCell></TableRow>
                  ) : reportData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No attendance data found for this class.</TableCell></TableRow>
                  ) : (
                    reportData.map((row, idx) => {
                      const percentage = row.percentage ? parseFloat(row.percentage) : 0;
                      return (
                        <TableRow 
                          key={idx} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => viewStats(row)}
                        >
                          <TableCell className="font-medium">{row.first_name} {row.last_name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.admission_number || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm text-primary group-hover:underline">View Subject Attendance</span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={statsDialog.open} onOpenChange={(open) => setStatsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Student Attendance Details</DialogTitle>
            <DialogDescription>
              {statsDialog.student && `${statsDialog.student.first_name} ${statsDialog.student.last_name || ''} (${statsDialog.student.admission_number || statsDialog.student.student_id})`}
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
    </div>
  );
}
