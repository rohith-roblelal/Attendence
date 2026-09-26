'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { tutorAssignmentsApi } from '../../lib/api/assignments';
import { classesApi } from '../../lib/api/classes';
import { teachersApi } from '../../lib/api/teachers';
import { Edit2, UserX } from 'lucide-react';

const createTutorSchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  teacher_id: z.number().int().positive('Teacher is required'),
  start_date: z.string().optional().or(z.literal('')),
});

const updateTutorSchema = z.object({
  end_date: z.string().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export default function TutorAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateTutorSchema : createTutorSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assnRes, classRes, teachRes] = await Promise.all([
        tutorAssignmentsApi.getAll(),
        classesApi.getClasses(),
        teachersApi.getTeachers()
      ]);
      setAssignments(assnRes.data.data);
      setClasses(classRes.data.data);
      setTeachers(teachRes.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      if (isEditing && currentId) {
        const payload = { ...data };
        if (!payload.end_date) delete payload.end_date;
        await tutorAssignmentsApi.update(currentId, payload);
      } else {
        const payload = { ...data };
        if (!payload.start_date) delete payload.start_date;
        await tutorAssignmentsApi.create(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editAssignment = (assn: any) => {
    setIsEditing(true);
    setCurrentId(assn.id);
    reset({
      end_date: assn.end_date ? assn.end_date.split('T')[0] : '',
      is_active: assn.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ class_id: 0, teacher_id: 0, start_date: '' });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await tutorAssignmentsApi.deactivate(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate assignment');
      setDeactivateId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Assignment Status/End Date' : 'Assign Class Tutor'}</h3>
        
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Class</label>
              <select {...register('class_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value={0}>Select...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                ))}
              </select>
              {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teacher (New Tutor)</label>
              <select {...register('teacher_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value={0}>Select...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
              {errors.teacher_id && <p className="text-red-500 text-xs mt-1">{errors.teacher_id.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date (Optional)</label>
              <input type="date" {...register('start_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date.message as string}</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" {...register('end_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date.message as string}</p>}
            </div>
            <div className="flex items-center mt-6">
              <input type="checkbox" id="tutor_is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="tutor_is_active" className="ml-2 block text-sm text-gray-900">Active</label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Assignment' : 'Assign Tutor')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutor Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No tutor assignments found.</td></tr>
            ) : (
              assignments.map(assn => {
                const cls = classes.find(c => c.id === assn.class_id);
                const teacher = teachers.find(t => t.id === assn.teacher_id);
                return (
                  <tr key={assn.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cls?.class_code || cls?.section_name || assn.class_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher ? `${teacher.first_name} ${teacher.last_name}` : assn.teacher_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col text-xs">
                        <span>Start: {assn.start_date?.split('T')[0] || '-'}</span>
                        <span>End: {assn.end_date?.split('T')[0] || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${assn.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {assn.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editAssignment(assn)} className="text-blue-600 hover:text-blue-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {assn.is_active ? (
                          <button onClick={() => setDeactivateId(assn.id)} className="text-red-600 hover:text-red-900">
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {deactivateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deactivate Assignment</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate this tutor assignment?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeactivateId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeactivate}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
