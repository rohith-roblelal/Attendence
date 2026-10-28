'use client';

import QuickAttendance from '../../../../components/operations/QuickAttendance';

export default function TakeAttendancePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Take Attendance</h1>
        <p className="text-muted-foreground">Quickly mark attendance for your current sessions.</p>
      </div>
      <QuickAttendance />
    </div>
  );
}
