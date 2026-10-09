import { api } from './api';
import { Prediction, RiskLevel } from '../types';

export interface PredictionStatistics {
  totalPredictions: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  diseases: Record<string, { total: number; highRisk: number }>;
}

export const predictionService = {
  async getAll(): Promise<Prediction[]> {
    try {
      const response = await api.get('/assessments', { params: { limit: 100 } });
      const rawList = response.data?.data?.assessments || response.data?.data || [];
      if (!Array.isArray(rawList)) return [];

      const matrixRows: Prediction[] = [];

      for (const asm of rawList) {
        const preds = asm.predictions || [];
        if (preds.length === 0) continue;

        const findPred = (name: string) =>
          preds.find((p: any) => p.disease?.toUpperCase() === name.toUpperCase());

        const diab = findPred('DIABETES');
        const hyper = findPred('HYPERTENSION');
        const heart = findPred('HEART_DISEASE');
        const anemia = findPred('ANEMIA');
        const ckd = findPred('CKD');

        const diabPct = diab ? Math.round((diab.probability ?? 0) * 100) : 0;
        const hyperPct = hyper ? Math.round((hyper.probability ?? 0) * 100) : 0;
        const heartPct = heart ? Math.round((heart.probability ?? 0) * 100) : 0;
        const anemiaPct = anemia ? Math.round((anemia.probability ?? 0) * 100) : 0;
        const ckdPct = ckd ? Math.round((ckd.probability ?? 0) * 100) : 0;

        let overallRisk: RiskLevel = 'LOW';
        if (preds.some((p: any) => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL')) {
          overallRisk = 'HIGH';
        } else if (preds.some((p: any) => p.riskLevel === 'MODERATE' || p.riskLevel === 'MEDIUM')) {
          overallRisk = 'MODERATE';
        }

        matrixRows.push({
          id: asm.id,
          patientId: asm.patientId,
          patientName: asm.patient?.fullName || 'Unknown Patient',
          age:
            asm.age ||
            (asm.patient?.dateOfBirth
              ? Math.floor(
                  (Date.now() - new Date(asm.patient.dateOfBirth).getTime()) /
                    (365.25 * 24 * 3600 * 1000)
                )
              : 0),
          village: asm.patient?.village?.name || asm.village || 'Local Village',
          date: asm.createdAt ? new Date(asm.createdAt).toISOString().split('T')[0] : '',
          diabetesRisk: diabPct,
          hypertensionRisk: hyperPct,
          heartDiseaseRisk: heartPct,
          anemiaRisk: anemiaPct,
          ckdRisk: ckdPct,
          overallRisk,
        });
      }

      return matrixRows;
    } catch (err) {
      console.error('Failed to load predictions:', err);
      return [];
    }
  },

  async getStatistics(): Promise<PredictionStatistics> {
    try {
      const response = await api.get('/predictions/statistics');
      const data = response.data?.data;
      if (data) {
        return {
          totalPredictions: data.totalPredictions ?? 0,
          highRisk: data.highRisk ?? 0,
          mediumRisk: data.mediumRisk ?? 0,
          lowRisk: data.lowRisk ?? 0,
          diseases: data.diseases ?? {},
        };
      }
    } catch (err) {
      console.error('Failed to load prediction stats:', err);
    }
    return {
      totalPredictions: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      diseases: {},
    };
  },
};