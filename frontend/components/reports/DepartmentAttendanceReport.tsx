'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { academicApi } from '../../lib/api/academic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function DepartmentAttendanceReport() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

const fetchDepartments = async () => {
    try {
      const res = await academicApi.getDepartments();
      setDepartments(res.data.data.filter((d: any) => d.is_active));
    } catch (err) {
      setError('Failed to load departments list');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  
  useEffect(() => {
    if (selectedDepartmentId) {
      fetchReport(selectedDepartmentId);
    } else {
      setReportData([]);
    }
  }, [selectedDepartmentId]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getDepartmentAttendance(id);
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
            <Label>Select Department</Label>
            <select 
              value={selectedDepartmentId} 
              onChange={(e) => setSelectedDepartmentId(Number(e.target.value))} 
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={0}>Choose a department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {loadingList && <p className="text-xs text-muted-foreground mt-1">Loading departments...</p>}
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

      {selectedDepartmentId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Class Aggregates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead className="text-center">Active Students</TableHead>
                    <TableHead className="text-center">Total Records</TableHead>
                    <TableHead className="text-center">Present Records</TableHead>
                    <TableHead className="text-right">Overall Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReport ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Generating report...</TableCell></TableRow>
                  ) : reportData.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data found for this department.</TableCell></TableRow>
                  ) : (
                    reportData.map((row, idx) => {
                      const percentage = row.percentage ? parseFloat(row.percentage) : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.class_name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{row.student_count || 0}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{row.total_records || 0}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{row.present_records || 0}</TableCell>
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
