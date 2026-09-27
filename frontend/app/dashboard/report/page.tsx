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
        <TabsList>
          <TabsTrigger value="class">By Class</TabsTrigger>
          <TabsTrigger value="student">By Student</TabsTrigger>
          <TabsTrigger value="subject">By Subject</TabsTrigger>
          <TabsTrigger value="department">By Department</TabsTrigger>
        </TabsList>
        <TabsContent value="class" className="mt-6"><ClassAttendanceReport /></TabsContent>
        <TabsContent value="student" className="mt-6"><StudentAttendanceReport /></TabsContent>
        <TabsContent value="subject" className="mt-6"><SubjectAttendanceReport /></TabsContent>
        <TabsContent value="department" className="mt-6"><DepartmentAttendanceReport /></TabsContent>
      </Tabs>
    </div>
  );
}