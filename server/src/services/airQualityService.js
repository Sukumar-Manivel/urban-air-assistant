const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

export const FALLBACK_CITIES = {
  delhi: {
    name: "Delhi",
    country: "India",
    latitude: 28.6139,
    longitude: 77.2090,
    aqi: 342,
    pm25: 285.4,
    pm10: 412.1,
    co: 2450
  },
  beijing: {
    name: "Beijing",
    country: "China",
    latitude: 39.9042,
    longitude: 116.4074,
    aqi: 185,
    pm25: 120.5,
    pm10: 198.3,
    co: 1420
  },
  mumbai: {
    name: "Mumbai",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    aqi: 168,
    pm25: 88.2,
    pm10: 154.0,
    co: 1120
  },
  los_angeles: {
    name: "Los Angeles",
    country: "United States",
    latitude: 34.0522,
    longitude: -118.2437,
    aqi: 82,
    pm25: 26.8,
    pm10: 45.1,
    co: 620
  },
  london: {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    aqi: 45,
    pm25: 10.8,
    pm10: 18.2,
    co: 380
  },
  salt_lake_city: {
    name: "Salt Lake City",
    country: "United States",
    latitude: 40.7608,
    longitude: -111.8910,
    aqi: 156,
    pm25: 65.4,
    pm10: 92.0,
    co: 940
  }
};

export function getAqiCategory(aqi) {
  if (aqi <= 50) return { label: "Good", color: "#22c55e", severity: "low" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308", severity: "moderate" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "#f97316", severity: "sensitive" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444", severity: "high" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#a855f7", severity: "very-high" };
  return { label: "Hazardous", color: "#7e22ce", severity: "hazardous" };
}

function getPollutantVal(val1, val2, fallback) {
  if (val1 !== undefined && val1 !== null) return val1;
  if (val2 !== undefined && val2 !== null) return val2;
  return fallback;
}

export function extractPollutants(airData = {}, cityData = {}) {
  const pm25Val = getPollutantVal(airData.pm2_5, cityData.pm25, 50);
  const pm10Val = getPollutantVal(airData.pm10, cityData.pm10, 80);
  const coVal = getPollutantVal(airData.carbon_monoxide, cityData.co, 500);
  return {
    pm25: Number(pm25Val.toFixed(1)),
    pm10: Number(pm10Val.toFixed(1)),
    co: Number(coVal.toFixed(1))
  };
}

export function formatAirQualityResponse(cityData, airData = {}) {
  const usAqi = Math.round(airData.us_aqi ?? cityData.aqi ?? 100);
  const category = getAqiCategory(usAqi);
  return {
    city: cityData.name,
    country: cityData.country || "Global",
    coordinates: { latitude: cityData.latitude, longitude: cityData.longitude },
    aqi: usAqi,
    category: category.label,
    severity: category.severity,
    color: category.color,
    pollutants: extractPollutants(airData, cityData),
    timestamp: new Date().toISOString(),
    source: airData.isFallback ? "in-memory-fallback" : "open-meteo-live"
  };
}

export function getFallbackCity(cityName = "delhi") {
  const normalized = cityName.toLowerCase().replace(/[\s-]+/g, "_");
  const match = FALLBACK_CITIES[normalized] || FALLBACK_CITIES.delhi;
  return formatAirQualityResponse(match, { ...match, isFallback: true });
}

export function sanitizeCoordinate(val, min, max) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new Error(`Invalid coordinate: ${val}`);
  }
  return num;
}

export async function fetchCoordinates(city) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", String(city || ""));
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${city}`);
  }
  const top = data.results[0];
  const latitude = sanitizeCoordinate(top.latitude, -90, 90);
  const longitude = sanitizeCoordinate(top.longitude, -180, 180);
  return { name: top.name, country: top.country, latitude, longitude };
}

export async function fetchLiveAirQuality(lat, lon) {
  const safeLat = sanitizeCoordinate(lat, -90, 90);
  const safeLon = sanitizeCoordinate(lon, -180, 180);
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", safeLat.toString());
  url.searchParams.set("longitude", safeLon.toString());
  url.searchParams.set("current", "pm10,pm2_5,carbon_monoxide,us_aqi");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air Quality HTTP error: ${res.status}`);
  const data = await res.json();
  return data.current || {};
}

export async function getCityAirQuality(cityName) {
  const cleanCity = (cityName || "Delhi").trim();
  const cacheKey = cleanCity.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const geo = await fetchCoordinates(cleanCity);
    const air = await fetchLiveAirQuality(geo.latitude, geo.longitude);
    const result = formatAirQualityResponse(geo, air);
    cache.set(cacheKey, { cachedAt: Date.now(), data: result });
    return result;
  } catch {
    return getFallbackCity(cleanCity);
  }
}
