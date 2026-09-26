'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { teachersApi } from '../../lib/api/teachers';
import { usersApi } from '../../lib/api/users';
import { Edit2, UserX } from 'lucide-react';

const createTeacherSchema = z.object({
  user_id: z.number().int().positive('User is required'),
  teacher_id: z.string().min(1, 'Teacher ID is required').max(30),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  joined_at: z.string().optional().or(z.literal('')),
});

const updateTeacherSchema = z.object({
  teacher_id: z.string().min(1).max(30).optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  joined_at: z.string().optional().or(z.literal('')),
  status: z.string().min(1).max(30).optional(),
});

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateTeacherSchema : createTeacherSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachRes, usersRes] = await Promise.all([
        teachersApi.getTeachers(),
        usersApi.getUsers()
      ]);
      setTeachers(teachRes.data.data);
      // Only keep users that are TEACHER or HOD to link a profile, and not already linked
      const allUsers = usersRes.data.data.users || [];
      const teacherUserIds = teachRes.data.data.map((t: any) => t.user_id);
      setUsers(allUsers.filter((u: any) => 
        (u.role === 'TEACHER' || u.role === 'HOD' || u.role === 'TUTOR') && 
        !teacherUserIds.includes(u.id)
      ));
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
      if (!payload.joined_at) delete payload.joined_at;
      if (!payload.last_name) payload.last_name = null;
      if (!payload.designation) payload.designation = null;

      if (isEditing && currentId) {
        await teachersApi.updateTeacher(currentId, payload);
      } else {
        await teachersApi.createTeacher(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editTeacher = (teacher: any) => {
    setIsEditing(true);
    setCurrentId(teacher.id);
    reset({
      teacher_id: teacher.teacher_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name || '',
      designation: teacher.designation || '',
      joined_at: teacher.joined_at ? teacher.joined_at.split('T')[0] : '',
      status: teacher.status,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ user_id: 0, teacher_id: '', first_name: '', last_name: '', designation: '', joined_at: '' });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await teachersApi.deactivateTeacher(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate teacher');
      setDeactivateId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Teacher Profile' : 'Create Teacher Profile'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Link to User Account</label>
              <select {...register('user_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value={0}>Select unlinked account...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
              {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id.message as string}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Teacher ID / Staff Code</label>
            <input {...register('teacher_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. T-1234" />
            {errors.teacher_id && <p className="text-red-500 text-xs mt-1">{errors.teacher_id.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input {...register('first_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name (Optional)</label>
            <input {...register('last_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Designation (Optional)</label>
            <input {...register('designation')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. Associate Professor" />
            {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Join Date (Optional)</label>
            <input type="date" {...register('joined_at')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.joined_at && <p className="text-red-500 text-xs mt-1">{errors.joined_at.message as string}</p>}
          </div>

          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select {...register('status')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
              </select>
              {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message as string}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Create Teacher')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : teachers.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No teachers found.</td></tr>
            ) : (
              teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.teacher_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.first_name} {teacher.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.designation || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.joined_at?.split('T')[0] || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => editTeacher(teacher)} className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {teacher.status === 'ACTIVE' ? (
                        <button onClick={() => setDeactivateId(teacher.id)} className="text-red-600 hover:text-red-900">
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

      {deactivateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deactivate Teacher</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate this teacher?
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
