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
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} Academic Year</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. 2026-2027" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input type="date" {...register('start_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input type="date" {...register('end_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>}
          </div>

          <div className="flex items-center mt-6">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Active</label>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </button>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : years.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No academic years found.</td></tr>
            ) : (
              years.map(year => (
                <tr key={year.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{year.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{year.start_date?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{year.end_date?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${year.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {year.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => editYear(year)} className="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onClick={() => deleteYear(year.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
