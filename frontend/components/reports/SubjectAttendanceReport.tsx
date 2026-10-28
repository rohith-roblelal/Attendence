'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { subjectsApi } from '../../lib/api/subjects';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function SubjectAttendanceReport() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      const res = await subjectsApi.getSubjects();
      setSubjects(res.data.data.filter((s: any) => s.is_active));
    } catch {
      setError('Failed to load subjects list');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getSubjectAttendance(id);
      setReportData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchReport(selectedSubjectId);
    } else {
      setReportData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Select Subject</Label>
            <select 
              value={selectedSubjectId} 
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))} 
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={0}>Choose a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
            {loadingList && <p className="text-xs text-muted-foreground mt-1">Loading subjects...</p>}
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

      {selectedSubjectId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance across this Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission Number</TableHead>
                    <TableHead className="text-center">Total Sessions</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReport ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Generating report...</TableCell></TableRow>
                  ) : reportData.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No attendance data found for this subject.</TableCell></TableRow>
                  ) : (
                    reportData.map((row, idx) => {
                      const percentage = row.percentage ? parseFloat(row.percentage) : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.first_name} {row.last_name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.admission_number || '-'}</TableCell>
                          <TableCell className="text-center">{row.total_sessions || 0}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{row.present_sessions || 0}</TableCell>
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
