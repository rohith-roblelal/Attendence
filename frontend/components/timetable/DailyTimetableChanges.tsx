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
import { Edit2, Trash2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const createDailySchema = z.object({
  class_id: z.number().int().positive('Class is required'),
  change_date: z.string().min(1, 'Date is required'),
  original_period: z.number().int().positive('Original period is required'),
  new_period: z.number().int().positive().optional().or(z.literal('')),
  original_class_subject_id: z.number().int().positive('Original Subject is required'),
  new_class_subject_id: z.number().int().positive().optional().or(z.literal('')),
  change_type: z.string().min(1, 'Change type is required'),
  reason: z.string().optional().or(z.literal('')),
});

const updateDailySchema = z.object({
  new_period: z.number().int().positive().optional().or(z.literal('')),
  new_class_subject_id: z.number().int().positive().optional().or(z.literal('')),
  change_type: z.string().min(1).max(30).optional(),
  reason: z.string().optional().or(z.literal('')),
});

export default function DailyTimetableChanges() {
  const [changes, setChanges] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(isEditing ? updateDailySchema : createDailySchema),
    defaultValues: { change_type: 'SUBSTITUTION' }
  });

  const watchClassId = watch('class_id');
  const watchChangeType = watch('change_type');

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
      const [chRes, clsRes, csRes, subRes, tRes] = await Promise.all([
        timetableApi.getDaily(),
        classesApi.getClasses(),
        classSubjectsApi.getAll(),
        subjectsApi.getSubjects(),
        teachersApi.getTeachers()
      ]);
      setChanges(chRes.data.data);
      setClasses(clsRes.data.data);
      setClassSubjects(csRes.data.data);
      setSubjects(subRes.data.data);
      setTeachers(tRes.data.data);
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
      if (!payload.reason) payload.reason = null;
      if (!payload.new_period || payload.new_period === '') payload.new_period = null;
      if (!payload.new_class_subject_id || payload.new_class_subject_id === '') payload.new_class_subject_id = null;

      if (isEditing && currentId) {
        await timetableApi.updateDaily(currentId, payload);
      } else {
        await timetableApi.createDaily(payload);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editChange = (change: any) => {
    setIsEditing(true);
    setCurrentId(change.id);
    setSelectedClassId(change.class_id);
    reset({
      class_id: change.class_id, 
      change_date: change.change_date?.split('T')[0],
      original_period: change.original_period,
      new_period: change.new_period || '',
      original_class_subject_id: change.original_class_subject_id,
      new_class_subject_id: change.new_class_subject_id || '',
      change_type: change.change_type,
      reason: change.reason || '',
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ 
      class_id: 0, 
      change_date: '', 
      original_period: 1, 
      new_period: '', 
      original_class_subject_id: 0, 
      new_class_subject_id: '', 
      change_type: 'SUBSTITUTION', 
      reason: '' 
    });
    setError(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setError(null);
    try {
      await timetableApi.deleteDaily(deleteId);
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete change');
      setDeleteId(null);
    }
  };

  // Get active class subjects for the selected class to populate dropdown
  const availableSubjects = classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active);

  const getSubjectDisplay = (csId: number) => {
    const cs = classSubjects.find(c => c.id === csId);
    if (!cs) return 'Unknown Subject';
    const sub = subjects.find(s => s.id === cs.subject_id);
    const teacher = teachers.find(t => t.id === cs.teacher_id);
    return `${sub?.name} (${teacher ? teacher.first_name : 'No Teacher'})`;
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <AlertDescription>
          <span className="font-semibold">Important:</span> Daily timetable changes are strictly isolated to a specific date and do <strong>not</strong> affect the regular recurring timetable. Use this for ad-hoc substitutions, period swaps, or cancellations.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Daily Change' : 'Log Daily Timetable Change'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <select disabled={isEditing} {...register('class_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100">
                  <option value={0}>Select...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                  ))}
                </select>
                {errors.class_id && <p className="text-destructive text-xs mt-1">{errors.class_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date of Change</Label>
                <Input disabled={isEditing} type="date" {...register('change_date')} className="disabled:bg-gray-100" />
                {errors.change_date && <p className="text-destructive text-xs mt-1">{errors.change_date.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Change Type</Label>
                <select {...register('change_type')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="SUBSTITUTION">Substitution</option>
                  <option value="CANCELLATION">Cancellation</option>
                  <option value="RESCHEDULING">Rescheduling</option>
                </select>
                {errors.change_type && <p className="text-destructive text-xs mt-1">{errors.change_type.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Original Period Number</Label>
                <Input disabled={isEditing} type="number" min="1" {...register('original_period', { valueAsNumber: true })} className="disabled:bg-gray-100" />
                {errors.original_period && <p className="text-destructive text-xs mt-1">{errors.original_period.message as string}</p>}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Original Subject Assignment</Label>
                <select disabled={isEditing} {...register('original_class_subject_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100">
                  <option value={0}>Select...</option>
                  {availableSubjects.map(cs => (
                    <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
                  ))}
                </select>
                {errors.original_class_subject_id && <p className="text-destructive text-xs mt-1">{errors.original_class_subject_id.message as string}</p>}
              </div>

              {watchChangeType === 'SUBSTITUTION' && (
                <div className="space-y-2 lg:col-span-2">
                  <Label>New Subject Assignment (Substitution)</Label>
                  <select {...register('new_class_subject_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select...</option>
                    {availableSubjects.map(cs => (
                      <option key={cs.id} value={cs.id}>{getSubjectDisplay(cs.id)}</option>
                    ))}
                  </select>
                  {errors.new_class_subject_id && <p className="text-destructive text-xs mt-1">{errors.new_class_subject_id.message as string}</p>}
                </div>
              )}

              {watchChangeType === 'RESCHEDULING' && (
                <div className="space-y-2 lg:col-span-2">
                  <Label>New Period Number</Label>
                  <Input type="number" min="1" {...register('new_period', { valueAsNumber: true })} />
                  {errors.new_period && <p className="text-destructive text-xs mt-1">{errors.new_period.message as string}</p>}
                </div>
              )}

              <div className="lg:col-span-4 space-y-2">
                <Label>Reason (Optional)</Label>
                <Input {...register('reason')} placeholder="e.g. Teacher on sick leave" />
                {errors.reason && <p className="text-destructive text-xs mt-1">{errors.reason.message as string}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Change' : 'Log Daily Change')}
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
              <TableHead>Type</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>New (If Applicable)</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : changes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No daily changes logged.</TableCell></TableRow>
            ) : (
              // Sort by date descending
              [...changes].sort((a,b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime()).map(change => {
                const cls = classes.find(c => c.id === change.class_id);

                return (
                  <TableRow key={change.id}>
                    <TableCell className="font-medium">
                      <div>{change.change_date?.split('T')[0]}</div>
                      <div className="text-xs text-muted-foreground">{cls?.class_code || cls?.section_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {change.change_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>Period {change.original_period}</div>
                      <div className="text-xs">{getSubjectDisplay(change.original_class_subject_id)}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {change.new_period && <div>Moved to P{change.new_period}</div>}
                      {change.new_class_subject_id && <div className="text-xs">{getSubjectDisplay(change.new_class_subject_id)}</div>}
                      {!change.new_period && !change.new_class_subject_id && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{change.reason || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => editChange(change)} className="text-blue-600 hover:text-blue-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(change.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daily Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this daily change? The timetable for this day will revert to the regular schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
