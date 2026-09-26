'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { subjectsApi } from '../../lib/api/subjects';
import { Edit2, UserX } from 'lucide-react';

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: { is_active: true, subject_type: 'THEORY' }
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

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

  const handleDeactivate = async (id: number) => {
    setError(null);
    try {
      await subjectsApi.deactivateSubject(id);
      fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate subject');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Subject' : 'Create Subject'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject Code</label>
            <input {...register('code')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. CS101" />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Subject Name</label>
            <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. Introduction to Programming" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select {...register('subject_type')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value="THEORY">Theory</option>
              <option value="PRACTICAL">Practical</option>
              <option value="PROJECT">Project</option>
              <option value="SEMINAR">Seminar</option>
            </select>
            {errors.subject_type && <p className="text-red-500 text-xs mt-1">{errors.subject_type.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Credits</label>
            <input type="number" step="0.5" {...register('credits', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Hours</label>
            <input type="number" {...register('default_contact_hours', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea {...register('description')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" rows={2} />
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="sub_is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="sub_is_active" className="ml-2 block text-sm text-gray-900">Active</label>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Subject' : 'Create Subject')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits / Hrs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No subjects found.</td></tr>
            ) : (
              subjects.map(sub => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{sub.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.subject_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sub.credits || '-'} / {sub.default_contact_hours || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => editSubject(sub)} className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {sub.is_active ? (
                        <button onClick={() => { if (confirm('Are you sure you want to deactivate this subject?')) handleDeactivate(sub.id); }} className="text-red-600 hover:text-red-900">
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button disabled className="text-gray-300 cursor-not-allowed">
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
