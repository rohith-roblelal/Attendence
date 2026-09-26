'use client';

import { useAuth } from '../../lib/auth/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Home, Users, BookOpen, Calendar, Clock, BarChart3, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: 'Admin Dashboard', href: '/dashboard/administration', icon: Home, roles: ['ADMINISTRATION'] },
  { name: 'Departments & Classes', href: '/dashboard/administration/academic', icon: BookOpen, roles: ['ADMINISTRATION'] },
  { name: 'User Management', href: '/dashboard/administration/users', icon: Users, roles: ['ADMINISTRATION'] },
  
  { name: 'HOD Dashboard', href: '/dashboard/hod', icon: Home, roles: ['HOD'] },
  { name: 'Department Reports', href: '/dashboard/hod/reports', icon: BarChart3, roles: ['HOD'] },
  
  { name: 'Tutor Dashboard', href: '/dashboard/tutor', icon: Home, roles: ['TUTOR'] },
  { name: 'Class Reports', href: '/dashboard/tutor/reports', icon: BarChart3, roles: ['TUTOR'] },
  
  { name: 'Teacher Dashboard', href: '/dashboard/teacher', icon: Home, roles: ['TEACHER'] },
  { name: 'My Sessions', href: '/dashboard/teacher/sessions', icon: Clock, roles: ['TEACHER'] },
  { name: 'Timetable', href: '/dashboard/teacher/timetable', icon: Calendar, roles: ['TEACHER'] },
  
  { name: 'Student Dashboard', href: '/dashboard/student', icon: Home, roles: ['STUDENT'] },
  { name: 'My Attendance', href: '/dashboard/student/attendance', icon: BarChart3, roles: ['STUDENT'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>;
  }

  const visibleNavItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">CAS</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold uppercase">
              {user.username.charAt(0)}
            </div>
            <div className="truncate">
              <p className="font-medium text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header (simplified for now) */}
        <header className="md:hidden h-16 bg-white shadow-sm flex items-center justify-between px-4">
          <h1 className="text-lg font-bold text-gray-800">CAS</h1>
          <Button variant="ghost" size="icon" onClick={() => logout()} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
