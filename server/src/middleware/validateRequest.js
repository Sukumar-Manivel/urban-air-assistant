import { CO2_FACTORS } from "../services/calculatorService.js";

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function checkHouseholdBooleans(household) {
  const flags = ["hasChildren", "hasElderly", "hasAsthma"];
  for (const flag of flags) {
    if (household[flag] !== undefined && typeof household[flag] !== "boolean") {
      return false;
    }
  }
  return true;
}

export function validateActionPlan(req, res, next) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: "Request body must be a valid object" });
  }
  const { household } = req.body;
  if (household !== undefined && !isPlainObject(household)) {
    return res.status(400).json({ error: "household must be a valid object" });
  }
  if (household && !checkHouseholdBooleans(household)) {
    return res.status(400).json({ error: "Household flags must be boolean values" });
  }
  next();
}

function checkImpactModes(body) {
  const current = String(body.currentMode || "car").toLowerCase();
  const target = String(body.targetMode || "metro").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CO2_FACTORS, current)) {
    return `Invalid currentMode: ${body.currentMode}`;
  }
  if (!Object.prototype.hasOwnProperty.call(CO2_FACTORS, target)) {
    return `Invalid targetMode: ${body.targetMode}`;
  }
  return null;
}

function checkImpactNumbers(body) {
  const km = Number(body.weeklyKm);
  if (body.weeklyKm !== undefined && (!Number.isFinite(km) || km < 0)) {
    return "weeklyKm must be a non-negative finite number";
  }
  const aqi = Number(body.aqi);
  if (body.aqi !== undefined && (!Number.isFinite(aqi) || aqi < 0)) {
    return "aqi must be a non-negative finite number";
  }
  return null;
}

function checkImpactBooleans(body) {
  if (body.usesMask !== undefined && typeof body.usesMask !== "boolean") {
    return "usesMask must be a boolean";
  }
  if (body.usesPurifier !== undefined && typeof body.usesPurifier !== "boolean") {
    return "usesPurifier must be a boolean";
  }
  return null;
}

export function validateCalculateImpact(req, res, next) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: "Request body must be a valid object" });
  }
  const numErr = checkImpactNumbers(req.body);
  if (numErr) return res.status(400).json({ error: numErr });

  const modeErr = checkImpactModes(req.body);
  if (modeErr) return res.status(400).json({ error: modeErr });

  const boolErr = checkImpactBooleans(req.body);
  if (boolErr) return res.status(400).json({ error: boolErr });

  next();
}
