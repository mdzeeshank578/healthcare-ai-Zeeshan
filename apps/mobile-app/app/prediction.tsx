import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AssessmentModelInputs,
  getAssessmentPredictions,
  ModelName,
  ModelResult,
} from '@/lib/ai-predictions';
import { offlineStorage } from '@/lib/offline-storage';

type Patient = {
  id: string | number;
  name?: string;
  age?: string | number;
  gender?: string;
};

type Assessment = {
  id: string | number;
  patientId?: string | number;
  patient_id?: string | number;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  height?: string | number;
  weight?: string | number;
  date?: string;
  createdAt?: string;
  created_at?: string;
  symptoms?: string[] | string;
  medicalHistory?: string[] | string;
  medical_history?: string[] | string;
  medications?: string[] | string;
  medication?: string[] | string;
  vitals?: Record<string, unknown>;
  modelInputs?: AssessmentModelInputs;
};

const modelLabels: Record<ModelName, string> = {
  diabetes: 'Diabetes Risk Model',
  heart: 'Heart Disease Model',
  hypertension: 'Hypertension Model',
};

const toList = (value?: string[] | string): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getVital = (assessment: Assessment, ...keys: string[]): unknown => {
  const vitals = assessment.vitals || {};
  for (const key of keys) {
    if (vitals[key] !== undefined && vitals[key] !== null) return vitals[key];
  }
  for (const key of keys) {
    const raw = (assessment as Record<string, unknown>)[key];
    if (raw !== undefined && raw !== null) return raw;
  }
  return undefined;
};

const getDate = (assessment: Assessment): string =>
  assessment.date || assessment.createdAt || assessment.created_at || '';

const riskStyle = (risk?: string) => {
  const normalized = (risk || '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('critical')) return styles.highRisk;
  if (normalized.includes('medium')) return styles.mediumRisk;
  return styles.lowRisk;
};

export default function PredictionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cases, setCases] = useState<
    { patient: Patient; assessment: Assessment; results: ModelResult[] }[]
  >([]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  const loadPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [storedPatients, storedAssessments] = await Promise.all([
        offlineStorage.getItem('patients'),
        offlineStorage.getItem('healthAssessments'),
      ]);

      const patients: Patient[] = storedPatients ? JSON.parse(storedPatients) : [];
      const assessments: Assessment[] = storedAssessments ? JSON.parse(storedAssessments) : [];

      const sorted = [...assessments].sort(
        (a, b) =>
          (new Date(getDate(b)).getTime() || 0) - (new Date(getDate(a)).getTime() || 0)
      );

      const resolved = await Promise.all(
        sorted.map(async (assessment) => {
          const patientId = assessment.patientId ?? assessment.patient_id;
          const patient =
            patients.find((item) => String(item.id) === String(patientId)) || {
              id: String(patientId || 'unknown'),
              name: assessment.patientName || 'Patient',
              age: assessment.patientAge,
              gender: assessment.patientGender,
            };

          const results = await getAssessmentPredictions({
            age: patient.age ?? assessment.patientAge,
            gender: patient.gender ?? assessment.patientGender,
            assessment: assessment.modelInputs || {},
            oxygen: getVital(assessment, 'oxygenSaturation', 'oxygen', 'spo2'),
            heartRate: getVital(assessment, 'heartRate', 'heart_rate', 'pulse'),
            systolicBP: getVital(
              assessment,
              'systolicBP',
              'sysBP',
              'sys_bp',
              'systolic',
              'bloodPressure'
            ),
            diastolicBP: getVital(
              assessment,
              'diastolicBP',
              'diaBP',
              'dia_bp',
              'diastolic'
            ),
            symptoms: toList(assessment.symptoms),
            medicalHistory: toList(assessment.medicalHistory || assessment.medical_history),
            medications: toList(assessment.medications || assessment.medication),
            height: assessment.height,
            weight: assessment.weight,
          });

          return { patient, assessment, results };
        })
      );

      setCases(resolved);
    } catch (caught) {
      console.error('Failed to load predictions:', caught);
      setError(caught instanceof Error ? caught.message : 'Unable to load prediction data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPredictions();
    }, [loadPredictions])
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0B8F87" />
        <Text style={styles.loadingText}>Running clinical disease models…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navigation & Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#16323A" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>AI Disease Predictions</Text>
            <Text style={styles.subtitle}>
              Evidence-based clinical risk screening powered by disease prediction models.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#0B8F87" />
          <Text style={styles.noticeText}>
            Predictions are computed on-device from patient vitals, demographics, symptoms, and medical history. Results are designed to assist healthcare workers in triage and referral.
          </Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadPredictions()}>
              <Text style={styles.retry}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!error && cases.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="analytics-outline" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Assessments Found</Text>
            <Text style={styles.emptyText}>
              Complete a health assessment with vitals (Blood Pressure, Heart Rate, etc.) to view disease predictions.
            </Text>
            <TouchableOpacity
              style={styles.newAssessmentButton}
              onPress={() => router.push('/select-patient')}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newAssessmentText}>Start New Assessment</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {cases.map(({ patient, assessment, results }) => (
          <View key={String(assessment.id)} style={styles.caseCard}>
            <View style={styles.caseHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.patientName} numberOfLines={1}>{patient.name || 'Patient'}</Text>
                <Text style={styles.date}>
                  {getDate(assessment)
                    ? new Date(getDate(assessment)).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent assessment'}
                </Text>
              </View>
              {patient.id !== 'unknown' && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/patient-details',
                      params: { id: String(patient.id) },
                    })
                  }>
                  <Text style={styles.profile}>View Patient</Text>
                </TouchableOpacity>
              )}
            </View>

            {results.map((result) => (
              <PredictionCard key={result.model} result={result} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PredictionCard({ result }: { result: ModelResult }) {
  const modelName = modelLabels[result.model] || result.model;

  if ('error' in result) {
    return (
      <View style={styles.unavailable}>
        <View style={styles.unavailableHeader}>
          <Ionicons name="information-circle-outline" size={18} color="#B45309" />
          <Text style={styles.unavailableTitle}>{modelName}</Text>
        </View>
        <Text style={styles.unavailableText}>{result.error}</Text>
      </View>
    );
  }

  const { prediction } = result;
  const risk = prediction.risk_level || (prediction.prediction === 1 ? 'HIGH' : 'LOW');

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={[styles.modelName, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{modelName}</Text>
        <View style={[styles.risk, riskStyle(risk)]}>
          <Text style={styles.riskText}>{risk} RISK</Text>
        </View>
      </View>

      <Text style={styles.outcome}>
        {prediction.prediction === 1
          ? '⚠️ Elevated Risk Detected'
          : '✅ Low Disease Probability'}
      </Text>

      {prediction.probability !== null && (
        <Text style={styles.probability}>
          Calculated Risk Probability: {(prediction.probability * 100).toFixed(1)}%
        </Text>
      )}

      {prediction.reasons && prediction.reasons.length > 0 && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonTitle}>Key Contributing Factors:</Text>
          {prediction.reasons.map((reason, idx) => (
            <Text key={idx} style={styles.reason}>
              • {reason}
            </Text>
          ))}
        </View>
      )}

      {prediction.triage ? (
        <View style={styles.triageBox}>
          <Text style={styles.triageTitle}>Recommended Triage Action:</Text>
          <Text style={styles.triage}>{prediction.triage}</Text>
        </View>
      ) : null}

      {prediction.clinical_risk && (
        <View style={styles.clinicalBox}>
          <Text style={styles.clinicalTitle}>
            Overall Clinical Vitals Risk: {prediction.clinical_risk}
          </Text>
          {prediction.clinical_reasons && prediction.clinical_reasons.length > 0 && (
            <Text style={styles.clinicalReasons}>
              Observations: {prediction.clinical_reasons.join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: { marginTop: 14, color: '#4A5568', fontSize: 15, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#16323A' },
  subtitle: { marginTop: 4, color: '#64748B', fontSize: 13, lineHeight: 18 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E6F6F4',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B2E5DF',
  },
  noticeText: { flex: 1, color: '#096B64', fontSize: 12, lineHeight: 18 },
  error: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginBottom: 16,
  },
  errorText: { color: '#991B1B', fontSize: 14 },
  retry: { color: '#B91C1C', fontWeight: '700', marginTop: 8 },
  empty: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    color: '#16323A',
    fontWeight: '700',
    fontSize: 18,
    marginTop: 14,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },
  newAssessmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    backgroundColor: '#0B8F87',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newAssessmentText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  caseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  patientName: { fontSize: 18, fontWeight: '700', color: '#16323A' },
  date: { color: '#64748B', fontSize: 12, marginTop: 2 },
  profile: { color: '#0B8F87', fontWeight: '700', fontSize: 13 },
  resultCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  unavailable: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unavailableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unavailableTitle: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 13,
  },
  unavailableText: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modelName: { color: '#1E293B', fontWeight: '800', fontSize: 15 },
  risk: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  highRisk: { backgroundColor: '#FEE2E2' },
  mediumRisk: { backgroundColor: '#FEF3C7' },
  lowRisk: { backgroundColor: '#DCFCE7' },
  riskText: { color: '#1E293B', fontSize: 11, fontWeight: '800' },
  outcome: { color: '#0F172A', fontWeight: '700', fontSize: 14, marginTop: 8 },
  probability: { color: '#475569', fontSize: 12, marginTop: 4, fontWeight: '500' },
  reasonBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  reasonTitle: { color: '#334155', fontSize: 12, fontWeight: '700' },
  reason: { color: '#64748B', fontSize: 12, marginTop: 3 },
  triageBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  triageTitle: { color: '#1E40AF', fontSize: 11, fontWeight: '700' },
  triage: { color: '#1E3A8A', fontSize: 13, fontWeight: '700', marginTop: 2 },
  clinicalBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  clinicalTitle: { color: '#475569', fontSize: 11, fontWeight: '700' },
  clinicalReasons: { color: '#64748B', fontSize: 11, marginTop: 2 },
});
