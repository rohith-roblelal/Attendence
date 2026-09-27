'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { RefreshCw, Download, BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface TutorDashboardData {
  counts: { active_students: number };
  attendanceOverview: { total_records: number; present_records: number };
  recentSessions: any[];
}

export default function TutorReportsPage() {
  const [data, setData] = useState<TutorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/tutor');
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const overallPct = data && data.attendanceOverview.total_records > 0 
    ? (data.attendanceOverview.present_records / data.attendanceOverview.total_records) * 100 
    : 0;

  return (
    <ProtectedRoute allowedRoles={['TUTOR']}>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Class Reports</h1>
            <p className="text-muted-foreground mt-1">High-level attendance analytics for your class.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="border-border/50 shadow-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  Overall Attendance
                </CardTitle>
                <CardDescription>Cumulative attendance across all subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-around gap-8 py-8">
                  <div className="text-center">
                    <div className="text-5xl font-black text-primary mb-2">
                      {overallPct.toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Average Attendance
                    </div>
                  </div>
                  
                  <div className="h-24 w-px bg-border hidden md:block" />
                  
                  <div className="flex flex-col gap-4 min-w-[200px]">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Present Records</span>
                        <span className="font-semibold text-green-600">{data.attendanceOverview.present_records}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${overallPct}%` }} />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Total Records</span>
                        <span className="font-semibold">{data.attendanceOverview.total_records}</span>
                      </div>
                      <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center">
                  <a href="/dashboard/tutor/students">
                    <Button variant="secondary" className="gap-2">
                      View Detailed Student Report
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
