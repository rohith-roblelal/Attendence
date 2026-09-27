'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";
import Link from 'next/link';

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your academic progress and schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Attendance Card */}
          <Link href="/dashboard/student/subject-attendance" className="block group">
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-indigo-500/50 dark:hover:border-indigo-400/50 bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/80 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  My Attendance
                </CardTitle>
                <CardDescription>
                  View your subject-wise attendance percentage, total classes conducted, and your presence record.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <div className="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  View Report <ArrowRight className="ml-1 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* My Timetable Card */}
          <Link href="/dashboard/student/timetable" className="block group">
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-teal-500/50 dark:hover:border-teal-400/50 bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/80 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  My Timetable
                </CardTitle>
                <CardDescription>
                  Check your daily class schedule, subjects, and assigned teachers for the current semester.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <div className="flex items-center text-sm font-medium text-teal-600 dark:text-teal-400 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  View Timetable <ArrowRight className="ml-1 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
