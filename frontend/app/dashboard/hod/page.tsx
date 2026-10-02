'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "../../../lib/api/client";

const formatKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();

// Alert cards are detected by key name; adjust the patterns to match your API keys.
const alertTone = (key: string, value: unknown): 'danger' | 'warning' | null => {
  if (!(Number(value) > 0)) return null;
  if (/risk/i.test(key)) return 'danger';
  if (/missing|pending/i.test(key)) return 'warning';
  return null;
};

const TONE_CARD = {
  danger: 'border-red-500/50 bg-red-50 dark:bg-red-950/20',
  warning: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20',
};
const TONE_TEXT = {
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const flattenObj = (ob: any) => {
  let result: any = {};
  for (const i in ob) {
    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      Object.assign(result, flattenObj(ob[i]));
    } else {
      result[i] = ob[i];
    }
  }
  return result;
};

const cell = (v: unknown) => (v === null || v === undefined || v === '' ? 'N/A' : String(v));

export default function HodPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/dashboard/hod');
        setData(flattenObj(response.data.data));
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const entries = data ? Object.entries(data) : [];
  const kpis = entries.filter(([, v]) => !Array.isArray(v));
  const lists = entries.filter(([, v]) => Array.isArray(v) && (v as any[]).length >= 0) as [string, any[]][];
  const activeTab = tab || lists[0]?.[0] || '';

  const departmentName = data?.department_name || data?.department;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">HOD Dashboard</h1>
      <p className="text-muted-foreground">
        {departmentName ? `Live overview of the ${departmentName} department.` : 'Live overview of your department.'}
      </p>

      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><CardTitle className="h-4 w-1/2 bg-muted rounded animate-pulse"></CardTitle></CardHeader>
              <CardContent><div className="h-8 w-1/3 bg-muted rounded animate-pulse"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="mt-6"><CardContent className="pt-6 text-destructive">Could not load the dashboard. Refresh the page to try again.</CardContent></Card>
      ) : data ? (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-6">
            {kpis.map(([key, value]) => {
              const tone = alertTone(key, value);
              return (
                <Card key={key} className={`overflow-hidden transition-colors ${tone ? TONE_CARD[tone] : 'hover:bg-muted/10'}`}>
                  <CardHeader className="pb-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {formatKey(key)}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${tone ? TONE_TEXT[tone] : ''}`}>{cell(value)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {lists.length > 0 && (
            <div className="pt-8">
              <Tabs value={activeTab} onValueChange={setTab} className="w-full">
                <TabsList className="flex w-full md:w-auto flex-wrap h-auto">
                  {lists.map(([key, rows]) => (
                    <TabsTrigger key={key} value={key} className="capitalize">
                      {formatKey(key)} ({rows.length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {lists.map(([key, rows]) => {
                  const columns = rows.length ? Object.keys(rows[0]) : [];
                  return (
                    <TabsContent key={key} value={key} className="mt-4">
                      <Card>
                        <CardHeader><CardTitle className="capitalize">{formatKey(key)}</CardTitle></CardHeader>
                        <CardContent>
                          {rows.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nothing to show here.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {columns.map(c => <TableHead key={c} className="capitalize">{formatKey(c)}</TableHead>)}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((row, i) => (
                                  <TableRow key={i}>
                                    {columns.map(c => <TableCell key={c}>{cell(row[c])}</TableCell>)}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </>
      ) : (
        <Card className="mt-6"><CardContent className="pt-6">No data available.</CardContent></Card>
      )}
    </div>
  );
}