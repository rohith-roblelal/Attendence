'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { academicApi } from '../../lib/api/academic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const specializationSchema = z.object({
  department_id: z.number().int().positive('Department is required'),
  code: z.string().min(1, 'Code is required').max(30),
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

type SpecializationFormData = z.infer<typeof specializationSchema>;

export default function Specializations({ departmentId }: { departmentId?: number }) {
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SpecializationFormData>({
    resolver: zodResolver(specializationSchema),
    defaultValues: { is_active: true, department_id: departmentId || 0 }
  });

const fetchData = async () => {
    setLoading(true);
    try {
      const [specRes, deptRes] = await Promise.all([
        academicApi.getSpecializations(),
        academicApi.getDepartments()
      ]);
      
      let fetchedSpecs = specRes.data.data;
      if (departmentId) {
        fetchedSpecs = fetchedSpecs.filter((s: any) => s.department_id === departmentId);
      }
      setSpecializations(fetchedSpecs);
      setDepartments(deptRes.data.data);
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

  
  const onSubmit = async (data: SpecializationFormData) => {
    setError(null);
    try {
      if (isEditing && currentId) {
        await academicApi.updateSpecialization(currentId, data);
      } else {
        await academicApi.createSpecialization(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editSpec = (spec: any) => {
    setIsEditing(true);
    setCurrentId(spec.id);
    reset({
      department_id: spec.department_id,
      code: spec.code,
      name: spec.name,
      description: spec.description,
      is_active: spec.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ department_id: departmentId || 0, code: '', name: '', description: '', is_active: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Create'} Specialization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <select id="department_id" {...register('department_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>Select a department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                {errors.department_id && <p className="text-destructive text-xs mt-1">{errors.department_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" {...register('code')} placeholder="e.g. AI" />
                {errors.code && <p className="text-destructive text-xs mt-1">{errors.code.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g. Artificial Intelligence" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} rows={2} />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input type="checkbox" id="spec_is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-primary border-input rounded" />
                <Label htmlFor="spec_is_active">Active</Label>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : specializations.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No specializations found.</TableCell></TableRow>
            ) : (
              specializations.map(spec => {
                const dept = departments.find(d => d.id === spec.department_id);
                return (
                  <TableRow key={spec.id}>
                    <TableCell className="text-muted-foreground">{dept?.code || spec.department_id}</TableCell>
                    <TableCell className="font-medium">{spec.code}</TableCell>
                    <TableCell>{spec.name}</TableCell>
                    <TableCell>
                      <Badge variant={spec.is_active ? "default" : "destructive"}>
                        {spec.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" onClick={() => editSpec(spec)}>Edit</Button>
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
