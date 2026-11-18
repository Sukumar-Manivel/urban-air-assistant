import { Router } from "express";
import { getCityAirQuality } from "../services/airQualityService.js";
import { generateGeminiPlan } from "../services/geminiService.js";
import { computeImpact } from "../services/calculatorService.js";
import { validateActionPlan, validateCalculateImpact } from "../middleware/validateRequest.js";

const router = Router();

export function handleHealth(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "urban-air-assistant",
    version: "1.0.0",
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
}

function respondError(res, err, fallbackMsg) {
  const isNotFound = err.message && err.message.includes("not found");
  const code = err.status || (isNotFound ? 404 : 500);
  res.status(code).json({ error: err.message || fallbackMsg });
}

export async function handleAirQuality(req, res) {
  const city = (req.query.city || "Delhi").toString().slice(0, 60);
  try {
    const data = await getCityAirQuality(city);
    res.status(200).json(data);
  } catch (err) {
    respondError(res, err, "Air quality lookup failed");
  }
}

function sanitizeHousehold(household = {}) {
  const safe = household || {};
  return {
    hasChildren: Boolean(safe.hasChildren),
    hasElderly: Boolean(safe.hasElderly),
    hasAsthma: Boolean(safe.hasAsthma),
    commuteMode: String(safe.commuteMode || "car").slice(0, 30)
  };
}

export async function handleActionPlan(req, res) {
  const { city = "Delhi", household = {} } = req.body || {};
  const sanitizedCity = String(city).slice(0, 60);
  const cleanHousehold = sanitizeHousehold(household);

  try {
    const aqiData = await getCityAirQuality(sanitizedCity);
    const plan = await generateGeminiPlan(sanitizedCity, aqiData, cleanHousehold);
    res.status(200).json({ city: sanitizedCity, airQuality: aqiData, plan });
  } catch (err) {
    respondError(res, err, "Action plan generation failed");
  }
}

export function handleCalculateImpact(req, res) {
  try {
    const impact = computeImpact(req.body || {});
    res.status(200).json(impact);
  } catch (err) {
    res.status(400).json({ error: "Invalid impact parameters", details: err.message });
  }
}

router.get("/health", handleHealth);
router.get("/air-quality", handleAirQuality);
router.post("/action-plan", validateActionPlan, handleActionPlan);
router.post("/calculate-impact", validateCalculateImpact, handleCalculateImpact);

export default router;
