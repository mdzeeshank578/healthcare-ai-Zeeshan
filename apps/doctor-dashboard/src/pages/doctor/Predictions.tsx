import React, { useEffect, useState } from 'react';
import { predictionService, PredictionStatistics } from '../../services/prediction.service';
import { Prediction } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Brain, Sparkles, Activity } from 'lucide-react';

export const DoctorPredictions: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<PredictionStatistics>({
    totalPredictions: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    diseases: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pData, sData] = await Promise.all([
          predictionService.getAll(),
          predictionService.getStatistics(),
        ]);
        setPredictions(pData);
        setStats(sData);
      } catch (err) {
        console.error('Failed to load predictions data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const totalRuns = stats.totalPredictions || predictions.length * 3;
  const highRiskCount = stats.highRisk || predictions.filter((p) => p.overallRisk === 'HIGH').length;
  const moderateRiskCount = stats.mediumRisk || predictions.filter((p) => p.overallRisk === 'MODERATE').length;
  const lowRiskCount = stats.lowRisk || predictions.filter((p) => p.overallRisk === 'LOW').length;

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'font-bold text-rose-600';
    if (risk >= 40) return 'font-semibold text-amber-600';
    return 'text-slate-600 font-medium';
  };

  const getRiskBg = (risk: number) => {
    if (risk >= 70) return 'bg-rose-50 border-rose-100 text-rose-700';
    if (risk >= 40) return 'bg-amber-50 border-amber-100 text-amber-700';
    return 'bg-slate-50 border-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="AI Disease Risk Analytics"
        subtitle="Machine learning probabilistic predictions across target NCD disease models."
      />

      {/* 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Model Runs</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalRuns}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">High Risk</span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">{highRiskCount}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Moderate</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{moderateRiskCount}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Low Risk</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{lowRiskCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#1976D2]" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Patient Multi-Disease Prediction Matrix</h3>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Decision Support Active
          </span>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No patient predictions recorded yet for your Primary Health Centre.</p>
            </div>
          ) : (
            predictions.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.patientName}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {p.age > 0 ? `${p.age} yrs · ` : ''}{p.village}
                    </p>
                    <span className="text-[10px] text-slate-400">{p.date}</span>
                  </div>
                  <RiskBadge risk={p.overallRisk} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2 rounded-xl border ${getRiskBg(p.diabetesRisk)}`}>
                    <span className="text-[10px] opacity-75 block font-medium">Diabetes Risk</span>
                    <span className="font-bold">{p.diabetesRisk}%</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${getRiskBg(p.hypertensionRisk)}`}>
                    <span className="text-[10px] opacity-75 block font-medium">Hypertension</span>
                    <span className="font-bold">{p.hypertensionRisk}%</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${getRiskBg(p.heartDiseaseRisk)}`}>
                    <span className="text-[10px] opacity-75 block font-medium">Heart Disease</span>
                    <span className="font-bold">{p.heartDiseaseRisk}%</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${getRiskBg(p.ckdRisk)}`}>
                    <span className="text-[10px] opacity-75 block font-medium">Kidney (CKD)</span>
                    <span className="font-bold">{p.ckdRisk}%</span>
                  </div>
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
                <th className="p-4">VILLAGE</th>
                <th className="p-4">DIABETES</th>
                <th className="p-4">HYPERTENSION</th>
                <th className="p-4">HEART DISEASE</th>
                <th className="p-4">ANEMIA</th>
                <th className="p-4">CKD</th>
                <th className="p-4">OVERALL RISK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No patient predictions recorded yet for your Primary Health Centre.
                  </td>
                </tr>
              ) : (
                predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {p.patientName}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {p.age > 0 ? `${p.age} yrs` : ''} · {p.date}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{p.village}</td>
                    <td className={`p-4 ${getRiskColor(p.diabetesRisk)}`}>{p.diabetesRisk}%</td>
                    <td className={`p-4 ${getRiskColor(p.hypertensionRisk)}`}>{p.hypertensionRisk}%</td>
                    <td className={`p-4 ${getRiskColor(p.heartDiseaseRisk)}`}>{p.heartDiseaseRisk}%</td>
                    <td className={`p-4 ${getRiskColor(p.anemiaRisk)}`}>{p.anemiaRisk}%</td>
                    <td className={`p-4 ${getRiskColor(p.ckdRisk)}`}>{p.ckdRisk}%</td>
                    <td className="p-4">
                      <RiskBadge risk={p.overallRisk} size="sm" />
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