'use client';

import { useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import StudentAttendanceReport from '../../../../components/reports/StudentAttendanceReport';
import ClassAttendanceReport from '../../../../components/reports/ClassAttendanceReport';
import SubjectAttendanceReport from '../../../../components/reports/SubjectAttendanceReport';
import DepartmentAttendanceReport from '../../../../components/reports/DepartmentAttendanceReport';

const TABS = [
  { id: 'student', label: 'Student Attendance', component: StudentAttendanceReport },
  { id: 'class', label: 'Class Attendance', component: ClassAttendanceReport },
  { id: 'subject', label: 'Subject Attendance', component: SubjectAttendanceReport },
  { id: 'department', label: 'Department Attendance', component: DepartmentAttendanceReport },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || StudentAttendanceReport;

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-gray-600 text-sm">
          View authoritative attendance summaries across different dimensions. All calculations are performed directly on the backend ensuring strict adherence to contact-hour rules and session integrity.
        </p>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          <ActiveComponent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
