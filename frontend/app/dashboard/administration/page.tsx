'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../../lib/api/client";
import Link from "next/link";
import { AlertCircle, CalendarX2 } from 'lucide-react';
import { formatKey as baseFormatKey } from '../../../lib/utils/formatters';

const AT_RISK_THRESHOLD = 75;

// Sections shown on the dashboard. Keys must match the keys in `kpis` from the API.
const SECTIONS = [
  { title: 'Academics', keys: ['academic_year', 'departments', 'active_classes'] },
  { title: 'People', keys: ['active_students', 'active_teachers', 'active_hods', 'active_tutors', 'admins', 'inactive_users'] },
  { title: 'Attendance', keys: ['overall_attendance', 'todays_attendance', 'absent_today'] },
  { title: 'Alerts', keys: ['students_at_risk', 'classes_missing_attendance_today'] },
];

// Custom labels (anything not listed here is auto-formatted from the key).
const LABELS: Record<string, string> = {
  todays_attendance: "Today's Attendance",
  classes_missing_attendance_today: 'Pending Attendance Today',
};

// Small hint shown under a card value.
const SUBTEXT: Record<string, string> = {
  students_at_risk: `Below ${AT_RISK_THRESHOLD}% attendance`,
  classes_missing_attendance_today: 'Not marked yet today',
};

// Alert cards: colour when value > 0, and which tab they open.
const ALERTS: Record<string, { tone: 'danger' | 'warning'; tab: 'at_risk' | 'missed_classes' }> = {
  students_at_risk: { tone: 'danger', tab: 'at_risk' },
  classes_missing_attendance_today: { tone: 'warning', tab: 'missed_classes' },
};

const TONE_CLASSES = {
  danger: 'border-red-500/50 bg-red-50 dark:bg-red-950/20',
  warning: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20',
};
const TONE_TEXT = {
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const formatKey = (key: string) => LABELS[key] ?? baseFormatKey(key);

export default function AdministrationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('at_risk');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const response = await apiClient.get('/dashboard/administration');
        setData(response.data.data);
      } catch (error: any) {
        console.error("Failed to fetch dashboard data", error);
        setError(error.response?.data?.message || 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openAlert = (target: string) => {
    setTab(target);
    document.getElementById('alerts-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
              <CardContent><div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
        <Card className="mt-6 border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </CardContent>
        </Card>
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

  // No attendance has been recorded yet: today's % is N/A and overall % is 0.
  // (Best fix is on the API: return null instead of 0 when there are no records.)
  const noRecords =
    String(kpis.todays_attendance) === 'N/A' && parseFloat(String(kpis.overall_attendance)) === 0;
  const todayNotTaken = String(kpis.todays_attendance) === 'N/A';

  const displayValue = (key: string, value: unknown) => {
    if (key === 'overall_attendance' && noRecords) return 'N/A';
    if (key === 'absent_today' && todayNotTaken) return 'N/A';
    return String(value);
  };

  // Any KPI the API returns that isn't listed above still shows up here.
  const sections = (() => {
    const knownKeys = SECTIONS.flatMap(s => s.keys);
    const otherKeys = Object.keys(kpis).filter(k => !knownKeys.includes(k));
    return otherKeys.length ? [...SECTIONS, { title: 'Other', keys: otherKeys }] : SECTIONS;
  })();

  const modules = [
    { href: '/dashboard/administration/academic', title: 'Academic Structure', desc: 'Manage years, departments, classes' },
    { href: '/dashboard/administration/people', title: 'People', desc: 'Manage students and teachers' },
    { href: '/dashboard/administration/sessions', title: 'Class Sessions', desc: 'Assign subjects and sessions' },
    { href: '/dashboard/administration/timetable', title: 'Timetable', desc: 'Manage weekly timetables' },
    { href: '/dashboard/administration/attendence', title: 'Attendance', desc: 'Track and record attendance' },
    { href: '/dashboard/report', title: 'Reports', desc: 'View analytical reports' },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight capitalize">Administration Dashboard</h1>
      <p className="text-muted-foreground">Live overview of key metrics.</p>

      {sections.map(section => {
        const keys = section.keys.filter(k => k in kpis);
        if (keys.length === 0) return null;
        return (
          <section key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {keys.map(key => {
                const value = kpis[key];
                const alert = ALERTS[key];
                const active = alert && Number(value) > 0;
                const clickable = !!alert;
                return (
                  <Card
                    key={key}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => openAlert(alert.tab) : undefined}
                    onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') openAlert(alert.tab); } : undefined}
                    className={`overflow-hidden transition-colors ${active ? TONE_CLASSES[alert.tone] : 'hover:bg-muted/10'} ${clickable ? 'cursor-pointer' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {formatKey(key)}
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${active ? TONE_TEXT[alert.tone] : ''}`}>
                        {displayValue(key, value)}
                      </div>
                      {SUBTEXT[key] && <p className="text-xs text-muted-foreground mt-1">{SUBTEXT[key]}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <div id="alerts-section" className="pt-8 scroll-mt-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto gap-1">
            <TabsTrigger value="at_risk" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              At-Risk Students ({atRiskStudents.length})
            </TabsTrigger>
            <TabsTrigger value="missed_classes" className="flex items-center gap-2">
              <CalendarX2 className="h-4 w-4 text-orange-500" />
              Pending Attendance Today ({missedClasses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="at_risk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Students with &lt; {AT_RISK_THRESHOLD}% Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {atRiskStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No students are currently at risk.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Admission No.</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Semester</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Total Eligible Attendance Sessions</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Sessions Attended</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Attendance %</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atRiskStudents.map((student: any) => {
                          const sTotal = Number(student.total_sessions) || 0;
                          const sPresent = Number(student.present_sessions) || 0;
                          const sPerc = student.attendance_percentage !== undefined && student.attendance_percentage !== null
                            ? Number(student.attendance_percentage)
                            : (sTotal > 0 ? Math.round((sPresent / sTotal) * 1000) / 10 : 0);
                          const semDisplay = student.semester_name 
                            ? (student.semester_name.startsWith('Sem') ? student.semester_name : `Sem ${student.semester_name}`)
                            : (student.semester_number ? `Sem ${student.semester_number}` : 'N/A');
                          const classDisplay = student.class_name || (student.class_code || student.section_name || 'Unassigned');
                          
                          return (
                            <TableRow key={student.admission_number || student.student_name}>
                              <TableCell className="font-medium whitespace-nowrap">{student.admission_number || '-'}</TableCell>
                              <TableCell className="font-medium">{student.student_name}</TableCell>
                              <TableCell className="whitespace-nowrap">{classDisplay}</TableCell>
                              <TableCell className="whitespace-nowrap">{semDisplay}</TableCell>
                              <TableCell className="text-right font-medium">{sTotal}</TableCell>
                              <TableCell className="text-right font-medium">{sPresent}</TableCell>
                              <TableCell className="text-right font-semibold text-destructive whitespace-nowrap">
                                {sPerc}%
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <Badge variant="destructive" className="font-semibold">
                                  At Risk
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missed_classes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Classes with Attendance Not Marked Today</CardTitle>
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
          {modules.map(m => (
            <Link key={m.href} href={m.href}>
              <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}