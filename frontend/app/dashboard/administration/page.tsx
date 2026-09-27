'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api/client';
import { Users, BookOpen, Layers, UserCheck, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface AdminStats {
  counts: {
    academic_years: number;
    departments: number;
    active_classes: number;
    active_students: number;
    active_teachers: number;
    active_hods: number;
    active_tutors: number;
  };
  attendanceOverview: {
    total_records: number;
    present_records: number;
  };
}

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

export default function AdministrationDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/administration');
      setStats(res.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Administration Overview</h1>
            <p className="text-muted-foreground mt-1">Manage and monitor college statistics across all departments.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-2xl mx-auto my-12">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg">Unable to load dashboard data</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-4">
              <p>We couldn&apos;t retrieve the administration overview. Please check your connection and try again.</p>
              <Button variant="outline" size="sm" onClick={fetchStats} className="bg-background/50 hover:bg-background">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : stats ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-lg font-semibold tracking-tight mb-4">Academic & Personnel</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Departments" value={stats.counts.departments} icon={Layers} colorClass="bg-blue-100 text-blue-700" />
                <StatCard title="Active Classes" value={stats.counts.active_classes} icon={BookOpen} colorClass="bg-indigo-100 text-indigo-700" />
                <StatCard title="Total Students" value={stats.counts.active_students} icon={Users} colorClass="bg-green-100 text-green-700" />
                <StatCard title="Total Teachers" value={stats.counts.active_teachers} icon={UserCheck} colorClass="bg-purple-100 text-purple-700" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold tracking-tight mb-4">Roles & Attendance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active HODs" value={stats.counts.active_hods} icon={Shield} colorClass="bg-amber-100 text-amber-700" />
                <StatCard title="Active Tutors" value={stats.counts.active_tutors} icon={UserCheck} colorClass="bg-orange-100 text-orange-700" />
                <StatCard 
                  title="Overall Attendance" 
                  value={stats.attendanceOverview.total_records > 0 
                    ? `${((stats.attendanceOverview.present_records / stats.attendanceOverview.total_records) * 100).toFixed(1)}%` 
                    : 'N/A'} 
                  subtitle={stats.attendanceOverview.total_records > 0 ? "Present" : ""}
                  icon={Users} 
                  colorClass="bg-teal-100 text-teal-700" 
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
