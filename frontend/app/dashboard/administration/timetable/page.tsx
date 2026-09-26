'use client';

import { useState } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import RegularTimetable from '../../../../components/timetable/RegularTimetable';
import DailyTimetableChanges from '../../../../components/timetable/DailyTimetableChanges';

const TABS = [
  { id: 'regular', label: 'Regular Timetable', component: RegularTimetable },
  { id: 'daily', label: 'Daily Changes & Substitutions', component: DailyTimetableChanges },
];

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || RegularTimetable;

  return (
    <ProtectedRoute allowedRoles={['ADMINISTRATION']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
        
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
