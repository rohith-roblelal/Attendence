'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';

export default function TutorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['TUTOR']}>
      <div>
        <h1 className="text-2xl font-bold mb-4">Tutor Dashboard</h1>
        <p>Welcome to the Tutor dashboard. Here you can monitor your assigned class's performance.</p>
      </div>
    </ProtectedRoute>
  );
}
