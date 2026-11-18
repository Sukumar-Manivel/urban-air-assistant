import { GoogleGenAI, Type } from "@google/genai";

export const ACTION_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    aqiLevel: { type: Type.STRING },
    vulnerableAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    commuteAlternative: {
      type: Type.OBJECT,
      properties: {
        recommendation: { type: Type.STRING },
        co2SavedKg: { type: Type.NUMBER },
        exposureSavedPercent: { type: Type.NUMBER }
      },
      required: ["recommendation", "co2SavedKg", "exposureSavedPercent"]
    },
    indoorAirHacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tip: { type: Type.STRING },
          impact: { type: Type.STRING }
        },
        required: ["tip", "impact"]
      }
    },
    hourlyRoutine: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timeSlot: { type: Type.STRING },
          advice: { type: Type.STRING },
          riskLevel: { type: Type.STRING }
        },
        required: ["timeSlot", "advice", "riskLevel"]
      }
    }
  },
  required: [
    "summary",
    "aqiLevel",
    "vulnerableAlerts",
    "commuteAlternative",
    "indoorAirHacks",
    "hourlyRoutine"
  ]
};

export function buildVulnerabilityAlerts(household, aqi) {
  const alerts = [];
  if (household.hasAsthma) {
    alerts.push("Keep rescue inhalers accessible; particulate spikes trigger acute airway inflammation.");
  }
  if (household.hasChildren) {
    alerts.push("Children breathe 50% more air per pound: prohibit outdoor recess and morning sports.");
  }
  if (household.hasElderly) {
    alerts.push("Elderly members must avoid morning garden walks; elevated PM2.5 strains cardiovascular health.");
  }
  if (alerts.length === 0) {
    alerts.push(`General public alert: AQI is ${aqi}; reduce strenuous outdoor workouts.`);
  }
  return alerts;
}

export function buildCommuteAdvice(commuteMode) {
  const mode = (commuteMode || "car").toLowerCase();
  if (mode.includes("car") || mode.includes("drive")) {
    return {
      recommendation: "Shift to Electric Metro or Carpool; set vehicle AC to cabin recirculate mode.",
      co2SavedKg: 4.2,
      exposureSavedPercent: 35
    };
  }
  if (mode.includes("bike") || mode.includes("motorcycle")) {
    return {
      recommendation: "Wear a certified N95/FFP2 respirator; swap 2-wheeler commute for covered rapid transit.",
      co2SavedKg: 1.8,
      exposureSavedPercent: 60
    };
  }
  return {
    recommendation: "Wear an N95 respirator along busy corridors; utilize filtered public transit coaches.",
    co2SavedKg: 0.8,
    exposureSavedPercent: 45
  };
}

export function buildIndoorHacks(aqi) {
  const doorHack = aqi > 200
    ? "Hermetic Door Sealing: Place damp rolled towels beneath exterior doors."
    : "Strategic Ventilation: Open windows only between 1:00 PM and 3:00 PM when inversion lifts.";

  return [
    {
      tip: "DIY HEPA Box Fan: Tape MERV-13 filter tightly to standard box fan facing inward.",
      impact: "Cuts indoor PM2.5 by up to 70% within 45 minutes for under $25."
    },
    {
      tip: "Wet Mopping Protocol: Use damp microfiber cloths; never dry sweep or vacuum without HEPA.",
      impact: "Prevents toxic settled particulate resuspension into room air."
    },
    {
      tip: doorHack,
      impact: "Stops chimney-effect infiltration of street-level smoke and industrial soot."
    }
  ];
}

export function buildHourlyRoutine(aqi) {
  const highRisk = aqi > 150 ? "High" : "Moderate";
  return [
    {
      timeSlot: "06:00 - 09:00",
      advice: "Winter temperature inversion peaks; seal all windows, keep air purifiers on high, postpone outdoor runs.",
      riskLevel: highRisk
    },
    {
      timeSlot: "12:00 - 15:00",
      advice: "Sunlight warms ground layer; short outdoor errands acceptable with N95 mask; ventilate if sun is bright.",
      riskLevel: "Low"
    },
    {
      timeSlot: "18:00 - 22:00",
      advice: "Evening rush hour and cold subsidence trap tailpipe soot; run bedroom air filtration 1 hour prior to sleep.",
      riskLevel: highRisk
    }
  ];
}

export function generateDeterministicPlan(city, aqiData, household) {
  const aqi = aqiData.aqi || 150;
  return {
    summary: `Smog Action Protocol for ${city}. Current AQI is ${aqi} (${aqiData.category || "Unhealthy"}). Immediate low-emission and health-protective measures are activated.`,
    aqiLevel: aqiData.category || "Unhealthy",
    vulnerableAlerts: buildVulnerabilityAlerts(household, aqi),
    commuteAlternative: buildCommuteAdvice(household.commuteMode),
    indoorAirHacks: buildIndoorHacks(aqi),
    hourlyRoutine: buildHourlyRoutine(aqi)
  };
}

function formatMetric(val) {
  if (val === undefined || val === null) return "N/A";
  return `${val} ug/m3`;
}

function formatFlag(flag) {
  return flag ? "Yes" : "No";
}

export function buildPrompt(city, aqiData, household) {
  const p = aqiData.pollutants || {};
  const cat = aqiData.category || "Moderate";
  const mode = household.commuteMode || "Car";
  return `Act as an expert Urban Air Quality & Low-Emission Health Specialist.
Generate an actionable winter smog daily routine for ${city}.
Live Air Metrics:
- US AQI: ${aqiData.aqi} (${cat})
- PM2.5: ${formatMetric(p.pm25)}
- PM10: ${formatMetric(p.pm10)}
- Carbon Monoxide (CO): ${formatMetric(p.co)}

Household Profile:
- Has Children: ${formatFlag(household.hasChildren)}
- Has Elderly: ${formatFlag(household.hasElderly)}
- Has Asthma/Respiratory Illness: ${formatFlag(household.hasAsthma)}
- Current Commute Mode: ${mode}

Provide specific, practical guidance on reducing personal PM2.5 exposure and family carbon footprint.`;
}

export async function generateGeminiPlan(city, aqiData, household) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateDeterministicPlan(city, aqiData, household);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildPrompt(city, aqiData, household);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ACTION_PLAN_SCHEMA,
        temperature: 0.2
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Gemini generation failed, using deterministic fallback:", err.message);
    return generateDeterministicPlan(city, aqiData, household);
  }
}
