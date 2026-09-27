'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { apiClient } from '../../../../lib/api/client';
import { RefreshCw, Calendar, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableEntry {
  id: number;
  day_of_week: number;
  period_number: number;
  subject_name: string;
  subject_code: string;
  class_name: string;
}

export default function TeacherTimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard/teacher/timetable');
      setTimetable(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTimetable(); }, []);

  const entriesByDay: Record<number, TimetableEntry[]> = {};
  DAYS.forEach((_, idx) => { entriesByDay[idx + 1] = []; });
  timetable.forEach(entry => {
    if (entriesByDay[entry.day_of_week]) {
      entriesByDay[entry.day_of_week].push(entry);
    }
  });

  const currentDayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  const todayEntries = entriesByDay[currentDayIndex] || [];

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'TUTOR', 'HOD']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Timetable</h1>
            <p className="text-muted-foreground mt-1">Your weekly teaching schedule across all classes.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTimetable} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTimetable}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {todayEntries.length > 0 && (
              <Card className="border-primary/50 shadow-md bg-primary/5 dark:bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Clock className="w-5 h-5" />
                      Today's Schedule
                    </CardTitle>
                    <Badge>{DAYS[currentDayIndex - 1]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap gap-4">
                  {todayEntries.map(entry => (
                    <div key={entry.id} className="flex-1 min-w-[200px] bg-background border border-border p-4 rounded-lg shadow-sm">
                      <div className="text-sm font-semibold text-primary mb-1">Period {entry.period_number}</div>
                      <div className="font-medium">{entry.subject_name}</div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Badge variant="outline">{entry.class_name}</Badge>
                        <span className="text-xs">{entry.subject_code}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DAYS.map((dayName, idx) => {
                const dayNum = idx + 1;
                const dayEntries = entriesByDay[dayNum];
                const isToday = currentDayIndex === dayNum;

                return (
                  <Card key={dayNum} className={`border-border/50 shadow-sm ${isToday ? 'ring-2 ring-primary/50' : ''}`}>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{dayName}</CardTitle>
                        <Badge variant="secondary">{dayEntries.length} Classes</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {dayEntries.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No classes</div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {dayEntries.map(entry => (
                            <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-primary">Period {entry.period_number}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{entry.class_name}</Badge>
                              </div>
                              <div className="font-medium text-sm leading-snug">{entry.subject_name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{entry.subject_code}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
