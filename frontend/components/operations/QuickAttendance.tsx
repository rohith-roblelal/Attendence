'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { classSessionsApi } from '../../lib/api/class-sessions';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { studentsApi } from '../../lib/api/students';
import { attendanceApi } from '../../lib/api/attendance';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/AuthContext';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuickAttendance() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATION';

  const [classes, setClasses] = useState<any[]>([]);
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
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  
  const [activeSessionId, setActiveSessionId] = useState<number>(0);
  const [showPopup, setShowPopup] = useState(false);

  // local state for marking attendance
  const [attendanceMarks, setAttendanceMarks] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});

  const fetchBaseData = async () => {
    setLoadingData(true);
    try {
      if (isAdmin) {
        const [clsRes, csRes, subRes] = await Promise.all([
          classesApi.getClasses(),
          classSubjectsApi.getAll(),
          subjectsApi.getSubjects()
        ]);
        setClasses(clsRes.data.data.filter((c: any) => c.status === 'ACTIVE'));
        setClassSubjects(csRes.data.data);
        setSubjects(subRes.data.data);
      } else {
        const [teacherRes, subRes] = await Promise.all([
          apiClient.get('/dashboard/teacher'),
          subjectsApi.getSubjects()
        ]);
        
        const teacherData = teacherRes.data.data;
        // Map assignments to match the shape expected by the UI
        const mappedSubjects = (teacherData.assignments || []).map((a: any) => ({
          id: a.class_subject_id || a.id,
          class_id: a.class_id,
          subject_id: a.subject_id,
          is_active: true
        }));
        
        setClasses(teacherData.classes || []);
        setClassSubjects(mappedSubjects);
        setSubjects(subRes.data.data);
      }
    } catch (err: any) {
      setError('Failed to fetch foundational data');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(Number(e.target.value));
    setSelectedClassSubjectId(0);
    resetSession();
  };

  const resetSession = () => {
    setActiveSessionId(0);
    setStudents([]);
    setExistingAttendance([]);
    setAttendanceMarks({});
    setError(null);
    setSuccess(null);
  };

  const handleStartSession = async () => {
    if (!selectedClassId || !selectedClassSubjectId || !selectedDate || !selectedPeriod) {
      setError('Please fill in all session details first.');
      return;
    }

    setLoadingStudents(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Check if session exists or create a new one
      let sessionId = 0;
      const allSessionsRes = await classSessionsApi.getAll();
      const existingSession = allSessionsRes.data.data.find((s: any) => 
        s.class_id === selectedClassId &&
        s.class_subject_id === selectedClassSubjectId &&
        s.session_date.split('T')[0] === selectedDate &&
        s.period_number === selectedPeriod
      );

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        // Create it
        const createRes = await classSessionsApi.create({
          class_id: selectedClassId,
          class_subject_id: selectedClassSubjectId,
          session_date: selectedDate,
          period_number: selectedPeriod,
          status: 'CONDUCTED', // Mark conducted automatically to skip pending state
          source: 'DIRECT_ENTRY'
        });
        sessionId = createRes.data.data.id;
      }

      setActiveSessionId(sessionId);

      // 2. Fetch students and attendance
      const [stuRes, attRes] = await Promise.all([
        studentsApi.getStudents(),
        attendanceApi.getAll({ class_session_id: sessionId })
      ]);
      
      const classStudents = stuRes.data.data.filter((s: any) => s.current_class_id === selectedClassId && s.status === 'ACTIVE');
      setStudents(classStudents);
      
      const attData = attRes.data.data.filter((a: any) => a.class_session_id === sessionId);
      setExistingAttendance(attData);

      // 3. Initialize marks
      const initialMarks: Record<number, 'PRESENT' | 'ABSENT'> = {};
      classStudents.forEach((s: any) => {
        const existing = attData.find((a: any) => a.student_id === s.id);
        // Default to absent if not marked yet to make tick-to-present easier
        initialMarks[s.id] = existing ? existing.status : 'ABSENT';
      });
      setAttendanceMarks(initialMarks);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start or load session.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const newMarks = { ...attendanceMarks };
    students.forEach(s => {
      newMarks[s.id] = status;
    });
    setAttendanceMarks(newMarks);
  };

  const handleSubmit = async () => {
    if (!activeSessionId) return;
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const recordsToCreate = [];
      const recordsToUpdate = [];

      for (const [studentIdStr, status] of Object.entries(attendanceMarks)) {
        const studentId = Number(studentIdStr);
        const existing = existingAttendance.find(a => a.student_id === studentId);
        
        if (existing) {
          if (existing.status !== status) {
            recordsToUpdate.push({ id: existing.id, status, reason: 'Updated via quick attendance' });
          }
        } else {
          recordsToCreate.push({ student_id: studentId, status });
        }
      }

      // Update existing
      if (recordsToUpdate.length > 0) {
        await Promise.all(recordsToUpdate.map(r => attendanceApi.update(r.id, { status: r.status, reason: r.reason })));
      }

      // Create new
      if (recordsToCreate.length > 0) {
        await attendanceApi.createBulk({
          class_session_id: activeSessionId,
          records: recordsToCreate
        });
      }

      setSuccess('Attendance successfully recorded!');
      setShowPopup(true);
      setTimeout(() => {
        router.push('/dashboard/teacher');
      }, 2000);
      
      // Refresh the existing attendance list so colors update
      const attRes = await attendanceApi.getAll({ class_session_id: activeSessionId });
      const attData = attRes.data.data.filter((a: any) => a.class_session_id === activeSessionId);
      setExistingAttendance(attData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const availableClassSubjects = classSubjects.filter(cs => cs.class_id === selectedClassId && cs.is_active);

  const getSubjectName = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  if (loadingData) return <div className="p-4 text-muted-foreground">Loading foundational data...</div>;

  return (
    <div className="space-y-6 relative">
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground dark:bg-zinc-900 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center transform animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-8 h-8 animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_reverse]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground dark:text-white mb-2 text-center">Success!</h3>
            <p className="text-muted-foreground dark:text-muted-foreground text-center mb-6">
              Attendance successfully recorded. Returning to dashboard...
            </p>
            <div className="w-full bg-muted dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full animate-[progress_2s_ease-in-out_forwards]" />
            </div>
            <style>{`
              @keyframes progress {
                from { width: 0% }
                to { width: 100% }
              }
            `}</style>
          </div>
        </div>
      )}
      
      {error && <div className="bg-red-50 text-destructive p-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded">{success}</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <select value={selectedClassId} onChange={handleClassChange} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value={0}>Select Class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.batch_name} - {c.semester_name} (Sec {c.section_name})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Subject</Label>
              <select 
                value={selectedClassSubjectId} 
                onChange={(e) => { setSelectedClassSubjectId(Number(e.target.value)); resetSession(); }} 
                disabled={!selectedClassId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value={0}>Select Subject...</option>
                {availableClassSubjects.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {getSubjectName(cs.subject_id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => { setSelectedDate(e.target.value); resetSession(); }} 
              />
            </div>

            <div className="space-y-2">
              <Label>Period/Hour</Label>
              <select 
                value={selectedPeriod} 
                onChange={(e) => { setSelectedPeriod(Number(e.target.value)); resetSession(); }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6].map(p => (
                  <option key={p} value={p}>Hour {p}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleStartSession} 
              disabled={!selectedClassId || !selectedClassSubjectId || loadingStudents}
              className="w-full md:w-auto"
            >
              {loadingStudents ? 'Loading Students...' : 'Load Students & Mark Attendance'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeSessionId > 0 && (
        <Card className="overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Mark Attendance</h3>
              <p className="text-sm text-muted-foreground">Click the checkbox to mark a student as Present. They are absent by default.</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 cursor-pointer shadow-sm transition-all hover:shadow"
                onClick={() => markAll('PRESENT')}
              >
                Mark ALL Present
              </Button>
              <Button 
                variant="outline"
                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 cursor-pointer shadow-sm transition-all hover:shadow"
                onClick={() => markAll('ABSENT')}
              >
                Mark ALL Absent
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
              {students.length === 0 ? (
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
                          <span className="text-muted-foreground text-sm">Not Saved</span>
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
                            <span className={`text-sm font-medium select-none w-16 text-left ${currentMark === 'PRESENT' ? 'text-green-700 font-bold' : 'text-muted-foreground'}`}>
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
              className="w-full md:w-auto"
            >
              {submitting ? 'Saving to Database...' : 'Submit Attendance'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
