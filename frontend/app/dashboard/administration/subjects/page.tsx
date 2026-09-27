'use client';

import Subjects from '../../../../components/academic/Subjects';

export default function SubjectsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <p className="text-muted-foreground">Manage academic subjects and courses.</p>
      </div>
      <Subjects />
    </div>
  );
}
