'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Students from '../../../../components/people/Students';
import Teachers from '../../../../components/people/Teachers';

export default function PeoplePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Students & Teachers</h1>
        <p className="text-muted-foreground">Manage student and teacher profiles.</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-6"><Students /></TabsContent>
        <TabsContent value="teachers" className="mt-6"><Teachers /></TabsContent>
      </Tabs>
    </div>
  );
}