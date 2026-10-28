'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { reportsApi } from '../../../../lib/api/reports';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, AlertCircle, Users, CheckCircle, Percent } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClassSummaryItem {
  class_id: number;
  class_name: string;
  student_count: number;
  total_records: number;
  present_records: number;
}

interface StudentSummaryItem {
  student_id: number;
  admission_number: string;
  student_name: string;
  class_name: string;
  total_records: number;
  present_records: number;
}

interface AcademicYear {
  id: number;
  name: string;
}

export default function HodReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [classSummary, setClassSummary] = useState<ClassSummaryItem[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummaryItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (yearId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.getHodDepartmentReport(yearId);
      const data = res.data.data;
      setClassSummary(data.classSummary || []);
      setStudentSummary(data.studentSummary || []);
      if (data.academic_years && data.academic_years.length > 0) {
        setAcademicYears(data.academic_years);
        if (!yearId && !selectedYear) {
          setSelectedYear(String(data.academic_years[0].id));
        }
      }
    } catch (err: any) {
      console.error('Failed to load HOD department report', err);
      setError(err?.response?.data?.message || 'Failed to load department attendance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'HOD') {
      setError(`Access restricted. Your current account (${user.username}) does not have the HOD role.`);
      setLoading(false);
      return;
    }
    fetchReport();
  }, [authLoading, user, router]);

  const handleYearChange = (yearIdStr: string | null) => {
    if (!yearIdStr) return;
    setSelectedYear(yearIdStr);
    fetchReport(parseInt(yearIdStr, 10));
  };

  // High-level aggregates
  const totals = useMemo(() => {
    let totalRecords = 0;
    let presentRecords = 0;
    let totalStudents = 0;

    classSummary.forEach((c) => {
      totalRecords += Number(c.total_records) || 0;
      presentRecords += Number(c.present_records) || 0;
      totalStudents += Number(c.student_count) || 0;
    });

    const percentage = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : '0.0';
    return { totalRecords, presentRecords, totalStudents, percentage };
  }, [classSummary]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department Reports</h1>
          <p className="text-muted-foreground">
            Attendance analytics and summary across classes and students in your department.
          </p>
        </div>

        {academicYears.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Academic Year:</span>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Year">
                  {(val: any) => {
                    const found = academicYears.find((y) => String(y.id) === String(val));
                    return found ? found.name : val || 'Select Year';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={String(y.id)}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Aggregate Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Tracked</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : classSummary.length}</div>
            <p className="text-xs text-muted-foreground">In active department scope</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : totals.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across department classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance Marks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : totals.totalRecords}</div>
            <p className="text-xs text-muted-foreground">{totals.presentRecords} Present records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${totals.percentage}%`}</div>
            <p className="text-xs text-muted-foreground">Department average</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabular Reports */}
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Class-wise Summary</TabsTrigger>
          <TabsTrigger value="students">Student-wise Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Attendance Summary</CardTitle>
              <CardDescription>
                Summary of total sessions and average attendance performance per class.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading class summary...</div>
              ) : classSummary.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No class records found for this year.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Total Attendance Marks</TableHead>
                      <TableHead className="text-center">Present Marks</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classSummary.map((cls) => {
                      const total = Number(cls.total_records) || 0;
                      const present = Number(cls.present_records) || 0;
                      const pct = total > 0 ? ((present / total) * 100).toFixed(1) : 'N/A';
                      const isLow = total > 0 && (present / total) < 0.75;

                      return (
                        <TableRow key={cls.class_id}>
                          <TableCell className="font-medium">{cls.class_name}</TableCell>
                          <TableCell className="text-center">{cls.student_count}</TableCell>
                          <TableCell className="text-center">{total}</TableCell>
                          <TableCell className="text-center">{present}</TableCell>
                          <TableCell className="text-right">
                            {pct !== 'N/A' ? (
                              <Badge variant={isLow ? "destructive" : "secondary"}>
                                {pct}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No Sessions</span>
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
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Summary</CardTitle>
              <CardDescription>
                Individual attendance percentages for students enrolled in your department.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading student summary...</div>
              ) : studentSummary.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No student attendance records found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Total Records</TableHead>
                      <TableHead className="text-center">Attended</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSummary.map((st) => {
                      const total = Number(st.total_records) || 0;
                      const present = Number(st.present_records) || 0;
                      const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
                      const isAtRisk = total > 0 && (present / total) < 0.75;

                      return (
                        <TableRow key={st.student_id}>
                          <TableCell className="font-mono text-xs">{st.admission_number}</TableCell>
                          <TableCell className="font-medium">{st.student_name}</TableCell>
                          <TableCell>{st.class_name}</TableCell>
                          <TableCell className="text-center">{total}</TableCell>
                          <TableCell className="text-center">{present}</TableCell>
                          <TableCell className="text-right font-medium">
                            {total > 0 ? `${pct}%` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {total === 0 ? (
                              <Badge variant="outline">No Records</Badge>
                            ) : isAtRisk ? (
                              <Badge variant="destructive">At Risk (&lt;75%)</Badge>
                            ) : (
                              <Badge variant="default">Good Standing</Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
