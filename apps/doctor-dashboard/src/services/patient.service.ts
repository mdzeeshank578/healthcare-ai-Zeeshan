import { api } from './api';
import { Patient, RiskLevel } from '../types';
import { mockPatients } from '../data/mockPatients';

interface Envelope<T> {
  data: T;
}

const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;

function mapBackendPatientToFrontend(raw: any): Patient {
  const latestAssessment = raw.latestAssessment || (raw.assessments && raw.assessments[0]) || null;
  const latestPrediction = raw.latestPrediction || (latestAssessment?.predictions && latestAssessment.predictions[0]) || null;

  const rawRisk = latestPrediction?.riskLevel || 'LOW';
  const overallRisk: RiskLevel =
    rawRisk === 'HIGH' ? 'HIGH' :
    rawRisk === 'MODERATE' || rawRisk === 'MEDIUM' ? 'MODERATE' :
    rawRisk === 'CRITICAL' ? 'CRITICAL' : 'LOW';

  const predictionsList = (latestAssessment?.predictions && latestAssessment.predictions.length > 0)
    ? latestAssessment.predictions
    : (latestPrediction ? [latestPrediction] : []);

  const diseaseRisks = predictionsList.map((pr: any) => ({
    disease: pr.disease || 'General',
    riskScore: Math.round((pr.probability ?? 0.1) * 100),
    riskLevel: (pr.riskLevel === 'HIGH' ? 'HIGH' : pr.riskLevel === 'MODERATE' || pr.riskLevel === 'MEDIUM' ? 'MODERATE' : 'LOW') as RiskLevel,
  }));

  const reasons = latestPrediction?.reasons || [];
  const explainableFactors = reasons.map((r: any) => ({
    factor: r.feature || r.reason || 'Clinical Indicator',
    importance: Math.min(100, Math.max(10, Math.round((r.value ? Number(r.value) : 50)))),
    description: r.message || r.reason || 'Contributed to overall risk score',
  }));

  const villageName = typeof raw.village === 'string'
    ? raw.village
    : (raw.village?.name || 'Local Village');

  const ashaName = raw.registeredBy?.fullName || raw.conductedBy?.fullName || raw.ashaWorkerName || 'Testing ASHA';
  const ashaId = raw.registeredBy?.id || raw.registeredById || raw.ashaWorkerId || '';

  const vitals = {
    bloodPressureSys: latestAssessment?.systolicBp ?? latestAssessment?.restingBloodPressure ?? 120,
    bloodPressureDia: latestAssessment?.diastolicBp ?? 80,
    bloodSugar: latestAssessment?.glucose ?? 95,
    temperature: latestAssessment?.temperatureC ? Math.round((latestAssessment.temperatureC * 9/5 + 32) * 10) / 10 : 98.6,
    spo2: latestAssessment?.oxygenSaturation ?? 98,
    weight: latestAssessment?.weightKg ?? 60,
    height: latestAssessment?.heightCm ?? 160,
    bmi: latestAssessment?.bmi ?? 23.4,
  };

  const lastAssessmentDate = latestAssessment?.createdAt
    ? new Date(latestAssessment.createdAt).toISOString().split('T')[0]
    : (raw.updatedAt ? new Date(raw.updatedAt).toISOString().split('T')[0] : 'Not Assessed');

  const aiRecommendation = latestPrediction?.triage
    ? latestPrediction.triage
    : (overallRisk === 'HIGH'
      ? 'Patient exhibits elevated health risk indicators. Urgent clinical review and PHC consultation recommended.'
      : 'Patient vitals within manageable baseline. Maintain periodic follow-up and monitoring.');

  return {
    id: raw.id,
    name: raw.fullName || raw.name || 'Unnamed Patient',
    age: raw.age || 0,
    gender: raw.gender === 'FEMALE' ? 'Female' : raw.gender === 'MALE' ? 'Male' : 'Other',
    village: villageName,
    phone: raw.phone || 'N/A',
    ashaWorkerName: ashaName,
    ashaWorkerId: ashaId,
    smokingStatus: latestAssessment?.smokingStatus === 'SMOKER' ? 'Yes' : 'No',
    familyHistoryDiabetes: Boolean(latestAssessment?.diabetesPedigreeFunction),
    familyHistoryHypertension: Boolean(latestAssessment?.familyHistoryHypertension),
    vitals,
    overallRisk,
    diseaseRisks: diseaseRisks.length > 0 ? diseaseRisks : [
      { disease: 'Hypertension', riskScore: 12, riskLevel: 'LOW' },
      { disease: 'Diabetes', riskScore: 8, riskLevel: 'LOW' }
    ],
    explainableFactors: explainableFactors.length > 0 ? explainableFactors : [
      { factor: 'Baseline Profile', importance: 25, description: 'ASHA community registration completed' }
    ],
    aiRecommendation,
    lastAssessmentDate,
  };
}

export const patientService = {
  async getAll(): Promise<Patient[]> {
    try {
      let items: any[] = [];
      try {
        const res = await api.get<Envelope<{ items: any[] }>>('/doctors/me/patients', {
          params: { limit: 100 }
        });
        items = unwrap(res).items;
      } catch {
        const res = await api.get<Envelope<{ items: any[] }>>('/patients', {
          params: { limit: 100 }
        });
        items = unwrap(res).items;
      }

      if (items && items.length > 0) {
        return items.map(mapBackendPatientToFrontend);
      }
      return [];
    } catch (e) {
      console.warn('Failed to fetch patients from API, using fallback:', e);
      const stored = localStorage.getItem('healthai_patients');
      return stored ? JSON.parse(stored) : mockPatients;
    }
  },

  async getById(id: string): Promise<Patient | undefined> {
    try {
      let p: any = null;
      try {
        const res = await api.get<Envelope<any>>(`/doctors/me/patients/${id}`);
        p = unwrap(res);
      } catch {
        const res = await api.get<Envelope<any>>(`/patients/${id}/summary`);
        const summary = unwrap(res);
        p = {
          ...summary.patient,
          assessments: summary.latestAssessment ? [summary.latestAssessment] : [],
          referrals: summary.activeReferrals || [],
          appointments: summary.upcomingAppointment ? [summary.upcomingAppointment] : [],
        };
      }

      if (p) {
        return mapBackendPatientToFrontend(p);
      }
    } catch (e) {
      console.warn('Failed to fetch patient by id from API:', e);
    }
    const patients = await this.getAll();
    return patients.find((p) => p.id === id);
  }
};