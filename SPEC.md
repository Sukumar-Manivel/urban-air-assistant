# SPEC.md: PromptWars Challenge 06 — Urban Air Quality Assistant

## 1. Problem Statement & Scope
During severe winter smog episodes in dense metropolitan regions (e.g., Delhi NCR, Beijing, Lahore, Salt Lake City), families and vulnerable populations face hazardous particulate matter levels (PM2.5, PM10, CO). Standard weather apps merely report numeric AQI values without providing context-specific, protective, or low-emission alternatives.

The **Urban Air Quality Assistant** empowers families, vulnerable individuals, and local communities with:
1. **Live Ambient Air Quality Intelligence**: Real-time pollutant tracking (PM2.5, PM10, US AQI, CO) by city using Open-Meteo Air Quality & Geocoding APIs with in-memory caching and resilient offline fallbacks.
2. **Personalized GenAI Daily Action Plans**: Powered by Google Gemini (`gemini-2.5-flash`) via the official `@google/genai` SDK with strict JSON response schemas. Generates tailored morning routines, commute ventilation advice, outdoor activity safety, and low-emission commute shifts conditioned on household profile (children, elderly, asthma/respiratory sensitivity, primary commute mode).
3. **Deterministic Fallback Engine**: 100% reliable rule-based emergency action generator if `GEMINI_API_KEY` is absent or rate-limited.
4. **Actionable Indoor Air Quality Hacks**: Low-cost, DIY DIY HEPA strategies, cross-ventilation timing, wet mopping vs vacuuming guidelines, and plant bio-filtration facts.
5. **Interactive Before/After Impact Calculator**: Real-time comparative estimator demonstrating personal exposure reduction (µg/m³ PM2.5 avoided) and household CO₂ emission savings (kg CO₂e/week) from sustainable habit adjustments.

---

## 2. System Architecture

### Backend (`server/src/`)
- **Runtime**: Node.js (ES Modules), Express.js.
- **Security & Middleware**:
  - `helmet`: Strict Content Security Policy (allowing necessary style/script execution while blocking unsafe-inline eval).
  - `cors`: Allowed origins for API consumers.
  - Rate Limiter: In-memory sliding window limiter protecting Gemini and external API quotas.
  - Input Validation: Strict sanitization on city names, coordinates, and household profile payloads.
- **Services & Routes**:
  - `GET /api/health`: Uptime, service health, timestamp, and API configuration status.
  - `GET /api/air-quality?city=...`: Open-Meteo Geocoding + Air Quality integration with 15-minute in-memory cache and preset fallbacks for global smog hotspots (Delhi, Mumbai, Beijing, Los Angeles, London, Salt Lake City).
  - `POST /api/action-plan`: Gemini `gemini-2.5-flash` client with structured `responseSchema`, server-side API key handling via `process.env.GEMINI_API_KEY`, and deterministic rule-based fallback.
  - `POST /api/calculate-impact`: Mathematical model computing PM2.5 inhalation reduction and CO₂ displacement based on commute distance and routine modifications.

### Frontend (`client/`)
- **Vanilla ES Modules & Semantic HTML5**: Zero heavyweight framework dependencies (React/Vue/Webpack/Vite bundles) keeping total repo footprint under 5 MB.
- **Accessibility (WCAG 2.1 AA)**: Full keyboard navigation, high contrast ratios (>= 4.5:1), ARIA live regions for dynamic alerts, semantic header/main/section/nav/footer, explicit labels for all inputs.
- **Components**:
  - City Selector & Live AQI Gauge (PM2.5, PM10, US AQI, CO levels, Category Badge).
  - Household Profile Form (Children, Elderly, Asthma, Commute Mode).
  - AI Action Plan Display with Category Cards (Health Alerts, Low-Emission Commute Alternatives, Indoor Hacks).
  - Interactive Exposure & Emission Reduction Calculator with Before/After visual comparison.

---

## 3. Strict Quality & Verification Standards
- **ESLint**: Complexity <= 8, Max Lines/Function <= 35, Max Depth <= 3, No Unused Vars, No Console warnings (`--max-warnings=0`).
- **jscpd**: 0 duplicate code clones (`threshold: 0`).
- **Security Check**: Zero hardcoded API keys (`AIza...`), zero `eval()`, zero `.innerHTML =`, zero high npm vulnerabilities.
- **Test Coverage**: >= 95% Lines, Statements, Functions, >= 90% Branches on `server/src/**/*.js`.
- **Accessibility**: 0 WCAG 2.1 AA violations via `@axe-core/playwright`.
- **Demo**: Playwright video recording stored in `demo-output/`.
- **Cloud Run Deployment**: Multi-stage `Dockerfile` listening on `PORT=8080`.
