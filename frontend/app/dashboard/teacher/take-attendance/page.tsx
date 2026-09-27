'use client';

import ProtectedRoute from '../../../../components/ProtectedRoute';
import QuickAttendance from '../../../../components/operations/QuickAttendance';

export default function TeacherTakeAttendancePage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'TUTOR', 'HOD']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Take Attendance</h1>
          <p className="text-muted-foreground mt-1">Select your class and hour, and mark student attendance instantly.</p>
        </div>

        <QuickAttendance />

      </div>
    </ProtectedRoute>
  );
}
