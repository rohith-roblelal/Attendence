'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { studentsApi } from '../../lib/api/students';
import { usersApi } from '../../lib/api/users';
import { classesApi } from '../../lib/api/classes';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';
import { Edit2, UserX, GitCommit, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATION';

  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [statsDialog, setStatsDialog] = useState<{ open: boolean; student: any; loading: boolean; data: any }>({
    open: false,
    student: null,
    loading: false,
    data: null,
  });

  const viewStats = async (student: any) => {
    setStatsDialog({ open: true, student, loading: true, data: null });
    try {
      const res = await apiClient.get(`/dashboard/tutor/students/${student.id || student.student_id}/stats`);
      setStatsDialog(prev => ({ ...prev, loading: false, data: res.data.data }));
    } catch (err) {
      setStatsDialog(prev => ({ ...prev, loading: false }));
    }
  };

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

  const [allUsers, setAllUsers] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [studRes, allStudRes, usersRes, classRes] = await Promise.all([
          studentsApi.getStudents({ page, limit }),
          studentsApi.getStudents({ limit: 1000 }),
          usersApi.getUsers(),
          classesApi.getClasses()
        ]);
        
        const fetchedStudents = studRes.data.data || [];
        setStudents(fetchedStudents);
        
        if (studRes.data.meta) {
          setTotalPages(studRes.data.meta.totalPages);
          setTotalRecords(studRes.data.meta.total);
        }

        const rawUsers = usersRes.data.data?.users || usersRes.data.data || [];
        setAllUsers(rawUsers);
        setClasses(classRes.data.data || []);

        const allStudentsList = allStudRes.data.data || [];
        const studentUserIds = allStudentsList.map((s: any) => s.user_id);
        setUsers(rawUsers.filter((u: any) => 
          u.role === 'STUDENT' && !studentUserIds.includes(u.id)
        ));
      } else {
        // Tutors/Teachers only see their assigned students
        const studRes = await apiClient.get('/dashboard/tutor/students');
        const rawStudents = studRes.data.data.students || [];
        // The tutor API returns differently named fields. We map them back to standard names for the table.
        const mappedStudents = rawStudents.map((s: any) => ({
          id: s.student_id, // Database primary key
          student_id: s.admission_number, // The Roll Number/Admission number
          first_name: s.student_name,
          last_name: '', // already concatenated into first_name
          status: 'ACTIVE', // The query only selects active students
          admission_number: ''
        }));
        setStudents(mappedStudents);
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, isAdmin]);

  
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
      
      {isAdmin && (
        <Card>
          <CardHeader>
          <CardTitle>{isEditing ? 'Edit Student Profile' : 'Create Student Profile'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!isEditing && (
                <div className="lg:col-span-2 space-y-2">
                  <Label>Link to User Account {users.length > 0 ? `(${users.length} unlinked available)` : '(No unlinked accounts)'}</Label>
                  <select {...register('user_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={0}>Select unlinked account...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>
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
      )}

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID / Adm No</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              {!isAdmin && <TableHead className="text-right">Details</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : students.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No students found.</TableCell></TableRow>
            ) : (
              students.map((student: any) => (
                <TableRow key={student.id || student.student_id}>
                  <TableCell className="font-medium">
                    <div>{student.student_id || student.admission_number}</div>
                    <div className="text-xs text-muted-foreground">{student.admission_number || '-'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {student.username || '-'}
                  </TableCell>
                  <TableCell>{student.first_name || student.student_name} {student.last_name || ''}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {student.class_code || 'Unassigned'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(student.status || 'ACTIVE') === 'ACTIVE' ? "default" : "destructive"}>
                      {student.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setTransferStudent(student)} className="text-purple-600 hover:text-purple-900" title="Transfer Class" aria-label="Transfer Class">
                          <GitCommit className="w-4 h-4" />
                        </button>
                        <button onClick={() => editStudent(student)} className="text-primary hover:text-primary" title="Edit Profile" aria-label="Edit Profile">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {student.status === 'ACTIVE' ? (
                          <button onClick={() => setDeactivateId(student.id)} className="text-destructive hover:text-red-900" title="Deactivate" aria-label="Deactivate student">
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button disabled className="text-gray-300 cursor-not-allowed">
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {!isAdmin && (
                    <TableCell className="text-right">
                      <button onClick={() => viewStats(student)} className="text-primary hover:text-primary/80" title="View Subject Attendance" aria-label="View Subject Attendance">
                        <BarChart2 className="w-5 h-5 ml-auto" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isAdmin && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} students
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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

      <Dialog open={statsDialog.open} onOpenChange={(open) => setStatsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-3xl max-w-3xl">
          <DialogHeader>
            <DialogTitle>Student Attendance Details</DialogTitle>
            <DialogDescription>
              {statsDialog.student && `${statsDialog.student.first_name || statsDialog.student.student_name} (${statsDialog.student.admission_number || statsDialog.student.student_id})`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {statsDialog.loading ? (
              <div className="text-center text-muted-foreground py-8">Loading attendance data...</div>
            ) : statsDialog.data && statsDialog.data.subjectAttendance && statsDialog.data.subjectAttendance.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Total Sessions</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsDialog.data.subjectAttendance.map((sub: any) => {
                      const total = Number(sub.total_sessions || 0);
                      const present = Number(sub.present_sessions || 0);
                      const percent = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <TableRow key={sub.subject_id}>
                          <TableCell className="font-medium">
                            <div>{sub.subject_name}</div>
                            <div className="text-xs text-muted-foreground">{sub.subject_code}</div>
                          </TableCell>
                          <TableCell className="text-center">{total}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{present}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={percent >= 75 ? "default" : "destructive"}>{percent}%</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No attendance records found for this student.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setStatsDialog(prev => ({ ...prev, open: false }))}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
