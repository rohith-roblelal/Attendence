'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { dashboardApi } from '../../../../lib/api/dashboard';
import { RefreshCw, AlertCircle, Calendar, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassInfo {
  class_id: number;
  class_name: string;
  section_name: string;
  batch_name: string;
  semester_name: string;
}

interface Assignment {
  class_id: number;
  teacher_id: number;
  teacher_name: string;
  teacher_status: string;
  subject_name: string;
  subject_code: string;
}

interface PeopleData {
  classes: ClassInfo[];
  assignments: Assignment[];
  academic_years: { id: number; name: string }[];
}

export default function HodPeoplePage() {
  const [data, setData] = useState<PeopleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noAssignment, setNoAssignment] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());

  const fetchData = async (academicYearId?: number) => {
    setIsLoading(true);
    setError(null);
    setNoAssignment(false);
    try {
      const res = await dashboardApi.getHodPeople(academicYearId);
      setData(res.data.data);
      // Expand all classes by default
      setExpandedClasses(new Set(res.data.data.classes.map(c => c.class_id)));
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.message?.includes('No active HOD assignment')) {
        setNoAssignment(true);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleYearChange = (val: string) => {
    setSelectedYearId(val);
    fetchData(parseInt(val, 10));
  };

  const toggleClass = (classId: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  // Group assignments by class_id
  const assignmentsByClass = (data?.assignments || []).reduce((acc, a) => {
    if (!acc[a.class_id]) acc[a.class_id] = [];
    acc[a.class_id].push(a);
    return acc;
  }, {} as Record<number, Assignment[]>);

  // Get unique teachers across all assignments
  const uniqueTeachers = new Map<number, string>();
  (data?.assignments || []).forEach(a => uniqueTeachers.set(a.teacher_id, a.teacher_name));

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
              <p className="text-muted-foreground mb-6">
                Your account is not associated with an active HOD assignment. Please contact Administration.
              </p>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Teachers &amp; Classes</h1>
            <p className="text-muted-foreground mt-1">View which teachers are teaching in each class of your department.</p>
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
            <Button variant="outline" size="sm" onClick={() => fetchData(selectedYearId ? parseInt(selectedYearId, 10) : undefined)} disabled={isLoading} className="gap-2 shrink-0">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="border-border/50">
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent><Skeleton className="h-32 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Unable to load data</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-4">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchData(selectedYearId ? parseInt(selectedYearId, 10) : undefined)}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span><strong className="text-foreground">{uniqueTeachers.size}</strong> active teachers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span><strong className="text-foreground">{data.classes.length}</strong> classes</span>
              </div>
            </div>

            {data.classes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center text-muted-foreground">
                  No active classes found for this academic year.
                </CardContent>
              </Card>
            ) : (
              data.classes.map(cls => {
                const classAssignments = assignmentsByClass[cls.class_id] || [];
                const isExpanded = expandedClasses.has(cls.class_id);
                return (
                  <Card key={cls.class_id} className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader
                      className="cursor-pointer select-none hover:bg-muted/40 transition-colors py-4"
                      onClick={() => toggleClass(cls.class_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base font-semibold">{cls.class_name}</CardTitle>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {classAssignments.length} subject{classAssignments.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="p-0">
                        {classAssignments.length === 0 ? (
                          <p className="p-6 text-sm text-muted-foreground">No teachers assigned to this class.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Subject</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Teacher</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {classAssignments.map((a, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{a.subject_name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">{a.subject_code}</Badge>
                                  </TableCell>
                                  <TableCell>{a.teacher_name.trim()}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={a.teacher_status === 'ACTIVE' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {a.teacher_status}
                                    </Badge>
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
              })
            )}
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
