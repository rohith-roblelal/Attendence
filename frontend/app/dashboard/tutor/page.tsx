'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api/client';
import { Users, BarChart3, Clock, Calendar, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

interface TutorDashboardData {
  counts: { active_students: number };
  attendanceOverview: { total_records: number; present_records: number };
  recentSessions: { id: number; session_date: string; period_number: number; status: string }[];
}

export default function TutorDashboard() {
  const [data, setData] = useState<TutorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/dashboard/tutor');
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
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
    <ProtectedRoute allowedRoles={['TUTOR']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Tutor Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your assigned class.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-destructive p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <Link href="/dashboard/tutor/students" className="block group">
                <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">My Students</p>
                    <h3 className="text-3xl font-bold mt-1">{data.counts.active_students}</h3>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/tutor/reports" className="block group">
                <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Class Attendance</p>
                    <h3 className="text-3xl font-bold mt-1">
                      {overallPct !== null ? `${overallPct.toFixed(1)}%` : 'N/A'}
                    </h3>
                  </CardContent>
                </Card>
              </Link>

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

            {/* Recent Sessions */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Recent Class Sessions
                    </CardTitle>
                    <CardDescription>Latest sessions conducted for this class</CardDescription>
                  </div>
                  <Link href="/dashboard/teacher/sessions">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted transition-colors">
                      View All Sessions <ArrowRight className="w-3 h-3 ml-1" />
                    </Badge>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.recentSessions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No recent sessions found.</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {data.recentSessions.map(s => {
                      const dateObj = new Date(s.session_date);
                      return (
                        <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary w-12 h-12 flex flex-col items-center justify-center rounded-lg font-bold">
                              <span className="text-xs uppercase opacity-80">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                              <span>{dateObj.getDate()}</span>
                            </div>
                            <div>
                              <div className="font-medium">Period {s.period_number}</div>
                              <div className="text-xs text-muted-foreground">
                                Status: {s.status}
                              </div>
                            </div>
                          </div>
                          {s.status === 'CONDUCTED' ? (
                            <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Conducted</Badge>
                          ) : (
                            <Badge variant="secondary">{s.status}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        ) : null}

      </div>
    </ProtectedRoute>
  );
}
