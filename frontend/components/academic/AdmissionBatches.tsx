'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { academicApi } from '../../lib/api/academic';

const admissionBatchSchema = z.object({
  academic_year_id: z.number().int().positive('Academic Year is required'),
  department_id: z.number().int().positive('Department is required'),
  specialization_id: z.number().int().positive().nullable().optional(),
  batch_name: z.string().min(1, 'Name is required').max(50),
  admission_year: z.number().int().min(2000).max(2100),
});

type AdmissionBatchFormData = z.infer<typeof admissionBatchSchema>;

export default function AdmissionBatches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<AdmissionBatchFormData>({
    resolver: zodResolver(admissionBatchSchema),
  });

  const selectedDeptId = watch('department_id');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, yearRes, deptRes, specRes] = await Promise.all([
        academicApi.getAdmissionBatches(),
        academicApi.getAcademicYears(),
        academicApi.getDepartments(),
        academicApi.getSpecializations()
      ]);
      setBatches(batchRes.data.data);
      setYears(yearRes.data.data);
      setDepartments(deptRes.data.data);
      setSpecializations(specRes.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AdmissionBatchFormData) => {
    setError(null);
    try {
      if (data.specialization_id === 0 || !data.specialization_id) {
        data.specialization_id = null;
      }
      
      if (isEditing && currentId) {
        await academicApi.updateAdmissionBatch(currentId, data);
      } else {
        await academicApi.createAdmissionBatch(data);
      }
      reset();
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editBatch = (batch: any) => {
    setIsEditing(true);
    setCurrentId(batch.id);
    reset({
      academic_year_id: batch.academic_year_id,
      department_id: batch.department_id,
      specialization_id: batch.specialization_id || 0,
      batch_name: batch.batch_name,
      admission_year: batch.admission_year,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentId(null);
    reset({ academic_year_id: 0, department_id: 0, specialization_id: 0, batch_name: '', admission_year: new Date().getFullYear() });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-lg">{isEditing ? 'Edit' : 'Create'} Admission Batch</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select {...register('academic_year_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select...</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            {errors.academic_year_id && <p className="text-red-500 text-xs mt-1">{errors.academic_year_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select {...register('department_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>Select...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.department_id && <p className="text-red-500 text-xs mt-1">{errors.department_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Specialization (Optional)</label>
            <select {...register('specialization_id', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
              <option value={0}>None</option>
              {specializations.filter(s => s.department_id === selectedDeptId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.specialization_id && <p className="text-red-500 text-xs mt-1">{errors.specialization_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Batch Name</label>
            <input {...register('batch_name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. 2026-2030 CS" />
            {errors.batch_name && <p className="text-red-500 text-xs mt-1">{errors.batch_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Admission Year</label>
            <input type="number" {...register('admission_year', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="e.g. 2026" />
            {errors.admission_year && <p className="text-red-500 text-xs mt-1">{errors.admission_year.message}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </button>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No batches found.</td></tr>
            ) : (
              batches.map(batch => {
                const dept = departments.find(d => d.id === batch.department_id);
                const spec = specializations.find(s => s.id === batch.specialization_id);
                return (
                  <tr key={batch.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batch_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.admission_year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept?.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{spec ? spec.code : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => editBatch(batch)} className="text-blue-600 hover:text-blue-900">Edit</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
