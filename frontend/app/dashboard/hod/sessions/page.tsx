'use client';

import ClassSessions from '../../../../components/operations/ClassSessions';

export default function HodSessionsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Sessions</h1>
        <p className="text-muted-foreground">Log, schedule, and manage department class session instances.</p>
      </div>

      <ClassSessions />
    </div>
  );
}
