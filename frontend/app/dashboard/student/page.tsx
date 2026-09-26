'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';

export default function StudentDashboard() {
  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div>
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
        <p>Welcome to the Student dashboard. Here you can view your personal attendance reports.</p>
      </div>
    </ProtectedRoute>
  );
}
