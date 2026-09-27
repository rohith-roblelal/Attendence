'use client';

import ClassSessions from '../../../../components/operations/ClassSessions';

export default function MySessionsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
        <p className="text-muted-foreground">Manage your scheduled class sessions.</p>
      </div>
      <ClassSessions />
    </div>
  );
}
