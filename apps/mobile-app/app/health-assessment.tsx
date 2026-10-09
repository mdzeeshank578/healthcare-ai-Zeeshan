import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import { AssessmentModelInputs, modelInputFields } from '@/constants/disease-models';
import { ashaApi } from '@/lib/asha-api';
import { createUuid, offlineStorage } from '@/lib/offline-storage';
import { parseClinicalSpeech } from '@/lib/clinical-speech-parser';

const quickSymptoms = [
  'Fever',
  'Cough',
  'Dizziness',
  'Fatigue',
  'Shortness of Breath',
  'Nausea / Vomiting',
];

const historyOptions = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'Kidney Disease',
  'Allergies',
];

type Assessment = Record<string, any>;
type Patient = {
  id?: string | number;
  patientId?: string | number;
  _id?: string | number;
  name?: string;
  fullName?: string;
  patientName?: string;
  age?: string | number;
  gender?: string;
  sex?: string;
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const numberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

interface InputFieldProps {
  label: string;
  value: string;
  setValue: (text: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

const InputField = memo(({
  label,
  value,
  setValue,
  numeric = false,
  multiline = false,
  placeholder = '',
}: InputFieldProps) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={setValue}
      keyboardType={numeric ? (Platform.OS === 'ios' ? 'decimal-pad' : 'numeric') : 'default'}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      autoCapitalize={numeric ? 'none' : 'sentences'}
      autoCorrect={!numeric}
    />
  </View>
));

export default function HealthAssessmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string; assessmentId?: string }>();
  const patientId = params.patientId;
  const assessmentId = params.assessmentId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const [temperature, setTemperature] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [additionalSymptoms, setAdditionalSymptoms] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState('');
  const [notes, setNotes] = useState('');

  const [ocrText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [modelInputs, setModelInputs] = useState<AssessmentModelInputs>({});

  // Voice recording & auto-fill states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const isEditing = Boolean(assessmentId);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [patientRaw, assessmentRaw] = await Promise.all([
        offlineStorage.getItem('patients'),
        offlineStorage.getItem('healthAssessments'),
      ]);

      let patients: Patient[] = [];
      if (patientRaw) {
        try {
          const parsed = JSON.parse(patientRaw);
          if (Array.isArray(parsed)) patients = parsed;
        } catch {}
      }

      let stored: Assessment[] = [];
      if (assessmentRaw) {
        try {
          const parsed = JSON.parse(assessmentRaw);
          if (Array.isArray(parsed)) stored = parsed;
        } catch {}
      }

      const existing = stored.find((item) => String(item.id) === String(assessmentId));
      const targetId = patientId ?? existing?.patientId ?? existing?.patient_id;

      let matchedPatient = patients.find((p) => {
        const id = p.id ?? p.patientId ?? p._id;
        return String(id) === String(targetId);
      });

      // If patient not in offline cache, fetch from API
      if (!matchedPatient && targetId) {
        try {
          const apiPatient = await ashaApi.patient(String(targetId)) as Patient;
          if (apiPatient) matchedPatient = apiPatient;
        } catch {}
      }

      if (matchedPatient) {
        const pName = matchedPatient.name ?? matchedPatient.fullName ?? matchedPatient.patientName ?? '';
        const pAge = matchedPatient.age !== undefined && matchedPatient.age !== null ? String(matchedPatient.age) : '';
        const pGender = matchedPatient.gender ?? matchedPatient.sex ?? '';
        setName(pName);
        setAge(pAge);
        setGender(pGender);
      }

      if (existing) {
        const vitals = existing.vitals || {};
        const exName = existing.patientName || matchedPatient?.name || matchedPatient?.fullName || '';
        const exAge = existing.patientAge !== undefined
          ? String(existing.patientAge)
          : (matchedPatient?.age !== undefined ? String(matchedPatient.age) : '');
        const exGender = existing.patientGender || matchedPatient?.gender || matchedPatient?.sex || '';

        setName(exName);
        setAge(exAge);
        setGender(exGender);
        setHeight(existing.height !== undefined && existing.height !== null ? String(existing.height) : '');
        setWeight(existing.weight !== undefined && existing.weight !== null ? String(existing.weight) : '');
        setTemperature(String(vitals.temperature ?? existing.temperature ?? ''));
        setSystolicBP(String(vitals.systolicBP ?? existing.sysBP ?? ''));
        setDiastolicBP(String(vitals.diastolicBP ?? existing.diaBP ?? ''));
        setHeartRate(String(vitals.heartRate ?? existing.heartRate ?? ''));
        setOxygen(String(vitals.oxygenSaturation ?? existing.oxygenSaturation ?? ''));

        setSymptoms(toList(existing.symptoms).filter((item) => quickSymptoms.includes(item)));
        setAdditionalSymptoms(
          existing.additionalSymptoms ||
          toList(existing.symptoms).filter((item) => !quickSymptoms.includes(item)).join(', ')
        );
        setHistory(toList(existing.medicalHistory));
        setMedications(toList(existing.medications).join(', '));
        setNotes(existing.additionalDetails || existing.notes || '');
        setTranscript(existing.speechTranscript || '');
        setModelInputs(existing.modelInputs || {});
      }
    } catch {
      Alert.alert('Error', 'Unable to load assessment data.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, patientId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleSelection = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const applyParsedClinicalData = useCallback((parsed: ReturnType<typeof parseClinicalSpeech>) => {
    let filledCount = 0;
    if (parsed.name) {
      setName(parsed.name);
      filledCount++;
    }
    if (parsed.age) {
      setAge(parsed.age);
      filledCount++;
    }
    if (parsed.gender) {
      setGender(parsed.gender);
      filledCount++;
    }
    if (parsed.temperature) {
      setTemperature(parsed.temperature);
      filledCount++;
    }
    if (parsed.systolicBP) {
      setSystolicBP(parsed.systolicBP);
      filledCount++;
    }
    if (parsed.diastolicBP) {
      setDiastolicBP(parsed.diastolicBP);
      filledCount++;
    }
    if (parsed.heartRate) {
      setHeartRate(parsed.heartRate);
      filledCount++;
    }
    if (parsed.oxygen) {
      setOxygen(parsed.oxygen);
      filledCount++;
    }
    if (parsed.height) {
      setHeight(parsed.height);
      filledCount++;
    }
    if (parsed.weight) {
      setWeight(parsed.weight);
      filledCount++;
    }
    if (parsed.symptoms && parsed.symptoms.length > 0) {
      setSymptoms((prev) => Array.from(new Set([...prev, ...parsed.symptoms])));
      filledCount += parsed.symptoms.length;
    }
    if (parsed.additionalSymptoms) {
      setAdditionalSymptoms((prev) =>
        prev ? `${prev}, ${parsed.additionalSymptoms}` : parsed.additionalSymptoms!
      );
      filledCount++;
    }
    if (parsed.history && parsed.history.length > 0) {
      setHistory((prev) => Array.from(new Set([...prev, ...parsed.history])));
      filledCount += parsed.history.length;
    }
    if (parsed.medications) {
      setMedications((prev) => (prev ? `${prev}, ${parsed.medications}` : parsed.medications!));
      filledCount++;
    }
    if (parsed.notes) {
      setNotes((prev) => (prev ? `${prev}\n${parsed.notes}` : parsed.notes!));
      filledCount++;
    }
    return filledCount;
  }, []);

  const startVoiceRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please grant microphone permission in device settings to record clinical notes.'
        );
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      Alert.alert('Recording Error', err?.message || 'Could not start audio recording.');
    }
  };

  const stopVoiceRecordingAndFill = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    try {
      setIsTranscribing(true);
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        Alert.alert('Recording Empty', 'No audio was captured. Please try speaking again.');
        return;
      }

      const formData = new FormData();
      const filename = uri.split('/').pop() || 'voice_assessment.m4a';
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: filename,
      } as any);

      const res = (await ashaApi.transcribeSpeech(formData)) as { transcript?: string };
      const speechText = res?.transcript || '';

      if (!speechText.trim()) {
        Alert.alert(
          'Voice Recognition Notice',
          'Could not detect speech in the audio. You can also use your mobile keyboard microphone to speak directly into the transcript box.'
        );
        return;
      }

      setTranscript((prev) => (prev ? `${prev}\n${speechText}` : speechText));

      const parsed = parseClinicalSpeech(speechText);
      const count = applyParsedClinicalData(parsed);

      Alert.alert(
        'Voice Assessment Populated',
        `Transcribed:\n"${speechText}"\n\nAuto-filled ${count} field(s):\n${parsed.summary}`
      );
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('sign in')) {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please log out and sign in again to use cloud voice features. You can also use your mobile keyboard microphone directly into the transcript box below.',
          [
            { text: 'Stay Here', style: 'cancel' },
            {
              text: 'Sign In Again',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Transcription Notice',
          msg || 'Could not reach the voice transcription service. You can use your keyboard mic to speak into the transcript field below and tap "Auto-Fill Fields".'
        );
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const cancelVoiceRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    try {
      await recorder.stop();
    } catch {}
  };

  const handleParseFromTranscript = () => {
    if (!transcript.trim()) {
      Alert.alert(
        'Transcript Empty',
        'Please enter or speak clinical notes into the transcript box first, then tap Auto-Fill.'
      );
      return;
    }
    const parsed = parseClinicalSpeech(transcript);
    const count = applyParsedClinicalData(parsed);
    Alert.alert(
      'Form Auto-Filled from Transcript',
      `Auto-filled ${count} field(s):\n\n${parsed.summary}`
    );
  };

  const choosePrescription = () => {
    Alert.alert(
      'OCR Offline Notice',
      'Prescription scanning requires the AI vision service or cloud OCR. Please enter any medication details manually.'
    );
  };

  const saveAssessment = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter or confirm the patient name.');
      return;
    }

    const numericVitals = {
      Temperature: numberOrUndefined(temperature),
      Systolic_BP: numberOrUndefined(systolicBP),
      Diastolic_BP: numberOrUndefined(diastolicBP),
      Heart_Rate: numberOrUndefined(heartRate),
      Oxygen: numberOrUndefined(oxygen),
    };

    const combinedSymptoms = [...symptoms, ...toList(additionalSymptoms)];
    const id = assessmentId || createUuid();
    const currentDate = new Date().toISOString();

    const record = {
      id: String(id),
      patientId: patientId || 'unknown',
      patientName: name.trim(),
      patientAge: numberOrUndefined(age),
      patientGender: gender,
      date: currentDate,
      createdAt: currentDate,
      riskLevel: 'Pending',
      risk_level: 'Pending',
      height: numberOrUndefined(height),
      weight: numberOrUndefined(weight),
      symptoms: combinedSymptoms,
      additionalSymptoms,
      medicalHistory: history,
      medications: toList(medications),
      additionalDetails: notes.trim(),
      ocrText,
      speechTranscript: transcript,
      modelInputs,
      vitals: {
        temperature: numericVitals.Temperature,
        systolicBP: numericVitals.Systolic_BP,
        diastolicBP: numericVitals.Diastolic_BP,
        heartRate: numericVitals.Heart_Rate,
        oxygenSaturation: numericVitals.Oxygen,
      },
    };

    try {
      setSubmitting(true);
      const raw = await offlineStorage.getItem('healthAssessments');
      let all: Assessment[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) all = parsed;
        } catch {}
      }

      const updated = isEditing
        ? all.map((item) => (String(item.id) === String(id) ? { ...item, ...record } : item))
        : [record, ...all];

      await offlineStorage.setItem('healthAssessments', JSON.stringify(updated));

      // Sync with server if online
      if (patientId) {
        const ageNum = numberOrUndefined(age) ?? (numberOrUndefined(record.patientAge) ?? 30);
        const tempF = numberOrUndefined(temperature);
        const tempC = tempF !== undefined
          ? (tempF > 50 ? Math.round(((tempF - 32) * 5 / 9) * 10) / 10 : tempF)
          : undefined;

        const assessmentPayload: Record<string, any> = {
          id: String(id),
          patientId: String(patientId),
          age: Math.min(120, Math.max(0, Math.round(ageNum))),
          weightKg: numberOrUndefined(weight),
          heightCm: numberOrUndefined(height),
          bmi: numberOrUndefined(modelInputs.BMI) ?? (
            (numberOrUndefined(weight) && numberOrUndefined(height))
              ? Math.round((numberOrUndefined(weight)! / Math.pow(numberOrUndefined(height)! / 100, 2)) * 10) / 10
              : undefined
          ),
          systolicBp: numericVitals.Systolic_BP,
          diastolicBp: numericVitals.Diastolic_BP,
          restingBloodPressure: numericVitals.Systolic_BP,
          heartRate: numericVitals.Heart_Rate,
          maxHeartRate: numericVitals.Heart_Rate,
          oxygenSaturation: numericVitals.Oxygen,
          temperatureC: tempC,
          glucose: numberOrUndefined(modelInputs.Glucose),
          cholesterol: numberOrUndefined(modelInputs.chol),
          pregnancies: numberOrUndefined(modelInputs.Pregnancies),
          skinThickness: numberOrUndefined(modelInputs.SkinThickness),
          insulin: numberOrUndefined(modelInputs.Insulin),
          diabetesPedigreeFunction: numberOrUndefined(modelInputs.DiabetesPedigreeFunction),
          smokingStatus: (modelInputs.Smoking_Status === '1' || modelInputs.Smoking_Status === 1) ? 'SMOKER' : 'NON_SMOKER',
          familyHistoryHypertension: Boolean(modelInputs.Family_History === '1' || modelInputs.Family_History === 1 || history.includes('Hypertension')),
          symptoms: combinedSymptoms,
          notes: notes.trim() || undefined,
          inputSource: 'MANUAL',
          clientCreatedAt: record.date,
        };

        Object.keys(assessmentPayload).forEach((k) => {
          if (assessmentPayload[k] === undefined) delete assessmentPayload[k];
        });

        try {
          if (isEditing) {
            await ashaApi.updateAssessment(String(id), assessmentPayload);
          } else {
            await ashaApi.createAssessment(assessmentPayload);
          }
          await ashaApi.completeAssessment(String(id)).catch(() => undefined);
        } catch (syncErr: any) {
          console.warn('Backend assessment sync error:', syncErr);
        }
      }

      Alert.alert(
        'Assessment Saved',
        'Health assessment has been saved successfully.',
        [
          {
            text: 'View Assessments',
            onPress: () => router.replace('/assessment'),
          },
          {
            text: 'Run Disease Predictions',
            onPress: () => router.replace('/prediction'),
          },
        ]
      );
    } catch {
      Alert.alert('Save Failed', 'Unable to save the assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B8F87" />
        <Text style={styles.loadingText}>Loading assessment...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#16323A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{isEditing ? 'Edit Assessment' : 'New Health Assessment'}</Text>
            <Text style={styles.subtitle}>Enter patient vitals and health observations</Text>
          </View>
        </View>

        {/* Voice-Assisted Assessment Card */}
        <View style={[styles.voiceCard, isRecording && styles.voiceCardRecording]}>
          <View style={styles.voiceHeaderRow}>
            <View style={styles.voiceTitleGroup}>
              <View style={[styles.voiceIconBadge, isRecording && styles.voiceIconBadgeActive]}>
                <Ionicons
                  name={isRecording ? 'mic' : 'mic-outline'}
                  size={22}
                  color={isRecording ? '#DC2626' : '#0B8F87'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceTitle}>
                  {isRecording ? `Recording... (${formatTimer(recordingSeconds)})` : 'Speak to Fill Assessment'}
                </Text>
                <Text style={styles.voiceSubtitle}>
                  {isRecording
                    ? 'Speak patient observations in Hindi or English... Tap Stop when done.'
                    : 'Speak vitals, symptoms & history (e.g. "BP 130 over 80, pulse 76, fever 101, paracetamol") to auto-populate form.'}
                </Text>
              </View>
            </View>
          </View>

          {isTranscribing ? (
            <View style={styles.transcribingBox}>
              <ActivityIndicator size="small" color="#0B8F87" />
              <Text style={styles.transcribingText}>AI is transcribing and auto-filling form fields...</Text>
            </View>
          ) : isRecording ? (
            <View style={styles.voiceActionRow}>
              <TouchableOpacity
                style={[styles.voiceButton, styles.voiceStopButton]}
                onPress={() => void stopVoiceRecordingAndFill()}>
                <Ionicons name="stop-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.voiceStopButtonText}>Stop & Auto-Fill Form</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceButton, styles.voiceCancelButton]}
                onPress={() => void cancelVoiceRecording()}>
                <Ionicons name="close-circle-outline" size={18} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.voiceCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.voiceStartButton}
              onPress={() => void startVoiceRecording()}>
              <Ionicons name="mic" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.voiceStartButtonText}>Tap to Speak Assessment</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Patient Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <InputField label="Patient Full Name" value={name} setValue={setName} placeholder="e.g. Sonia" />
          <InputField label="Age" value={age} setValue={setAge} numeric placeholder="e.g. 21" />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {['Female', 'Male', 'Other'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, gender.toLowerCase() === item.toLowerCase() && styles.selectedChip]}
                onPress={() => setGender(item)}>
                <Text
                  style={[
                    styles.chipText,
                    gender.toLowerCase() === item.toLowerCase() && styles.selectedChipText,
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField label="Height (cm)" value={height} setValue={setHeight} numeric placeholder="165" />
            </View>
            <View style={styles.flex}>
              <InputField label="Weight (kg)" value={weight} setValue={setWeight} numeric placeholder="60" />
            </View>
          </View>
        </View>

        {/* Vital Signs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <InputField label="Body Temperature (°F)" value={temperature} setValue={setTemperature} numeric placeholder="98.6" />

          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField label="Systolic BP (mmHg)" value={systolicBP} setValue={setSystolicBP} numeric placeholder="120" />
            </View>
            <View style={styles.flex}>
              <InputField label="Diastolic BP (mmHg)" value={diastolicBP} setValue={setDiastolicBP} numeric placeholder="80" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <InputField label="Heart Rate (BPM)" value={heartRate} setValue={setHeartRate} numeric placeholder="72" />
            </View>
            <View style={styles.flex}>
              <InputField label="Oxygen Saturation (SpO2 %)" value={oxygen} setValue={setOxygen} numeric placeholder="98" />
            </View>
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.label}>Common Symptoms</Text>
          <View style={styles.chips}>
            {quickSymptoms.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, symptoms.includes(item) && styles.selectedChip]}
                onPress={() => toggleSelection(item, setSymptoms)}>
                <Text style={[styles.chipText, symptoms.includes(item) && styles.selectedChipText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <InputField
            label="Additional Symptoms"
            value={additionalSymptoms}
            setValue={setAdditionalSymptoms}
            multiline
            placeholder="Describe any other symptoms or complaints..."
          />
        </View>

        {/* Medical History */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Medical History & Notes</Text>
          <Text style={styles.label}>Known Conditions</Text>
          <View style={styles.chips}>
            {historyOptions.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, history.includes(item) && styles.selectedChip]}
                onPress={() => toggleSelection(item, setHistory)}>
                <Text style={[styles.chipText, history.includes(item) && styles.selectedChipText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <InputField
            label="Current Medications"
            value={medications}
            setValue={setMedications}
            placeholder="e.g. Paracetamol, Metformin"
          />
          <InputField
            label="Clinical Notes / Observations"
            value={notes}
            setValue={setNotes}
            multiline
            placeholder="Notes from consultation or household visit..."
          />
        </View>

        {/* Voice Dictation & Notes */}
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Voice Notes & Transcription</Text>
            <TouchableOpacity
              style={isRecording ? styles.micButtonRecording : styles.micButton}
              onPress={() => {
                if (isRecording) {
                  void stopVoiceRecordingAndFill();
                } else {
                  void startVoiceRecording();
                }
              }}>
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic-outline'}
                size={18}
                color={isRecording ? '#DC2626' : '#0B8F87'}
              />
              <Text style={isRecording ? styles.micButtonRecordingText : styles.micButtonText}>
                {isRecording ? 'Stop Mic' : 'Start Mic'}
              </Text>
            </TouchableOpacity>
          </View>
          <InputField
            label="Speech Transcript / Spoken Notes"
            value={transcript}
            setValue={setTranscript}
            multiline
            placeholder="Spoken observation notes or dictation transcript (you can also use your keyboard mic here)..."
          />
          <TouchableOpacity
            style={styles.transcriptFillButton}
            onPress={handleParseFromTranscript}>
            <Ionicons name="flash-outline" size={18} color="#0B8F87" style={{ marginRight: 6 }} />
            <Text style={styles.transcriptFillButtonText}>⚡ Auto-Fill Fields from Transcript</Text>
          </TouchableOpacity>
        </View>

        {/* Prescription Scanning */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prescription OCR</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={choosePrescription}>
            <Ionicons name="document-text-outline" size={18} color="#0B8F87" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Attach Prescription (Requires AI Service)</Text>
          </TouchableOpacity>
        </View>

        {/* Local ONNX Disease Model Inputs */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Disease Risk Model Inputs</Text>
          <Text style={styles.helperText}>
            These values are used locally by on-device ONNX models to predict Diabetes, Heart Disease, and Hypertension risks.
          </Text>
          {modelInputFields.map(([key, label]) => (
            <InputField
              key={key}
              label={label}
              value={modelInputs[key] === undefined ? '' : String(modelInputs[key])}
              setValue={(val) => setModelInputs((current) => ({ ...current, [key]: val }))}
              numeric
            />
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          disabled={submitting}
          onPress={() => void saveAssessment()}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>
                {isEditing ? 'Update Assessment' : 'Save Health Assessment'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    color: '#16323A',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#16323A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  selectedChip: {
    borderColor: '#0B8F87',
    backgroundColor: '#E6F7F5',
  },
  chipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#0B8F87',
    fontWeight: '700',
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  micButtonText: {
    color: '#0B8F87',
    fontSize: 12,
    fontWeight: '700',
  },
  micButtonRecording: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  micButtonRecordingText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0B8F87',
    backgroundColor: '#F0FDFA',
  },
  transcriptFillButtonText: {
    color: '#0B8F87',
    fontSize: 13,
    fontWeight: '700',
  },
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#0B8F87',
    shadowColor: '#0B8F87',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  voiceCardRecording: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F7F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIconBadgeActive: {
    backgroundColor: '#FEE2E2',
  },
  voiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  voiceSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  voiceStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B8F87',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  voiceStartButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  voiceActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  voiceStopButton: {
    flex: 2,
    backgroundColor: '#DC2626',
  },
  voiceStopButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  voiceCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  voiceCancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  transcribingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  transcribingText: {
    color: '#0B8F87',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0B8F87',
    backgroundColor: '#F0FDFA',
    padding: 10,
  },
  secondaryButtonText: {
    color: '#0B8F87',
    fontWeight: '700',
    fontSize: 14,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#0B8F87',
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
