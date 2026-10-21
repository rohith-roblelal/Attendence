'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usersApi } from '../../lib/api/users';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ROLES = ['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT'];

const createUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required'),
});

const updateUserSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  role: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: { role: 'STUDENT' }
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers();
      setUsers(res.data.data.users || res.data.data || []);
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
      if (isEditing && currentId) {
        await usersApi.updateUser(currentId, data);
      } else {
        await usersApi.createUser(data);
      }
      reset({ username: '', password: '', role: 'STUDENT' });
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
      role: user.role,
      is_active: user.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ username: '', password: '', role: 'STUDENT' });
    setError(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setError(null);
    try {
      await usersApi.deleteUser(deleteId);
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit User' : 'Create User Account'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input {...register('username')} placeholder="e.g. jdoe" />
                {errors.username && <p className="text-destructive text-xs mt-1">{errors.username.message as string}</p>}
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      {...register('password')} 
                      placeholder="Min 6 characters" 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message as string}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>Role</Label>
                <select {...register('role')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {errors.role && <p className="text-destructive text-xs mt-1">{errors.role.message as string}</p>}
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2 pt-4">
                  <input type="checkbox" id="user_is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-primary border-input rounded" />
                  <Label htmlFor="user_is_active">Active</Label>
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

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-md border border-border shadow-sm">
        <div className="w-full sm:w-64 space-y-1">
          <Label>Search Username</Label>
          <Input 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 space-y-1">
          <Label>Filter by Role</Label>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Roles</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (() => {
              const filteredUsers = users.filter(u => {
                const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
                return matchesSearch && matchesRole;
              });

              if (filteredUsers.length === 0) {
                return <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users found.</TableCell></TableRow>;
              }

              return filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => editUser(user)} className="text-primary hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(user.id)} className="text-destructive hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this user account and all their associated data? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}