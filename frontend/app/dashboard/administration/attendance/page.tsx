'use client';

import ProtectedRoute from '../../../../components/ProtectedRoute';
import AttendanceTracker from '../../../../components/operations/AttendanceTracker';

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 text-sm">
          Mark and manage attendance against specific class sessions.
        </p>

        <div className="mt-6">
          <AttendanceTracker />
        </div>
      </div>
    </ProtectedRoute>
  );
}
