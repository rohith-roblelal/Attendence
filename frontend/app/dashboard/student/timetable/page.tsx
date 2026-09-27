'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "../../../../lib/api/client";
import { Calendar as CalendarIcon, Clock, BookOpen, User } from 'lucide-react';

export default function StudentTimetablePage() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await apiClient.get('/dashboard/student/timetable');
        setTimetable(response.data.data);
      } catch (err: any) {
        console.error("Failed to fetch timetable", err);
        setError(err.response?.data?.message || 'Failed to load timetable. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Find the maximum period number to render enough columns
  const maxPeriod = timetable.length > 0 ? Math.max(...timetable.map(t => t.period_number)) : 5;
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-muted-foreground mt-2">Loading your schedule...</p>
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
        <p className="text-muted-foreground mt-2">View your weekly class schedule assigned by your teachers.</p>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 text-red-800">
          <CardContent className="pt-6">{error}</CardContent>
        </Card>
      ) : timetable.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-12 flex flex-col items-center">
            <CalendarIcon className="h-12 w-12 text-muted mb-4" />
            <p className="text-lg font-medium text-foreground">No timetable available</p>
            <p>Your teachers have not scheduled any classes for you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid" style={{ gridTemplateColumns: `120px repeat(${maxPeriod}, 1fr)` }}>
                {/* Header Row */}
                <div className="bg-muted/50 p-4 font-semibold text-sm border-b border-r text-center">Day</div>
                {periods.map(p => (
                  <div key={p} className="bg-muted/50 p-4 font-semibold text-sm border-b border-r text-center flex flex-col items-center justify-center">
                    <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
                    Period {p}
                  </div>
                ))}

                {/* Grid Rows */}
                {days.map((dayName, dayIdx) => {
                  const dayOfWeek = dayIdx + 1; // 1=Monday
                  const dayEntries = timetable.filter(t => t.day_of_week === dayOfWeek);
                  
                  // Only render days that actually have classes, or always render Monday-Friday
                  if (dayEntries.length === 0 && (dayOfWeek === 6 || dayOfWeek === 7)) return null;

                  return (
                    <React.Fragment key={dayOfWeek}>
                      {/* Row Header (Day) */}
                      <div className="p-4 font-medium text-sm border-b border-r bg-muted/10 flex items-center justify-center">
                        {dayName}
                      </div>

                      {/* Period Cells */}
                      {periods.map(periodNum => {
                        const entry = dayEntries.find(t => t.period_number === periodNum);
                        
                        return (
                          <div key={periodNum} className="border-b border-r p-2 hover:bg-muted/5 transition-colors h-full min-h-[100px]">
                            {entry ? (
                              <div className="h-full bg-blue-50/50 border border-blue-100 rounded-md p-3 flex flex-col gap-2 shadow-sm">
                                <div className="font-semibold text-blue-900 text-sm leading-tight">
                                  {entry.subject_name}
                                </div>
                                <div className="flex items-center text-xs text-blue-700/80 mt-auto">
                                  <User className="h-3 w-3 mr-1" />
                                  <span className="truncate" title={entry.teacher_name}>{entry.teacher_name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted/30">
                                -
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
