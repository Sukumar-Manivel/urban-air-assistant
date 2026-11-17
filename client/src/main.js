let currentAqiData = { aqi: 150 };

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function updatePollutantCards(pollutants = {}) {
  const p25 = pollutants.pm25 ?? "--";
  const p10 = pollutants.pm10 ?? "--";
  const pCo = pollutants.co ?? "--";
  setElementText("val-pm25", `${p25} µg/m³`);
  setElementText("val-pm10", `${p10} µg/m³`);
  setElementText("val-co", `${pCo} µg/m³`);
}

function updateAqiDisplay(data) {
  currentAqiData = data;
  setElementText("aqi-location-label", `${data.city}, ${data.country}`);
  setElementText("aqi-value", String(data.aqi));
  setElementText("aqi-badge", data.category);

  const badgeEl = document.getElementById("aqi-badge");
  if (badgeEl && data.color) {
    badgeEl.style.backgroundColor = data.color;
  }

  updatePollutantCards(data.pollutants);
}

function createAlertNode(text) {
  const node = document.createElement("div");
  node.className = "alert-banner";
  const strong = document.createElement("strong");
  strong.textContent = "⚠️ Critical Health Warning: ";
  const span = document.createElement("span");
  span.textContent = text;
  node.appendChild(strong);
  node.appendChild(span);
  return node;
}

function createRoutineNode(item) {
  const node = document.createElement("div");
  node.className = "routine-item";

  const header = document.createElement("div");
  header.className = "routine-header";

  const timeSlot = document.createElement("span");
  timeSlot.textContent = item.timeSlot;

  const badge = document.createElement("span");
  badge.textContent = `Risk: ${item.riskLevel}`;

  header.appendChild(timeSlot);
  header.appendChild(badge);

  const advice = document.createElement("p");
  advice.style.fontSize = "0.9rem";
  advice.textContent = item.advice;

  node.appendChild(header);
  node.appendChild(advice);
  return node;
}

function renderActionPlan(plan) {
  const container = document.getElementById("ai-plan-container");
  if (!container) return;
  container.replaceChildren();

  const summary = document.createElement("p");
  summary.style.marginBottom = "14px";
  summary.style.fontWeight = "600";
  summary.textContent = plan.summary;
  container.appendChild(summary);

  if (Array.isArray(plan.vulnerableAlerts)) {
    for (const alert of plan.vulnerableAlerts) {
      container.appendChild(createAlertNode(alert));
    }
  }

  if (Array.isArray(plan.hourlyRoutine)) {
    const routineHeading = document.createElement("h3");
    routineHeading.style.margin = "16px 0 8px 0";
    routineHeading.style.fontSize = "1.05rem";
    routineHeading.textContent = "Personalized Hourly Smog Protocol";
    container.appendChild(routineHeading);

    for (const item of plan.hourlyRoutine) {
      container.appendChild(createRoutineNode(item));
    }
  }
}

export async function fetchAqiForCity(city) {
  try {
    const res = await fetch(`/api/air-quality?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("AQI request failed");
    const data = await res.json();
    updateAqiDisplay(data);
    return data;
  } catch {
    setElementText("aqi-badge", "Offline / Fallback Data");
    return null;
  }
}

function readHouseholdPayload() {
  const cityInput = document.getElementById("city-input");
  const modeSelect = document.getElementById("commute-mode-select");
  return {
    city: cityInput ? cityInput.value : "Delhi",
    household: {
      hasChildren: Boolean(document.getElementById("chk-children")?.checked),
      hasElderly: Boolean(document.getElementById("chk-elderly")?.checked),
      hasAsthma: Boolean(document.getElementById("chk-asthma")?.checked),
      commuteMode: modeSelect ? modeSelect.value : "car"
    }
  };
}

export async function handlePlanSubmit(event) {
  event.preventDefault();
  const payload = readHouseholdPayload();

  try {
    setElementText("ai-plan-container", "Generating personalized GenAI plan...");
    const res = await fetch("/api/action-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.plan) {
      renderActionPlan(result.plan);
    }
  } catch {
    setElementText("ai-plan-container", "Unable to load plan. Please try again.");
  }
}

function readCalcPayload() {
  const kmInput = document.getElementById("calc-weekly-km");
  const modeSelect = document.getElementById("calc-target-mode");
  const maskBox = document.getElementById("calc-chk-mask");
  const purifierBox = document.getElementById("calc-chk-purifier");

  return {
    currentMode: "car",
    targetMode: modeSelect ? modeSelect.value : "metro",
    weeklyKm: kmInput ? Number(kmInput.value) : 70,
    aqi: currentAqiData.aqi || 150,
    usesMask: Boolean(maskBox?.checked),
    usesPurifier: Boolean(purifierBox?.checked)
  };
}

export async function handleCalcSubmit(event) {
  event.preventDefault();
  const payload = readCalcPayload();

  try {
    const res = await fetch("/api/calculate-impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.savings) {
      setElementText("res-co2-savings", `${data.savings.co2SavedKgPerWeek} kg`);
      setElementText("res-co2-desc", `${data.savings.co2ReductionPercent}% weekly reduction`);
      setElementText("res-pm25-savings", `${data.savings.exposureReductionPercent}%`);
      setElementText("res-pm25-desc", `${data.savings.pm25AvoidedMicrograms} µg PM2.5 avoided`);
    }
  } catch {
    setElementText("res-co2-savings", "--");
  }
}

function attachHotspots() {
  const chips = document.querySelectorAll(".btn-chip");
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const city = chip.getAttribute("data-city");
      const cityInput = document.getElementById("city-input");
      if (cityInput && city) {
        cityInput.value = city;
        fetchAqiForCity(city);
      }
    });
  }
}

export function initApp() {
  const cityForm = document.getElementById("city-form");
  const planForm = document.getElementById("plan-form");
  const calcForm = document.getElementById("calc-form");

  cityForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = document.getElementById("city-input")?.value;
    if (city) fetchAqiForCity(city);
  });

  planForm?.addEventListener("submit", handlePlanSubmit);
  calcForm?.addEventListener("submit", handleCalcSubmit);

  attachHotspots();
  fetchAqiForCity("Delhi");
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initApp);
}
