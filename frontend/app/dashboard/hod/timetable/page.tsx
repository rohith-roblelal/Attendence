'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RegularTimetable from '../../../../components/timetable/RegularTimetable';
import DailyTimetableChanges from '../../../../components/timetable/DailyTimetableChanges';

export default function HodTimetablePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timetable Management</h1>
        <p className="text-muted-foreground">Manage the regular recurring weekly timetable and one-off daily schedule changes.</p>
      </div>

      <Tabs defaultValue="regular">
        <TabsList>
          <TabsTrigger value="regular">Regular Timetable</TabsTrigger>
          <TabsTrigger value="daily">Daily Changes</TabsTrigger>
        </TabsList>
        <TabsContent value="regular" className="mt-6"><RegularTimetable /></TabsContent>
        <TabsContent value="daily" className="mt-6"><DailyTimetableChanges /></TabsContent>
      </Tabs>
    </div>
  );
}
