'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { usersApi } from '../../../../lib/api/users';
import { Edit2, UserX, UserCheck } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers();
      setUsers(res.data.data.users);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>

        {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit' : 'Create'} User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input {...register('username')} />
                  {errors.username && <p className="text-destructive text-xs mt-1">{errors.username?.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>
                    Password {isEditing && <span className="text-muted-foreground font-normal">(Leave blank to keep unchanged)</span>}
                  </Label>
                  <Input type="password" {...register('password')} />
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password?.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <select {...register('role')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="ADMINISTRATION">ADMINISTRATION</option>
                    <option value="HOD">HOD</option>
                    <option value="TUTOR">TUTOR</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="STUDENT">STUDENT</option>
                  </select>
                  {errors.role && <p className="text-destructive text-xs mt-1">{errors.role?.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input type="email" {...register('email')} />
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email?.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input type="text" {...register('phone')} />
                  {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone?.message as string}</p>}
                </div>

                {isEditing && (
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox id="user_is_active" {...register('is_active')} />
                    <Label htmlFor="user_is_active">Account Active</Label>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{user.email || '-'}</span>
                        <span className="text-xs">{user.phone || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this user? They will immediately lose access to the system. This does not delete their records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
