export type ModelName = 'diabetes' | 'heart' | 'hypertension';
export type AssessmentModelInputs = Record<string, string | number | undefined>;

export type ModelPrediction = {
  prediction: number;
  probability: number | null;
  risk_level: string;
  triage: string;
  reasons: string[];
  clinical_score?: number;
  clinical_risk?: string;
  clinical_reasons?: string[];
};

export type ModelResult =
  | { model: ModelName; prediction: ModelPrediction }
  | { model: ModelName; error: string };

export const modelInputFields = [
  ['Pregnancies', 'Pregnancies'],
  ['Glucose', 'Glucose (mg/dL)'],
  ['SkinThickness', 'Skin thickness (mm)'],
  ['Insulin', 'Insulin (mu U/ml)'],
  ['BMI', 'BMI'],
  ['DiabetesPedigreeFunction', 'Diabetes pedigree function'],
  ['cp', 'Chest pain type (0–3)'],
  ['chol', 'Cholesterol (mg/dL)'],
  ['fbs', 'Fasting blood sugar >120 (0/1)'],
  ['restecg', 'Resting ECG result (0–2)'],
  ['thalach', 'Maximum heart rate'],
  ['exang', 'Exercise angina (0/1)'],
  ['oldpeak', 'ST depression (oldpeak)'],
  ['slope', 'ST slope (0–2)'],
  ['ca', 'Major vessels (0–3)'],
  ['thal', 'Thal result (0–3)'],
  ['BP_History', 'Blood-pressure history (0/1)'],
  ['Medication', 'Taking medication (0/1)'],
  ['Family_History', 'Family history (0/1)'],
  ['Exercise_Level', 'Low exercise level (0/1)'],
  ['Smoking_Status', 'Smoking status (0/1)'],
] as const;

// Verified exact coefficients and intercepts from trained skl2onnx logistic models
const MODEL_WEIGHTS: Record<ModelName, { coefficients: number[]; intercept: number }> = {
  diabetes: {
    coefficients: [
      0.10300605744123459,
      0.0315990149974823,
      -0.0007769133080728352,
      0.033062513917684555,
      0.007656999863684177,
      0.06951035559177399,
      0.4761974811553955,
      0.013563110493123531,
    ],
    intercept: -10.032607078552246,
  },
  heart: {
    coefficients: [
      0.026173321530222893,
      1.0199196338653564,
      0.7464882731437683,
      0.005301849450916052,
      -0.00319354678504169,
      0.24947108328342438,
      0.13541945815086365,
      -0.013152414932847023,
      0.9931637644767761,
      0.40430933237075806,
      0.2609589993953705,
      0.8410861492156982,
      0.2526029646396637,
    ],
    intercept: -5.6091203689575195,
  },
  hypertension: {
    coefficients: [
      0.04636838659644127,
      0.26656031608581543,
      0.2757147252559662,
      -2.221323013305664,
      -0.41725853085517883,
      0.12528356909751892,
      -0.007864008657634258,
      2.1760447025299072,
      6.354373908834532e-05,
      2.3095109462738037,
    ],
    intercept: -5.904094696044922,
  },
};

function runLinearClassifier(
  model: ModelName,
  features: number[]
): { prediction: number; probability: number } {
  const { coefficients, intercept } = MODEL_WEIGHTS[model];
  let z1 = intercept;
  for (let i = 0; i < features.length; i++) {
    z1 += (coefficients[i] || 0) * (features[i] || 0);
  }
  const z0 = -z1;
  const p0 = 1.0 / (1.0 + Math.exp(-z0));
  const p1 = 1.0 / (1.0 + Math.exp(-z1));
  const sum = p0 + p1;
  const prob1 = sum > 0 ? p1 / sum : 0.5;
  const prediction = prob1 >= 0.5 ? 1 : 0;
  return { prediction, probability: Math.round(prob1 * 1000) / 1000 };
}

function getRiskLevel(prob: number | null): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (prob === null) return 'LOW';
  if (prob < 0.3) return 'LOW';
  if (prob < 0.7) return 'MEDIUM';
  return 'HIGH';
}

function getTriageAction(risk: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  if (risk === 'LOW') return 'Home Monitoring & Routine Check-up';
  if (risk === 'MEDIUM') return 'Schedule Doctor Consultation';
  return 'Immediate Medical Attention Required';
}

function explainDiabetes(data: {
  Glucose?: number;
  BMI?: number;
  Age?: number;
  BloodPressure?: number;
}): string[] {
  const reasons: string[] = [];
  if ((data.Glucose ?? 0) > 140) reasons.push('High Glucose (>140 mg/dL)');
  if ((data.BMI ?? 0) > 30) reasons.push('High BMI (>30 kg/m²)');
  if ((data.Age ?? 0) > 45) reasons.push('Age Above 45');
  if ((data.BloodPressure ?? 0) > 90) reasons.push('High Diastolic Blood Pressure (>90 mmHg)');
  return reasons;
}

function explainHeart(data: {
  age?: number;
  chol?: number;
  trestbps?: number;
  exang?: number;
  oldpeak?: number;
}): string[] {
  const reasons: string[] = [];
  if ((data.age ?? 0) > 50) reasons.push('Age Above 50');
  if ((data.chol ?? 0) > 240) reasons.push('High Cholesterol (>240 mg/dL)');
  if ((data.trestbps ?? 0) > 140) reasons.push('High Resting Blood Pressure (>140 mmHg)');
  if ((data.exang ?? 0) === 1) reasons.push('Exercise Induced Angina');
  if ((data.oldpeak ?? 0) > 2) reasons.push('Abnormal ECG Stress Result');
  return reasons;
}

function explainHypertension(data: {
  Systolic_BP?: number;
  Diastolic_BP?: number;
  BMI?: number;
  Family_History?: number;
  Smoking_Status?: number;
  Exercise_Level?: number;
}): string[] {
  const reasons: string[] = [];
  if ((data.Systolic_BP ?? 0) > 140) reasons.push('High Systolic Blood Pressure (>140 mmHg)');
  if ((data.Diastolic_BP ?? 0) > 90) reasons.push('High Diastolic Blood Pressure (>90 mmHg)');
  if ((data.BMI ?? 0) > 30) reasons.push('Obesity Risk (BMI >30)');
  if ((data.Family_History ?? 0) === 1) reasons.push('Family History Of Hypertension');
  if ((data.Smoking_Status ?? 0) === 1) reasons.push('Smoking Risk');
  if ((data.Exercise_Level ?? 0) === 0) reasons.push('Low Physical Activity');
  return reasons;
}

function calculateClinicalRisk(patient: {
  Systolic_BP?: number;
  Diastolic_BP?: number;
  Oxygen?: number;
  Heart_Rate?: number;
  Temperature?: number;
  symptoms?: string[];
  medical_history?: string[];
  current_medications?: string[];
}): { clinical_score: number; clinical_risk: string; clinical_reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const systolic = patient.Systolic_BP ?? 0;
  const diastolic = patient.Diastolic_BP ?? 0;
  const oxygen = patient.Oxygen ?? 100;
  const heartRate = patient.Heart_Rate ?? 70;
  const temperature = patient.Temperature ?? 98.6;

  if (systolic >= 180 || diastolic >= 120) {
    score += 40;
    reasons.push('Severely Elevated Blood Pressure');
  } else if (systolic >= 140 || diastolic >= 90) {
    score += 20;
    reasons.push('High Blood Pressure');
  }

  if (oxygen < 90) {
    score += 40;
    reasons.push('Low Oxygen Saturation (<90%)');
  } else if (oxygen < 95) {
    score += 20;
    reasons.push('Reduced Oxygen Saturation (<95%)');
  }

  if (heartRate > 120) {
    score += 20;
    reasons.push('High Heart Rate (>120 bpm)');
  } else if (heartRate < 50 && heartRate > 0) {
    score += 20;
    reasons.push('Low Heart Rate (<50 bpm)');
  }

  if (temperature >= 102) {
    score += 20;
    reasons.push('High Fever (≥102 °F)');
  }

  const symptoms = (patient.symptoms || []).map((s) => s.toLowerCase());
  const highRiskSymptoms = [
    'chest pain',
    'shortness of breath',
    'stroke',
    'heart attack',
    'fainting',
    'unconscious',
  ];
  const mediumRiskSymptoms = ['swelling', 'dizziness', 'headache', 'fatigue', 'persistent cough'];

  for (const s of symptoms) {
    if (highRiskSymptoms.some((h) => s.includes(h))) {
      score += 30;
      reasons.push(`High-Risk Symptom: ${s}`);
    } else if (mediumRiskSymptoms.some((m) => s.includes(m))) {
      score += 15;
      reasons.push(`Symptom: ${s}`);
    }
  }

  const history = (patient.medical_history || []).map((h) => h.toLowerCase());
  for (const h of history) {
    if (['heart disease', 'stroke', 'kidney disease'].some((crit) => h.includes(crit))) {
      score += 20;
      reasons.push(`Critical History: ${h}`);
    } else if (['diabetes', 'hypertension', 'asthma'].some((med) => h.includes(med))) {
      score += 10;
      reasons.push(`Medical History: ${h}`);
    }
  }

  if ((patient.current_medications || []).length > 0) {
    score += 10;
    reasons.push('Currently on Medication');
  }

  let level = 'LOW';
  if (score >= 80) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';

  return {
    clinical_score: score,
    clinical_risk: level,
    clinical_reasons: reasons,
  };
}

const numberValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getAssessmentPredictions = async ({
  age: rawAge,
  gender,
  assessment,
  oxygen: rawOxygen,
  heartRate: rawHeartRate,
  systolicBP: rawSystolicBP,
  diastolicBP: rawDiastolicBP,
  symptoms = [],
  medicalHistory = [],
  medications = [],
  height: rawHeight,
  weight: rawWeight,
}: {
  age: unknown;
  gender: unknown;
  assessment: AssessmentModelInputs;
  oxygen: unknown;
  heartRate: unknown;
  systolicBP: unknown;
  diastolicBP: unknown;
  symptoms: string[];
  medicalHistory: string[];
  medications: string[];
  height?: unknown;
  weight?: unknown;
}): Promise<ModelResult[]> => {
  const age = numberValue(rawAge) ?? 40;
  const systolicBP = numberValue(rawSystolicBP) ?? 120;
  const diastolicBP = numberValue(rawDiastolicBP) ?? 80;
  const heartRate = numberValue(rawHeartRate) ?? 72;
  const oxygen = numberValue(rawOxygen) ?? 98;
  const height = numberValue(rawHeight);
  const weight = numberValue(rawWeight);

  // Auto-calculate BMI from weight (kg) and height (cm/m) if not provided directly
  let bmi = numberValue(assessment.BMI);
  if (bmi === undefined && height && weight && height > 0) {
    const heightInMeters = height > 3 ? height / 100 : height;
    bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }

  const sex =
    String(gender).toLowerCase() === 'male'
      ? 1
      : String(gender).toLowerCase() === 'female'
      ? 0
      : 1;

  const clinical = calculateClinicalRisk({
    Systolic_BP: systolicBP,
    Diastolic_BP: diastolicBP,
    Oxygen: oxygen,
    Heart_Rate: heartRate,
    symptoms,
    medical_history: medicalHistory,
    current_medications: medications,
  });

  const definitions: Array<{
    model: ModelName;
    features: (number | undefined)[];
    message: string;
    explain: () => string[];
  }> = [
    {
      model: 'diabetes',
      features: [
        numberValue(assessment.Pregnancies) ?? 0,
        numberValue(assessment.Glucose),
        diastolicBP,
        numberValue(assessment.SkinThickness) ?? 20,
        numberValue(assessment.Insulin) ?? 79,
        bmi ?? 25,
        numberValue(assessment.DiabetesPedigreeFunction) ?? 0.47,
        age,
      ],
      message: 'Provide blood glucose level in assessment to compute diabetes prediction.',
      explain: () =>
        explainDiabetes({
          Glucose: numberValue(assessment.Glucose),
          BMI: bmi,
          Age: age,
          BloodPressure: diastolicBP,
        }),
    },
    {
      model: 'heart',
      features: [
        age,
        sex,
        numberValue(assessment.cp) ?? 0,
        systolicBP,
        numberValue(assessment.chol) ?? (systolicBP > 140 ? 240 : 190),
        numberValue(assessment.fbs) ?? (numberValue(assessment.Glucose) && numberValue(assessment.Glucose)! > 120 ? 1 : 0),
        numberValue(assessment.restecg) ?? 0,
        numberValue(assessment.thalach) ?? heartRate,
        numberValue(assessment.exang) ?? (symptoms.some((s) => s.toLowerCase().includes('chest pain')) ? 1 : 0),
        numberValue(assessment.oldpeak) ?? 1.0,
        numberValue(assessment.slope) ?? 1,
        numberValue(assessment.ca) ?? 0,
        numberValue(assessment.thal) ?? 2,
      ],
      message: 'Provide vital signs and patient age to compute heart disease prediction.',
      explain: () =>
        explainHeart({
          age,
          chol: numberValue(assessment.chol),
          trestbps: systolicBP,
          exang: numberValue(assessment.exang),
          oldpeak: numberValue(assessment.oldpeak),
        }),
    },
    {
      model: 'hypertension',
      features: [
        age,
        bmi ?? 24,
        systolicBP,
        diastolicBP,
        heartRate,
        numberValue(assessment.BP_History) ?? (systolicBP >= 140 || diastolicBP >= 90 ? 1 : 0),
        numberValue(assessment.Medication) ?? (medications.length > 0 ? 1 : 0),
        numberValue(assessment.Family_History) ?? 0,
        numberValue(assessment.Exercise_Level) ?? 1,
        numberValue(assessment.Smoking_Status) ?? 0,
      ],
      message: 'Provide blood pressure (Systolic & Diastolic) to compute hypertension prediction.',
      explain: () =>
        explainHypertension({
          Systolic_BP: systolicBP,
          Diastolic_BP: diastolicBP,
          BMI: bmi,
          Family_History: numberValue(assessment.Family_History),
          Smoking_Status: numberValue(assessment.Smoking_Status),
          Exercise_Level: numberValue(assessment.Exercise_Level),
        }),
    },
  ];

  return definitions.map(({ model, features, message, explain }) => {
    if (features.some((val) => val === undefined)) {
      return { model, error: message };
    }
    const { prediction, probability } = runLinearClassifier(
      model,
      features as number[]
    );
    const risk_level = getRiskLevel(probability);
    const triage = getTriageAction(risk_level);
    const reasons = explain();

    return {
      model,
      prediction: {
        prediction,
        probability,
        risk_level,
        triage,
        reasons,
        ...clinical,
      },
    };
  });
};
