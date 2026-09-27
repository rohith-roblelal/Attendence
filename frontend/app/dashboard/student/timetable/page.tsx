'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface TimetableEntry {
  id: number;
  day_of_week: number;
  period_number: number;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/student/timetable');
      setEntries(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Group by day
  const byDay: Record<number, TimetableEntry[]> = {};
  entries.forEach(e => {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
    byDay[e.day_of_week].push(e);
  });

  const days = Object.keys(byDay).map(Number).sort();
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayDayOfWeek = today === 0 ? 7 : today; // convert to 1=Mon...7=Sun

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Timetable</h1>
            <p className="text-muted-foreground mt-1">Your regular weekly class schedule.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2 shrink-0">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Unable to load timetable</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : entries.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No timetable entries found for your class.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {days.map(day => {
              const dayEntries = byDay[day].sort((a, b) => a.period_number - b.period_number);
              const dayName = DAYS[day - 1] || `Day ${day}`;
              const isToday = day === todayDayOfWeek;
              return (
                <Card key={day} className={`border-border/50 shadow-sm ${isToday ? 'ring-2 ring-primary/30' : ''}`}>
                  <CardHeader className="py-3 px-5 border-b border-border/50 flex-row items-center gap-3">
                    <CardTitle className="text-base font-semibold">{dayName}</CardTitle>
                    {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayEntries.map(entry => (
                        <div key={entry.id} className="border border-border/50 rounded-lg p-3 bg-muted/30 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period {entry.period_number}</span>
                            <Badge variant="outline" className="font-mono text-xs">{entry.subject_code}</Badge>
                          </div>
                          <p className="font-medium text-sm text-foreground">{entry.subject_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{entry.teacher_name.trim()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
