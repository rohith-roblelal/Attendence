'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { classesApi } from '../../lib/api/classes';

export default function ClassAttendanceReport() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await classesApi.getClasses();
      setClasses(res.data.data.filter((c: any) => c.status === 'ACTIVE'));
    } catch (err) {
      setError('Failed to load classes list');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchReport(selectedClassId);
    } else {
      setReportData([]);
    }
  }, [selectedClassId]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getClassAttendance(id);
      setReportData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700">Select Class</label>
        <select 
          value={selectedClassId} 
          onChange={(e) => setSelectedClassId(Number(e.target.value))} 
          className="mt-1 block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
        >
          <option value={0}>Choose a class...</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.class_code || c.section_name}
            </option>
          ))}
        </select>
        {loadingList && <p className="text-xs text-gray-500 mt-1">Loading classes...</p>}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {selectedClassId > 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Student Attendance Summary</h3>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Number</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sessions</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingReport ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Generating report...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No attendance data found for this class.</td></tr>
              ) : (
                reportData.map((row, idx) => {
                  const percentage = row.percentage ? parseFloat(row.percentage) : 0;
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.first_name} {row.last_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.admission_number || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.total_sessions || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-center">{row.present_sessions || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium text-center">{row.absent_sessions || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span className={`px-2 py-1 rounded ${percentage >= 75 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
