import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAqiCategory,
  extractPollutants,
  formatAirQualityResponse,
  getFallbackCity,
  fetchCoordinates,
  fetchLiveAirQuality,
  getCityAirQuality,
  sanitizeCoordinate,
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

  it("should return fallback city for known and throw for unknown cities", () => {
    expect(getFallbackCity("beijing").city).toBe("Beijing");
    expect(getFallbackCity().city).toBe("Delhi");
    expect(() => getFallbackCity("atlantis")).toThrow("not found");
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
    await expect(fetchCoordinates("GhostCity")).rejects.toThrow("Location \"GhostCity\" not found");
  });

  it("should fetch live metrics or throw on failure", async () => {
    global.fetch = mockJsonFetch({ current: { us_aqi: 95, pm2_5: 32.1, pm10: 48.2, carbon_monoxide: 510 } });
    const air = await fetchLiveAirQuality(48.85, 2.35);
    expect(air.us_aqi).toBe(95);

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchLiveAirQuality(0, 0)).rejects.toThrow("Air Quality HTTP error");
  });

  it("should validate and sanitize coordinate ranges", () => {
    expect(sanitizeCoordinate(45.5, -90, 90)).toBe(45.5);
    expect(() => sanitizeCoordinate("invalid", -90, 90)).toThrow("Invalid coordinate");
    expect(() => sanitizeCoordinate(95, -90, 90)).toThrow("Invalid coordinate");
    expect(() => sanitizeCoordinate(-190, -180, 180)).toThrow("Invalid coordinate");
  });
});

describe("Caching & Eviction Logic", () => {
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

  it("should evict oldest cache entry when reaching capacity", async () => {
    const fetchMock = mockJsonFetch({
      results: [{ name: "City", country: "C", latitude: 10, longitude: 10 }],
      current: { us_aqi: 50, pm2_5: 10, pm10: 20, carbon_monoxide: 100 }
    });
    global.fetch = fetchMock;
    for (let i = 0; i < 102; i++) {
      await getCityAirQuality(`city_${i}`);
    }
    const count = fetchMock.mock.calls.length;

    const cached = await getCityAirQuality("city_101");
    expect(cached.city).toBe("City");
    expect(fetchMock.mock.calls.length).toBe(count);

    const evicted = await getCityAirQuality("city_0");
    expect(evicted.city).toBe("City");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(count);
  });
});

describe("Fallback Logic & Unknown Locations", () => {
  it("should use preset fallback when upstream fails for known cities", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Down"));
    const fallbackRes = await getCityAirQuality("delhi");
    expect(fallbackRes.source).toBe("in-memory-fallback");

    const defaultCall = await getCityAirQuality();
    expect(defaultCall.city).toBe("Delhi");
  });

  it("should throw 404 when location is not found by geocoding", async () => {
    global.fetch = mockJsonFetch({ results: [] });
    await expect(getCityAirQuality("Tamil Nadu")).rejects.toMatchObject({
      message: expect.stringContaining('Location "Tamil Nadu" not found'),
      status: 404
    });
  });

  it("should throw 503 when air quality API fails for valid cities like Chennai", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ name: "Chennai", country: "India", latitude: 13.08, longitude: 80.27 }] })
      })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(getCityAirQuality("Chennai")).rejects.toMatchObject({
      message: expect.stringContaining('temporarily unavailable for "Chennai"'),
      status: 503
    });
  });
});
