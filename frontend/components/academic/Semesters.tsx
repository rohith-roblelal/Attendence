'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { academicApi } from '../../lib/api/academic';

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

  useEffect(() => {
    fetchData();
  }, []);

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
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} Semester</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select {...register('academic_year_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select...</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            {errors.academic_year_id && <p className="text-red-500 text-xs mt-1">{errors.academic_year_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Semester Number</label>
            <input type="number" {...register('semester_number', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. 1" />
            {errors.semester_number && <p className="text-red-500 text-xs mt-1">{errors.semester_number.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. Fall 2026" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : semesters.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No semesters found.</td></tr>
            ) : (
              semesters.map(sem => {
                const year = years.find(y => y.id === sem.academic_year_id);
                return (
                  <tr key={sem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sem.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.semester_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{year?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.start_date?.split('T')[0]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem.end_date?.split('T')[0]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => editSem(sem)} className="text-blue-600 hover:text-blue-900">Edit</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
