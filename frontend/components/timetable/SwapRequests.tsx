'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { swapsApi } from '../../lib/api/swaps';
import { teachersApi } from '../../lib/api/teachers';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const requestSchema = z.object({
  target_teacher_id: z.number().int().positive('Please select a teacher'),
  swap_date: z.string().min(1, 'Date is required'),
  requesting_class_subject_id: z.number().int().positive('Please select your subject'),
  requesting_period_number: z.number().int().positive('Please enter your period number'),
  target_class_subject_id: z.number().int().positive('Please select target subject'),
  target_period_number: z.number().int().positive('Please enter target period number'),
});

export default function SwapRequests() {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [targetAssignments, setTargetAssignments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [myTeacherId, setMyTeacherId] = useState<number | null>(null);

  const [allClassSubjects, setAllClassSubjects] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(requestSchema),
  });

  const watchTargetTeacher = watch('target_teacher_id');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (watchTargetTeacher) {
      const assignments = allClassSubjects.filter(cs => cs.teacher_id === Number(watchTargetTeacher) && cs.is_active);
      // Map them to include subject and class details for the dropdown
      const mapped = assignments.map(a => {
        const sub = allSubjects.find(s => s.id === a.subject_id);
        const cls = allClasses.find(c => c.id === a.class_id);
        return {
          id: a.id,
          subject: sub,
          class: cls
        };
      });
      setTargetAssignments(mapped);
    } else {
      setTargetAssignments([]);
    }
  }, [watchTargetTeacher, allClassSubjects, allSubjects, allClasses]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [swapsRes, tRes, meRes, csRes, cRes, subRes] = await Promise.all([
        swapsApi.getMySwaps(),
        teachersApi.getTeachers(),
        apiClient.get('/dashboard/teacher'),
        apiClient.get('/class-subjects'),
        apiClient.get('/classes'),
        apiClient.get('/subjects')
      ]);
      setSwaps(swapsRes.data.data);
      setTeachers(tRes.data.data);
      
      const csData = csRes.data.data;
      const cData = cRes.data.data;
      const subData = subRes.data.data;

      setAllClassSubjects(csData);
      setAllClasses(cData);
      setAllSubjects(subData);

      const meData = meRes.data.data;
      const currentTeacher = tRes.data.data?.find((t: any) => t.user_id === user?.id) || meData.teacher;
      const currentTeacherId = currentTeacher?.id || meData.teacher?.id || 0;
      setMyTeacherId(currentTeacherId);
      
      const myRawAssignments = (meData.assignments && meData.assignments.length > 0)
        ? meData.assignments
        : csData.filter((cs: any) => cs.teacher_id === currentTeacherId && cs.is_active);
      const myMapped = myRawAssignments.map((a: any) => {
        const sub = subData.find((s: any) => s.id === a.subject_id);
        const cls = cData.find((c: any) => c.id === a.class_id);
        return {
          id: a.class_subject_id || a.id,
          subject: sub,
          class: cls
        };
      });
      setMyAssignments(myMapped);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch swap data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);
    try {
      await swapsApi.create(data);
      setSuccess('Swap request sent successfully!');
      reset();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleRespond = async (id: number, status: string) => {
    setError(null);
    setSuccess(null);
    try {
      await swapsApi.respond(id, status);
      setSuccess(`Swap request ${status.toLowerCase()}!`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to respond');
    }
  };

  const receivedSwaps = swaps.filter(s => s.target_teacher_id === myTeacherId);
  const sentSwaps = swaps.filter(s => s.requesting_teacher_id === myTeacherId);

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded">{success}</div>}

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="received">Received Requests ({receivedSwaps.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent Requests</TabsTrigger>
          <TabsTrigger value="new">Request a Swap</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Swap Requests for You</CardTitle>
            </CardHeader>
            <CardContent>
              {receivedSwaps.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">No pending swap requests.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>They Teach</TableHead>
                      <TableHead>You Teach</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedSwaps.map(swap => (
                      <TableRow key={swap.id}>
                        <TableCell className="font-medium">{swap.req_first_name} {swap.req_last_name}</TableCell>
                        <TableCell>{swap.swap_date.split('T')[0]}</TableCell>
                        <TableCell>
                          <div>{swap.req_sub_name} (Period {swap.requesting_period_number})</div>
                          <div className="text-xs text-muted-foreground">{swap.req_class_code} / {swap.req_section_name}</div>
                        </TableCell>
                        <TableCell>
                          <div>{swap.tgt_sub_name} (Period {swap.target_period_number})</div>
                          <div className="text-xs text-muted-foreground">{swap.tgt_class_code} / {swap.tgt_section_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={swap.status === 'PENDING' ? 'secondary' : swap.status === 'APPROVED' ? 'default' : 'destructive'}>
                            {swap.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {swap.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleRespond(swap.id, 'APPROVED')} className="bg-green-600 hover:bg-green-700">Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRespond(swap.id, 'REJECTED')}>Reject</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Swap Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {sentSwaps.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">You haven't requested any swaps.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested From</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>You Teach</TableHead>
                      <TableHead>They Teach</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentSwaps.map(swap => (
                      <TableRow key={swap.id}>
                        <TableCell className="font-medium">{swap.tgt_first_name} {swap.tgt_last_name}</TableCell>
                        <TableCell>{swap.swap_date.split('T')[0]}</TableCell>
                        <TableCell>
                          <div>{swap.req_sub_name} (Period {swap.requesting_period_number})</div>
                          <div className="text-xs text-muted-foreground">{swap.req_class_code} / {swap.req_section_name}</div>
                        </TableCell>
                        <TableCell>
                          <div>{swap.tgt_sub_name} (Period {swap.target_period_number})</div>
                          <div className="text-xs text-muted-foreground">{swap.tgt_class_code} / {swap.tgt_section_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={swap.status === 'PENDING' ? 'secondary' : swap.status === 'APPROVED' ? 'default' : 'destructive'}>
                            {swap.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Request a Period Swap</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
                
                <div className="space-y-2">
                  <Label>Date of Swap</Label>
                  <Input type="date" {...register('swap_date')} />
                  {errors.swap_date && <p className="text-destructive text-xs">{errors.swap_date.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/20">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Your Details</h3>
                    <div className="space-y-2">
                      <Label>Your Subject/Class</Label>
                      <select {...register('requesting_class_subject_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value={0}>Select your subject...</option>
                        {myAssignments.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.subject?.name || 'Unknown'} ({a.class?.class_code || 'Class'})
                          </option>
                        ))}
                      </select>
                      {errors.requesting_class_subject_id && <p className="text-destructive text-xs">{errors.requesting_class_subject_id.message as string}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Your Period Number</Label>
                      <Input type="number" min="1" {...register('requesting_period_number', { valueAsNumber: true })} />
                      {errors.requesting_period_number && <p className="text-destructive text-xs">{errors.requesting_period_number.message as string}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Their Details</h3>
                    <div className="space-y-2">
                      <Label>Select Teacher to Swap With</Label>
                      <select {...register('target_teacher_id', { valueAsNumber: true })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value={0}>Select teacher...</option>
                        {teachers.filter(t => t.id !== myTeacherId && t.status === 'ACTIVE').map(t => (
                          <option key={t.id} value={t.id}>
                            {t.first_name} {t.last_name}
                          </option>
                        ))}
                      </select>
                      {errors.target_teacher_id && <p className="text-destructive text-xs">{errors.target_teacher_id.message as string}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Their Subject/Class</Label>
                      <select {...register('target_class_subject_id', { valueAsNumber: true })} disabled={!watchTargetTeacher} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                        <option value={0}>Select their subject...</option>
                        {targetAssignments.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.subject?.name || 'Unknown'} - {a.class?.class_code || 'Class'}
                          </option>
                        ))}
                      </select>
                      {errors.target_class_subject_id && <p className="text-destructive text-xs">{errors.target_class_subject_id.message as string}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Their Period Number</Label>
                      <Input type="number" min="1" {...register('target_period_number', { valueAsNumber: true })} />
                      {errors.target_period_number && <p className="text-destructive text-xs">{errors.target_period_number.message as string}</p>}
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? 'Sending Request...' : 'Send Swap Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
