'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';

export default function TeacherDashboard() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <div>
        <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>
        <p>Welcome to the Teacher dashboard. Manage your class sessions and attendance here.</p>
      </div>
    </ProtectedRoute>
  );
}
