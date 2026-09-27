'use client';

import RegularTimetable from '../../../../components/timetable/RegularTimetable';

export default function TeacherTimetablePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
        <p className="text-muted-foreground">View your weekly teaching schedule.</p>
      </div>
      <RegularTimetable />
    </div>
  );
}
