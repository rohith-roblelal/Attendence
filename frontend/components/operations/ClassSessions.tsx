'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { classSessionsApi } from '../../lib/api/class-sessions';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { teachersApi } from '../../lib/api/teachers';
import { Edit2, XCircle } from 'lucide-react';

const createSessionSchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  class_subject_id: z.number().int().positive('Subject Assignment is required'),
  session_date: z.string().min(1, 'Date is required'),
  period_number: z.number().int().positive('Period is required'),
  conducted_by_teacher_id: z.number().int().positive().optional().or(z.literal('')),
  contact_hours: z.number().positive().optional().or(z.literal('')),
  status: z.string().min(1).max(30),
  source: z.string().min(1).max(30),
});

const updateSessionSchema = z.object({
  conducted_by_teacher_id: z.number().int().positive().optional().or(z.literal('')),
  contact_hours: z.number().positive().optional().or(z.literal('')),
  status: z.string().min(1).max(30).optional(),
  source: z.string().min(1).max(30).optional(),
});

export default function ClassSessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateSessionSchema : createSessionSchema),
    defaultValues: { status: 'SCHEDULED', source: 'MANUAL', contact_hours: 1 }
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
      const [sessRes, clsRes, csRes, subRes, tRes] = await Promise.all([
        classSessionsApi.getAll(),
        classesApi.getClasses(),
        classSubjectsApi.getAll(),
        subjectsApi.getSubjects(),
        teachersApi.getTeachers()
      ]);
      setSessions(sessRes.data.data);
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
      if (!payload.conducted_by_teacher_id || payload.conducted_by_teacher_id === '') delete payload.conducted_by_teacher_id;
      if (!payload.contact_hours || payload.contact_hours === '') delete payload.contact_hours;

      if (isEditing && currentId) {
        await classSessionsApi.update(currentId, payload);
      } else {
        await classSessionsApi.create(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editSession = (session: any) => {
    setIsEditing(true);
    setCurrentId(session.id);
    setSelectedClassId(session.class_id);
    reset({
      class_id: session.class_id, 
      class_subject_id: session.class_subject_id,
      session_date: session.session_date?.split('T')[0],
      period_number: session.period_number,
      conducted_by_teacher_id: session.conducted_by_teacher_id || '',
      contact_hours: session.contact_hours || 1,
      status: session.status,
      source: session.source,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ 
      class_id: 0, 
      class_subject_id: 0,
      session_date: '', 
      period_number: 1, 
      conducted_by_teacher_id: '', 
      contact_hours: 1, 
      status: 'SCHEDULED', 
      source: 'MANUAL' 
    });
    setError(null);
  };

  const handleCancelSession = async () => {
    if (!cancelId) return;
    setError(null);
    try {
      await classSessionsApi.cancel(cancelId);
      setCancelId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel session');
      setCancelId(null);
    }
  };

  // Get active class subjects for the selected class to populate dropdown
  const availableSubjects = classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active);

  const getSubjectDisplay = (csId: number) => {
    const cs = classSubjects.find(c => c.id === csId);
    if (!cs) return 'Unknown Subject';
    const sub = subjects.find(s => s.id === cs.subject_id);
    const teacher = teachers.find(t => t.id === cs.teacher_id);
    return `${sub?.name} (Permanent: ${teacher ? teacher.first_name : 'None'})`;
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 flex flex-col gap-1 border border-blue-100">
        <span className="font-semibold">Important:</span>
        <span>The <strong>Permanent Teacher</strong> is derived from the Class-Subject assignment. You may record a different <strong>Conducting Teacher</strong> here (e.g. for a substitution) without changing the permanent assignment. Cancelled sessions remain in the database for historical integrity but are excluded from attendance.</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Session' : 'Record Class Session'}</h3>
        
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

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Subject (Shows Permanent Teacher)</label>
            <select disabled={isEditing} {...register('class_subject_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100">
              <option value={0}>Select...</option>
              {availableSubjects.map(cs => (
                <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
              ))}
            </select>
            {errors.class_subject_id && <p className="text-red-500 text-xs mt-1">{errors.class_subject_id.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input disabled={isEditing} type="date" {...register('session_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100" />
            {errors.session_date && <p className="text-red-500 text-xs mt-1">{errors.session_date.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Period Number</label>
            <input disabled={isEditing} type="number" min="1" {...register('period_number', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100" />
            {errors.period_number && <p className="text-red-500 text-xs mt-1">{errors.period_number.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Actually Conducted By</label>
            <select {...register('conducted_by_teacher_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value="">(Use Permanent Teacher)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
            {errors.conducted_by_teacher_id && <p className="text-red-500 text-xs mt-1">{errors.conducted_by_teacher_id.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Hours</label>
            <input type="number" step="0.5" {...register('contact_hours', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Session' : 'Record Session')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conducted By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No sessions logged.</td></tr>
            ) : (
              // Sort by date descending, then period
              [...sessions].sort((a,b) => {
                const dateDiff = new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
                if (dateDiff !== 0) return dateDiff;
                return a.period_number - b.period_number;
              }).map(session => {
                const cls = classes.find(c => c.id === session.class_id);
                const cs = classSubjects.find(c => c.id === session.class_subject_id);
                const sub = cs ? subjects.find(s => s.id === cs.subject_id) : null;
                const permanentTeacher = cs ? teachers.find(t => t.id === cs.teacher_id) : null;
                const conductedTeacher = session.conducted_by_teacher_id ? teachers.find(t => t.id === session.conducted_by_teacher_id) : permanentTeacher;

                return (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>{session.session_date?.split('T')[0]}</div>
                      <div className="text-xs text-gray-500">{cls?.class_code || cls?.section_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      P{session.period_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{sub?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">Perm: {permanentTeacher ? permanentTeacher.first_name : 'None'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className={session.conducted_by_teacher_id ? "text-purple-600 font-medium" : ""}>
                        {conductedTeacher ? `${conductedTeacher.first_name} ${conductedTeacher.last_name}` : 'Unknown'}
                      </div>
                      {session.conducted_by_teacher_id && <div className="text-xs text-purple-400">(Substitute)</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          session.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editSession(session)} className="text-blue-600 hover:text-blue-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {session.status !== 'CANCELLED' ? (
                          <button onClick={() => setCancelId(session.id)} className="text-red-600 hover:text-red-900" title="Cancel Session">
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button disabled className="text-gray-300 cursor-not-allowed">
                            <XCircle className="w-4 h-4" />
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

      {cancelId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Session</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to cancel this session? The record will be kept for historical integrity, but it will be excluded from attendance.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCancelId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Go Back
              </button>
              <button 
                onClick={handleCancelSession}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
