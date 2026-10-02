'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../../lib/api/client";
import Link from "next/link";
import { AlertCircle, CalendarX2 } from 'lucide-react';

export default function AdministrationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/administration');
        setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
              <CardContent><div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      </div>
    );
  }

  const { kpis, lists } = data;
  const atRiskStudents = lists?.at_risk_students || [];
  const missedClasses = lists?.missed_classes || [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
      <p className="text-muted-foreground">Here is your live overview of key metrics fetched directly from the database.</p>
      
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
        {Object.entries(kpis).map(([key, value]) => {
          return (
            <Card key={key} className="overflow-hidden hover:bg-muted/10 transition-colors">
              <CardHeader className="pb-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {formatKey(key)}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{String(value)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="pt-8">
        <Tabs defaultValue="at_risk" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="at_risk" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              At-Risk Students ({atRiskStudents.length})
            </TabsTrigger>
            <TabsTrigger value="missed_classes" className="flex items-center gap-2">
              <CalendarX2 className="h-4 w-4 text-orange-500" />
              Missing Attendance Today ({missedClasses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="at_risk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Students with &lt; 75% Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {atRiskStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No students are currently at risk.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Total Sessions</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atRiskStudents.map((student: any) => {
                        const sTotal = Number(student.total_sessions) || 0;
                        const sPresent = Number(student.present_sessions) || 0;
                        const sPerc = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0;
                        return (
                          <TableRow key={student.admission_number}>
                            <TableCell className="font-medium">{student.admission_number}</TableCell>
                            <TableCell>{student.student_name}</TableCell>
                            <TableCell>{sTotal}</TableCell>
                            <TableCell>{sPresent}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {sPerc}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missed_classes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Classes with Missing Attendance Today</CardTitle>
              </CardHeader>
              <CardContent>
                {missedClasses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">All active classes have submitted attendance today!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Section</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedClasses.map((c: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{c.batch_name}</TableCell>
                          <TableCell>{c.semester_name}</TableCell>
                          <TableCell>{c.class_code || c.section_name}</TableCell>
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

      <div className="pt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Admin Modules</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Link href="/dashboard/administration/academic">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Academic Structure</CardTitle>
                <p className="text-sm text-muted-foreground">Manage years, departments, classes</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/people">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">People</CardTitle>
                <p className="text-sm text-muted-foreground">Manage students and teachers</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/sessions">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Class Sessions</CardTitle>
                <p className="text-sm text-muted-foreground">Assign subjects and sessions</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/timetable">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Timetable</CardTitle>
                <p className="text-sm text-muted-foreground">Manage weekly timetables</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/administration/attendence">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Attendance</CardTitle>
                <p className="text-sm text-muted-foreground">Track and record attendance</p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/dashboard/report">
            <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Reports</CardTitle>
                <p className="text-sm text-muted-foreground">View analytical reports</p>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
