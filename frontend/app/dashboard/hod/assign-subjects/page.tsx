'use client';

import ClassSubjects from '../../../../components/assignments/ClassSubjects';

export default function HodAssignSubjectsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assign Subjects to Teachers</h1>
        <p className="text-muted-foreground">Assign subjects and permanent teachers to classes.</p>
      </div>

      <ClassSubjects />
    </div>
  );
}
