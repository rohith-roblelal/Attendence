'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api/client';
import { BookOpen, Calendar, Clock, CheckCircle2, ArrowRight, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';

interface TeacherDashboardData {
  counts: { assigned_subjects: number; conducted_sessions: number };
  attendanceOverview: { total_records: number; present_records: number };
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/dashboard/teacher');
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const overallPct = data && data.attendanceOverview.total_records > 0 
    ? (data.attendanceOverview.present_records / data.attendanceOverview.total_records) * 100 
    : null;

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'TUTOR', 'HOD']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your classes, sessions, and attendance.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : data ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link href="/dashboard/teacher/take-attendance" className="block group">
                <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Quick Action</p>
                    <h3 className="text-xl font-bold mt-1 text-primary">Take Attendance</h3>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/teacher/sessions" className="block group">
                <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Sessions Conducted</p>
                    <h3 className="text-3xl font-bold mt-1">{data.counts.conducted_sessions}</h3>
                  </CardContent>
                </Card>
              </Link>

              <Card className="border-border/50 shadow-sm h-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Subjects Assigned</p>
                  <h3 className="text-3xl font-bold mt-1">{data.counts.assigned_subjects}</h3>
                </CardContent>
              </Card>

              <Link href="/dashboard/teacher/timetable" className="block group">
                <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">My Timetable</p>
                    <h3 className="text-lg font-bold mt-1">View Schedule</h3>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        ) : null}

      </div>
    </ProtectedRoute>
  );
}
