'use client';

import { useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Subjects from '../../../../components/academic/Subjects';
import ClassSubjects from '../../../../components/assignments/ClassSubjects';

const TABS = [
  { id: 'subjects', label: 'Subjects Database', component: Subjects },
  { id: 'class-subjects', label: 'Class-Subject Assignments', component: ClassSubjects },
];

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || Subjects;

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Subjects Management</h1>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
