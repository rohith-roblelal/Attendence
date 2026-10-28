'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AcademicYears from '../../../../components/academic/AcademicYears';
import Departments from '../../../../components/academic/Departments';
import Specializations from '../../../../components/academic/Specializations';
import AdmissionBatches from '../../../../components/academic/AdmissionBatches';
import Semesters from '../../../../components/academic/Semesters';
import Classes from '../../../../components/academic/Classes';

export default function AcademicStructurePage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academic Structure</h1>
        <p className="text-muted-foreground">Manage years, departments, specializations, batches, semesters and classes.</p>
      </div>

      <Tabs defaultValue="years">
        <TabsList>
          <TabsTrigger value="years">Academic Years</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="batches">Admission Batches</TabsTrigger>
          <TabsTrigger value="semesters">Semesters</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>
        <TabsContent value="years" className="mt-6"><AcademicYears /></TabsContent>
        <TabsContent value="departments" className="mt-6"><Departments /></TabsContent>
        <TabsContent value="specializations" className="mt-6"><Specializations /></TabsContent>
        <TabsContent value="batches" className="mt-6"><AdmissionBatches /></TabsContent>
        <TabsContent value="semesters" className="mt-6"><Semesters /></TabsContent>
        <TabsContent value="classes" className="mt-6"><Classes /></TabsContent>
      </Tabs>
    </div>
  );
}