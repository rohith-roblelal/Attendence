'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { timetableApi } from '../../lib/api/timetable';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { teachersApi } from '../../lib/api/teachers';
import { Edit2, UserX } from 'lucide-react';

const createRegularSchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  day_of_week: z.number().int().min(1, 'Day is required').max(7),
  period_number: z.number().int().positive('Period is required'),
  class_subject_id: z.number().int().positive('Subject Assignment is required'),
});

const updateRegularSchema = z.object({
  class_subject_id: z.number().int().positive('Subject Assignment is required').optional(),
  is_active: z.boolean().optional(),
});

export default function RegularTimetable() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateRegularSchema : createRegularSchema),
  });

  const watchClassId = watch('class_id');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (watchClassId) {
      setSelectedClassId(Number(watchClassId));
    }
  }, [watchClassId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ttRes, clsRes, csRes, subRes, tRes] = await Promise.all([
        timetableApi.getRegular(),
        classesApi.getClasses(),
        classSubjectsApi.getAll(),
        subjectsApi.getSubjects(),
        teachersApi.getTeachers()
      ]);
      setTimetable(ttRes.data.data);
      setClasses(clsRes.data.data);
      setClassSubjects(csRes.data.data);
      setSubjects(subRes.data.data);
      setTeachers(tRes.data.data);
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
        const payload = { 
          class_subject_id: data.class_subject_id,
          is_active: data.is_active
        };
        await timetableApi.updateRegular(currentId, payload);
      } else {
        await timetableApi.createRegular(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editEntry = (entry: any) => {
    setIsEditing(true);
    setCurrentId(entry.id);
    setSelectedClassId(entry.class_id);
    reset({
      class_id: entry.class_id, // For display purposes, form uses class_id internally but doesn't patch it
      day_of_week: entry.day_of_week,
      period_number: entry.period_number,
      class_subject_id: entry.class_subject_id,
      is_active: entry.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ class_id: 0, day_of_week: 1, period_number: 1, class_subject_id: 0, is_active: true });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await timetableApi.deactivateRegular(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate entry');
      setDeactivateId(null);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get active class subjects for the selected class to populate dropdown
  const availableSubjects = classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active);

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Class</label>
            <select disabled={isEditing} {...register('class_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100">
              <option value={0}>Select...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
              ))}
            </select>
            {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Day</label>
            <select disabled={isEditing} {...register('day_of_week', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100">
              {days.map((day, idx) => (
                <option key={idx + 1} value={idx + 1}>{day}</option>
              ))}
            </select>
            {errors.day_of_week && <p className="text-red-500 text-xs mt-1">{errors.day_of_week.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Period Number</label>
            <input disabled={isEditing} type="number" min="1" {...register('period_number', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100" />
            {errors.period_number && <p className="text-red-500 text-xs mt-1">{errors.period_number.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Subject Assignment</label>
            <select {...register('class_subject_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select subject...</option>
              {availableSubjects.map(cs => {
                const sub = subjects.find(s => s.id === cs.subject_id);
                const teacher = teachers.find(t => t.id === cs.teacher_id);
                return (
                  <option key={cs.id} value={cs.id}>
                    {sub?.name} ({teacher ? `${teacher.first_name}` : 'No Teacher'})
                  </option>
                )
              })}
            </select>
            {errors.class_subject_id && <p className="text-red-500 text-xs mt-1">{errors.class_subject_id.message as string}</p>}
          </div>

          {isEditing && (
            <div className="flex items-center mt-6">
              <input type="checkbox" id="tt_is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="tt_is_active" className="ml-2 block text-sm text-gray-900">Active</label>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Entry' : 'Add Entry')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject & Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : timetable.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No regular timetable entries found.</td></tr>
            ) : (
              // Sort by class_id, day, period
              [...timetable].sort((a,b) => a.class_id - b.class_id || a.day_of_week - b.day_of_week || a.period_number - b.period_number).map(entry => {
                const cls = classes.find(c => c.id === entry.class_id);
                const cs = classSubjects.find(c => c.id === entry.class_subject_id);
                const sub = cs ? subjects.find(s => s.id === cs.subject_id) : null;
                const teacher = cs ? teachers.find(t => t.id === cs.teacher_id) : null;

                return (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cls?.class_code || cls?.section_name || entry.class_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{days[entry.day_of_week - 1]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">P{entry.period_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{sub?.name || 'Unknown Subject'}</div>
                      <div className="text-xs text-gray-400">{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editEntry(entry)} className="text-blue-600 hover:text-blue-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {entry.is_active ? (
                          <button onClick={() => setDeactivateId(entry.id)} className="text-red-600 hover:text-red-900">
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deactivate Entry</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate this timetable entry?
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
