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
import { Edit2, Trash2 } from 'lucide-react';

const createDailySchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  change_date: z.string().min(1, 'Date is required'),
  original_period: z.number().int().positive('Original period is required'),
  new_period: z.number().int().positive().optional().or(z.literal('')),
  original_class_subject_id: z.number().int().positive('Original Subject is required'),
  new_class_subject_id: z.number().int().positive().optional().or(z.literal('')),
  change_type: z.string().min(1, 'Change type is required'),
  reason: z.string().optional().or(z.literal('')),
});

const updateDailySchema = z.object({
  new_period: z.number().int().positive().optional().or(z.literal('')),
  new_class_subject_id: z.number().int().positive().optional().or(z.literal('')),
  change_type: z.string().min(1).max(30).optional(),
  reason: z.string().optional().or(z.literal('')),
});

export default function DailyTimetableChanges() {
  const [changes, setChanges] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateDailySchema : createDailySchema),
    defaultValues: { change_type: 'SUBSTITUTION' }
  });

  const watchClassId = watch('class_id');
  const watchChangeType = watch('change_type');

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
      const [chRes, clsRes, csRes, subRes, tRes] = await Promise.all([
        timetableApi.getDaily(),
        classesApi.getClasses(),
        classSubjectsApi.getAll(),
        subjectsApi.getSubjects(),
        teachersApi.getTeachers()
      ]);
      setChanges(chRes.data.data);
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
      const payload = { ...data };
      if (!payload.reason) payload.reason = null;
      if (!payload.new_period || payload.new_period === '') payload.new_period = null;
      if (!payload.new_class_subject_id || payload.new_class_subject_id === '') payload.new_class_subject_id = null;

      if (isEditing && currentId) {
        await timetableApi.updateDaily(currentId, payload);
      } else {
        await timetableApi.createDaily(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editChange = (change: any) => {
    setIsEditing(true);
    setCurrentId(change.id);
    setSelectedClassId(change.class_id);
    reset({
      class_id: change.class_id, 
      change_date: change.change_date?.split('T')[0],
      original_period: change.original_period,
      new_period: change.new_period || '',
      original_class_subject_id: change.original_class_subject_id,
      new_class_subject_id: change.new_class_subject_id || '',
      change_type: change.change_type,
      reason: change.reason || '',
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ 
      class_id: 0, 
      change_date: '', 
      original_period: 1, 
      new_period: '', 
      original_class_subject_id: 0, 
      new_class_subject_id: '', 
      change_type: 'SUBSTITUTION', 
      reason: '' 
    });
    setError(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setError(null);
    try {
      await timetableApi.deleteDaily(deleteId);
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete change');
      setDeleteId(null);
    }
  };

  // Get active class subjects for the selected class to populate dropdown
  const availableSubjects = classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active);

  const getSubjectDisplay = (csId: number) => {
    const cs = classSubjects.find(c => c.id === csId);
    if (!cs) return 'Unknown Subject';
    const sub = subjects.find(s => s.id === cs.subject_id);
    const teacher = teachers.find(t => t.id === cs.teacher_id);
    return `${sub?.name} (${teacher ? teacher.first_name : 'No Teacher'})`;
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 flex flex-col gap-1 border border-blue-100">
        <span className="font-semibold">Important:</span>
        <span>Daily timetable changes are strictly isolated to a specific date and do <strong>not</strong> affect the regular recurring timetable. Use this for ad-hoc substitutions, period swaps, or cancellations.</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Daily Change' : 'Log Daily Timetable Change'}</h3>
        
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
            <label className="block text-sm font-medium text-gray-700">Date of Change</label>
            <input disabled={isEditing} type="date" {...register('change_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100" />
            {errors.change_date && <p className="text-red-500 text-xs mt-1">{errors.change_date.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Change Type</label>
            <select {...register('change_type')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value="SUBSTITUTION">Substitution</option>
              <option value="CANCELLATION">Cancellation</option>
              <option value="RESCHEDULING">Rescheduling</option>
            </select>
            {errors.change_type && <p className="text-red-500 text-xs mt-1">{errors.change_type.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Original Period Number</label>
            <input disabled={isEditing} type="number" min="1" {...register('original_period', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100" />
            {errors.original_period && <p className="text-red-500 text-xs mt-1">{errors.original_period.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Original Subject Assignment</label>
            <select disabled={isEditing} {...register('original_class_subject_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100">
              <option value={0}>Select...</option>
              {availableSubjects.map(cs => (
                <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
              ))}
            </select>
            {errors.original_class_subject_id && <p className="text-red-500 text-xs mt-1">{errors.original_class_subject_id.message as string}</p>}
          </div>

          {watchChangeType === 'SUBSTITUTION' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">New Subject Assignment (Substitution)</label>
              <select {...register('new_class_subject_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value="">Select...</option>
                {availableSubjects.map(cs => (
                  <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
                ))}
              </select>
              {errors.new_class_subject_id && <p className="text-red-500 text-xs mt-1">{errors.new_class_subject_id.message as string}</p>}
            </div>
          )}

          {watchChangeType === 'RESCHEDULING' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">New Period Number</label>
              <input type="number" min="1" {...register('new_period', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.new_period && <p className="text-red-500 text-xs mt-1">{errors.new_period.message as string}</p>}
            </div>
          )}

          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
            <input {...register('reason')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. Teacher on sick leave" />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message as string}</p>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Change' : 'Log Daily Change')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New (If Applicable)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : changes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No daily changes logged.</td></tr>
            ) : (
              // Sort by date descending
              [...changes].sort((a,b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime()).map(change => {
                const cls = classes.find(c => c.id === change.class_id);

                return (
                  <tr key={change.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>{change.change_date?.split('T')[0]}</div>
                      <div className="text-xs text-gray-500">{cls?.class_code || cls?.section_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {change.change_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Period {change.original_period}</div>
                      <div className="text-xs">{getSubjectDisplay(change.original_class_subject_id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {change.new_period && <div>Moved to P{change.new_period}</div>}
                      {change.new_class_subject_id && <div className="text-xs">{getSubjectDisplay(change.new_class_subject_id)}</div>}
                      {!change.new_period && !change.new_class_subject_id && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{change.reason || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editChange(change)} className="text-blue-600 hover:text-blue-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(change.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Daily Change</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this daily change? The timetable for this day will revert to the regular schedule.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
