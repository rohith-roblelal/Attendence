'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Database,
  GraduationCap,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';

import { apiClient } from '../../../lib/api/client';
import { formatKeyTitleCase as formatKey } from '../../../lib/utils/formatters';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tone = 'danger' | 'warning' | 'default';


const flattenObj = (obj: Record<string, any>) => {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObj(value));
    } else {
      result[key] = value;
    }
  }

  return result;
};

const cell = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const alertTone = (key: string, value: unknown): Tone => {
  if (!(Number(value) > 0)) return 'default';

  if (/risk|overdue|critical|absent/i.test(key)) return 'danger';

  if (/missing|pending|warning/i.test(key)) return 'warning';

  return 'default';
};

const getIcon = (key: string) => {
  if (/department/i.test(key)) return Building2;
  if (/student/i.test(key)) return Users;
  if (/teacher|faculty/i.test(key)) return GraduationCap;
  if (/class|semester|subject/i.test(key)) return BookOpen;
  if (/academic|year/i.test(key)) return CalendarDays;
  if (/attendance|present|record/i.test(key)) return ClipboardCheck;
  if (/risk|missing|pending|alert/i.test(key)) return AlertTriangle;
  if (/database|total/i.test(key)) return Database;

  return Activity;
};

const toneStyles: Record<Tone, string> = {
  default: 'text-primary bg-primary/10',
  danger: 'text-red-600 bg-red-500/10 dark:text-red-400',
  warning: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
};

export default function HodPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (yearId?: number) => {
    setLoading(true);
    setError(false);
    setErrorMessage(null);

    try {
      const url = yearId ? `/dashboard/hod?academic_year_id=${yearId}` : '/dashboard/hod';
      const response = await apiClient.get(url);
      const payload = response.data?.data;

      if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.academic_years) && payload.academic_years.length > 0) {
          setAcademicYears(payload.academic_years);
          if (!yearId && !selectedYear) {
            const currentYearId = payload.context?.academic_year_name 
              ? payload.academic_years.find((y: any) => y.name === payload.context.academic_year_name)?.id
              : payload.academic_years[0].id;
            if (currentYearId) setSelectedYear(String(currentYearId));
          }
        }
        setData(flattenObj(payload));
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch HOD dashboard:', err);
      setError(true);
      setErrorMessage(err?.response?.data?.message || null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'HOD') {
      setError(true);
      setErrorMessage(`Access restricted. Your current account (${user.username}) has role "${user.role}", which cannot access the HOD dashboard.`);
      setLoading(false);
      return;
    }
    void fetchData();
  }, [authLoading, user, router, fetchData]);

  const handleYearChange = (yearIdStr: string | null) => {
    if (!yearIdStr) return;
    setSelectedYear(yearIdStr);
    fetchData(parseInt(yearIdStr, 10));
  };

  const entries = useMemo(
    () => (data ? Object.entries(data) : []),
    [data],
  );

  const kpis = useMemo(
    () =>
      entries.filter(
        ([key, value]) =>
          !Array.isArray(value) &&
          !/^(department_name|department)$/i.test(key),
      ),
    [entries],
  );

  const lists = useMemo(
    () =>
      entries.filter(
        ([, value]) => Array.isArray(value),
      ) as [string, any[]][],
    [entries],
  );

  const activeTab = lists.some(([key]) => key === tab)
    ? tab
    : lists[0]?.[0] ?? '';

  const departmentName =
    data?.department_name || data?.department || 'Your Department';

  const academicYear =
    data?.academic_year_name ||
    data?.academic_year ||
    data?.academicYear ||
    null;

  const filteredRows = useMemo(() => {
    const rows = lists.find(([key]) => key === activeTab)?.[1] ?? [];
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row ?? {}).some((value) =>
        cell(value).toLowerCase().includes(query),
      ),
    );
  }, [lists, activeTab, search]);

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">

        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Department Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              HOD Dashboard
            </h1>

            <p className="text-sm text-muted-foreground sm:text-base">
              Monitor your department, academic records, and attendance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {academicYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</span>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-full sm:w-[170px] bg-background">
                    <SelectValue placeholder="Select Academic Year">
                      {(val: any) => {
                        const found = academicYears.find((y) => String(y.id) === String(val));
                        return found ? found.name : val || 'Select Academic Year';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => void fetchData(selectedYear ? parseInt(selectedYear, 10) : undefined)}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && !data ? (
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item}>
                  <CardContent className="space-y-4 p-6">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center max-w-lg mx-auto">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  {errorMessage?.toLowerCase().includes('forbidden') || errorMessage?.toLowerCase().includes('permissions')
                    ? 'Access Restricted'
                    : 'Unable to Load Dashboard'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {errorMessage?.toLowerCase().includes('forbidden') || errorMessage?.toLowerCase().includes('permissions')
                    ? 'Your current account does not have an active HOD role or department assignment. Please log in with an assigned HOD account (e.g. hod_cse) or assign an HOD to your department in the Administration settings.'
                    : errorMessage || 'Please check your connection and try again.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={() => void fetchData()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                {errorMessage?.toLowerCase().includes('forbidden') && (
                  <Button variant="outline" onClick={() => window.location.href = '/dashboard/administration'}>
                    Go to Admin Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Department overview */}
            <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
              <CardContent className="relative p-6 sm:p-8">
                <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Department Overview
                    </Badge>

                    <div className="space-y-2">
                      <h2 className="max-w-3xl text-xl font-bold leading-tight sm:text-3xl">
                        {departmentName}
                      </h2>

                      <p className="max-w-2xl text-sm text-primary-foreground/80 sm:text-base">
                        Your department information and academic records,
                        all in one place.
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <div className="rounded-lg bg-white/15 p-3">
                      <CalendarDays className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-xs text-primary-foreground/75">
                        Academic Year
                      </p>
                      <p className="text-lg font-semibold">
                        {academicYear ? cell(academicYear) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI cards */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Department Statistics</h2>
                <p className="text-sm text-muted-foreground">
                  A quick summary of your department data.
                </p>
              </div>

              {kpis.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {kpis.map(([key, value]) => {
                    const tone = alertTone(key, value);
                    const Icon = getIcon(key);

                    return (
                      <Card
                        key={key}
                        className="group rounded-2xl border-border/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                {formatKey(key)}
                              </p>

                              <p className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                                {cell(value)}
                              </p>
                            </div>

                            <div
                              className={`shrink-0 rounded-xl p-3 ${toneStyles[tone]}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {tone === 'danger' ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                Requires attention
                              </>
                            ) : tone === 'warning' ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                Pending review
                              </>
                            ) : (
                              <>
                                <Activity className="h-3.5 w-3.5" />
                                Department overview
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No statistics are currently available.
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Dynamic record tables */}
            {lists.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Academic Records</h2>
                  <p className="text-sm text-muted-foreground">
                    Browse the records available to your department.
                  </p>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(value) => {
                    setTab(value);
                    setSearch('');
                  }}
                  className="w-full space-y-4"
                >
                  <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-xl border bg-background p-1 sm:min-w-0">
                      {lists.map(([key, rows]) => {
                        const Icon = getIcon(key);

                        return (
                          <TabsTrigger
                            key={key}
                            value={key}
                            className="gap-2 whitespace-nowrap rounded-lg px-4 py-2.5"
                          >
                            <Icon className="h-4 w-4" />
                            {formatKey(key)}
                            <Badge
                              variant="secondary"
                              className="ml-1 h-5 min-w-5 justify-center px-1.5 text-xs"
                            >
                              {rows.length}
                            </Badge>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  {lists.map(([key, rows]) => {
                    const columns = rows.reduce<string[]>((result, row) => {
                      if (row && typeof row === 'object' && !Array.isArray(row)) {
                        for (const column of Object.keys(row)) {
                          if (!result.includes(column)) result.push(column);
                        }
                      }

                      return result;
                    }, []);

                    const Icon = getIcon(key);

                    return (
                      <TabsContent
                        key={key}
                        value={key}
                        className="mt-0 focus-visible:outline-none"
                      >
                        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
                          <CardHeader className="border-b bg-muted/30 p-4 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                  <Icon className="h-5 w-5 text-primary" />
                                  {formatKey(key)}
                                </CardTitle>

                                <CardDescription>
                                  Showing {filteredRows.length} of {rows.length} records.
                                </CardDescription>
                              </div>

                              <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  placeholder="Search in table..."
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  className="pl-9"
                                />
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-0">
                            {filteredRows.length === 0 ? (
                              <div className="py-12 text-center text-sm text-muted-foreground">
                                {search.trim() ? 'No matching records found.' : 'No records available.'}
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      {columns.map((col) => (
                                        <TableHead key={col} className="whitespace-nowrap">
                                          {formatKey(col)}
                                        </TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {filteredRows.map((row: any, idx: number) => (
                                      <TableRow key={idx} className="hover:bg-muted/30">
                                        {columns.map((col) => (
                                          <TableCell key={col} className="whitespace-nowrap">
                                            {cell(row[col])}
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
