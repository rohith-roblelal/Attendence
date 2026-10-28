'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Check, X, Calendar, AlertCircle, BookOpen, Users } from 'lucide-react';
import { apiClient } from "../../../lib/api/client";
import { swapsApi } from "../../../lib/api/swaps";
import { formatKey } from '../../../lib/utils/formatters';

import ProtectedRoute from '../../../components/ProtectedRoute';

export default function TeacherPage() {
  const [data, setData] = useState<any>(null);
  const [pendingSwaps, setPendingSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/dashboard/teacher');
      const raw = response.data.data;
      setPendingSwaps(raw.pendingSwaps || []);
      setData(raw);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRespond = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await swapsApi.respond(id, status);
      setActionMessage({
        type: 'success',
        text: `Swap request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`
      });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update swap request.'
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER', 'HOD', 'TUTOR']}>
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight capitalize">Teacher Dashboard</h1>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!data) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER', 'HOD', 'TUTOR']}>
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight capitalize">Teacher Dashboard</h1>
          <Card className="mt-6">
            <CardContent className="pt-6">No data available.</CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Flatten counts for the KPI grid
  const kpis: any = {};
  if (data.counts) {
    for (const [k, v] of Object.entries(data.counts)) {
      kpis[k] = v;
    }
  }
  if (data.attendanceOverview) {
    for (const [k, v] of Object.entries(data.attendanceOverview)) {
      kpis[k] = v;
    }
  }

  const assignedClasses = data.classes || [];
  const assignedSubjects = data.assignments || [];

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'HOD', 'TUTOR']}>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Here is your live overview of key metrics, assigned classes, and timetable changes.</p>
          </div>
          <Link href="/dashboard/teacher/swaps">
            <Button variant="outline" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Manage Swap Requests
              {pendingSwaps.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingSwaps.length}
                </Badge>
              )}
            </Button>
          </Link>
        </div>

        {actionMessage && (
          <div
            className={`p-3 rounded text-sm ${
              actionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Prominent Swap Request Section */}
        {pendingSwaps.length > 0 && (
          <Card className="border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-300">
                    Incoming Period Swap Requests ({pendingSwaps.length})
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300">
                  Action Required
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Another teacher has requested to swap a class period with you. Please review and respond below.
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-background overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Swap Date</TableHead>
                      <TableHead>They Will Teach</TableHead>
                      <TableHead>You Will Teach</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSwaps.map((swap) => (
                      <TableRow key={swap.id}>
                        <TableCell className="font-medium">
                          {swap.req_first_name} {swap.req_last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{String(swap.swap_date).split('T')[0]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{swap.req_sub_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Period {swap.requesting_period_number} • {swap.req_class_code || 'Class'} ({swap.req_section_name || 'A'})
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{swap.tgt_sub_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Period {swap.target_period_number} • {swap.tgt_class_code || 'Class'} ({swap.tgt_section_name || 'A'})
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespond(swap.id, 'APPROVED')}
                              className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRespond(swap.id, 'REJECTED')}
                              className="gap-1 h-8"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {Object.entries(kpis).map(([key, value]) => {
            const isSwapKpi = key === 'pending_swap_requests';
            const numVal = Number(value);

            return (
              <Card
                key={key}
                className={`overflow-hidden transition-colors ${
                  isSwapKpi && numVal > 0
                    ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'hover:bg-muted/10'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {formatKey(key)}
                    </h3>
                    {isSwapKpi && numVal > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{String(value)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="pt-6">
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="classes" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                My Assigned Classes ({assignedClasses.length})
              </TabsTrigger>
              <TabsTrigger value="subjects" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                My Assigned Subjects ({assignedSubjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Classes You Teach</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignedClasses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">You have not been assigned to any classes.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead>Semester</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedClasses.map((c: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{c.batch_name}</TableCell>
                            <TableCell>{c.semester_name}</TableCell>
                            <TableCell>{c.section_name}</TableCell>
                            <TableCell>
                              <Badge variant={c.status ? "default" : "secondary"}>
                                {c.status ? "Active" : "Inactive"}
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

            <TabsContent value="subjects" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subjects You Teach</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignedSubjects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">You have no active subject assignments.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment ID</TableHead>
                          <TableHead>Class ID</TableHead>
                          <TableHead>Subject ID</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedSubjects.map((sub: any) => (
                          <TableRow key={sub.class_subject_id}>
                            <TableCell className="font-medium">CS-{sub.class_subject_id}</TableCell>
                            <TableCell>Class #{sub.class_id}</TableCell>
                            <TableCell>Subject #{sub.subject_id}</TableCell>
                            <TableCell>
                              <Badge variant={sub.is_active ? "default" : "secondary"}>
                                {sub.is_active ? "Active" : "Inactive"}
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
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
