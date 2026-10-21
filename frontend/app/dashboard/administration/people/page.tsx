'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Students from '../../../../components/people/Students';
import Teachers from '../../../../components/people/Teachers';
import Users from '../../../../components/people/Users';

export default function PeoplePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">People & Accounts</h1>
        <p className="text-muted-foreground">Manage student, teacher profiles, and user accounts.</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="users">User Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-6"><Students /></TabsContent>
        <TabsContent value="teachers" className="mt-6"><Teachers /></TabsContent>
        <TabsContent value="users" className="mt-6"><Users /></TabsContent>
      </Tabs>
    </div>
  );
}