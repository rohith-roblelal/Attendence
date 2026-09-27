'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import {
  RefreshCw, AlertCircle, Calendar, BarChart3,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ClassSummary {
  class_id: number;
  class_name: string;
  student_count: number;
  total_records: number;
  present_records: number;
}

interface StudentSummary {
  student_id: number;
  admission_number: string;
  student_name: string;
  class_name: string;
  total_records: number;
  present_records: number;
}

interface ReportData {
  classSummary: ClassSummary[];
  studentSummary: StudentSummary[];
  academic_years: { id: number; name: string }[];
}

const pct = (present: number, total: number) =>
  total > 0 ? (present / total) * 100 : null;

const PctBadge = ({ present, total }: { present: number; total: number }) => {
  const p = pct(present, total);
  if (p === null) return <span className="text-muted-foreground text-xs">N/A</span>;
  const color = p < 75 ? 'text-red-600' : p < 85 ? 'text-amber-600' : 'text-green-600';
  return <span className={`font-semibold ${color}`}>{p.toFixed(1)}%</span>;
};

export default function HodReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noAssignment, setNoAssignment] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'class' | 'student'>('class');

  const fetchData = async (academicYearId?: number) => {
    setIsLoading(true);
    setError(null);
    setNoAssignment(false);
    try {
      const url = academicYearId
        ? `/reports/hod/department?academic_year_id=${academicYearId}`
        : '/reports/hod/department';
      const res = await apiClient.get(url);
      setData(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setNoAssignment(true);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load report');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleYearChange = (val: string | null) => {
    if (!val) return;
    setSelectedYearId(val);
    fetchData(parseInt(val, 10));
  };

  const toggleClass = (id: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Students grouped by class for expanded view
  const studentsByClass: Record<string, StudentSummary[]> = {};
  (data?.studentSummary || []).forEach(s => {
    if (!studentsByClass[s.class_name]) studentsByClass[s.class_name] = [];
    studentsByClass[s.class_name].push(s);
  });

  const lowAttendanceCount = (data?.studentSummary || []).filter(
    s => s.total_records > 0 && (s.present_records / s.total_records) < 0.75
  ).length;

  if (noAssignment) {
    return (
      <ProtectedRoute allowedRoles={['HOD']}>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card className="max-w-md text-center border-border/50">
            <CardHeader>
              <div className="mx-auto bg-amber-100 text-amber-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl">No Active Department Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Your account has no active HOD assignment.</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['HOD']}>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Department Reports</h1>
            <p className="text-muted-foreground mt-1">Attendance breakdown by class and student for your department.</p>
          </div>
          <div className="flex items-center gap-3">
            {data && data.academic_years.length > 0 && (
              <Select value={selectedYearId || ''} onValueChange={(val: string | null) => val && handleYearChange(val)} disabled={isLoading}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {data.academic_years.map(y => (
                    <SelectItem key={y.id} value={y.id.toString()}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchData(selectedYearId ? parseInt(selectedYearId, 10) : undefined)} disabled={isLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Failed to load report</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchData()}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Summary strip */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span><strong className="text-foreground">{data.classSummary.length}</strong> classes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span><strong className="text-foreground">{data.studentSummary.length}</strong> students</span>
              </div>
              {lowAttendanceCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span><strong>{lowAttendanceCount}</strong> students below 75%</span>
                </div>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 border-b border-border">
              {(['class', 'student'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'class' ? 'Class-wise' : 'Student-wise'}
                </button>
              ))}
            </div>

            {/* Class-wise Tab */}
            {activeTab === 'class' && (
              <div className="space-y-3">
                {data.classSummary.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="p-12 text-center text-muted-foreground">No active classes for this period.</CardContent>
                  </Card>
                ) : data.classSummary.map(cls => {
                  const isExpanded = expandedClasses.has(cls.class_id);
                  const classStudents = studentsByClass[cls.class_name] || [];
                  const clsPct = pct(cls.present_records, cls.total_records);
                  return (
                    <Card key={cls.class_id} className="border-border/50 shadow-sm overflow-hidden">
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/40 transition-colors py-4 px-5"
                        onClick={() => toggleClass(cls.class_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <CardTitle className="text-base font-semibold">{cls.class_name}</CardTitle>
                            <Badge variant="secondary">{cls.student_count} students</Badge>
                            {clsPct !== null && (
                              <span className={`text-sm font-semibold ${clsPct < 75 ? 'text-red-600' : clsPct < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                {clsPct.toFixed(1)}% overall
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="p-0">
                          {classStudents.length === 0 ? (
                            <p className="p-6 text-sm text-muted-foreground">No student data available.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>Adm. No.</TableHead>
                                  <TableHead>Student</TableHead>
                                  <TableHead className="text-center">Present</TableHead>
                                  <TableHead className="text-center">Total</TableHead>
                                  <TableHead className="text-right">Attendance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classStudents.map(s => (
                                  <TableRow key={s.student_id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{s.admission_number}</TableCell>
                                    <TableCell className="font-medium">{s.student_name.trim()}</TableCell>
                                    <TableCell className="text-center text-green-600">{s.present_records}</TableCell>
                                    <TableCell className="text-center text-muted-foreground">{s.total_records}</TableCell>
                                    <TableCell className="text-right">
                                      <PctBadge present={s.present_records} total={s.total_records} />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Student-wise Tab */}
            {activeTab === 'student' && (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-0">
                  {data.studentSummary.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">No students found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Adm. No.</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-right">Attendance</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.studentSummary.map(s => {
                          const p = pct(s.present_records, s.total_records);
                          const isLow = p !== null && p < 75;
                          return (
                            <TableRow key={s.student_id} className={isLow ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                              <TableCell className="font-mono text-xs text-muted-foreground">{s.admission_number}</TableCell>
                              <TableCell className="font-medium">{s.student_name.trim()}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{s.class_name}</TableCell>
                              <TableCell className="text-center text-green-600">{s.present_records}</TableCell>
                              <TableCell className="text-center text-muted-foreground">{s.total_records}</TableCell>
                              <TableCell className="text-right"><PctBadge present={s.present_records} total={s.total_records} /></TableCell>
                              <TableCell className="text-center">
                                {p === null ? (
                                  <Badge variant="secondary">No Data</Badge>
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
            )}

          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
