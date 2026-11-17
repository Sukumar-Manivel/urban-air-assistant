import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAqiCategory,
  extractPollutants,
  formatAirQualityResponse,
  getFallbackCity,
  fetchCoordinates,
  fetchLiveAirQuality,
  getCityAirQuality,
  FALLBACK_CITIES
} from "../src/services/airQualityService.js";

const originalFetch = global.fetch;
beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => { global.fetch = originalFetch; });

function mockJsonFetch(payload) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload
  });
}

describe("AQI Categorization & Extraction", () => {
  it("should categorize all AQI ranges correctly", () => {
    expect(getAqiCategory(30).label).toBe("Good");
    expect(getAqiCategory(75).label).toBe("Moderate");
    expect(getAqiCategory(120).label).toBe("Unhealthy for Sensitive Groups");
    expect(getAqiCategory(180).label).toBe("Unhealthy");
    expect(getAqiCategory(250).label).toBe("Very Unhealthy");
    expect(getAqiCategory(350).label).toBe("Hazardous");
  });

  it("should extract pollutants and format responses", () => {
    const res = extractPollutants({}, {});
    expect(res.pm25).toBe(50);
    expect(res.pm10).toBe(80);
    expect(res.co).toBe(500);

    const formatted = formatAirQualityResponse(FALLBACK_CITIES.delhi, { us_aqi: 350 });
    expect(formatted.city).toBe("Delhi");
    expect(formatted.category).toBe("Hazardous");

    const fallbackFormatted = formatAirQualityResponse(FALLBACK_CITIES.delhi, {});
    expect(fallbackFormatted.source).toBe("open-meteo-live");
  });

  it("should return fallback city for known and unknown cities", () => {
    expect(getFallbackCity("beijing").city).toBe("Beijing");
    expect(getFallbackCity().city).toBe("Delhi");
    expect(getFallbackCity("atlantis").city).toBe("Delhi");
  });
});

describe("External Geocoding & Live Air Quality", () => {
  it("should fetch coordinates or throw on failure", async () => {
    global.fetch = mockJsonFetch({ results: [{ name: "Paris", country: "France", latitude: 48.85, longitude: 2.35 }] });
    const coords = await fetchCoordinates("Paris");
    expect(coords.name).toBe("Paris");

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchCoordinates("Nowhere")).rejects.toThrow("Geocoding HTTP error");

    global.fetch = mockJsonFetch({ results: [] });
    await expect(fetchCoordinates("GhostCity")).rejects.toThrow("City not found");
  });

  it("should fetch live metrics or throw on failure", async () => {
    global.fetch = mockJsonFetch({ current: { us_aqi: 95, pm2_5: 32.1, pm10: 48.2, carbon_monoxide: 510 } });
    const air = await fetchLiveAirQuality(48.85, 2.35);
    expect(air.us_aqi).toBe(95);

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchLiveAirQuality(0, 0)).rejects.toThrow("Air Quality HTTP error");
  });
});

describe("Caching and Fallback Logic", () => {
  it("should succeed with live fetch and subsequently hit in-memory cache", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ name: "Tokyo", country: "Japan", latitude: 35.67, longitude: 139.65 }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: { us_aqi: 45, pm2_5: 12.0, pm10: 22.0, carbon_monoxide: 300 } })
      });

    const liveRes = await getCityAirQuality("Tokyo");
    expect(liveRes.city).toBe("Tokyo");

    const cachedRes = await getCityAirQuality("Tokyo");
    expect(cachedRes.city).toBe("Tokyo");
  });

  it("should handle network failure gracefully with fallback city", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Down"));
    const fallbackRes = await getCityAirQuality("unknown_place");
    expect(fallbackRes.source).toBe("in-memory-fallback");

    const defaultCall = await getCityAirQuality();
    expect(defaultCall.city).toBe("Delhi");
  });
});
