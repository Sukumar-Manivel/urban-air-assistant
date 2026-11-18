export const CO2_FACTORS = {
  car: 0.192,
  motorcycle: 0.103,
  carpool: 0.064,
  bus: 0.082,
  metro: 0.028,
  bicycle: 0.0,
  walk: 0.0
};

export function calculateCo2(mode, distanceKm) {
  const normalized = (mode || "car").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CO2_FACTORS, normalized)) {
    throw new Error(`Invalid transport mode: ${mode}`);
  }
  const factor = CO2_FACTORS[normalized];
  return Number((distanceKm * factor).toFixed(2));
}

export function calculateInhalation(aqi, distanceKm, usesMask, usesPurifier) {
  const pm25Ambient = Math.max(10, aqi * 0.7);
  const transitHours = distanceKm / 25;
  const transitInhalation = transitHours * 0.8 * pm25Ambient;
  const indoorHours = 24 * 7 - transitHours;
  const indoorFactor = usesPurifier ? 0.3 : 0.8;
  const indoorInhalation = indoorHours * 0.5 * (pm25Ambient * indoorFactor);

  const transitMaskFactor = usesMask ? 0.15 : 1.0;
  const total = (transitInhalation * transitMaskFactor) + indoorInhalation;
  return Math.round(total);
}

function validateMode(mode, name) {
  const norm = String(mode || "").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CO2_FACTORS, norm)) {
    throw new Error(`Invalid ${name}: ${mode}`);
  }
  return norm;
}

function validateNumber(val, name) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${name} must be a non-negative finite number`);
  }
  return num;
}

function validateBoolean(val, name) {
  if (val !== undefined && typeof val !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return Boolean(val);
}

export function sanitizeInputs(input = {}) {
  const currentMode = validateMode(input.currentMode || "car", "currentMode");
  const targetMode = validateMode(input.targetMode || "metro", "targetMode");
  const km = validateNumber(input.weeklyKm ?? 60, "weeklyKm");
  const aqi = validateNumber(input.aqi ?? 180, "aqi");
  return {
    currentMode,
    targetMode,
    weeklyKm: Math.min(1000, km),
    aqi: Math.min(800, aqi),
    usesMask: validateBoolean(input.usesMask, "usesMask"),
    usesPurifier: validateBoolean(input.usesPurifier, "usesPurifier")
  };
}

export function computeSavings(baselineCo2, targetCo2, baselineInhaled, protectedInhaled) {
  const co2SavedKg = Number(Math.max(0, baselineCo2 - targetCo2).toFixed(2));
  const pm25Avoided = Math.max(0, baselineInhaled - protectedInhaled);
  return {
    co2SavedKgPerWeek: co2SavedKg,
    co2ReductionPercent: Math.round((co2SavedKg / (baselineCo2 || 1)) * 100),
    pm25AvoidedMicrograms: pm25Avoided,
    exposureReductionPercent: Math.round((pm25Avoided / (baselineInhaled || 1)) * 100)
  };
}

export function computeImpact(input = {}) {
  const params = sanitizeInputs(input);

  const baselineCo2 = calculateCo2(params.currentMode, params.weeklyKm);
  const targetCo2 = calculateCo2(params.targetMode, params.weeklyKm);

  const baselineInhaled = calculateInhalation(params.aqi, params.weeklyKm, false, false);
  const protectedInhaled = calculateInhalation(params.aqi, params.weeklyKm, params.usesMask, params.usesPurifier);

  const savings = computeSavings(baselineCo2, targetCo2, baselineInhaled, protectedInhaled);

  return {
    baseline: { co2KgPerWeek: baselineCo2, pm25InhaledMicrograms: baselineInhaled },
    withInterventions: { co2KgPerWeek: targetCo2, pm25InhaledMicrograms: protectedInhaled },
    savings
  };
}
