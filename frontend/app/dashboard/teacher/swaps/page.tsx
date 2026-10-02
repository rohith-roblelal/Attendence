'use client';
import SwapRequests from '../../../../components/timetable/SwapRequests';
import ProtectedRoute from '../../../../components/ProtectedRoute';

export default function SwapRequestsPage() {
  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'HOD', 'TUTOR']}>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Swap Requests</h1>
          <p className="text-muted-foreground">Request and manage period swaps with other teachers.</p>
        </div>
        <SwapRequests />
      </div>
    </ProtectedRoute>
  );
}
