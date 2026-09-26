'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { studentsApi } from '../../lib/api/students';
import { usersApi } from '../../lib/api/users';
import { classesApi } from '../../lib/api/classes';
import { Edit2, UserX, GitCommit } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

  useEffect(() => {
    fetchData();
  }, []);

  
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
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Student Profile' : 'Create Student Profile'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!isEditing && (
                <div className="lg:col-span-2 space-y-2">
                  <Label>Link to User Account</Label>
                  <select {...register('user_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={0}>Select unlinked account...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                  {errors.user_id && <p className="text-destructive text-xs mt-1">{errors.user_id.message as string}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>Student ID / Roll No</Label>
                <Input {...register('student_id')} placeholder="e.g. S-2026-001" />
                {errors.student_id && <p className="text-destructive text-xs mt-1">{errors.student_id.message as string}</p>}
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label>Initial Class Enrollment</Label>
                  <select {...register('class_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={0}>None...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                    ))}
                  </select>
                  {errors.class_id && <p className="text-destructive text-xs mt-1">{errors.class_id.message as string}</p>}
                </div>
              )}

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
                <Label>Admission Number (Optional)</Label>
                <Input {...register('admission_number')} />
                {errors.admission_number && <p className="text-destructive text-xs mt-1">{errors.admission_number.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date of Birth (Optional)</Label>
                <Input type="date" {...register('date_of_birth')} />
                {errors.date_of_birth && <p className="text-destructive text-xs mt-1">{errors.date_of_birth.message as string}</p>}
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
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="GRADUATED">GRADUATED</option>
                  </select>
                  {errors.status && <p className="text-destructive text-xs mt-1">{errors.status.message as string}</p>}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student')}
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
              <TableHead>ID / Adm No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : students.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No students found.</TableCell></TableRow>
            ) : (
              students.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div>{student.student_id}</div>
                    <div className="text-xs text-muted-foreground">{student.admission_number || '-'}</div>
                  </TableCell>
                  <TableCell>{student.first_name} {student.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === 'ACTIVE' ? "default" : "destructive"}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
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
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this student?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!transferStudent} onOpenChange={(open) => { if (!open) { setTransferStudent(null); resetTransfer(); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Student Class</DialogTitle>
            <DialogDescription>
              Transferring <strong>{transferStudent?.first_name} {transferStudent?.last_name}</strong> to a new class. This will preserve their enrollment history.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>New Class</Label>
              <select {...registerTransfer('class_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value={0}>Select new class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                ))}
              </select>
              {transferErrors.class_id && <p className="text-destructive text-xs mt-1">{transferErrors.class_id.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label>Transfer Reason</Label>
              <textarea {...registerTransfer('transfer_reason')} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" rows={3} placeholder="e.g. Moved to a different specialization"></textarea>
              {transferErrors.transfer_reason && <p className="text-destructive text-xs mt-1">{transferErrors.transfer_reason.message as string}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setTransferStudent(null); resetTransfer(); }}>Cancel</Button>
              <Button type="submit" disabled={isTransferring}>
                {isTransferring ? 'Transferring...' : 'Execute Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
