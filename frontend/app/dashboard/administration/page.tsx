'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api/client';
import { Users, BookOpen, Layers, UserCheck, Shield } from 'lucide-react';

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

export default function AdministrationDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/dashboard/administration');
        setStats(res.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-4 rounded-lg ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Administration Dashboard</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-gray-500">Loading statistics...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Active Departments" value={stats.counts.departments} icon={Layers} colorClass="bg-blue-500" />
              <StatCard title="Active Classes" value={stats.counts.active_classes} icon={BookOpen} colorClass="bg-indigo-500" />
              <StatCard title="Total Students" value={stats.counts.active_students} icon={Users} colorClass="bg-green-500" />
              <StatCard title="Total Teachers" value={stats.counts.active_teachers} icon={UserCheck} colorClass="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Active HODs" value={stats.counts.active_hods} icon={Shield} colorClass="bg-amber-500" />
              <StatCard title="Active Tutors" value={stats.counts.active_tutors} icon={UserCheck} colorClass="bg-orange-500" />
              <StatCard 
                title="Overall Attendance" 
                value={stats.attendanceOverview.total_records > 0 
                  ? `${((stats.attendanceOverview.present_records / stats.attendanceOverview.total_records) * 100).toFixed(1)}%` 
                  : 'N/A'} 
                icon={Users} 
                colorClass="bg-teal-500" 
              />
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
