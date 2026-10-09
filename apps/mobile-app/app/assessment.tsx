import { offlineStorage } from '@/lib/offline-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Patient = {
  id?: string | number;
  patientId?: string | number;
  _id?: string | number;
  name?: string;
  fullName?: string;
  patientName?: string;
};

type Assessment = {
  id?: string | number;
  patientId?: string | number;
  patient_id?: string | number;
  patientName?: string;
  date?: string;
  createdAt?: string;
  created_at?: string;
  symptoms?: string[] | string;
  risk?: string;
  riskLevel?: string;
  risk_level?: string;
  status?: string;
};

type RiskFilter = 'All' | 'High' | 'Medium' | 'Low';

const parseArray = <T,>(value: string | null): T[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const getPatientId = (patient: Patient) => patient.id ?? patient.patientId ?? patient._id;
const getPatientName = (patient: Patient) => patient.name ?? patient.fullName ?? patient.patientName ?? 'Unnamed Patient';
const getAssessmentDate = (assessment: Assessment) => assessment.createdAt ?? assessment.date ?? assessment.created_at ?? '';
const getSymptoms = (assessment: Assessment) => {
  if (Array.isArray(assessment.symptoms)) return assessment.symptoms.filter(Boolean).join(', ');
  return assessment.symptoms?.trim() || 'No symptoms recorded';
};
const getRisk = (assessment: Assessment): Exclude<RiskFilter, 'All'> => {
  const risk = (assessment.risk ?? assessment.riskLevel ?? assessment.risk_level ?? '').trim().toLowerCase();
  if (risk === 'high') return 'High';
  if (risk === 'medium') return 'Medium';
  return 'Low';
};
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};
const riskColors = (risk: Exclude<RiskFilter, 'All'>) => {
  if (risk === 'High') return { backgroundColor: '#FCE8E8', color: '#D94A4A' };
  if (risk === 'Medium') return { backgroundColor: '#FFF4D9', color: '#B77D12' };
  return { backgroundColor: '#E5F5EC', color: '#2E9B67' };
};

export default function AssessmentScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RiskFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [storedPatients, storedAssessments] = await Promise.all([
        offlineStorage.getItem('patients'),
        offlineStorage.getItem('healthAssessments'),
      ]);
      setPatients(parseArray<Patient>(storedPatients));
      setAssessments(parseArray<Assessment>(storedAssessments));
    } catch {
      setPatients([]);
      setAssessments([]);
      setError('Unable to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAssessments();
  }, [loadAssessments]));

  const getResolvedPatientName = useCallback((assessment: Assessment) => {
    if (assessment.patientName?.trim()) return assessment.patientName.trim();
    const matchingPatient = patients.find((patient) => String(getPatientId(patient)) === String(assessment.patientId ?? assessment.patient_id));
    return matchingPatient ? getPatientName(matchingPatient) : 'Unknown Patient';
  }, [patients]);

  const sortedAssessments = useMemo(() => [...assessments].sort((left, right) => {
    const leftDate = new Date(getAssessmentDate(left)).getTime() || 0;
    const rightDate = new Date(getAssessmentDate(right)).getTime() || 0;
    return rightDate - leftDate;
  }), [assessments]);

  const displayedAssessments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedAssessments.filter((assessment) => {
      const matchesRisk = selectedFilter === 'All' || getRisk(assessment) === selectedFilter;
      const matchesSearch = !query || getResolvedPatientName(assessment).toLowerCase().includes(query);
      return matchesRisk && matchesSearch;
    });
  }, [getResolvedPatientName, searchQuery, selectedFilter, sortedAssessments]);

  const statistics = useMemo(() => ({
    total: assessments.length,
    high: assessments.filter((assessment) => getRisk(assessment) === 'High').length,
    medium: assessments.filter((assessment) => getRisk(assessment) === 'Medium').length,
    low: assessments.filter((assessment) => getRisk(assessment) === 'Low').length,
  }), [assessments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B8F87" />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')}
            accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#16323A" />
          </TouchableOpacity>
          <View style={styles.headerTitleArea}>
            <Text style={styles.title} numberOfLines={1}>Assessments</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Manage patient health assessments</Text>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/select-patient')}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statisticsGrid}>
          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: '#E9F7F5' }]}>
              <Text style={[styles.statValue, { color: '#0B6F69' }]}>{statistics.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FCE8E8' }]}>
              <Text style={[styles.statValue, { color: '#D94A4A' }]}>{statistics.high}</Text>
              <Text style={styles.statLabel}>High Risk</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: '#FFF4D9' }]}>
              <Text style={[styles.statValue, { color: '#B77D12' }]}>{statistics.medium}</Text>
              <Text style={styles.statLabel}>Medium Risk</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E5F5EC' }]}>
              <Text style={[styles.statValue, { color: '#2E9B67' }]}>{statistics.low}</Text>
              <Text style={styles.statLabel}>Low Risk</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#7B8794" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by patient name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        <View style={styles.filters}>
          {(['All', 'High', 'Medium', 'Low'] as RiskFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, selectedFilter === filter && styles.activeFilterButton]}
              onPress={() => setSelectedFilter(filter)}>
              <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Assessments</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {displayedAssessments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={assessments.length === 0 ? 'clipboard-outline' : 'search-outline'} size={52} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{assessments.length === 0 ? 'No assessments yet' : 'No assessments found'}</Text>
            <Text style={styles.emptyText}>
              {assessments.length === 0 ? 'Start by creating a new health assessment.' : 'Try another patient name.'}
            </Text>
            {assessments.length === 0 ? (
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/select-patient')}>
                <Text style={styles.emptyButtonText}>+ New Assessment</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          displayedAssessments.map((assessment, index) => {
            const risk = getRisk(assessment);
            const colors = riskColors(risk);
            return (
              <TouchableOpacity
                key={String(assessment.id ?? index)}
                style={styles.assessmentCard}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/assessment_details', params: { assessmentId: String(assessment.id ?? '') } })}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleArea}>
                    <Text style={styles.patientName}>{getResolvedPatientName(assessment)}</Text>
                    <Text style={styles.dateText}>{formatDate(getAssessmentDate(assessment))}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: colors.backgroundColor }]}>
                    <Text style={[styles.riskText, { color: colors.color }]}>{risk} Risk</Text>
                  </View>
                </View>
                <Text style={styles.symptomsLabel}>Symptoms</Text>
                <Text style={styles.symptomsText} numberOfLines={2}>{getSymptoms(assessment)}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.statusText}>{assessment.status?.trim() || 'Assessment recorded'}</Text>
                  <Text style={styles.viewDetails}>View Details <Ionicons name="arrow-forward" size={14} /></Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAFC' },
  loadingText: { marginTop: 12, color: '#7B8794' },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DCE5E8' },
  headerTitleArea: { flex: 1, minWidth: 0 },
  title: { color: '#16323A', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#7B8794', fontSize: 12, lineHeight: 16, marginTop: 2 },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#0B8F87' },
  newButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statisticsGrid: { marginTop: 18 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#52646A', fontSize: 12, fontWeight: '600', marginTop: 3 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, marginTop: 22, borderRadius: 12, borderWidth: 1, borderColor: '#DCE5E8', backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, height: '100%', color: '#16323A', fontSize: 15 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5E8' },
  activeFilterButton: { backgroundColor: '#0B8F87', borderColor: '#0B8F87' },
  filterText: { color: '#52646A', fontSize: 12, fontWeight: '700' },
  activeFilterText: { color: '#FFFFFF' },
  sectionTitle: { color: '#16323A', fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  errorText: { color: '#D94A4A', marginBottom: 10 },
  assessmentCard: { borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EAED' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleArea: { flex: 1 },
  patientName: { color: '#16323A', fontSize: 16, fontWeight: '800' },
  dateText: { color: '#7B8794', fontSize: 12, marginTop: 4 },
  riskBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  riskText: { fontSize: 11, fontWeight: '800' },
  symptomsLabel: { color: '#52646A', fontSize: 12, fontWeight: '700', marginTop: 14 },
  symptomsText: { color: '#16323A', fontSize: 14, lineHeight: 20, marginTop: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: '#EEF2F3', marginTop: 14, paddingTop: 12 },
  statusText: { color: '#7B8794', fontSize: 12, flex: 1 },
  viewDetails: { color: '#0B8F87', fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40, borderRadius: 16, backgroundColor: '#FFFFFF' },
  emptyTitle: { color: '#16323A', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#7B8794', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  emptyButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, marginTop: 18, backgroundColor: '#0B8F87' },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
