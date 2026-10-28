'use client';

import ClassAttendanceReport from '../../../../components/reports/ClassAttendanceReport';

export default function TutorReportsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Reports</h1>
        <p className="text-muted-foreground">View attendance and performance reports for your class.</p>
      </div>
      <ClassAttendanceReport />
    </div>
  );
}
