'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HodAssignments from '../../../../components/assignments/HodAssignments';
import TutorAssignments from '../../../../components/assignments/TutorAssignments';

export default function HodTutorPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HOD & Tutors</h1>
        <p className="text-muted-foreground">Assign Heads of Departments and Class Tutors.</p>
      </div>

      <Tabs defaultValue="hod">
        <TabsList>
          <TabsTrigger value="hod">HOD Assignments</TabsTrigger>
          <TabsTrigger value="tutors">Tutor Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="hod" className="mt-6"><HodAssignments /></TabsContent>
        <TabsContent value="tutors" className="mt-6"><TutorAssignments /></TabsContent>
      </Tabs>
    </div>
  );
}
