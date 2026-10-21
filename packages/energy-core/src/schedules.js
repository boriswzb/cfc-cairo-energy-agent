import {
  EQUIPMENT_WEEKDAY,
  LIGHTING_WEEKDAY,
  OCCUPANCY_WEEKDAY,
} from './constants.js';

export function dayOfWeek(row) {
  return row.index % 7; // 2023-01-01 is Sunday
}

export function isWorkday(row) {
  return dayOfWeek(row) <= 4; // Sunday–Thursday
}

export function occupancyFraction(type, row) {
  const hour = row.hour;
  const workday = isWorkday(row);
  if (type === 'openlab') return 1;
  if (!workday) {
    if (type === 'lobby' || type === 'reception') return 0.06;
    if (type === 'canteen') return 0.02;
    return 0.015;
  }
  if (type === 'lobby' || type === 'reception') {
    return Math.min(1, Math.max(OCCUPANCY_WEEKDAY[hour], 0.12));
  }
  if (type === 'canteen') {
    const lunch = Math.exp(-((hour - 12.5) ** 2) / 2.4) * 0.65;
    return Math.min(1, OCCUPANCY_WEEKDAY[hour] * 0.8 + lunch);
  }
  if (type === 'training') {
    if (hour < 8 || hour > 17) return 0;
    return hour === 8 || hour === 17 ? 0.55 : 0.88;
  }
  if (type === 'core') return Math.min(0.25, OCCUPANCY_WEEKDAY[hour] * 0.25);
  return OCCUPANCY_WEEKDAY[hour];
}

export function lightingFraction(type, row) {
  if (type === 'openlab') return 1;
  const hour = row.hour;
  const workday = isWorkday(row);
  if (!workday) return type === 'lobby' ? 0.18 : 0.08;
  if (type === 'canteen') {
    return Math.min(1, LIGHTING_WEEKDAY[hour] * 0.85 + (hour >= 10 && hour <= 15 ? 0.2 : 0));
  }
  if (type === 'lobby' || type === 'reception') {
    return Math.min(1, Math.max(LIGHTING_WEEKDAY[hour], hour >= 6 && hour <= 21 ? 0.55 : 0.12));
  }
  return LIGHTING_WEEKDAY[hour];
}

export function equipmentFraction(type, row) {
  if (type === 'openlab') return 1;
  if (!isWorkday(row)) return 0.18;
  return EQUIPMENT_WEEKDAY[row.hour];
}

export function setpointsFor(type, row) {
  if (type === 'openlab') return { heating: 20, cooling: 22, mode: 'cooling' };
  const occupied = occupancyFraction(type, row) > 0.04;
  const cooling = occupied ? 24 : 27;
  const heating = occupied ? 21 : 18;
  const mode = row.tdb < 18 ? 'heating' : 'cooling';
  return { heating, cooling, mode };
}

export function indoorTemperature(type, row) {
  const setpoints = setpointsFor(type, row);
  return setpoints.mode === 'heating' ? setpoints.heating : setpoints.cooling;
}

export function freshAirFlowM3s(type, row, area, profile) {
  if (type === 'openlab') return 0.15;
  const occ = occupancyFraction(type, row);
  if (occ < 0.02) return 0;
  const people = Math.max(1, area * profile.peopleDensity * occ);
  const lps = people * profile.freshAirLpsPerson + area * profile.freshAirLpsM2;
  return lps / 1000;
}

export function infiltrationFlowM3s(area, height, occupied) {
  const volume = area * height;
  const ach = occupied ? 0.12 : 0.05;
  return (ach * volume) / 3600;
}
