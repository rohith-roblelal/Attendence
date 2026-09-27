'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { dashboardApi, HodDashboardResponse } from '../../../lib/api/dashboard';
import { 
  Users, 
  BookOpen, 
  UserCheck, 
  AlertCircle, 
  RefreshCw,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }: { title: string, value: string | number, icon: any, colorClass: string, subtitle?: string }) => (
  <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            {subtitle && <span className="text-sm font-medium text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonCard = () => (
  <Card className="overflow-hidden border-border/50 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-[60px]" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const AttendancePercentage = ({ present, total }: { present: number, total: number }) => {
  if (total === 0) return <span className="text-muted-foreground">N/A</span>;
  const percentage = (present / total) * 100;
  
  let color = "text-green-600";
  if (percentage < 75) color = "text-red-600";
  else if (percentage < 85) color = "text-amber-600";
  
  return <span className={`font-semibold ${color}`}>{percentage.toFixed(1)}%</span>;
};

export default function HodDashboard() {
  const [dashboardData, setDashboardData] = useState<HodDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noAssignment, setNoAssignment] = useState(false);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);

  const fetchDashboard = async (academicYearId?: number) => {
    setIsLoading(true);
    setError(null);
    setNoAssignment(false);
    try {
      const res = await dashboardApi.getHodStats(academicYearId);
      setDashboardData(res.data.data);
      // Auto-select the year that the backend resolved to
      if (!academicYearId) {
        const defaultYear = res.data.data.academic_years.find(y => y.name === res.data.data.context.academic_year_name);
        if (defaultYear) setSelectedAcademicYearId(defaultYear.id.toString());
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.message?.includes('No active HOD assignment')) {
        setNoAssignment(true);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleYearChange = (val: string) => {
    setSelectedAcademicYearId(val);
    fetchDashboard(parseInt(val, 10));
  };

  if (noAssignment) {
    return (
      <ProtectedRoute allowedRoles={['HOD']}>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card className="max-w-md text-center border-border/50 shadow-sm">
            <CardHeader>
              <div className="mx-auto bg-amber-100 text-amber-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <CardTitle className="text-xl">No Active Department Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Your account is currently not associated with an active HOD assignment. 
                You cannot monitor any department until an assignment is created for you.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Check Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['HOD']}>
      <div className="space-y-8 max-w-7xl mx-auto pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">HOD Dashboard</h1>
            {isLoading && !dashboardData ? (
              <Skeleton className="h-5 w-64 mt-2" />
            ) : dashboardData ? (
              <div className="flex items-center gap-1.5 text-muted-foreground mt-2">
                <Building className="w-4 h-4" />
                <span className="font-medium">{dashboardData.context.department_name}</span>
              </div>
            ) : null}
          </div>
          
          <div className="flex items-center gap-3">
            {dashboardData && dashboardData.academic_years.length > 0 && (
              <Select value={selectedAcademicYearId || ''} onValueChange={(val: string | null) => val && handleYearChange(val)} disabled={isLoading}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {dashboardData.academic_years.map(year => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchDashboard(selectedAcademicYearId ? parseInt(selectedAcademicYearId, 10) : undefined)} disabled={isLoading} className="gap-2 shrink-0">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {/* Loading / Error / Content */}
        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-[400px] rounded-xl" />
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-2xl mx-auto my-12">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg">Unable to load dashboard data</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-4">
              <p>{error}. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => fetchDashboard(selectedAcademicYearId ? parseInt(selectedAcademicYearId, 10) : undefined)} className="bg-background/50 hover:bg-background text-foreground border-border">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : dashboardData ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total Students" 
                value={dashboardData.counts.active_students} 
                icon={Users} 
                colorClass="bg-blue-100 text-blue-700" 
              />
              <StatCard 
                title="Active Classes" 
                value={dashboardData.counts.active_classes} 
                icon={BookOpen} 
                colorClass="bg-indigo-100 text-indigo-700" 
              />
              <StatCard 
                title="Total Teachers" 
                value={dashboardData.counts.active_teachers} 
                icon={UserCheck} 
                colorClass="bg-purple-100 text-purple-700" 
              />
              <StatCard 
                title="Overall Attendance" 
                value={dashboardData.attendanceOverview.total_records > 0 
                  ? `${((dashboardData.attendanceOverview.present_records / dashboardData.attendanceOverview.total_records) * 100).toFixed(1)}%` 
                  : 'N/A'} 
                subtitle={dashboardData.attendanceOverview.total_records > 0 ? "Avg" : ""}
                icon={CheckCircle2} 
                colorClass="bg-teal-100 text-teal-700" 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Class-wise Attendance */}
              <Card className="border-border/50 shadow-sm flex flex-col">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-lg">Class-wise Attendance</CardTitle>
                  <CardDescription>Overall attendance percentage per class</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                  {dashboardData.classes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No active classes found for this academic year.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[120px]">Class</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.classes.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-medium">{cls.name}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{cls.student_count}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {cls.total_records > 0 ? Math.round(cls.total_records / Math.max(1, cls.student_count)) : 0}
                            </TableCell>
                            <TableCell className="text-right">
                              <AttendancePercentage present={cls.present_records} total={cls.total_records} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Students Requiring Attention */}
              <Card className="border-border/50 shadow-sm flex flex-col">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Requires Attention
                      </CardTitle>
                      <CardDescription>Students with &lt; 75% attendance</CardDescription>
                    </div>
                    {dashboardData.attention.length > 0 && (
                      <Badge variant="destructive" className="rounded-full">
                        {dashboardData.attention.length} Students
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                  {dashboardData.attention.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                      <div className="bg-green-100 text-green-600 p-3 rounded-full">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-muted-foreground">No students currently require attention.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.attention.map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.first_name} {student.last_name || ''}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">{student.class_name}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {((student.present_records / student.total_records) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
            
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
