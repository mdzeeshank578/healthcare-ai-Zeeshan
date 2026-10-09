import React, { useEffect, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { appointmentService, Appointment } from '../../services/appointment.service';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from '../../utils/toast';

export const DoctorAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setAppointments(await appointmentService.listDoctor({ date }));
    } catch {
      toast.error('Unable to load your appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const action = async (id: string, operation: 'confirm' | 'start' | 'complete' | 'noShow') => {
    try {
      await ({
        confirm: appointmentService.confirm,
        start: appointmentService.start,
        complete: appointmentService.complete,
        noShow: appointmentService.noShow,
      }[operation])(id);
      toast.success('Appointment updated.');
      load();
    } catch {
      toast.error('This appointment cannot be updated right now.');
    }
  };

  const filtered = appointments.filter((item) =>
    item.patient.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Consultation Calendar"
        subtitle="Your scheduled PHC consultations and visit status."
      />

      <div className="bg-white p-3.5 sm:p-4 border border-slate-200 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row gap-2.5 sm:gap-3 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <CalendarDays className="w-4 h-4 text-[#1976D2] shrink-0" />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="text-xs font-semibold bg-transparent outline-none text-slate-700 w-full"
          />
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient name..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1976D2]"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-xl sm:rounded-2xl border border-slate-200 text-center text-slate-400">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium">No consultations scheduled for {date}.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 justify-between shadow-xs"
            >
              <div>
                <p className="font-bold text-slate-900 text-sm sm:text-base">{item.patient.fullName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(item.scheduledAt).toLocaleString()} · {item.durationMinutes} minutes
                </p>
                {item.reason && <p className="text-xs text-slate-600 mt-1.5">{item.reason}</p>}
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                <span className="px-2.5 py-1 bg-blue-50 text-[#1976D2] text-[10px] font-bold rounded-lg uppercase">
                  {item.status}
                </span>
                {item.status === 'SCHEDULED' && (
                  <button
                    onClick={() => action(item.id, 'confirm')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#1976D2] hover:bg-[#0D47A1] text-white rounded-xl transition-colors shadow-xs"
                  >
                    Confirm
                  </button>
                )}
                {item.status === 'CONFIRMED' && (
                  <button
                    onClick={() => action(item.id, 'start')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#1976D2] hover:bg-[#0D47A1] text-white rounded-xl transition-colors shadow-xs"
                  >
                    Start visit
                  </button>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => action(item.id, 'complete')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-xs"
                  >
                    Complete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
