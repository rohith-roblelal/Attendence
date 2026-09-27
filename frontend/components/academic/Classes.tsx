'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classesApi } from '../../lib/api/classes';
import { academicApi } from '../../lib/api/academic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const classSchema = z.object({
  admission_batch_id: z.number().int().positive('Batch is required'),
  semester_id: z.number().int().positive('Semester is required'),
  section_name: z.string().min(1, 'Section name is required').max(20),
  class_code: z.string().max(50).nullable().optional(),
  is_active: z.boolean().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: { is_active: true }
  });

const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, batchRes, semRes] = await Promise.all([
        classesApi.getClasses(),
        academicApi.getAdmissionBatches(),
        academicApi.getSemesters()
      ]);
      setClasses(classRes.data.data);
      setBatches(batchRes.data.data);
      setSemesters(semRes.data.data);
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

  
  const onSubmit = async (data: ClassFormData) => {
    setError(null);
    try {
      if (!data.class_code) {
        data.class_code = null;
      }
      
      if (isEditing && currentId) {
        await classesApi.updateClass(currentId, data);
      } else {
        await classesApi.createClass(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editClass = (cls: any) => {
    setIsEditing(true);
    setCurrentId(cls.id);
    reset({
      admission_batch_id: cls.admission_batch_id,
      semester_id: cls.semester_id,
      section_name: cls.section_name,
      class_code: cls.class_code || '',
      is_active: cls.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ admission_batch_id: 0, semester_id: 0, section_name: '', class_code: '', is_active: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Create'} Class</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admission_batch_id">Admission Batch</Label>
                <select id="admission_batch_id" {...register('admission_batch_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>Select...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_name}</option>
                  ))}
                </select>
                {errors.admission_batch_id && <p className="text-destructive text-xs mt-1">{errors.admission_batch_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester_id">Semester</Label>
                <select id="semester_id" {...register('semester_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>Select...</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.semester_number})</option>
                  ))}
                </select>
                {errors.semester_id && <p className="text-destructive text-xs mt-1">{errors.semester_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="section_name">Section Name</Label>
                <Input id="section_name" {...register('section_name')} placeholder="e.g. A" />
                {errors.section_name && <p className="text-destructive text-xs mt-1">{errors.section_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_code">Class Code (Optional)</Label>
                <Input id="class_code" {...register('class_code')} placeholder="e.g. CS-A" />
                {errors.class_code && <p className="text-destructive text-xs mt-1">{errors.class_code.message}</p>}
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input type="checkbox" id="class_is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-primary border-input rounded" />
                <Label htmlFor="class_is_active">Active</Label>
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
              <TableHead>Class Code</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : classes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No classes found.</TableCell></TableRow>
            ) : (
              classes.map(cls => {
                const batch = batches.find(b => b.id === cls.admission_batch_id);
                const sem = semesters.find(s => s.id === cls.semester_id);
                return (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.class_code || '-'}</TableCell>
                    <TableCell>{cls.section_name}</TableCell>
                    <TableCell className="text-muted-foreground">{batch?.batch_name}</TableCell>
                    <TableCell className="text-muted-foreground">{sem?.name}</TableCell>
                    <TableCell>
                      <Badge variant={cls.is_active ? "default" : "destructive"}>
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" onClick={() => editClass(cls)}>Edit</Button>
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
