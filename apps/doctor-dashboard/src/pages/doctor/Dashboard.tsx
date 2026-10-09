import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patient.service';
import { referralService } from '../../services/referral.service';
import { Patient, Referral } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { RiskBadge } from '../../components/common/RiskBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { authService } from '../../services/auth.service';
import { authStorage } from '../../services/auth.storage';
import { api } from '../../services/api';
import { formatDoctorGreetingName, getTimeBasedGreeting } from '../../utils/doctor.utils';
import {
  Users,
  AlertTriangle,
  Flame,
  Share2,
  ChevronRight,
  Eye,
  Activity,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState<string>(() => {
    const u = authService.getCurrentUser();
    return formatDoctorGreetingName(u?.name);
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [pData, rData] = await Promise.all([
          patientService.getAll(),
          referralService.getAll(),
        ]);
        setPatients(pData);
        setReferrals(rData);

        try {
          const profile = await api.get<{ success: boolean; data: { fullName?: string } }>('/doctors/me');
          if (profile.data?.data?.fullName) {
            const rawName = profile.data.data.fullName;
            setDoctorName(formatDoctorGreetingName(rawName));
            const current = authService.getCurrentUser();
            if (current && current.name !== rawName) {
              const updated = { ...current, name: rawName };
              setUserSession(updated);
            }
          }
        } catch {
          // fallback to cached session
        }
      } finally {
        setLoading(false);
      }
    }

    function setUserSession(updatedUser: any) {
      const token = authStorage.getAccessToken();
      const refresh = authStorage.getRefreshToken();
      if (token && refresh) authStorage.setSession(token, refresh, updatedUser);
    }

    loadData();
  }, []);

  if (loading) return <LoadingSpinner />;

  const highRiskPatients = patients.filter(
    (p) => p.overallRisk === 'HIGH' || p.overallRisk === 'CRITICAL'
  );
  const urgentCases = highRiskPatients.length;
  const villageCount = new Set(patients.map((p) => p.village).filter(Boolean)).size;

  const diseaseDistributionData = [
    {
      name: 'Diabetes',
      count: patients.filter((p) =>
        p.diseaseRisks.some(
          (r) =>
            r.disease.toUpperCase().includes('DIABETES') &&
            (r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
        )
      ).length,
      color: '#EF4444',
    },
    {
      name: 'Hypertension',
      count: patients.filter((p) =>
        p.diseaseRisks.some(
          (r) =>
            r.disease.toUpperCase().includes('HYPERTENSION') &&
            (r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
        )
      ).length,
      color: '#F59E0B',
    },
    {
      name: 'Heart Risk',
      count: patients.filter((p) =>
        p.diseaseRisks.some(
          (r) =>
            r.disease.toUpperCase().includes('HEART') &&
            (r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
        )
      ).length,
      color: '#0284C7',
    },
    {
      name: 'Anemia',
      count: patients.filter((p) =>
        p.diseaseRisks.some(
          (r) =>
            r.disease.toUpperCase().includes('ANEMIA') &&
            (r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
        )
      ).length,
      color: '#10B981',
    },
    {
      name: 'CKD',
      count: patients.filter((p) =>
        p.diseaseRisks.some(
          (r) =>
            r.disease.toUpperCase().includes('CKD') &&
            (r.riskLevel === 'HIGH' || r.riskLevel === 'MODERATE')
        )
      ).length,
      color: '#8B5CF6',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 sm:p-2.5 bg-sky-600 rounded-xl text-white shadow-xs shrink-0">
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <PageHeader
              title={`${getTimeBasedGreeting()}, ${doctorName} 👋`}
              subtitle="Rural primary healthcare intake & AI clinical overview."
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 self-start md:self-auto shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PHC Live Sync</span>
        </div>
      </div>

      {/* Primary Metric Cards - 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Patients"
          value={patients.length}
          icon={Users}
          trend={patients.length > 0 ? `${patients.length} enrolled` : '0 enrolled'}
          trendDirection="up"
          subtitle={villageCount > 0 ? `${villageCount} village${villageCount > 1 ? 's' : ''}` : 'Primary centre'}
        />
        <StatCard
          title="High Risk"
          value={highRiskPatients.length}
          icon={AlertTriangle}
          trend={highRiskPatients.length > 0 ? `${highRiskPatients.length} priority` : 'None flagged'}
          trendDirection={highRiskPatients.length > 0 ? 'up' : 'down'}
          badgeColor="bg-red-50 text-red-600 border border-red-100"
        />
        <StatCard
          title="Urgent Alerts"
          value={urgentCases}
          icon={Flame}
          trend={urgentCases > 0 ? 'Immediate' : 'Normal tone'}
          trendDirection={urgentCases > 0 ? 'up' : 'down'}
          badgeColor="bg-amber-50 text-amber-600 border border-amber-100"
        />
        <StatCard
          title="Referrals"
          value={referrals.length}
          icon={Share2}
          trend={referrals.length > 0 ? `${referrals.length} active` : 'Queue clear'}
          badgeColor="bg-sky-50 text-sky-700 border border-sky-100"
        />
      </div>

      {/* Analytics & Referrals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Chart View */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Disease Risk Distribution</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Case volumes by risk category</p>
            </div>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-700 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="h-48 sm:h-64 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseaseDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {diseaseDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Referrals Queue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Recent Referrals</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">From community visits</p>
            </div>
            <button
              onClick={() => navigate('/doctor/referrals')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center"
            >
              View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[260px]">
            {referrals.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Share2 className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No active referrals in queue.</p>
              </div>
            ) : (
              referrals.slice(0, 4).map((ref) => (
                <div
                  key={ref.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-sky-200 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{ref.patientName}</p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">{ref.destinationPHC}</p>
                    <span className="text-[10px] text-slate-400 block">{ref.createdAt}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ref.priority === 'Urgent'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ref.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* High-Risk Patient Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">High Risk Patients Requiring Attention</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Prioritized by AI risk thresholds</p>
          </div>
          <button
            onClick={() => navigate('/doctor/patients')}
            className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-lg hover:bg-sky-100 transition-colors flex items-center space-x-1 shrink-0"
          >
            <span>All Patients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {highRiskPatients.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-xs font-medium">All registered patients are currently within normal or moderate risk thresholds.</p>
            </div>
          ) : (
            highRiskPatients.map((patient) => (
              <div key={patient.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{patient.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">{patient.age} yrs · {patient.village}</span>
                  </div>
                  <RiskBadge risk={patient.overallRisk} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Blood Pressure</span>
                    <span className="font-mono font-bold text-red-600">{patient.vitals.bloodPressureSys}/{patient.vitals.bloodPressureDia} mmHg</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Blood Sugar</span>
                    <span className="font-mono font-bold text-red-600">{patient.vitals.bloodSugar} mg/dL</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  className="w-full py-2 bg-sky-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> View Patient Profile
                </button>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Patient</th>
                <th className="p-4">Age</th>
                <th className="p-4">Village</th>
                <th className="p-4">Blood Pressure</th>
                <th className="p-4">Blood Sugar</th>
                <th className="p-4">Risk Level</th>
                <th className="p-4">AI Prediction</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {highRiskPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    All registered patients are currently within normal or moderate risk thresholds.
                  </td>
                </tr>
              ) : (
                highRiskPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {patient.name}
                      <span className="block text-[10px] font-mono font-normal text-slate-400 mt-0.5">
                        {patient.id}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{patient.age} yrs</td>
                    <td className="p-4 text-slate-600 font-medium">{patient.village}</td>
                    <td className="p-4 font-mono font-bold text-red-600">
                      {patient.vitals.bloodPressureSys}/{patient.vitals.bloodPressureDia}{' '}
                      <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-red-600">
                      {patient.vitals.bloodSugar}{' '}
                      <span className="text-[10px] font-normal text-slate-400">mg/dL</span>
                    </td>
                    <td className="p-4">
                      <RiskBadge risk={patient.overallRisk} size="sm" />
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 font-semibold">
                        {patient.diseaseRisks
                          .filter((r) => r.riskLevel === 'HIGH')
                          .map((r) => r.disease)
                          .join(' + ') || 'Normal'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                        className="px-3 py-1.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Patient
                      </button>
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