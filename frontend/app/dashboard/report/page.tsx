'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClassAttendanceReport from '../../../components/reports/ClassAttendanceReport';
import StudentAttendanceReport from '../../../components/reports/StudentAttendanceReport';
import SubjectAttendanceReport from '../../../components/reports/SubjectAttendanceReport';
import DepartmentAttendanceReport from '../../../components/reports/DepartmentAttendanceReport';

export default function ReportsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Attendance breakdowns by class, student, subject and department.</p>
      </div>

      <Tabs defaultValue="class">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0">
          <TabsList className="inline-flex min-w-max md:w-auto h-auto">
            <TabsTrigger value="class" className="px-4 py-2">By Class</TabsTrigger>
            <TabsTrigger value="student" className="px-4 py-2">By Student</TabsTrigger>
            <TabsTrigger value="subject" className="px-4 py-2">By Subject</TabsTrigger>
            <TabsTrigger value="department" className="px-4 py-2">By Department</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="class" className="mt-6"><ClassAttendanceReport /></TabsContent>
        <TabsContent value="student" className="mt-6"><StudentAttendanceReport /></TabsContent>
        <TabsContent value="subject" className="mt-6"><SubjectAttendanceReport /></TabsContent>
        <TabsContent value="department" className="mt-6"><DepartmentAttendanceReport /></TabsContent>
      </Tabs>
    </div>
  );
}