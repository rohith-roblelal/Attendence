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
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';
import { Edit2, XCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const createSessionSchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  class_subject_id: z.number().int().positive('Subject Assignment is required'),
  session_date: z.string().optional().or(z.literal('')),
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATION';

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
      if (isAdmin) {
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
      } else {
        const [sessRes, teacherRes, subRes, tRes] = await Promise.all([
          apiClient.get('/dashboard/teacher/sessions'),
          apiClient.get('/dashboard/teacher'),
          subjectsApi.getSubjects(),
          teachersApi.getTeachers()
        ]);
        
        setSessions(sessRes.data.data);
        
        const teacherData = teacherRes.data.data;
        const mappedSubjects = (teacherData.assignments || []).map((a: any) => ({
          id: a.class_subject_id || a.id,
          class_id: a.class_id,
          subject_id: a.subject_id,
          teacher_id: a.teacher_id, // ensure teacher_id is mapped for getSubjectDisplay
          is_active: true
        }));
        
        setClasses(teacherData.classes || []);
        setClassSubjects(mappedSubjects);
        setSubjects(subRes.data.data);
        setTeachers(tRes.data.data);
      }
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

  // For Admins, filter by selected class. For Teachers, show all their assigned subjects.
  const availableSubjects = isAdmin 
    ? classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active)
    : classSubjects.filter(cs => cs.is_active);

  const getSubjectDisplay = (csId: number) => {
    const cs = classSubjects.find(c => c.id === csId);
    if (!cs) return 'Unknown Subject';
    const sub = subjects.find(s => s.id === cs.subject_id);
    const teacher = teachers.find(t => t.id === cs.teacher_id);
    return `${sub?.name} (Permanent: ${teacher ? teacher.first_name : 'None'})`;
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 flex flex-col gap-1 border border-blue-100">
        <span className="font-semibold">Important:</span>
        <span>The <strong>Permanent Teacher</strong> is derived from the Class-Subject assignment. You may record a different <strong>Conducting Teacher</strong> here (e.g. for a substitution) without changing the permanent assignment. Cancelled sessions remain in the database for historical integrity but are excluded from attendance.</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Session' : 'Record Class Session'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <select disabled={isEditing} {...register('class_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted">
                  <option value={0}>Select...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                  ))}
                </select>
                {errors.class_id && <p className="text-destructive text-xs mt-1">{errors.class_id.message as string}</p>}
              </div>

              <div className="lg:col-span-2 space-y-2">
                <Label>Subject (Shows Permanent Teacher)</Label>
                <select {...register('class_subject_id', { 
                  valueAsNumber: true,
                  onChange: (e) => {
                    const subjId = Number(e.target.value);
                    const matchedSubj = classSubjects.find(cs => cs.id === subjId);
                    if (matchedSubj && !isAdmin) {
                      const currentValues = watch();
                      reset({ ...currentValues, class_id: matchedSubj.class_id, class_subject_id: subjId });
                    }
                  }
                })} disabled={isEditing} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted">
                  <option value={0}>Select...</option>
                  {availableSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
                  ))}
                </select>
                {errors.class_subject_id && <p className="text-destructive text-xs mt-1">{errors.class_subject_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date (Optional)</Label>
                <Input disabled={isEditing} type="date" {...register('session_date')} className="disabled:bg-muted" />
                {errors.session_date && <p className="text-destructive text-xs mt-1">{errors.session_date.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Period Number</Label>
                <Input disabled={isEditing} type="number" min="1" {...register('period_number', { valueAsNumber: true })} className="disabled:bg-muted" />
                {errors.period_number && <p className="text-destructive text-xs mt-1">{errors.period_number.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Actually Conducted By</Label>
                <select {...register('conducted_by_teacher_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">(Use Permanent Teacher)</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
                {errors.conducted_by_teacher_id && <p className="text-destructive text-xs mt-1">{errors.conducted_by_teacher_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Contact Hours</Label>
                <Input type="number" step="0.5" {...register('contact_hours', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select {...register('status')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Session' : 'Record Session')}
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
              <TableHead>Date & Class</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Conducted By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : sessions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No sessions logged.</TableCell></TableRow>
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
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div>{session.session_date?.split('T')[0]}</div>
                      <div className="text-xs text-muted-foreground">{cls?.class_code || cls?.section_name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      P{session.period_number}
                    </TableCell>
                    <TableCell>
                      <div>{sub?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">Perm: {permanentTeacher ? permanentTeacher.first_name : 'None'}</div>
                    </TableCell>
                    <TableCell>
                      <div className={session.conducted_by_teacher_id ? "text-purple-600 font-medium" : "text-muted-foreground"}>
                        {conductedTeacher ? `${conductedTeacher.first_name} ${conductedTeacher.last_name}` : 'Unknown'}
                      </div>
                      {session.conducted_by_teacher_id && <div className="text-xs text-purple-400">(Substitute)</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'COMPLETED' ? "default" : session.status === 'CANCELLED' ? "destructive" : "secondary"}>
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editSession(session)} className="text-primary hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {session.status !== 'CANCELLED' ? (
                          <button onClick={() => setCancelId(session.id)} className="text-destructive hover:text-red-900" title="Cancel Session">
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button disabled className="text-gray-300 cursor-not-allowed">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? The record will be kept for historical integrity, but it will be excluded from attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
