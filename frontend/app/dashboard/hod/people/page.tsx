'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { dashboardApi } from '../../../../lib/api/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, BookOpen, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClassItem {
  class_id: number;
  class_name: string;
  section_name: string;
  batch_name: string;
  semester_name: string;
}

interface AssignmentItem {
  class_id: number;
  teacher_id: number;
  teacher_name: string;
  teacher_status: string;
  subject_name: string;
  subject_code: string;
}

interface AcademicYear {
  id: number;
  name: string;
}

export default function HodPeoplePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (yearId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getHodPeople(yearId);
      const data = res.data.data;
      setClasses(data.classes || []);
      setAssignments(data.assignments || []);
      if (data.academic_years && data.academic_years.length > 0) {
        setAcademicYears(data.academic_years);
        if (!yearId && !selectedYear) {
          setSelectedYear(String(data.academic_years[0].id));
        }
      }
    } catch (err: any) {
      console.error('Failed to load HOD teachers and classes', err);
      setError(err?.response?.data?.message || 'Failed to load teachers and classes for your department.');
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
    fetchData();
  }, [authLoading, user, router]);

  const handleYearChange = (yearIdStr: string | null) => {
    if (!yearIdStr) return;
    setSelectedYear(yearIdStr);
    fetchData(parseInt(yearIdStr, 10));
  };

  // Group assignments by class_id for fast lookup
  const assignmentsByClass = useMemo(() => {
    const map = new Map<number, AssignmentItem[]>();
    assignments.forEach((item) => {
      if (!map.has(item.class_id)) {
        map.set(item.class_id, []);
      }
      map.get(item.class_id)!.push(item);
    });
    return map;
  }, [assignments]);

  // Unique teachers count
  const uniqueTeachers = useMemo(() => {
    const teacherMap = new Map<number, { name: string; status: string }>();
    assignments.forEach((a) => {
      if (!teacherMap.has(a.teacher_id)) {
        teacherMap.set(a.teacher_id, { name: a.teacher_name, status: a.teacher_status });
      }
    });
    return Array.from(teacherMap.entries()).map(([id, t]) => ({ id, ...t }));
  }, [assignments]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers & Classes</h1>
          <p className="text-muted-foreground">
            Overview of department classes and teacher-subject allocations.
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

      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : classes.length}</div>
            <p className="text-xs text-muted-foreground">Active in selected academic year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : uniqueTeachers.length}</div>
            <p className="text-xs text-muted-foreground">Active faculty handling subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Allocations</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : assignments.length}</div>
            <p className="text-xs text-muted-foreground">Active subject mappings</p>
          </CardContent>
        </Card>
      </div>

      {/* Classes and Allocations */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading teachers and classes...</div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No classes found for this department in the selected academic year.
            </CardContent>
          </Card>
        ) : (
          classes.map((cls) => {
            const classAssignments = assignmentsByClass.get(cls.class_id) || [];
            return (
              <Card key={cls.class_id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        {cls.class_name}
                      </CardTitle>
                      <CardDescription>
                        Batch: {cls.batch_name} | Semester: {cls.semester_name} | Section: {cls.section_name}
                      </CardDescription>
                    </div>
                    <Badge variant={classAssignments.length > 0 ? "secondary" : "outline"}>
                      {classAssignments.length} {classAssignments.length === 1 ? 'Subject Assigned' : 'Subjects Assigned'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {classAssignments.length === 0 ? (
                    <div className="p-6 text-sm text-center text-muted-foreground">
                      No subject-teacher allocations configured for this class yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject Code</TableHead>
                          <TableHead>Subject Name</TableHead>
                          <TableHead>Teacher Assigned</TableHead>
                          <TableHead className="text-right">Teacher Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classAssignments.map((assign, idx) => (
                          <TableRow key={`${cls.class_id}-${assign.subject_code}-${idx}`}>
                            <TableCell className="font-mono font-medium">{assign.subject_code}</TableCell>
                            <TableCell className="font-medium">{assign.subject_name}</TableCell>
                            <TableCell>{assign.teacher_name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={assign.teacher_status === 'ACTIVE' ? 'default' : 'outline'}>
                                {assign.teacher_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
