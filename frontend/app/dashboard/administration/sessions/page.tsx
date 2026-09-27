'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClassSessions from '../../../../components/operations/ClassSessions';
import ClassSubjects from '../../../../components/assignments/ClassSubjects';

export default function SessionsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Sessions</h1>
        <p className="text-muted-foreground">Assign subjects to classes and record individual session instances.</p>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="assignments">Class-Subject Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="mt-6"><ClassSessions /></TabsContent>
        <TabsContent value="assignments" className="mt-6"><ClassSubjects /></TabsContent>
      </Tabs>
    </div>
  );
}