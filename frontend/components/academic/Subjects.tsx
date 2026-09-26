'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { subjectsApi } from '../../lib/api/subjects';
import { Edit2, UserX } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const createSubjectSchema = z.object({
  code: z.string().min(1, 'Code is required').max(30),
  name: z.string().min(1, 'Name is required').max(150),
  subject_type: z.string().min(1, 'Type is required').max(30),
  default_contact_hours: z.number().nonnegative().optional(),
  credits: z.number().nonnegative().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export default function Subjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: { is_active: true, subject_type: 'THEORY' }
  });

const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await subjectsApi.getSubjects();
      setSubjects(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  
  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const payload = { ...data };
      if (!payload.default_contact_hours && payload.default_contact_hours !== 0) delete payload.default_contact_hours;
      if (!payload.credits && payload.credits !== 0) payload.credits = null;
      if (!payload.description) payload.description = null;

      if (isEditing && currentId) {
        await subjectsApi.updateSubject(currentId, payload);
      } else {
        await subjectsApi.createSubject(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editSubject = (sub: any) => {
    setIsEditing(true);
    setCurrentId(sub.id);
    reset({
      code: sub.code,
      name: sub.name,
      subject_type: sub.subject_type,
      default_contact_hours: sub.default_contact_hours || 0,
      credits: sub.credits || 0,
      description: sub.description || '',
      is_active: sub.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ code: '', name: '', subject_type: 'THEORY', default_contact_hours: 0, credits: 0, description: '', is_active: true });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await subjectsApi.deactivateSubject(deactivateId);
      setDeactivateId(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate subject');
      setDeactivateId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Subject' : 'Create Subject'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input {...register('code')} placeholder="e.g. CS101" />
                {errors.code && <p className="text-destructive text-xs mt-1">{errors.code.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input {...register('name')} placeholder="e.g. Introduction to Programming" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <select {...register('subject_type')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="THEORY">Theory</option>
                  <option value="PRACTICAL">Practical</option>
                  <option value="PROJECT">Project</option>
                  <option value="SEMINAR">Seminar</option>
                </select>
                {errors.subject_type && <p className="text-destructive text-xs mt-1">{errors.subject_type.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Credits</Label>
                <Input type="number" step="0.5" {...register('credits', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label>Contact Hours</Label>
                <Input type="number" {...register('default_contact_hours', { valueAsNumber: true })} />
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <Label>Description</Label>
                <textarea {...register('description')} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" rows={2} />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="sub_is_active" {...register('is_active')} />
                <Label htmlFor="sub_is_active">Active</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Subject' : 'Create Subject')}
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Credits / Hrs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : subjects.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No subjects found.</TableCell></TableRow>
            ) : (
              subjects.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.code}</TableCell>
                  <TableCell>{sub.name}</TableCell>
                  <TableCell className="text-muted-foreground">{sub.subject_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.credits || '-'} / {sub.default_contact_hours || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.is_active ? "default" : "destructive"}>
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => editSubject(sub)} className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {sub.is_active ? (
                        <button onClick={() => setDeactivateId(sub.id)} className="text-red-600 hover:text-red-900">
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button disabled className="text-gray-300 cursor-not-allowed">
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this subject?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
