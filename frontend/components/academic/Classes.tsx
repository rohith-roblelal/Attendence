'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classesApi } from '../../lib/api/classes';
import { academicApi } from '../../lib/api/academic';

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

  useEffect(() => {
    fetchData();
  }, []);

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
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} Class</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Admission Batch</label>
            <select {...register('admission_batch_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select...</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_name}</option>
              ))}
            </select>
            {errors.admission_batch_id && <p className="text-red-500 text-xs mt-1">{errors.admission_batch_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <select {...register('semester_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select...</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.semester_number})</option>
              ))}
            </select>
            {errors.semester_id && <p className="text-red-500 text-xs mt-1">{errors.semester_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Section Name</label>
            <input {...register('section_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. A" />
            {errors.section_name && <p className="text-red-500 text-xs mt-1">{errors.section_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Class Code (Optional)</label>
            <input {...register('class_code')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. CS-A" />
            {errors.class_code && <p className="text-red-500 text-xs mt-1">{errors.class_code.message}</p>}
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="class_is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="class_is_active" className="ml-2 block text-sm text-gray-900">Active</label>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : classes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No classes found.</td></tr>
            ) : (
              classes.map(cls => {
                const batch = batches.find(b => b.id === cls.admission_batch_id);
                const sem = semesters.find(s => s.id === cls.semester_id);
                return (
                  <tr key={cls.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cls.class_code || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls.section_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch?.batch_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sem?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {cls.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => editClass(cls)} className="text-blue-600 hover:text-blue-900">Edit</button>
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
