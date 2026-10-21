'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { hodAssignmentsApi } from '../../lib/api/assignments';
import { academicApi } from '../../lib/api/academic';
import { teachersApi } from '../../lib/api/teachers';
import { Edit2, UserX } from 'lucide-react';

const createHodSchema = z.object({
  department_id: z.number().int().positive('Department is required'),
  teacher_id: z.number().int().positive('Teacher is required'),
  start_date: z.string().optional().or(z.literal('')),
});

const updateHodSchema = z.object({
  end_date: z.string().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export default function HodAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateHodSchema : createHodSchema),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assnRes, deptRes, teachRes] = await Promise.all([
        hodAssignmentsApi.getAll(),
        academicApi.getDepartments(),
        teachersApi.getTeachers(),
      ]);
      setAssignments(assnRes.data.data);
      setDepartments(deptRes.data.data);
      setTeachers(teachRes.data.data);
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

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      if (isEditing && currentId) {
        const payload = { ...data };
        if (!payload.end_date) delete payload.end_date;
        await hodAssignmentsApi.update(currentId, payload);
      } else {
        const payload = { ...data };
        if (!payload.start_date) delete payload.start_date;
        await hodAssignmentsApi.create(payload);
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
    reset({ department_id: 0, teacher_id: 0, start_date: '' });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await hodAssignmentsApi.deactivate(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate assignment');
      setDeactivateId(null);
    }
  };

  // Find departments that already have an active HOD
  const activeHodDeptIds = new Set(
    assignments.filter(a => a.is_active).map(a => Number(a.department_id))
  );

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card text-card-foreground p-4 rounded shadow-sm border border-border space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{isEditing ? 'Edit Assignment Status/End Date' : 'Assign Department Head (HOD)'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each department has exactly one active HOD responsible for all academic years, semesters, and classes.
          </p>
        </div>
        
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Department</label>
              <select {...register('department_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2">
                <option value={0}>Select Department...</option>
                {departments.map(d => {
                  const hasActive = activeHodDeptIds.has(d.id);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} {hasActive ? '(Replaces active HOD)' : ''}
                    </option>
                  );
                })}
              </select>
              {errors.department_id && <p className="text-destructive text-xs mt-1">{errors.department_id.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Faculty Member (HOD)</label>
              <select {...register('teacher_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2">
                <option value={0}>Select Faculty...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.teacher_id})</option>
                ))}
              </select>
              {errors.teacher_id && <p className="text-destructive text-xs mt-1">{errors.teacher_id.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Start Date (Optional)</label>
              <input type="date" {...register('start_date')} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2" />
              {errors.start_date && <p className="text-destructive text-xs mt-1">{errors.start_date.message as string}</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">End Date</label>
              <input type="date" {...register('end_date')} className="mt-1 block w-full rounded-md border-border/60 shadow-sm focus:border-primary focus:ring-ring sm:text-sm border p-2" />
              {errors.end_date && <p className="text-destructive text-xs mt-1">{errors.end_date.message as string}</p>}
            </div>
            <div className="flex items-center mt-6">
              <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-ring border-border/60 rounded" />
              <label htmlFor="is_active" className="ml-2 block text-sm text-foreground">Active HOD</label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground text-white px-4 py-2 rounded text-sm hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Assignment' : 'Assign HOD to Department')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">HOD Faculty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenure Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card text-card-foreground divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">Loading assignments...</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">No HOD assignments found.</td></tr>
            ) : (
              assignments.map(assn => {
                const dept = departments.find(d => d.id === assn.department_id);
                const teacher = teachers.find(t => t.id === assn.teacher_id);
                return (
                  <tr key={assn.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{dept?.name || `Dept #${assn.department_id}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium">{teacher ? `${teacher.first_name} ${teacher.last_name}` : `Teacher #${assn.teacher_id}`}</span>
                        {teacher?.teacher_id && <span className="text-xs text-muted-foreground">{teacher.teacher_id}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Entire Department</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex flex-col text-xs">
                        <span>From: {assn.start_date?.split('T')[0] || '-'}</span>
                        <span>To: {assn.end_date ? assn.end_date.split('T')[0] : 'Present'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${assn.is_active ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                        {assn.is_active ? 'Active HOD' : 'Former HOD'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editAssignment(assn)} className="text-primary hover:text-primary" title="Edit status">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {assn.is_active ? (
                          <button onClick={() => setDeactivateId(assn.id)} className="text-destructive hover:text-red-900" title="Deactivate HOD">
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
          <div className="bg-card text-card-foreground p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Deactivate Assignment</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to deactivate this HOD assignment?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeactivateId(null)}
                className="px-4 py-2 text-sm text-foreground bg-muted hover:bg-muted rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeactivate}
                className="px-4 py-2 text-sm text-white bg-destructive hover:bg-red-700 rounded-md"
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
