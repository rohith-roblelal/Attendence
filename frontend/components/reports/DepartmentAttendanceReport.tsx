'use client';

import { useState, useEffect } from 'react';
import { reportsApi } from '../../lib/api/reports';
import { academicApi } from '../../lib/api/academic';

export default function DepartmentAttendanceReport() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number>(0);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await academicApi.getDepartments();
      setDepartments(res.data.data.filter((d: any) => d.is_active));
    } catch (err) {
      setError('Failed to load departments list');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (selectedDepartmentId) {
      fetchReport(selectedDepartmentId);
    } else {
      setReportData([]);
    }
  }, [selectedDepartmentId]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await reportsApi.getDepartmentAttendance(id);
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
        <label className="block text-sm font-medium text-gray-700">Select Department</label>
        <select 
          value={selectedDepartmentId} 
          onChange={(e) => setSelectedDepartmentId(Number(e.target.value))} 
          className="mt-1 block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
        >
          <option value={0}>Choose a department...</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {loadingList && <p className="text-xs text-gray-500 mt-1">Loading departments...</p>}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {selectedDepartmentId > 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Department Class Aggregates</h3>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Active Students</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Records</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present Records</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Attendance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingReport ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Generating report...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No data found for this department.</td></tr>
              ) : (
                reportData.map((row, idx) => {
                  const percentage = row.percentage ? parseFloat(row.percentage) : 0;
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.student_count || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.total_records || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-center">{row.present_records || 0}</td>
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
