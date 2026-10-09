import React, { useEffect, useState } from 'react';
import { assessmentService } from '../../services/assessment.service';
import { Assessment } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ClipboardList, User } from 'lucide-react';

export const DoctorAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await assessmentService.getAll();
        setAssessments(data);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Field Assessments"
        subtitle="Real-time clinical intake stream submitted from community health visits."
      />

      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {assessments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No field assessments submitted yet by community ASHA workers.</p>
            </div>
          ) : (
            assessments.map((a) => (
              <div key={a.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{a.patientName}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {a.village} · {a.date}
                    </p>
                  </div>
                  <RiskBadge risk={a.overallRisk} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">BP</span>
                    <span className="font-mono font-bold text-slate-800">
                      {a.vitals.bloodPressureSys}/{a.vitals.bloodPressureDia}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">Sugar</span>
                    <span className="font-mono font-bold text-slate-800">
                      {a.vitals.bloodSugar}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 block font-medium">BMI</span>
                    <span className="font-mono font-bold text-slate-800">
                      {a.vitals.bmi}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {a.ashaWorkerName}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">PATIENT</th>
                <th className="p-4">DATE</th>
                <th className="p-4">VILLAGE</th>
                <th className="p-4">ASHA WORKER</th>
                <th className="p-4">BP</th>
                <th className="p-4">SUGAR</th>
                <th className="p-4">BMI</th>
                <th className="p-4">AI RISK</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No field assessments submitted yet by community ASHA workers.
                  </td>
                </tr>
              ) : (
                assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {a.patientName}
                      <span className="block text-[10px] font-mono font-normal text-slate-400 mt-0.5">
                        {a.patientId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{a.date}</td>
                    <td className="p-4 text-slate-700 font-medium">{a.village}</td>
                    <td className="p-4 text-slate-700">{a.ashaWorkerName}</td>
                    <td className="p-4 font-mono font-medium">
                      {a.vitals.bloodPressureSys}/{a.vitals.bloodPressureDia}
                    </td>
                    <td className="p-4 font-mono font-medium">{a.vitals.bloodSugar} mg/dL</td>
                    <td className="p-4 font-mono font-medium">{a.vitals.bmi}</td>
                    <td className="p-4">
                      <RiskBadge risk={a.overallRisk} size="sm" />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};