import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patient.service';
import { Patient } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Search, Eye, Users, ChevronRight } from 'lucide-react';

export const DoctorPatients: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [villageFilter, setVillageFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await patientService.getAll();
        setPatients(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const villages = Array.from(new Set(patients.map((p) => p.village).filter(Boolean)));

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.toLowerCase().includes(search.toLowerCase()));
    const matchesRisk = riskFilter === 'ALL' || p.overallRisk === riskFilter;
    const matchesVillage = villageFilter === 'ALL' || p.village === villageFilter;
    return matchesSearch && matchesRisk && matchesVillage;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Patients Register"
        subtitle="Manage and review all registered rural community patients."
      />

      <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#1976D2] transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#1976D2]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MODERATE">Moderate Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#1976D2]"
          >
            <option value="ALL">All Villages</option>
            {villages.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No patients match your search criteria.</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{patient.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{patient.id}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {patient.age} yrs · {patient.village}
                    </p>
                  </div>
                  <RiskBadge risk={patient.overallRisk || 'LOW'} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Blood Pressure</span>
                    <span className="font-mono font-bold text-slate-800">
                      {patient.vitals?.bloodPressureSys
                        ? `${patient.vitals.bloodPressureSys}/${patient.vitals.bloodPressureDia} mmHg`
                        : '—'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-medium">Blood Sugar</span>
                    <span className="font-mono font-bold text-slate-800">
                      {patient.vitals?.bloodSugar ? `${patient.vitals.bloodSugar} mg/dL` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Last Visit: {patient.lastAssessmentDate || 'None'}
                  </span>
                  <button
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                    className="px-3.5 py-1.5 bg-[#1976D2] hover:bg-[#0D47A1] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">PATIENT</th>
                <th className="p-4">AGE</th>
                <th className="p-4">VILLAGE</th>
                <th className="p-4">BLOOD PRESSURE</th>
                <th className="p-4">BLOOD SUGAR</th>
                <th className="p-4">RISK STATUS</th>
                <th className="p-4">LAST ASSESSMENT</th>
                <th className="p-4">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {patient.name}
                      <span className="block text-[10px] font-normal text-slate-400">{patient.id}</span>
                    </td>
                    <td className="p-4">{patient.age} yrs</td>
                    <td className="p-4">{patient.village}</td>
                    <td className="p-4 font-mono font-semibold">
                      {patient.vitals?.bloodPressureSys
                        ? `${patient.vitals.bloodPressureSys}/${patient.vitals.bloodPressureDia}`
                        : '—'}
                    </td>
                    <td className="p-4 font-mono font-semibold">
                      {patient.vitals?.bloodSugar ? `${patient.vitals.bloodSugar} mg/dL` : '—'}
                    </td>
                    <td className="p-4">
                      <RiskBadge risk={patient.overallRisk || 'LOW'} size="sm" />
                    </td>
                    <td className="p-4 text-slate-500">{patient.lastAssessmentDate || 'None'}</td>
                    <td className="p-4">
                      <button
                        onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                        className="px-3 py-1.5 bg-[#1976D2] text-white font-semibold rounded-lg hover:bg-[#0D47A1] transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Profile
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