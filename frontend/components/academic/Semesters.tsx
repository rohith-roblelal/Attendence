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

const semesterSchema = z.object({
  academic_year_id: z.number().int().positive('Academic Year is required'),
  semester_number: z.number().int().positive('Semester Number is required'),
  name: z.string().min(1, 'Name is required').max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
}).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
  message: "Start date must not be after end date",
  path: ["start_date"]
});

type SemesterFormData = z.infer<typeof semesterSchema>;

export default function Semesters() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SemesterFormData>({
    resolver: zodResolver(semesterSchema),
  });

const fetchData = async () => {
    setLoading(true);
    try {
      const [semRes, yearRes] = await Promise.all([
        academicApi.getSemesters(),
        academicApi.getAcademicYears()
      ]);
      setSemesters(semRes.data.data);
      setYears(yearRes.data.data);
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

  
  const onSubmit = async (data: SemesterFormData) => {
    setError(null);
    try {
      if (isEditing && currentId) {
        await academicApi.updateSemester(currentId, data);
      } else {
        await academicApi.createSemester(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editSem = (sem: any) => {
    setIsEditing(true);
    setCurrentId(sem.id);
    reset({
      academic_year_id: sem.academic_year_id,
      semester_number: sem.semester_number,
      name: sem.name,
      start_date: sem.start_date.split('T')[0],
      end_date: sem.end_date.split('T')[0],
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ academic_year_id: 0, semester_number: 1, name: '', start_date: '', end_date: '' });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit' : 'Create'} Semester</CardTitle>
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
                <Label htmlFor="semester_number">Semester Number</Label>
                <Input type="number" id="semester_number" {...register('semester_number', { valueAsNumber: true })} placeholder="e.g. 1" />
                {errors.semester_number && <p className="text-destructive text-xs mt-1">{errors.semester_number.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g. Fall 2026" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input type="date" id="start_date" {...register('start_date')} />
                  {errors.start_date && <p className="text-destructive text-xs mt-1">{errors.start_date.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input type="date" id="end_date" {...register('end_date')} />
                  {errors.end_date && <p className="text-destructive text-xs mt-1">{errors.end_date.message}</p>}
                </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Academic Year</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : semesters.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No semesters found.</TableCell></TableRow>
            ) : (
              semesters.map(sem => {
                const year = years.find(y => y.id === sem.academic_year_id);
                return (
                  <TableRow key={sem.id}>
                    <TableCell className="font-medium">{sem.name}</TableCell>
                    <TableCell>{sem.semester_number}</TableCell>
                    <TableCell>{year?.name}</TableCell>
                    <TableCell>{sem.start_date?.split('T')[0]}</TableCell>
                    <TableCell>{sem.end_date?.split('T')[0]}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" onClick={() => editSem(sem)}>Edit</Button>
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
