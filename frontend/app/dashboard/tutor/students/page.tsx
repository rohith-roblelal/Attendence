'use client';

import Students from '../../../../components/people/Students';

export default function TutorStudentsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
        <p className="text-muted-foreground">Manage and view the students assigned to your class.</p>
      </div>
      <Students />
    </div>
  );
}
