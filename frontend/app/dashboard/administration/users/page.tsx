'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { usersApi } from '../../../../lib/api/users';
import { Edit2, UserX, UserCheck } from 'lucide-react';

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT']),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: { role: 'STUDENT', is_active: true }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers();
      // admin.controller.ts returns { status: 'success', data: { users: [...] } }
      setUsers(res.data.data.users);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const payload = { ...data };
      if (!payload.email) payload.email = null;
      if (!payload.phone) payload.phone = null;
      if (isEditing && !payload.password) {
        delete payload.password; // Do not send empty password on update
      }

      if (isEditing && currentId) {
        await usersApi.updateUser(currentId, payload);
      } else {
        await usersApi.createUser(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editUser = (user: any) => {
    setIsEditing(true);
    setCurrentId(user.id);
    reset({
      username: user.username,
      password: '', // Never populate password
      role: user.role,
      email: user.email || '',
      phone: user.phone || '',
      is_active: user.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ username: '', password: '', role: 'STUDENT', email: '', phone: '', is_active: true });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setError(null);
    try {
      await usersApi.deactivateUser(deactivateId);
      setDeactivateId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
      setDeactivateId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} User</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input {...register('username')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username?.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password {isEditing && <span className="text-gray-400 font-normal">(Leave blank to keep unchanged)</span>}
              </label>
              <input type="password" {...register('password')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password?.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select {...register('role')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                <option value="ADMINISTRATION">ADMINISTRATION</option>
                <option value="HOD">HOD</option>
                <option value="TUTOR">TUTOR</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role?.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
              <input type="email" {...register('email')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email?.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
              <input type="text" {...register('phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone?.message as string}</p>}
            </div>

            {isEditing && (
              <div className="flex items-center mt-6">
                <input type="checkbox" id="user_is_active" {...register('is_active')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="user_is_active" className="ml-2 block text-sm text-gray-900">Account Active</label>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
            </button>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>{user.email || '-'}</span>
                        <span className="text-xs text-gray-400">{user.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editUser(user)} className="text-blue-600 hover:text-blue-900" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.is_active ? (
                          <button onClick={() => setDeactivateId(user.id)} className="text-red-600 hover:text-red-900" title="Deactivate">
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button disabled className="text-gray-300 cursor-not-allowed" title="Already Deactivated">
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

      {/* Deactivation Modal */}
      {deactivateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deactivate User</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate this user? They will immediately lose access to the system. This does not delete their records.
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
    </ProtectedRoute>
  );
}
