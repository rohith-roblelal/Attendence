'use client';

import { useState, useEffect } from 'react';
import { classSessionsApi } from '../../lib/api/class-sessions';
import { classesApi } from '../../lib/api/classes';
import { classSubjectsApi } from '../../lib/api/class-subjects';
import { subjectsApi } from '../../lib/api/subjects';
import { studentsApi } from '../../lib/api/students';
import { attendanceApi } from '../../lib/api/attendance';
import { Check, X, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    fetchBaseData();
  }, []);

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

  if (loadingData) return <div className="p-4 text-gray-500">Loading foundational data...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded">{success}</div>}
      
      <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
        <h3 className="font-semibold text-lg mb-4">Select Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Class</label>
            <select value={selectedClassId} onChange={handleClassChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select Class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.class_code || c.section_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valid Class Session</label>
            <select 
              value={selectedSessionId} 
              onChange={handleSessionChange} 
              disabled={!selectedClassId}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 disabled:bg-gray-100"
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
      </div>

      {selectedSessionId > 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
              <p className="text-sm text-gray-500">Showing eligible students for this class.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => markAll('PRESENT')}
                className="bg-green-50 text-green-700 px-3 py-1.5 rounded text-sm hover:bg-green-100 border border-green-200"
              >
                Mark Unmarked as Present
              </button>
              <button 
                onClick={() => markAll('ABSENT')}
                className="bg-red-50 text-red-700 px-3 py-1.5 rounded text-sm hover:bg-red-100 border border-red-200"
              >
                Mark Unmarked as Absent
              </button>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Historical Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mark</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingStudents ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No students enrolled in this class.</td></tr>
              ) : (
                students.map(student => {
                  const existing = existingAttendance.find(a => a.student_id === student.id);
                  const currentMark = attendanceMarks[student.id];

                  return (
                    <tr key={student.id} className={existing && currentMark !== existing.status ? "bg-yellow-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.admission_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {existing ? (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${existing.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {existing.status}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not Marked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center gap-4">
                          <button 
                            onClick={() => markStudent(student.id, 'PRESENT')}
                            className={`p-2 rounded-full border ${currentMark === 'PRESENT' ? 'bg-green-600 text-white border-green-600' : 'text-gray-400 border-gray-300 hover:bg-gray-100'}`}
                            title="Present"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => markStudent(student.id, 'ABSENT')}
                            className={`p-2 rounded-full border ${currentMark === 'ABSENT' ? 'bg-red-600 text-white border-red-600' : 'text-gray-400 border-gray-300 hover:bg-gray-100'}`}
                            title="Absent"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="p-4 border-t border-gray-200 flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={submitting || students.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {submitting ? 'Saving to Database...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
