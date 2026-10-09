import { api } from './api';
import { Referral, ReferralPriority, ReferralStatus } from '../types';

export const referralService = {
  async getAll(): Promise<Referral[]> {
    try {
      const response = await api.get('/doctors/me/referrals');
      const list = response.data?.data?.referrals || response.data?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => {
          const rawPriority = String(item.priority || '').toUpperCase();
          const priority: ReferralPriority =
            rawPriority === 'URGENT' ? 'Urgent' : rawPriority === 'HIGH' ? 'High' : 'Normal';

          const rawStatus = String(item.status || '').toUpperCase();
          const status: ReferralStatus =
            rawStatus === 'ACCEPTED'
              ? 'Accepted'
              : rawStatus === 'COMPLETED'
              ? 'Completed'
              : rawStatus === 'REJECTED'
              ? 'Rejected'
              : 'Pending';

          return {
            id: item.id,
            patientId: item.patientId,
            patientName: item.patient?.fullName || 'Patient',
            patientAge: item.patient?.age || 0,
            patientVillage: item.patient?.village?.name || 'Local Village',
            reason: item.reason || 'Clinical Referral',
            priority,
            destinationPHC: item.toPhc?.name || 'Assigned PHC',
            referredByDoctorId: item.referredById || '',
            referredByDoctorName: item.referredBy?.fullName || 'Doctor',
            status,
            notes: item.notes || '',
            createdAt: item.createdAt
              ? new Date(item.createdAt).toLocaleString('en-US', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '',
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch backend referrals, checking local store:', err);
    }

    const stored = localStorage.getItem('healthai_referrals');
    return stored ? JSON.parse(stored) : [];
  },

  async create(referralData: Omit<Referral, 'id' | 'createdAt' | 'status'>): Promise<Referral> {
    const referrals = await this.getAll();
    const newReferral: Referral = {
      ...referralData,
      id: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Pending',
      createdAt: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
    };

    const updated = [newReferral, ...referrals];
    localStorage.setItem('healthai_referrals', JSON.stringify(updated));
    return newReferral;
  },
};