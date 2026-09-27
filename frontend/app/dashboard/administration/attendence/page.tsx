'use client';

import AttendanceTracker from '../../../../components/operations/AttendanceTracker';

export default function AttendancePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Mark and review attendance for any recorded class session.</p>
      </div>
      <AttendanceTracker />
    </div>
  );
}