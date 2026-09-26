'use client';

import { useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import AcademicYears from '../../../../components/academic/AcademicYears';
import Departments from '../../../../components/academic/Departments';
import Specializations from '../../../../components/academic/Specializations';
import AdmissionBatches from '../../../../components/academic/AdmissionBatches';
import Semesters from '../../../../components/academic/Semesters';
import Classes from '../../../../components/academic/Classes';

const TABS = [
  { id: 'academic-years', label: 'Academic Years', component: AcademicYears },
  { id: 'departments', label: 'Departments', component: Departments },
  { id: 'specializations', label: 'Specializations', component: Specializations },
  { id: 'admission-batches', label: 'Admission Batches', component: AdmissionBatches },
  { id: 'semesters', label: 'Semesters', component: Semesters },
  { id: 'classes', label: 'Classes & Sections', component: Classes },
];

export default function AcademicStructurePage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || AcademicYears;

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Academic Structure</h1>
        
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
