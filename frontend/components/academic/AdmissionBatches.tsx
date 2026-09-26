'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { academicApi } from '../../lib/api/academic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const admissionBatchSchema = z.object({
  academic_year_id: z.number().int().positive('Academic Year is required'),
  department_id: z.number().int().positive('Department is required'),
  specialization_id: z.number().int().positive().nullable().optional(),
  batch_name: z.string().min(1, 'Name is required').max(50),
  admission_year: z.number().int().min(2000).max(2100),
});

type AdmissionBatchFormData = z.infer<typeof admissionBatchSchema>;

export default function AdmissionBatches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<AdmissionBatchFormData>({
    resolver: zodResolver(admissionBatchSchema),
  });

  const selectedDeptId = watch('department_id');

const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, yearRes, deptRes, specRes] = await Promise.all([
        academicApi.getAdmissionBatches(),
        academicApi.getAcademicYears(),
        academicApi.getDepartments(),
        academicApi.getSpecializations()
      ]);
      setBatches(batchRes.data.data);
      setYears(yearRes.data.data);
      setDepartments(deptRes.data.data);
      setSpecializations(specRes.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  
  const onSubmit = async (data: AdmissionBatchFormData) => {
    setError(null);
    try {
      if (data.specialization_id === 0 || !data.specialization_id) {
        data.specialization_id = null;
      }
      
      if (isEditing && currentId) {
        await academicApi.updateAdmissionBatch(currentId, data);
      } else {
        await academicApi.createAdmissionBatch(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editBatch = (batch: any) => {
    setIsEditing(true);
    setCurrentId(batch.id);
    reset({
      academic_year_id: batch.academic_year_id,
      department_id: batch.department_id,
      specialization_id: batch.specialization_id || 0,
      batch_name: batch.batch_name,
      admission_year: batch.admission_year,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ academic_year_id: 0, department_id: 0, specialization_id: 0, batch_name: '', admission_year: new Date().getFullYear() });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Create'} Admission Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academic_year_id">Academic Year</Label>
                <select id="academic_year_id" {...register('academic_year_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>Select...</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
                {errors.academic_year_id && <p className="text-destructive text-xs mt-1">{errors.academic_year_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <select id="department_id" {...register('department_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>Select...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.department_id && <p className="text-destructive text-xs mt-1">{errors.department_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization_id">Specialization (Optional)</Label>
                <select id="specialization_id" {...register('specialization_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>None</option>
                  {specializations.filter(s => s.department_id === selectedDeptId).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.specialization_id && <p className="text-destructive text-xs mt-1">{errors.specialization_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch_name">Batch Name</Label>
                <Input id="batch_name" {...register('batch_name')} placeholder="e.g. 2026-2030 CS" />
                {errors.batch_name && <p className="text-destructive text-xs mt-1">{errors.batch_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admission_year">Admission Year</Label>
                <Input type="number" id="admission_year" {...register('admission_year', { valueAsNumber: true })} placeholder="e.g. 2026" />
                {errors.admission_year && <p className="text-destructive text-xs mt-1">{errors.admission_year.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : batches.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No batches found.</TableCell></TableRow>
            ) : (
              batches.map(batch => {
                const dept = departments.find(d => d.id === batch.department_id);
                const spec = specializations.find(s => s.id === batch.specialization_id);
                return (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_name}</TableCell>
                    <TableCell>{batch.admission_year}</TableCell>
                    <TableCell className="text-muted-foreground">{dept?.code}</TableCell>
                    <TableCell className="text-muted-foreground">{spec ? spec.code : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" onClick={() => editBatch(batch)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
