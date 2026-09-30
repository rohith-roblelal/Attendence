'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { academicApi } from '../../lib/api/academic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const academicYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  is_active: z.boolean().optional(),
}).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
  message: "Start date must not be after end date",
  path: ["start_date"]
});

type AcademicYearFormData = z.infer<typeof academicYearSchema>;

export default function AcademicYears() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { is_active: true }
  });

const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await academicApi.getAcademicYears();
      setYears(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  
  const onSubmit = async (data: AcademicYearFormData) => {
    setError(null);
    try {
      if (isEditing && currentId) {
        await academicApi.updateAcademicYear(currentId, data);
      } else {
        await academicApi.createAcademicYear(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchYears();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const deleteYear = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this academic year?")) return;
    setError(null);
    try {
      await academicApi.deleteAcademicYear(id);
      fetchYears();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete academic year');
    }
  };

  const editYear = (year: any) => {
    setIsEditing(true);
    setCurrentId(year.id);
    reset({
      name: year.name,
      start_date: year.start_date.split('T')[0],
      end_date: year.end_date.split('T')[0],
      is_active: year.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ name: '', start_date: '', end_date: '', is_active: true });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card text-card-foreground p-4 rounded shadow-sm border border-border space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} Academic Year</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Name</label>
            <input {...register('name')} className="mt-1 block w-full rounded-md border-border/50 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2" placeholder="e.g. 2026-2027" />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground">Start Date</label>
            <input type="date" {...register('start_date')} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2" />
            {errors.start_date && <p className="text-destructive text-xs mt-1">{errors.start_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">End Date</label>
            <input type="date" {...register('end_date')} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2" />
            {errors.end_date && <p className="text-destructive text-xs mt-1">{errors.end_date.message}</p>}
          </div>

          <div className="flex items-center mt-6">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-ring border-border/60 rounded" />
            <label htmlFor="is_active" className="ml-2 block text-sm text-foreground">Active</label>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground text-white px-4 py-2 rounded text-sm hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </button>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="bg-muted text-foreground px-4 py-2 rounded text-sm hover:bg-gray-300">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-card text-card-foreground rounded shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">End</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card text-card-foreground divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : years.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">No academic years found.</td></tr>
            ) : (
              years.map(year => (
                <tr key={year.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{year.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{year.start_date?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{year.end_date?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${year.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {year.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => editYear(year)} className="text-primary hover:text-primary">Edit</button>
                    <button onClick={() => deleteYear(year.id)} className="text-destructive hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
