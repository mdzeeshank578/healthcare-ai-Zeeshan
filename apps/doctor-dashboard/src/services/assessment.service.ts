import { api } from './api';
import { Assessment, RiskLevel } from '../types';

function mapBackendAssessmentToFrontend(raw: any): Assessment {
  const predictions = raw.predictions || [];
  let overallRisk: RiskLevel = 'LOW';
  if (predictions.some((p: any) => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL')) {
    overallRisk = 'HIGH';
  } else if (predictions.some((p: any) => p.riskLevel === 'MODERATE' || p.riskLevel === 'MEDIUM')) {
    overallRisk = 'MODERATE';
  }

  const sys = raw.systolicBp ?? raw.restingBloodPressure ?? 120;
  const dia = raw.diastolicBp ?? 80;
  const sugar = raw.glucose ?? 95;
  const temp = raw.temperatureC ? Math.round((raw.temperatureC * (9 / 5) + 32) * 10) / 10 : 98.6;
  const spo2 = raw.oxygenSaturation ?? 98;
  const weight = raw.weightKg ?? 60;
  const height = raw.heightCm ?? 160;
  const bmi = raw.bmi ?? (weight && height ? Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10 : 23.4);

  const dateStr = raw.createdAt ? new Date(raw.createdAt).toISOString().split('T')[0] : '';

  return {
    id: raw.id,
    patientId: raw.patientId,
    patientName: raw.patient?.fullName || 'Unknown Patient',
    village: raw.patient?.village?.name || raw.village || 'Local Village',
    date: dateStr,
    ashaWorkerName: raw.conductedBy?.fullName || raw.ashaWorkerName || 'Community Health Worker',
    vitals: {
      bloodPressureSys: sys,
      bloodPressureDia: dia,
      bloodSugar: sugar,
      temperature: temp,
      spo2,
      weight,
      height,
      bmi,
    },
    overallRisk,
    status: raw.status === 'COMPLETED' ? 'Pending Review' : 'Pending Review',
  };
}

export const assessmentService = {
  async getAll(): Promise<Assessment[]> {
    try {
      const response = await api.get('/assessments', { params: { limit: 100 } });
      const rawList = response.data?.data?.assessments || response.data?.data || [];
      if (Array.isArray(rawList)) {
        return rawList.map(mapBackendAssessmentToFrontend);
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      return [];
    }
  },
};