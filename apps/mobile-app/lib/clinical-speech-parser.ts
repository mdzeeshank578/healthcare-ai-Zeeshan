export interface ParsedClinicalAssessment {
  name?: string;
  age?: string;
  gender?: string;
  height?: string;
  weight?: string;
  temperature?: string;
  systolicBP?: string;
  diastolicBP?: string;
  heartRate?: string;
  oxygen?: string;
  symptoms: string[];
  additionalSymptoms?: string;
  history: string[];
  medications?: string;
  notes?: string;
  summary: string;
}

const COMMON_DRUGS = [
  'paracetamol',
  'metformin',
  'amlodipine',
  'insulin',
  'aspirin',
  'atorvastatin',
  'azithromycin',
  'cetirizine',
  'pantoprazole',
  'omeprazole',
  'telmisartan',
  'atenolol',
  'losartan',
  'glimepiride',
  'amoxicillin',
  'ciprofloxacin',
  'ibuprofen',
  'cough syrup',
  'ors',
  'iron tablet',
  'folic acid',
];

export function parseClinicalSpeech(rawText: string): ParsedClinicalAssessment {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  const extracted: ParsedClinicalAssessment = {
    symptoms: [],
    history: [],
    summary: '',
  };

  const detectedItems: string[] = [];

  // 1. Temperature
  const tempMatch =
    lower.match(/(?:temp(?:erature)?|bukhar|bukhaar|fever)\s*(?:is|of|=|:)?\s*(\d{2,3}(?:\.\d+)?)/i) ||
    lower.match(/(\d{2,3}(?:\.\d+)?)\s*(?:degrees?|fahrenheit|degree\s*f|°\s*f)\b/i);

  if (tempMatch) {
    const val = parseFloat(tempMatch[1]);
    if (val >= 93 && val <= 108) {
      extracted.temperature = String(val);
      detectedItems.push(`Temp: ${val}°F`);
    }
  }

  // 2. Blood Pressure (BP)
  const bpMatch =
    lower.match(/(?:bp|blood\s*pressure)\s*(?:is|=|:)?\s*(\d{2,3})\s*(?:[\/\\]|over|by|\s+)\s*(\d{2,3})/i);

  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    if (sys >= 60 && sys <= 250 && dia >= 40 && dia <= 160) {
      extracted.systolicBP = String(sys);
      extracted.diastolicBP = String(dia);
      detectedItems.push(`BP: ${sys}/${dia}`);
    }
  } else {
    const sysMatch =
      lower.match(/(?:systolic(?:\s*bp)?|blood\s*pressure|bp)\s*(?:is|=|:)?\s*(\d{2,3})/i);
    const diaMatch =
      lower.match(/(?:diastolic(?:\s*bp)?)\s*(?:is|=|:)?\s*(\d{2,3})/i);
    if (sysMatch) {
      const sysVal = parseInt(sysMatch[1], 10);
      if (sysVal >= 60 && sysVal <= 250) {
        extracted.systolicBP = String(sysVal);
        detectedItems.push(`Sys BP: ${sysVal}`);
      }
    }
    if (diaMatch) {
      const diaVal = parseInt(diaMatch[1], 10);
      if (diaVal >= 40 && diaVal <= 160) {
        extracted.diastolicBP = String(diaVal);
        detectedItems.push(`Dia BP: ${diaVal}`);
      }
    }
  }

  // 3. Heart Rate / Pulse
  const hrMatch =
    lower.match(/(?:heart\s*rate|pulse(?:\s*rate)?|dhadkan)\s*(?:is|=|:)?\s*(\d{2,3})/i) ||
    lower.match(/(\d{2,3})\s*(?:bpm|beats\s*per\s*minute)/i);

  if (hrMatch) {
    const val = parseInt(hrMatch[1], 10);
    if (val >= 35 && val <= 220) {
      extracted.heartRate = String(val);
      detectedItems.push(`Pulse: ${val} BPM`);
    }
  }

  // 4. Oxygen Saturation (SpO2)
  const o2Match =
    lower.match(/(?:oxygen(?:\s*saturation|\s*level)?|spo2|o2|saturation)\s*(?:is|=|:)?\s*(\d{2,3})%?/i) ||
    lower.match(/(\d{2,3})%?\s*(?:spo2|percent\s*oxygen)/i);

  if (o2Match) {
    const val = parseInt(o2Match[1], 10);
    if (val >= 50 && val <= 100) {
      extracted.oxygen = String(val);
      detectedItems.push(`SpO2: ${val}%`);
    }
  }

  // 5. Age
  const ageMatch =
    lower.match(/(?:age|umar)\s*(?:is|=|:)?\s*(\d{1,3})/i) ||
    lower.match(/(\d{1,3})\s*(?:years?\s*old|yr|yrs|saal(?:\s*ka|\s*ki)?)/i);

  if (ageMatch) {
    const val = parseInt(ageMatch[1], 10);
    if (val >= 0 && val <= 125) {
      extracted.age = String(val);
      detectedItems.push(`Age: ${val}`);
    }
  }

  // 6. Gender
  if (/\b(?:female|mahila|aurat|woman|girl|lady|stree)\b/i.test(lower)) {
    extracted.gender = 'Female';
    detectedItems.push('Gender: Female');
  } else if (/\b(?:male|purush|aadmi|man|boy)\b/i.test(lower)) {
    extracted.gender = 'Male';
    detectedItems.push('Gender: Male');
  } else if (/\b(?:other|transgender|third\s*gender)\b/i.test(lower)) {
    extracted.gender = 'Other';
    detectedItems.push('Gender: Other');
  }

  // 7. Height (cm)
  const heightMatch = lower.match(/(?:height|kad|lambaai)\s*(?:is|=|:)?\s*(\d{2,3})\s*(?:cm|centimeters?)?/i);
  if (heightMatch) {
    const val = parseInt(heightMatch[1], 10);
    if (val >= 40 && val <= 250) {
      extracted.height = String(val);
      detectedItems.push(`Height: ${val}cm`);
    }
  }

  // 8. Weight (kg)
  const weightMatch = lower.match(/(?:weight|vajan|wazan|bhaar)\s*(?:is|=|:)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)?/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    if (val >= 2 && val <= 300) {
      extracted.weight = String(val);
      detectedItems.push(`Weight: ${val}kg`);
    }
  }

  // 9. Quick Symptoms
  const symptomChecks: Array<[string, RegExp]> = [
    ['Fever', /\b(?:fever|bukhar|bukhaar|pyrexia|tapaav|garam)\b/i],
    ['Cough', /\b(?:cough|khansi|khaansi|coughing)\b/i],
    ['Dizziness', /\b(?:dizziness|dizzy|chakkar|giddiness|vertigo)\b/i],
    ['Fatigue', /\b(?:fatigue|tired|tiredness|kamzori|thakan|kamjori|exhaustion|exhausted|weakness)\b/i],
    ['Shortness of Breath', /\b(?:shortness\s*of\s*breath|breathless(?:ness)?|saans(?:\s*fulna|\s*lene\s*me\s*takleef|\s*phoolna)?|dyspnea)\b/i],
    ['Nausea / Vomiting', /\b(?:nausea|vomit(?:ing)?|ulti|nauseous|je\s*machlana)\b/i],
  ];

  for (const [sym, regex] of symptomChecks) {
    if (regex.test(lower) && !extracted.symptoms.includes(sym)) {
      extracted.symptoms.push(sym);
      detectedItems.push(`Symptom: ${sym}`);
    }
  }

  // Additional Symptoms detection
  const additionalSymptomMatches: string[] = [];
  if (/\b(?:headache|sar\s*dard|head\s*pain)\b/i.test(lower)) additionalSymptomMatches.push('Headache');
  if (/\b(?:chest\s*pain|seene\s*me\s*dard)\b/i.test(lower)) additionalSymptomMatches.push('Chest Pain');
  if (/\b(?:body\s*ache|body\s*pain|badan\s*dard)\b/i.test(lower)) additionalSymptomMatches.push('Body Ache');
  if (/\b(?:cold|runny\s*nose|zukam|jukam)\b/i.test(lower)) additionalSymptomMatches.push('Cold / Rhinitis');
  if (/\b(?:diarrhea|loose\s*motion|dast)\b/i.test(lower)) additionalSymptomMatches.push('Diarrhea');
  if (/\b(?:sore\s*throat|gale\s*me\s*dard)\b/i.test(lower)) additionalSymptomMatches.push('Sore Throat');
  if (/\b(?:abdominal\s*pain|stomach\s*pain|pet\s*dard)\b/i.test(lower)) additionalSymptomMatches.push('Abdominal Pain');

  if (additionalSymptomMatches.length > 0) {
    extracted.additionalSymptoms = additionalSymptomMatches.join(', ');
    detectedItems.push(`Other: ${extracted.additionalSymptoms}`);
  }

  // 10. Medical History
  const historyChecks: Array<[string, RegExp]> = [
    ['Diabetes', /\b(?:diabetes|diabetic|sugar(?:\s*ki\s*bimari)?|madhumeh)\b/i],
    ['Hypertension', /\b(?:hypertension|high\s*bp|high\s*blood\s*pressure)\b/i],
    ['Heart Disease', /\b(?:heart\s*disease|heart\s*problem|cardiac|dil\s*ki\s*bimari)\b/i],
    ['Asthma', /\b(?:asthma|asthmatic|dama)\b/i],
    ['Kidney Disease', /\b(?:kidney\s*disease|kidney\s*problem|renal|gurda)\b/i],
    ['Allergies', /\b(?:allerg(?:y|ies|ic))\b/i],
  ];

  for (const [condition, regex] of historyChecks) {
    if (regex.test(lower) && !extracted.history.includes(condition)) {
      extracted.history.push(condition);
      detectedItems.push(`History: ${condition}`);
    }
  }

  // 11. Medications
  const foundMeds: string[] = [];
  for (const drug of COMMON_DRUGS) {
    if (lower.includes(drug)) {
      foundMeds.push(drug.charAt(0).toUpperCase() + drug.slice(1));
    }
  }

  const medPhraseMatch = lower.match(/(?:taking|medication[s]?|medicine[s]?|dawa(?:i)?)\s*(?:is|are|=|:)?\s*([^.,\n]+)/i);
  if (medPhraseMatch && foundMeds.length === 0) {
    const rawMed = medPhraseMatch[1].trim();
    if (rawMed.length > 2 && rawMed.length < 60) {
      foundMeds.push(rawMed);
    }
  }

  if (foundMeds.length > 0) {
    extracted.medications = foundMeds.join(', ');
    detectedItems.push(`Meds: ${extracted.medications}`);
  }

  // 12. Notes
  extracted.notes = text;
  extracted.summary = detectedItems.length > 0
    ? `Extracted: ${detectedItems.join(' • ')}`
    : 'No clinical vitals recognized in text.';

  return extracted;
}
