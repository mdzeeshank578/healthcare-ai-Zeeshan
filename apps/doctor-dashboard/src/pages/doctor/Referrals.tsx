import React, { useEffect, useState } from 'react';
import { referralService } from '../../services/referral.service';
import { Referral } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Share2, Building2 } from 'lucide-react';

export const DoctorReferrals: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await referralService.getAll();
        setReferrals(data);
      } catch (err) {
        console.error('Failed to load referrals:', err);
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
        title="Referral Management"
        subtitle="Track patient referral statuses sent to Primary Health Centers."
      />

      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {referrals.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Share2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No active referrals in queue for your Primary Health Centre.</p>
            </div>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block">{r.id}</span>
                    <h4 className="font-bold text-slate-900 text-sm">{r.patientName}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.priority}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{r.destinationPHC}</span>
                </div>

                {r.reason && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {r.reason}
                  </p>
                )}

                <div className="text-[10px] text-slate-400 pt-1">
                  Submitted: {r.createdAt}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">REF ID</th>
                <th className="p-4">PATIENT</th>
                <th className="p-4">DESTINATION PHC</th>
                <th className="p-4">PRIORITY</th>
                <th className="p-4">REASON</th>
                <th className="p-4">CREATED AT</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Share2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No active referrals in queue for your Primary Health Centre.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="p-4 font-bold text-slate-800">{r.patientName}</td>
                    <td className="p-4 font-medium text-slate-700">{r.destinationPHC}</td>
                    <td className="p-4 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          r.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{r.reason}</td>
                    <td className="p-4 text-slate-400">{r.createdAt}</td>
                    <td className="p-4">
                      <StatusBadge status={r.status} />
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