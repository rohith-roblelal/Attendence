'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { teachersApi } from '../../lib/api/teachers';
import { usersApi } from '../../lib/api/users';
import { academicApi } from '../../lib/api/academic';
import { Edit2, UserX } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const createTeacherSchema = z.object({
  user_id: z.number().int().positive('User is required'),
  department_id: z.number().int().positive('Department is required').optional().or(z.literal(0)),
  teacher_id: z.string().min(1, 'Teacher ID is required').max(30),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  joined_at: z.string().optional().or(z.literal('')),
});

const updateTeacherSchema = z.object({
  department_id: z.number().int().positive().optional().or(z.literal(0)),
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
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateTeacherSchema : createTeacherSchema),
  });

const fetchData = async () => {
    setLoading(true);
    try {
      const [teachRes, usersRes, deptRes] = await Promise.all([
        teachersApi.getTeachers(),
        usersApi.getUsers(),
        academicApi.getDepartments()
      ]);
      setTeachers(teachRes.data.data);
      setDepartments(deptRes.data.data);
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

  useEffect(() => {
    fetchData();
  }, []);

  
  const onSubmit = async (data: any) => {
    setError(null);
    try {
      const payload = { ...data };
      if (!payload.joined_at) delete payload.joined_at;
      if (!payload.last_name) payload.last_name = null;
      if (!payload.designation) payload.designation = null;
      if (!payload.department_id || payload.department_id === 0) payload.department_id = null;

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
      department_id: teacher.department_id || 0,
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
    reset({ user_id: 0, department_id: 0, teacher_id: '', first_name: '', last_name: '', designation: '', joined_at: '' });
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
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Teacher Profile' : 'Create Teacher Profile'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!isEditing && (
                <div className="space-y-2">
                  <Label>Link to User Account</Label>
                  <select {...register('user_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={0}>Select unlinked account...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                    ))}
                  </select>
                  {errors.user_id && <p className="text-destructive text-xs mt-1">{errors.user_id.message as string}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>Department</Label>
                <select {...register('department_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value={0}>No Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.department_id && <p className="text-destructive text-xs mt-1">{errors.department_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Teacher ID / Staff Code</Label>
                <Input {...register('teacher_id')} placeholder="e.g. T-1234" />
                {errors.teacher_id && <p className="text-destructive text-xs mt-1">{errors.teacher_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...register('first_name')} />
                {errors.first_name && <p className="text-destructive text-xs mt-1">{errors.first_name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Last Name (Optional)</Label>
                <Input {...register('last_name')} />
                {errors.last_name && <p className="text-destructive text-xs mt-1">{errors.last_name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Designation (Optional)</Label>
                <Input {...register('designation')} placeholder="e.g. Associate Professor" />
                {errors.designation && <p className="text-destructive text-xs mt-1">{errors.designation.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Join Date (Optional)</Label>
                <Input type="date" {...register('joined_at')} />
                {errors.joined_at && <p className="text-destructive text-xs mt-1">{errors.joined_at.message as string}</p>}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select {...register('status')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                  </select>
                  {errors.status && <p className="text-destructive text-xs mt-1">{errors.status.message as string}</p>}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Create Teacher')}
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
              <TableHead>ID / Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : teachers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No teachers found.</TableCell></TableRow>
            ) : (
              teachers.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.teacher_id}</TableCell>
                  <TableCell>{teacher.first_name} {teacher.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{departments.find(d => d.id === teacher.department_id)?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{teacher.designation || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{teacher.joined_at?.split('T')[0] || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.status === 'ACTIVE' ? "default" : "destructive"}>
                      {teacher.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => editTeacher(teacher)} className="text-primary hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {teacher.status === 'ACTIVE' ? (
                        <button onClick={() => setDeactivateId(teacher.id)} className="text-destructive hover:text-red-900">
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button disabled className="text-gray-300 cursor-not-allowed">
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

      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this teacher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
