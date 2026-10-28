'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { studentsApi } from '../../lib/api/students';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function StudentAttendanceReport() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

const fetchStudents = async () => {
    try {
      const res = await studentsApi.getStudents();
      setStudents(res.data.data.filter((s: any) => s.is_active));
    } catch (err) {
      setError('Failed to load students list');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  
  useEffect(() => {
    if (selectedStudentId) {
      fetchReport(selectedStudentId);
    } else {
      setReportData([]);
    }
  }, [selectedStudentId]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getStudentAttendance(id);
      setReportData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Select Student</Label>
            <select 
              value={selectedStudentId} 
              onChange={(e) => setSelectedStudentId(Number(e.target.value))} 
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={0}>Choose a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_number || 'No ID'})
                </option>
              ))}
            </select>
            {loadingList && <p className="text-xs text-muted-foreground mt-1">Loading students...</p>}
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

      {selectedStudentId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Total Sessions</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReport ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Generating report...</TableCell></TableRow>
                  ) : reportData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No attendance data found for this student.</TableCell></TableRow>
                  ) : (
                    reportData.map((row, idx) => {
                      const percentage = row.total_sessions > 0 ? (row.present_sessions / row.total_sessions) * 100 : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.class_name}</TableCell>
                          <TableCell className="font-medium">{row.subject_name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{row.total_sessions}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{row.present_sessions}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{row.absent_sessions}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={percentage >= 75 ? 'default' : 'destructive'} className={percentage >= 75 ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                              {percentage.toFixed(1)}%
                            </Badge>
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
    </div>
  );
}
