import { AIR_CP, DRY_AIR_R, LATENT_HEAT, STANDARD_PRESSURE, WATER_VAPOR_R } from './constants.js';

export function saturationVaporPressure(T) {
  // Tetens over water, Pa
  return 610.78 * Math.exp((17.27 * T) / (T + 237.3));
}

export function humidityRatio(T, rh, pressure = STANDARD_PRESSURE) {
  const pv = Math.max(0, Math.min(1, rh)) * saturationVaporPressure(T);
  return (0.622 * pv) / Math.max(pressure - pv, 1);
}

export function relativeHumidityFromW(T, w, pressure = STANDARD_PRESSURE) {
  const pv = (w * pressure) / (0.622 + w);
  return Math.max(0, Math.min(1, pv / saturationVaporPressure(T)));
}

export function moistAirEnthalpy(T, w) {
  return AIR_CP * T + w * LATENT_HEAT;
}

export function moistAirDensity(T, pressure = STANDARD_PRESSURE) {
  return pressure / (DRY_AIR_R * (T + 273.15));
}

/** Sensible and latent coil load for an outdoor-air stream (kW, positive = cooling). */
export function ventilationLoad({ flowM3s, tOut, rhOut, tIn, rhIn, pressure = STANDARD_PRESSURE, sensibleRecovery = 0 }) {
  const wOut = humidityRatio(tOut, rhOut, pressure);
  const wIn = humidityRatio(tIn, rhIn, pressure);
  const density = moistAirDensity(tOut, pressure);
  const massFlow = density * Math.max(0, flowM3s);
  const sensible = massFlow * AIR_CP * (tOut - tIn) * (1 - sensibleRecovery) / 1000;
  const latent = massFlow * LATENT_HEAT * Math.max(0, wOut - wIn) / 1000;
  return {
    sensible,
    latent,
    total: sensible + latent,
    wOut,
    wIn,
    massFlow,
  };
}

export function parseWeatherCsv(csv) {
  const lines = csv.replace(/\r/g, '').trim().split('\n');
  const headers = lines[0].split(',').map((header) => header.trim());
  const required = ['month', 'day', 'hour', 'dayOfYear', 'tdb', 'tdew', 'rh', 'pressure', 'ghi', 'dni', 'dhi'];
  for (const key of required) {
    if (!headers.includes(key)) throw new Error(`Weather CSV missing column: ${key}`);
  }
  const rows = lines.slice(1).filter(Boolean).map((line, index) => {
    const values = line.split(',');
    const record = {};
    headers.forEach((header, column) => {
      const raw = values[column];
      record[header] = ['iso'].includes(header) ? raw : Number(raw);
    });
    if (!Number.isFinite(record.tdb) || !Number.isFinite(record.ghi)) {
      throw new Error(`Invalid weather row ${index + 2}`);
    }
    return record;
  });
  if (rows.length !== 8760) throw new Error(`Expected 8760 weather records, got ${rows.length}`);
  return rows;
}

export function parseWeatherMetadata(json) {
  return typeof json === 'string' ? JSON.parse(json) : json;
}

export function solarPosition(dayOfYear, localHour, latitude, longitude, timezone) {
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (localHour - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const timeOffset = eqTime + 4 * longitude - 60 * timezone;
  const trueSolarTime = localHour * 60 + timeOffset;
  const hourAngle = ((trueSolarTime / 4 - 180) * Math.PI) / 180;
  const lat = (latitude * Math.PI) / 180;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const altitude = Math.PI / 2 - zenith;
  const azimuth =
    (Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat),
    ) *
      180) /
      Math.PI +
    180;
  return {
    altitude,
    altitudeDeg: (altitude * 180) / Math.PI,
    azimuthDeg: ((azimuth % 360) + 360) % 360,
    cosZenith: Math.max(0, cosZenith),
    declinationDeg: (decl * 180) / Math.PI,
    hourAngleDeg: (hourAngle * 180) / Math.PI,
  };
}

export const ORIENTATIONS = ['south', 'east', 'north', 'west'];

export function orientationLabel(orientation) {
  return { south: '南', east: '东', north: '北', west: '西' }[orientation] ?? orientation;
}

/**
 * Precompute solar incidence and plane-of-array irradiance for all envelopes and the roof PV.
 */
export function buildSolarSeries(weather, { latitude, longitude, timezone, albedo = 0.2, pvTiltDeg = 20, pvAzimuthDeg = 180 }) {
  const pvTilt = (pvTiltDeg * Math.PI) / 180;
  const pvAz = (pvAzimuthDeg * Math.PI) / 180;
  return weather.map((row) => {
    const localHour = row.hour + 0.5;
    const sun = solarPosition(row.dayOfYear, localHour, latitude, longitude, timezone);
    const up = Math.max(0, Math.sin(sun.altitude));
    const north = Math.cos((sun.azimuthDeg * Math.PI) / 180) * Math.cos(sun.altitude);
    const east = Math.sin((sun.azimuthDeg * Math.PI) / 180) * Math.cos(sun.altitude);
    const beam = {
      south: Math.max(0, row.dni * -north),
      north: Math.max(0, row.dni * north),
      east: Math.max(0, row.dni * east),
      west: Math.max(0, row.dni * -east),
    };
    const diffuseSky = row.dhi * 0.5;
    const ground = row.ghi * albedo * 0.5;
    const poa = {};
    for (const orientation of ORIENTATIONS) {
      poa[orientation] = Math.max(0, beam[orientation] + diffuseSky + ground);
    }
    const pvNormal = {
      x: Math.sin(pvAz) * Math.sin(pvTilt),
      y: Math.cos(pvTilt),
      z: Math.cos(pvAz) * Math.sin(pvTilt),
    };
    const pvCos =
      Math.max(0, east * pvNormal.x + up * pvNormal.y + north * pvNormal.z);
    const pvPoa = Math.max(
      0,
      row.dni * pvCos +
        row.dhi * ((1 + Math.cos(pvTilt)) / 2) +
        row.ghi * albedo * ((1 - Math.cos(pvTilt)) / 2),
    );
    return {
      ...sun,
      up,
      north,
      east,
      beam,
      diffuseSky,
      ground,
      poa,
      roofPoa: Math.max(0, row.ghi),
      pvPoa,
      pvCos,
    };
  });
}

export function aggregateMonthly(hourly, accessor) {
  const totals = Array.from({ length: 12 }, () => 0);
  for (let i = 0; i < hourly.length; i += 1) {
    totals[hourly[i].month - 1] += accessor(hourly[i], i);
  }
  return totals;
}
