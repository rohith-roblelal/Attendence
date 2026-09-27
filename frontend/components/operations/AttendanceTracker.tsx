'use client';

import { useState, useEffect } from 'react';
import { classSessionsApi } from '../../lib/api/class-sessions';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { studentsApi } from '../../lib/api/students';
import { attendanceApi } from '../../lib/api/attendance';
import { Check, X, AlertCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendanceTracker() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);

  // local state for marking attendance
  const [attendanceMarks, setAttendanceMarks] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});

const fetchBaseData = async () => {
    setLoadingData(true);
    try {
      const [clsRes, sessRes, csRes, subRes] = await Promise.all([
        classesApi.getClasses(),
        classSessionsApi.getAll(),
        classSubjectsApi.getAll(),
        subjectsApi.getSubjects()
      ]);
      setClasses(clsRes.data.data);
      // Only keep non-cancelled sessions that occurred in the past or today
      const validSessions = sessRes.data.data.filter((s: any) => s.status !== 'CANCELLED');
      setSessions(validSessions);
      setClassSubjects(csRes.data.data);
      setSubjects(subRes.data.data);
    } catch (err: any) {
      setError('Failed to fetch foundational data');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionData(selectedSessionId, selectedClassId);
    } else {
      setStudents([]);
      setExistingAttendance([]);
      setAttendanceMarks({});
    }
  }, [selectedSessionId]);

  const fetchSessionData = async (sessionId: number, classId: number) => {
    setLoadingStudents(true);
    setError(null);
    setSuccess(null);
    try {
      const [stuRes, attRes] = await Promise.all([
        studentsApi.getStudents(),
        attendanceApi.getAll({ class_session_id: sessionId })
      ]);
      
      const classStudents = stuRes.data.data.filter((s: any) => s.current_class_id === classId && s.is_active);
      setStudents(classStudents);
      
      const attData = attRes.data.data.filter((a: any) => a.class_session_id === sessionId);
      setExistingAttendance(attData);

      // Initialize marks with existing data, or default to empty
      const initialMarks: Record<number, 'PRESENT' | 'ABSENT'> = {};
      attData.forEach((a: any) => {
        initialMarks[a.student_id] = a.status;
      });
      setAttendanceMarks(initialMarks);

    } catch (err: any) {
      setError('Failed to fetch session students and attendance');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = Number(e.target.value);
    setSelectedClassId(classId);
    setSelectedSessionId(0);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSessionId(Number(e.target.value));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const newMarks = { ...attendanceMarks };
    students.forEach(s => {
      // Don't overwrite existing attendance records with the bulk action to prevent accidental edits
      // Only set for students who haven't been marked yet
      const existing = existingAttendance.find(a => a.student_id === s.id);
      if (!existing) {
        newMarks[s.id] = status;
      }
    });
    setAttendanceMarks(newMarks);
  };

  const markStudent = (studentId: number, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedSessionId) return;
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Separate creates vs updates
      const recordsToCreate = [];
      const recordsToUpdate = [];

      for (const [studentIdStr, status] of Object.entries(attendanceMarks)) {
        const studentId = Number(studentIdStr);
        const existing = existingAttendance.find(a => a.student_id === studentId);
        
        if (existing) {
          if (existing.status !== status) {
            recordsToUpdate.push({ id: existing.id, status, reason: 'Updated via bulk interface' });
          }
        } else {
          recordsToCreate.push({ student_id: studentId, status });
        }
      }

      // Update existing records individually
      if (recordsToUpdate.length > 0) {
        await Promise.all(recordsToUpdate.map(r => attendanceApi.update(r.id, { status: r.status, reason: r.reason })));
      }

      // Bulk insert new records
      if (recordsToCreate.length > 0) {
        await attendanceApi.createBulk({
          class_session_id: selectedSessionId,
          records: recordsToCreate
        });
      }

      setSuccess('Attendance successfully recorded.');
      fetchSessionData(selectedSessionId, selectedClassId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const availableSessions = sessions.filter(s => s.class_id === selectedClassId);

  const getSubjectName = (csId: number) => {
    const cs = classSubjects.find(c => c.id === csId);
    if (!cs) return 'Unknown';
    const sub = subjects.find(s => s.id === cs.subject_id);
    return sub?.name || 'Unknown';
  };

  if (loadingData) return <div className="p-4 text-muted-foreground">Loading foundational data...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded">{success}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>Select Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <select value={selectedClassId} onChange={handleClassChange} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value={0}>Select Class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valid Class Session</Label>
              <select 
                value={selectedSessionId} 
                onChange={handleSessionChange} 
                disabled={!selectedClassId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted"
              >
                <option value={0}>Select Session...</option>
                {availableSessions.sort((a,b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.session_date.split('T')[0]} - P{s.period_number} - {getSubjectName(s.class_subject_id)} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSessionId > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Mark Attendance</h3>
              <p className="text-sm text-muted-foreground">Showing eligible students for this class.</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 cursor-pointer shadow-sm transition-all hover:shadow"
                onClick={() => markAll('PRESENT')}
              >
                Mark Unmarked as Present
              </Button>
              <Button 
                variant="outline"
                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 cursor-pointer shadow-sm transition-all hover:shadow"
                onClick={() => markAll('ABSENT')}
              >
                Mark Unmarked as Absent
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Admission Number</TableHead>
                <TableHead>Historical Status</TableHead>
                <TableHead className="text-center">Mark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStudents ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading students...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No students enrolled in this class.</TableCell></TableRow>
              ) : (
                students.map(student => {
                  const existing = existingAttendance.find(a => a.student_id === student.id);
                  const currentMark = attendanceMarks[student.id];

                  return (
                    <TableRow key={student.id} className={existing && currentMark !== existing.status ? "bg-yellow-50/50" : ""}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.admission_number || '-'}
                      </TableCell>
                      <TableCell>
                        {existing ? (
                          <Badge variant={existing.status === 'PRESENT' ? "default" : "destructive"}>
                            {existing.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not Marked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              className="w-5 h-5 cursor-pointer accent-green-600 rounded bg-background text-foreground"
                              checked={currentMark === 'PRESENT'}
                              onChange={(e) => {
                                setAttendanceMarks(prev => ({ 
                                  ...prev, 
                                  [student.id]: e.target.checked ? 'PRESENT' : 'ABSENT' 
                                }));
                              }}
                            />
                            <span className={`text-sm font-medium select-none ${currentMark === 'PRESENT' ? 'text-green-700' : 'text-muted-foreground'}`}>
                              {currentMark === 'PRESENT' ? 'Present' : 'Absent'}
                            </span>
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="p-4 border-t flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={submitting || students.length === 0}
            >
              {submitting ? 'Saving to Database...' : 'Submit Attendance'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
