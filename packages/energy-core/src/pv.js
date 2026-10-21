import { PV_DEFAULTS } from './constants.js';

export function simulatePV({ weather, solar, pv, demandKW, gridFactorKgPerKWh = 0.43 }) {
  const config = { ...PV_DEFAULTS, ...pv };
  const capacity = Number(config.capacityKWp) || 160;
  const acLimit = capacity * config.dcAcRatio;
  const n = weather.length;
  const dcKW = new Float64Array(n);
  const acKW = new Float64Array(n);
  const selfKW = new Float64Array(n);
  const exportKW = new Float64Array(n);
  const importKW = new Float64Array(n);
  const cellTemp = new Float64Array(n);
  let yieldKWh = 0;
  let selfKWh = 0;
  let exportKWh = 0;
  let demandKWh = 0;
  let importKWh = 0;

  for (let i = 0; i < n; i += 1) {
    const row = weather[i];
    const sun = solar[i];
    const tCell = row.tdb + ((config.noctC - 20) / 800) * sun.pvPoa;
    cellTemp[i] = tCell;
    const tempFactor = 1 + config.temperatureCoefficient * (tCell - 25);
    const dc =
      capacity *
      (sun.pvPoa / 1000) *
      Math.max(0, tempFactor) *
      config.systemLoss *
      config.soiling *
      (1 - config.degradation);
    const ac = Math.min(acLimit, dc * config.inverterEfficiency);
    dcKW[i] = dc;
    acKW[i] = ac;
    const self = Math.min(ac, Math.max(0, demandKW[i]));
    selfKW[i] = self;
    selfKWh += self;
    exportKW[i] = Math.max(0, ac - self);
    exportKWh += exportKW[i];
    importKW[i] = Math.max(0, demandKW[i] - self);
    importKWh += importKW[i];
    yieldKWh += ac;
    demandKWh += Math.max(0, demandKW[i]);
  }

  const monthly = Array.from({ length: 12 }, () => ({ yieldKWh: 0, selfKWh: 0, exportKWh: 0, demandKWh: 0, importKWh: 0 }));
  for (let i = 0; i < n; i += 1) {
    const bucket = monthly[weather[i].month - 1];
    bucket.yieldKWh += acKW[i];
    bucket.selfKWh += selfKW[i];
    bucket.exportKWh += exportKW[i];
    bucket.demandKWh += Math.max(0, demandKW[i]);
    bucket.importKWh += importKW[i];
  }

  // Average daily profile for the July design week.
  const july = Array.from({ length: 24 }, () => ({ pv: 0, demand: 0, count: 0 }));
  for (let i = 0; i < n; i += 1) {
    if (weather[i].month !== 7) continue;
    const slot = july[weather[i].hour];
    slot.pv += acKW[i];
    slot.demand += Math.max(0, demandKW[i]);
    slot.count += 1;
  }
  july.forEach((slot) => {
    slot.pv /= Math.max(1, slot.count);
    slot.demand /= Math.max(1, slot.count);
  });

  return {
    config,
    capacityKWp: capacity,
    hourly: { dcKW, acKW, selfKW, exportKW, importKW, cellTemp },
    annual: {
      yieldMWh: yieldKWh / 1000,
      selfConsumedMWh: selfKWh / 1000,
      exportMWh: exportKWh / 1000,
      importMWh: importKWh / 1000,
      demandMWh: demandKWh / 1000,
      selfConsumptionRatio: yieldKWh > 0 ? selfKWh / yieldKWh : 0,
      selfSufficiencyRatio: demandKWh > 0 ? selfKWh / demandKWh : 0,
      capacityFactor: capacity > 0 ? yieldKWh / (capacity * 8760) : 0,
      specificYieldKWhPerKWp: capacity > 0 ? yieldKWh / capacity : 0,
      co2AvoidedTonnes: (selfKWh * gridFactorKgPerKWh) / 1000,
      gridFactorKgPerKWh,
    },
    monthly,
    julyProfile: july,
  };
}
