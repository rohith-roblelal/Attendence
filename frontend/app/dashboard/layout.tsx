'use client';

import { useAuth } from '../../lib/auth/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Home, Users, BookOpen, Calendar, Clock, BarChart3, Settings, Layers, UserCheck, Shield, GraduationCap, Menu, ArrowLeftRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
}

const navItems: NavItem[] = [
  // ADMINISTRATION
  { name: 'Dashboard', href: '/dashboard/administration', icon: Home, roles: ['ADMINISTRATION'], group: 'MAIN' },
  
  { name: 'Academic Structure', href: '/dashboard/administration/academic', icon: Layers, roles: ['ADMINISTRATION'], group: 'ACADEMICS' },
  { name: 'Subjects', href: '/dashboard/administration/subjects', icon: BookOpen, roles: ['ADMINISTRATION'], group: 'ACADEMICS' },
  { name: 'Timetable', href: '/dashboard/administration/timetable', icon: Calendar, roles: ['ADMINISTRATION'], group: 'ACADEMICS' },
  { name: 'Class Sessions', href: '/dashboard/administration/sessions', icon: Clock, roles: ['ADMINISTRATION'], group: 'ACADEMICS' },
  
  { name: 'Students & Teachers', href: '/dashboard/administration/people', icon: Users, roles: ['ADMINISTRATION'], group: 'PEOPLE' },
  { name: 'HOD & Tutors', href: '/dashboard/administration/hod-tutor', icon: Shield, roles: ['ADMINISTRATION'], group: 'PEOPLE' },
  
  { name: 'Attendance', href: '/dashboard/administration/attendence', icon: UserCheck, roles: ['ADMINISTRATION'], group: 'ATTENDANCE' },
  { name: 'Reports', href: '/dashboard/report', icon: BarChart3, roles: ['ADMINISTRATION'], group: 'ATTENDANCE' },
  
  { name: 'User Management', href: '/dashboard/administration/users', icon: Settings, roles: ['ADMINISTRATION'], group: 'SYSTEM' },

  // HOD
  { name: 'Dashboard', href: '/dashboard/hod', icon: Home, roles: ['HOD'], group: 'MAIN' },
  { name: 'Subjects', href: '/dashboard/hod/subjects', icon: BookOpen, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Assign Subjects', href: '/dashboard/hod/assign-subjects', icon: GraduationCap, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Timetable', href: '/dashboard/hod/timetable', icon: Calendar, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Class Sessions', href: '/dashboard/hod/sessions', icon: Clock, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Teachers & Classes', href: '/dashboard/hod/people', icon: Users, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Department Reports', href: '/dashboard/hod/reports', icon: BarChart3, roles: ['HOD'], group: 'DEPARTMENT' },
  { name: 'Tutor Dashboard', href: '/dashboard/tutor', icon: Home, roles: ['TUTOR'], group: 'MAIN' },
  { name: 'My Students', href: '/dashboard/tutor/students', icon: Users, roles: ['TUTOR'], group: 'DEPARTMENT' },
  { name: 'Class Reports', href: '/dashboard/tutor/reports', icon: BarChart3, roles: ['TUTOR'], group: 'DEPARTMENT' },
  { name: 'Teacher Dashboard', href: '/dashboard/teacher', icon: Home, roles: ['TEACHER', 'TUTOR', 'HOD'], group: 'TEACHING' },
  { name: 'Take Attendance', href: '/dashboard/teacher/take-attendance', icon: UserCheck, roles: ['TEACHER', 'TUTOR', 'HOD'], group: 'TEACHING' },
  { name: 'My Sessions', href: '/dashboard/teacher/sessions', icon: Clock, roles: ['TEACHER', 'TUTOR', 'HOD'], group: 'TEACHING' },
  { name: 'Timetable', href: '/dashboard/teacher/timetable', icon: Calendar, roles: ['TEACHER', 'TUTOR', 'HOD'], group: 'TEACHING' },
  { name: 'Swap Requests', href: '/dashboard/teacher/swaps', icon: ArrowLeftRight, roles: ['TEACHER', 'TUTOR', 'HOD'], group: 'TEACHING' },
  { name: 'Dashboard', href: '/dashboard/student', icon: Home, roles: ['STUDENT'], group: 'MAIN' },
  { name: 'My Attendance', href: '/dashboard/student/subject-attendance', icon: BookOpen, roles: ['STUDENT'], group: 'ACADEMICS' },
  { name: 'My Timetable', href: '/dashboard/student/timetable', icon: Calendar, roles: ['STUDENT'], group: 'ACADEMICS' },
];

import { ThemeToggle } from "../../components/ThemeToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const { visibleNavItems, sortedGroups, groupedNavItems } = React.useMemo(() => {
    const visible = navItems.filter((item) => item.roles.includes(user?.role || ''));
    const grouped = visible.reduce((acc, item) => {
      const group = item.group || 'OTHER';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>);

    const groupOrder = ['MAIN', 'DEPARTMENT', 'TEACHING', 'ACADEMICS', 'PEOPLE', 'ATTENDANCE', 'SYSTEM', 'OTHER'];
    const sorted = Object.keys(grouped).sort((a, b) => {
      let indexA = groupOrder.indexOf(a);
      let indexB = groupOrder.indexOf(b);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });

    return { visibleNavItems: visible, sortedGroups: sorted, groupedNavItems: grouped };
  }, [user?.role]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Redirecting to login...</div>;
  }


  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground truncate">Welcome, {user.username}</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-hide">
        {sortedGroups.map(group => (
          <div key={group} className="space-y-1">
            {group !== 'OTHER' && (
              <h2 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group}
              </h2>
            )}
            {groupedNavItems[group].map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard/administration' && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 px-1 text-sm text-foreground">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold uppercase">
              {user.username.charAt(0)}
            </div>
            <div className="truncate">
              <p className="font-medium text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <ThemeToggle />
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
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card shadow-md hidden md:flex flex-col border-r border-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[80%] bg-card h-full flex flex-col shadow-xl animate-in slide-in-from-left duration-300">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 z-50 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 h-16 bg-card border-b border-border flex items-center justify-between px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground truncate hidden sm:block">Welcome, {user.username}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button aria-label="Logout" variant="ghost" size="icon" onClick={() => logout()} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
