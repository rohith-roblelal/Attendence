'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';

export default function HodDashboard() {
  return (
    <ProtectedRoute allowedRoles={['HOD']}>
      <div>
        <h1 className="text-2xl font-bold mb-4">HOD Dashboard</h1>
        <p>Welcome to the HOD dashboard. Here you can monitor your department&apos;s attendance.</p>
      </div>
    </ProtectedRoute>
  );
}
