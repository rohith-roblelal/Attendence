'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Subjects from '../../../../components/academic/Subjects';
import ClassSubjects from '../../../../components/assignments/ClassSubjects';

export default function HodSubjectsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subject & Course Management</h1>
        <p className="text-muted-foreground">Manage department subjects and assign teachers to class subjects.</p>
      </div>

      <Tabs defaultValue="subjects">
        <TabsList>
          <TabsTrigger value="subjects">Subject Catalog</TabsTrigger>
          <TabsTrigger value="assignments">Assign to Classes</TabsTrigger>
        </TabsList>
        <TabsContent value="subjects" className="mt-6">
          <Subjects />
        </TabsContent>
        <TabsContent value="assignments" className="mt-6">
          <ClassSubjects />
        </TabsContent>
      </Tabs>
    </div>
  );
}
