'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';

export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.replace('/login');
      return;
    }
    
    const roleDashboards: Record<string, string> = {
      'ADMINISTRATION': '/dashboard/administration',
      'HOD': '/dashboard/hod',
      'TUTOR': '/dashboard/tutor',
      'TEACHER': '/dashboard/teacher',
      'STUDENT': '/dashboard/student',
    };
    
    const dashboardPath = roleDashboards[user.role];
    if (dashboardPath) {
      router.replace(dashboardPath);
    }
  }, [user, isLoading, router]);

  return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
}
