'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { studentsApi } from '../../lib/api/students';
import { usersApi } from '../../lib/api/users';
import { classesApi } from '../../lib/api/classes';
import { Edit2, UserX, GitCommit } from 'lucide-react';

const createStudentSchema = z.object({
  user_id: z.number().int().positive('User is required'),
  student_id: z.string().min(1, 'Student ID is required').max(30),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  admission_number: z.string().max(50).optional().or(z.literal('')),
  joined_at: z.string().optional().or(z.literal('')),
  class_id: z.number().int().positive('Initial class is required').optional(),
});

const updateStudentSchema = z.object({
  student_id: z.string().min(1).max(30).optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  admission_number: z.string().max(50).optional().or(z.literal('')),
  joined_at: z.string().optional().or(z.literal('')),
  status: z.string().min(1).max(30).optional(),
});

const transferStudentSchema = z.object({
  class_id: z.number().int().positive('New Class is required'),
  transfer_reason: z.string().min(1, 'Transfer reason is required').max(255),
});

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateStudentSchema : createStudentSchema),
  });

  const { 
    register: registerTransfer, 
    handleSubmit: handleTransferSubmit, 
    reset: resetTransfer,
    formState: { errors: transferErrors, isSubmitting: isTransferring } 
  } = useForm<any>({
    resolver: zodResolver(transferStudentSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studRes, usersRes, classRes] = await Promise.all([
        studentsApi.getStudents(),
        usersApi.getUsers(),
        classesApi.getClasses()
      ]);
      setStudents(studRes.data.data);
      
      const allUsers = usersRes.data.data.users || [];
      const studentUserIds = studRes.data.data.map((s: any) => s.user_id);
      setUsers(allUsers.filter((u: any) => 
        u.role === 'STUDENT' && !studentUserIds.includes(u.id)
      ));
      
      setClasses(classRes.data.data);
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
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.joined_at) delete payload.joined_at;
      if (!payload.last_name) payload.last_name = null;
      if (!payload.admission_number) payload.admission_number = null;
      
      if (!isEditing && (!payload.class_id || payload.class_id === 0)) {
        delete payload.class_id;
      }

      if (isEditing && currentId) {
        await studentsApi.updateStudent(currentId, payload);
      } else {
        await studentsApi.createStudent(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const onTransferSubmit = async (data: any) => {
    if (!transferStudent) return;
    setError(null);
    try {
      await studentsApi.updateStudent(transferStudent.id, {
        class_id: data.class_id,
        transfer_reason: data.transfer_reason
      });
      setTransferStudent(null);
      resetTransfer();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer student');
    }
  };

  const editStudent = (student: any) => {
    setIsEditing(true);
    setCurrentId(student.id);
    reset({
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name || '',
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
      admission_number: student.admission_number || '',
      joined_at: student.joined_at ? student.joined_at.split('T')[0] : '',
      status: student.status,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ user_id: 0, student_id: '', first_name: '', last_name: '', class_id: 0, admission_number: '', date_of_birth: '', joined_at: '' });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await studentsApi.deactivateStudent(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate student');
      setDeactivateId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit Student Profile' : 'Create Student Profile'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isEditing && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Link to User Account</label>
              <select {...register('user_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value={0}>Select unlinked account...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
              {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id.message as string}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Student ID / Roll No</label>
            <input {...register('student_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. S-2026-001" />
            {errors.student_id && <p className="text-red-500 text-xs mt-1">{errors.student_id.message as string}</p>}
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Initial Class Enrollment</label>
              <select {...register('class_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value={0}>None...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                ))}
              </select>
              {errors.class_id && <p className="text-red-500 text-xs mt-1">{errors.class_id.message as string}</p>}
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700">Admission Number (Optional)</label>
            <input {...register('admission_number')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.admission_number && <p className="text-red-500 text-xs mt-1">{errors.admission_number.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth (Optional)</label>
            <input type="date" {...register('date_of_birth')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
            {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message as string}</p>}
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
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
              {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message as string}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student')}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Adm No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No students found.</td></tr>
            ) : (
              students.map(student => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>{student.student_id}</div>
                    <div className="text-xs text-gray-500">{student.admission_number || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.first_name} {student.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setTransferStudent(student)} className="text-purple-600 hover:text-purple-900" title="Transfer Class">
                        <GitCommit className="w-4 h-4" />
                      </button>
                      <button onClick={() => editStudent(student)} className="text-blue-600 hover:text-blue-900" title="Edit Profile">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {student.status === 'ACTIVE' ? (
                        <button onClick={() => setDeactivateId(student.id)} className="text-red-600 hover:text-red-900" title="Deactivate">
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

      {/* Deactivation Modal */}
      {deactivateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deactivate Student</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate this student?
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

      {/* Transfer Modal */}
      {transferStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Transfer Student Class</h3>
            <p className="text-sm text-gray-500 mb-4">
              Transferring <strong>{transferStudent.first_name} {transferStudent.last_name}</strong> to a new class. This will preserve their enrollment history.
            </p>
            <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Class</label>
                <select {...registerTransfer('class_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                  <option value={0}>Select new class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                  ))}
                </select>
                {transferErrors.class_id && <p className="text-red-500 text-xs mt-1">{transferErrors.class_id.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Transfer Reason</label>
                <textarea {...registerTransfer('transfer_reason')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" rows={3} placeholder="e.g. Moved to a different specialization"></textarea>
                {transferErrors.transfer_reason && <p className="text-red-500 text-xs mt-1">{transferErrors.transfer_reason.message as string}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setTransferStudent(null); resetTransfer(); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isTransferring}
                  className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
