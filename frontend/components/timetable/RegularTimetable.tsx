'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { timetableApi } from '../../lib/api/timetable';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { teachersApi } from '../../lib/api/teachers';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';
import { Edit2, UserX } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const createRegularSchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  day_of_week: z.number().int().min(1, 'Day is required').max(7),
  period_number: z.number().int().positive('Period is required'),
  class_subject_id: z.number().int().positive('Subject Assignment is required'),
});

const updateRegularSchema = z.object({
  class_subject_id: z.number().int().positive('Subject Assignment is required').optional(),
  is_active: z.boolean().optional(),
});

export default function RegularTimetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATION';
  const isHod = user?.role === 'HOD';

  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateRegularSchema : createRegularSchema),
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
      if (isAdmin || isHod) {
        const [ttRes, clsRes, csRes, subRes, tRes] = await Promise.all([
          timetableApi.getRegular(),
          classesApi.getClasses(),
          classSubjectsApi.getAll(),
          subjectsApi.getSubjects(),
          teachersApi.getTeachers()
        ]);
        setTimetable(ttRes.data.data);
        setClasses(clsRes.data.data.filter((c: any) => c.is_active));
        setClassSubjects(csRes.data.data);
        setSubjects(subRes.data.data);
        setTeachers(tRes.data.data);
      } else {
        const [ttRes, teacherRes, subRes, tRes] = await Promise.all([
          apiClient.get('/dashboard/teacher/timetable'),
          apiClient.get('/dashboard/teacher'),
          subjectsApi.getSubjects(),
          teachersApi.getTeachers()
        ]);
        
        setTimetable(ttRes.data.data);
        
        const teacherData = teacherRes.data.data;
        const mappedSubjects = (teacherData.assignments || []).map((a: any) => ({
          id: a.class_subject_id || a.id,
          class_id: a.class_id,
          subject_id: a.subject_id,
          teacher_id: a.teacher_id,
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
    if (!isHod) return;
    setError(null);
    try {
      if (isEditing && currentId) {
        const payload = { 
          class_subject_id: data.class_subject_id,
          is_active: data.is_active
        };
        await timetableApi.updateRegular(currentId, payload);
      } else {
        await timetableApi.createRegular(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editEntry = (entry: any) => {
    if (!isHod) return;
    setIsEditing(true);
    setCurrentId(entry.id);
    setSelectedClassId(entry.class_id);
    reset({
      class_id: entry.class_id, // For display purposes, form uses class_id internally but doesn't patch it
      day_of_week: entry.day_of_week,
      period_number: entry.period_number,
      class_subject_id: entry.class_subject_id,
      is_active: entry.is_active,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ class_id: 0, day_of_week: 1, period_number: 1, class_subject_id: 0, is_active: true });
    setError(null);
  };

  const handleDeactivate = async () => {
    if (!isHod || !deactivateId) return;
    setError(null);
    try {
      await timetableApi.deactivateRegular(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate entry');
      setDeactivateId(null);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // For Admins and HODs, filter by selected class. For Teachers, show all their assigned subjects.
  const availableSubjects = (isAdmin || isHod) 
    ? classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active)
    : classSubjects.filter(cs => cs.is_active);

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      
      {isHod && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <select disabled={isEditing} {...register('class_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted">
                    <option value={0}>Select...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_code || c.section_name || `Class ${c.id}`}</option>
                    ))}
                  </select>
                  {errors.class_id && <p className="text-destructive text-xs mt-1">{errors.class_id.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Day</Label>
                  <select disabled={isEditing} {...register('day_of_week', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted">
                    {days.map((day, idx) => (
                      <option key={idx + 1} value={idx + 1}>{day}</option>
                    ))}
                  </select>
                  {errors.day_of_week && <p className="text-destructive text-xs mt-1">{errors.day_of_week.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Period Number</Label>
                  <Input disabled={isEditing} type="number" min="1" {...register('period_number', { valueAsNumber: true })} className="disabled:bg-muted" />
                  {errors.period_number && <p className="text-destructive text-xs mt-1">{errors.period_number.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Subject Assignment</Label>
                  <select {...register('class_subject_id', { 
                    valueAsNumber: true,
                    onChange: (e) => {
                      const subjId = Number(e.target.value);
                      const matchedSubj = classSubjects.find(cs => cs.id === subjId);
                      if (matchedSubj && !isAdmin && !isHod) {
                        const currentValues = watch();
                        reset({ ...currentValues, class_id: matchedSubj.class_id, class_subject_id: subjId });
                      }
                    }
                  })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={0}>Select subject...</option>
                    {availableSubjects.map(cs => {
                      const sub = subjects.find(s => s.id === cs.subject_id);
                      const teacher = teachers.find(t => t.id === cs.teacher_id);
                      return (
                        <option key={cs.id} value={cs.id}>
                          {sub?.name} ({teacher ? `${teacher.first_name}` : 'No Teacher'})
                        </option>
                      )
                    })}
                  </select>
                  {errors.class_subject_id && <p className="text-destructive text-xs mt-1">{errors.class_subject_id.message as string}</p>}
                </div>

                {isEditing && (
                  <div className="flex items-center space-x-2 pt-8">
                    <input type="checkbox" id="tt_is_active" {...register('is_active')} className="h-4 w-4 text-primary focus:ring-primary border-input rounded" />
                    <Label htmlFor="tt_is_active">Active</Label>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update Entry' : 'Add Entry')}
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
              <TableHead>Class</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Subject & Teacher</TableHead>
              <TableHead>Status</TableHead>
              {isHod && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={isHod ? 6 : 5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : timetable.length === 0 ? (
              <TableRow><TableCell colSpan={isHod ? 6 : 5} className="text-center text-muted-foreground">No regular timetable entries found.</TableCell></TableRow>
            ) : (
              // Sort by class_id, day, period
              [...timetable].sort((a,b) => a.class_id - b.class_id || a.day_of_week - b.day_of_week || a.period_number - b.period_number).map(entry => {
                const cls = classes.find(c => c.id === entry.class_id);
                const cs = classSubjects.find(c => c.id === entry.class_subject_id);
                const sub = cs ? subjects.find(s => s.id === cs.subject_id) : null;
                const teacher = cs ? teachers.find(t => t.id === cs.teacher_id) : null;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{cls?.class_code || cls?.section_name || entry.class_id}</TableCell>
                    <TableCell className="text-muted-foreground">{days[entry.day_of_week - 1]}</TableCell>
                    <TableCell className="text-muted-foreground">P{entry.period_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{sub?.name || 'Unknown Subject'}</div>
                      <div className="text-xs text-muted-foreground">{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_active ? "default" : "destructive"}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {isHod && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => editEntry(entry)} className="text-primary hover:text-primary">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {entry.is_active ? (
                            <button onClick={() => setDeactivateId(entry.id)} className="text-destructive hover:text-red-900">
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this timetable entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
