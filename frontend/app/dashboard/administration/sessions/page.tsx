'use client';

import ProtectedRoute from '../../../../components/ProtectedRoute';
import ClassSessions from '../../../../components/operations/ClassSessions';

export default function SessionsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Class Sessions Tracker</h1>
        <p className="text-gray-600 text-sm">
          Log and manage individual class sessions. This forms the basis for accurate attendance tracking.
        </p>

        <div className="mt-6">
          <ClassSessions />
        </div>
      </div>
    </ProtectedRoute>
  );
}
