import React, { useEffect, useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  X, 
  UserCheck, 
  Stethoscope, 
  HeartHandshake, 
  Filter
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { UserModal } from '../../components/admin/UserModal';
import { adminService, PhcAshaWorker, PhcDoctor, PhcVillage } from '../../services/admin.service';
import { toast } from '../../utils/toast';

interface EditStaffState {
  type: 'doctor' | 'asha';
  id: string;
  fullName: string;
  email?: string;
  specialization?: string;
  employeeCode?: string;
  villageId?: string;
}

interface DeleteStaffState {
  type: 'doctor' | 'asha';
  id: string;
  name: string;
}

export const AdminUsers: React.FC = () => {
  const [doctors, setDoctors] = useState<PhcDoctor[]>([]);
  const [workers, setWorkers] = useState<PhcAshaWorker[]>([]);
  const [villages, setVillages] = useState<PhcVillage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INVITED' | 'INACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'DOCTOR' | 'ASHA'>('ALL');

  // Edit & Delete modal states
  const [editingStaff, setEditingStaff] = useState<EditStaffState | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<DeleteStaffState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const [doctorItems, workerItems, villageItems] = await Promise.all([
        adminService.getDoctors(),
        adminService.getAshaWorkers(),
        adminService.getVillages(),
      ]);
      setDoctors(doctorItems);
      setWorkers(workerItems);
      setVillages(villageItems);
    } catch {
      toast.error('Unable to load PHC staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSearch =
        doc.fullName.toLowerCase().includes(search.toLowerCase()) ||
        doc.email.toLowerCase().includes(search.toLowerCase()) ||
        (doc.specialization && doc.specialization.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [doctors, search, statusFilter]);

  // Filtered ASHA Workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesSearch =
        worker.fullName.toLowerCase().includes(search.toLowerCase()) ||
        worker.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        worker.village.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || worker.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workers, search, statusFilter]);

  // Status Toggle
  const handleToggleStatus = async (type: 'doctor' | 'asha', id: string, currentStatus: string) => {
    try {
      if (type === 'doctor') {
        if (currentStatus === 'ACTIVE') {
          await adminService.deactivateDoctor(id);
          toast.success('Doctor deactivated successfully.');
        } else {
          await adminService.activateDoctor(id);
          toast.success('Doctor activated successfully.');
        }
      } else {
        if (currentStatus === 'ACTIVE') {
          await adminService.deactivateAshaWorker(id);
          toast.success('ASHA worker deactivated successfully.');
        } else {
          await adminService.activateAshaWorker(id);
          toast.success('ASHA worker activated successfully.');
        }
      }
      load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status.';
      toast.error(message);
    }
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setActionLoading(true);
    try {
      if (editingStaff.type === 'doctor') {
        await adminService.updateDoctor(editingStaff.id, {
          fullName: editingStaff.fullName,
          specialization: editingStaff.specialization,
        });
        toast.success('Doctor details updated successfully.');
      } else {
        await adminService.updateAshaWorker(editingStaff.id, {
          fullName: editingStaff.fullName,
          employeeCode: editingStaff.employeeCode,
          villageId: editingStaff.villageId,
        });
        toast.success('ASHA worker details updated successfully.');
      }
      setEditingStaff(null);
      load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update staff member.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setActionLoading(true);
    try {
      if (deletingStaff.type === 'doctor') {
        await adminService.deleteDoctor(deletingStaff.id);
        toast.success(`Doctor ${deletingStaff.name} removed successfully.`);
      } else {
        await adminService.deleteAshaWorker(deletingStaff.id);
        toast.success(`ASHA worker ${deletingStaff.name} removed successfully.`);
      }
      setDeletingStaff(null);
      load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to remove staff member.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="PHC Staff Management"
        subtitle="Invite, update staff profiles, toggle active status, and manage PHC members."
        action={
          <button
            onClick={() => setModal(true)}
            className="px-4 py-2.5 bg-[#1976D2] hover:bg-[#0D47A1] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add staff
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, code, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter('DOCTOR')}
              className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'DOCTOR' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Doctors
            </button>
            <button
              onClick={() => setRoleFilter('ASHA')}
              className={`px-3 py-1.5 rounded-lg transition-all ${roleFilter === 'ASHA' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ASHA Workers
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1976D2]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Doctors Table */}
      {(roleFilter === 'ALL' || roleFilter === 'DOCTOR') && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-[#1976D2] rounded-lg">
                <Stethoscope className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Doctors
                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-semibold">
                  {filteredDoctors.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-4 px-6">NAME</th>
                  <th className="p-4">EMAIL</th>
                  <th className="p-4">SPECIALIZATION</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.length ? (
                  filteredDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                            {doc.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{doc.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{doc.email}</td>
                      <td className="p-4 text-slate-700">
                        {doc.specialization ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                            {doc.specialization}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="p-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit Doctor"
                            onClick={() =>
                              setEditingStaff({
                                type: 'doctor',
                                id: doc.id,
                                fullName: doc.fullName,
                                email: doc.email,
                                specialization: doc.specialization || '',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-[#1976D2] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            title={doc.status === 'ACTIVE' ? 'Deactivate Doctor' : 'Activate Doctor'}
                            onClick={() => handleToggleStatus('doctor', doc.id, doc.status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              doc.status === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {doc.status === 'ACTIVE' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            title="Remove Doctor"
                            onClick={() =>
                              setDeletingStaff({
                                type: 'doctor',
                                id: doc.id,
                                name: doc.fullName,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No doctors matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ASHA Workers Table */}
      {(roleFilter === 'ALL' || roleFilter === 'ASHA') && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                ASHA Workers
                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-semibold">
                  {filteredWorkers.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-4 px-6">NAME</th>
                  <th className="p-4">EMPLOYEE CODE</th>
                  <th className="p-4">ASSIGNED VILLAGE</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.length ? (
                  filteredWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {worker.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{worker.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-600">{worker.employeeCode}</td>
                      <td className="p-4 text-slate-700">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-medium border border-emerald-100">
                          {worker.village.name}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={worker.status} />
                      </td>
                      <td className="p-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit ASHA Worker"
                            onClick={() =>
                              setEditingStaff({
                                type: 'asha',
                                id: worker.id,
                                fullName: worker.fullName,
                                employeeCode: worker.employeeCode,
                                villageId: worker.village.id,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-[#1976D2] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            title={worker.status === 'ACTIVE' ? 'Deactivate Worker' : 'Activate Worker'}
                            onClick={() => handleToggleStatus('asha', worker.id, worker.status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              worker.status === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {worker.status === 'ACTIVE' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            title="Remove ASHA Worker"
                            onClick={() =>
                              setDeletingStaff({
                                type: 'asha',
                                id: worker.id,
                                name: worker.fullName,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No ASHA workers matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add Staff Modal */}
      <UserModal
        isOpen={modal}
        villages={villages}
        onClose={() => setModal(false)}
        onSuccess={load}
      />

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#1976D2]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit {editingStaff.type === 'doctor' ? 'Doctor' : 'ASHA Worker'}
                </h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.fullName}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, fullName: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1976D2] focus:bg-white"
                />
              </div>

              {editingStaff.type === 'doctor' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={editingStaff.specialization || ''}
                    placeholder="e.g. General Medicine, Pediatrics"
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, specialization: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1976D2] focus:bg-white"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.employeeCode || ''}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, employeeCode: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1976D2] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Village</label>
                    <select
                      required
                      value={editingStaff.villageId || ''}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, villageId: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1976D2] focus:bg-white"
                    >
                      <option value="">Select a village</option>
                      {villages.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1976D2] hover:bg-[#0D47A1] text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Remove {deletingStaff.type === 'doctor' ? 'Doctor' : 'ASHA Worker'}?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to remove <span className="font-semibold text-slate-800">{deletingStaff.name}</span>? Their access to the platform will be immediately revoked.
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setDeletingStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors shadow-xs"
                >
                  {actionLoading ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Status Badge Helper
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full font-semibold text-[11px]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'INVITED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full font-semibold text-[11px]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Invited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-semibold text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
};
