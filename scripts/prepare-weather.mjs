import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const epwPath = path.join(root, 'data', 'cairo_tmyx.epw');
const csvPath = path.join(root, 'data', 'cairo_hourly.csv');
const metaPath = path.join(root, 'data', 'weather-metadata.json');

const text = fs.readFileSync(epwPath, 'utf8').replace(/\r/g, '');
const lines = text.split('\n').filter(Boolean);
const header = lines[0].split(',');
const location = {
  city: header[1],
  state: header[2],
  country: header[3],
  stationId: header[5],
  latitude: Number(header[6]),
  longitude: Number(header[7]),
  timezone: Number(header[8]),
  elevation: Number(header[9]),
  source: 'Climate.OneBuilding TMYx',
};
const dataLines = lines.slice(8).filter((line) => /^\d{4},\d{1,2},/.test(line));
if (dataLines.length !== 8760) {
  throw new Error(`Expected 8760 hourly records, got ${dataLines.length}`);
}

const rows = dataLines.map((line, index) => {
  const fields = line.split(',');
  const month = Number(fields[1]);
  const day = Number(fields[2]);
  const hour = Number(fields[3]);
  const tdb = Number(fields[6]);
  const tdew = Number(fields[7]);
  const rh = Number(fields[8]);
  const pressure = Number(fields[9]);
  const ghi = Math.max(0, Number(fields[13]));
  const dni = Math.max(0, Number(fields[14]));
  const dhi = Math.max(0, Number(fields[15]));
  const windSpeed = Number(fields[21]);
  const windDir = Number(fields[20]);
  const cloud = Number(fields[22]);
  const albedo = Number(fields[31]) || 0.2;
  const date = new Date(Date.UTC(2023, 0, 1) + index * 3600000);
  const clockHour = (hour - 1 + 24) % 24;
  return {
    index,
    iso: `${date.toISOString().slice(0, 10)}T${String(clockHour).padStart(2, '0')}:00:00+02:00`,
    month,
    day,
    hour: clockHour,
    dayOfYear: Math.floor(index / 24) + 1,
    tdb,
    tdew,
    rh,
    pressure,
    ghi,
    dni,
    dhi,
    windSpeed,
    windDir,
    cloud,
    albedo,
  };
});

const columns = [
  'index',
  'iso',
  'month',
  'day',
  'hour',
  'dayOfYear',
  'tdb',
  'tdew',
  'rh',
  'pressure',
  'ghi',
  'dni',
  'dhi',
  'windSpeed',
  'windDir',
  'cloud',
  'albedo',
];
const csv = [
  columns.join(','),
  ...rows.map((row) =>
    columns
      .map((column) => {
        const value = row[column];
        return typeof value === 'number' ? Number(value.toFixed(4)) : value;
      })
      .join(','),
  ),
].join('\n');
fs.writeFileSync(csvPath, `${csv}\n`, 'utf8');

const monthly = Array.from({ length: 12 }, (_, month) => {
  const subset = rows.filter((row) => row.month === month + 1);
  const mean = (key) => subset.reduce((sum, row) => sum + row[key], 0) / subset.length;
  return {
    month: month + 1,
    tdbMean: Number(mean('tdb').toFixed(2)),
    tdbMax: Math.max(...subset.map((row) => row.tdb)),
    tdbMin: Math.min(...subset.map((row) => row.tdb)),
    ghiTotal: Number(subset.reduce((sum, row) => sum + row.ghi, 0).toFixed(1)),
    dniTotal: Number(subset.reduce((sum, row) => sum + row.dni, 0).toFixed(1)),
    rhMean: Number(mean('rh').toFixed(1)),
  };
});

const annual = {
  tdbMean: Number((rows.reduce((sum, row) => sum + row.tdb, 0) / rows.length).toFixed(2)),
  tdbMax: Math.max(...rows.map((row) => row.tdb)),
  tdbMin: Math.min(...rows.map((row) => row.tdb)),
  ghiTotalKwhM2: Number((rows.reduce((sum, row) => sum + row.ghi, 0) / 1000).toFixed(1)),
  dniTotalKwhM2: Number((rows.reduce((sum, row) => sum + row.dni, 0) / 1000).toFixed(1)),
  coolingDegreeDays18: Number(
    (rows.reduce((sum, row) => sum + Math.max(0, row.tdb - 18), 0) / 24).toFixed(1),
  ),
  heatingDegreeDays18: Number(
    (rows.reduce((sum, row) => sum + Math.max(0, 18 - row.tdb), 0) / 24).toFixed(1),
  ),
};

const metadata = {
  ...location,
  dataset: 'EGY_QH_Cairo.Intl.AP.623660_TMYx',
  sourceUrl:
    'https://climate.onebuilding.org/WMO_Region_1_Africa/EGY_Egypt/QH_Al_Qahirah_Cairo/EGY_QH_Cairo.Intl.AP.623660_TMYx.zip',
  generatedAt: new Date().toISOString(),
  records: rows.length,
  referenceYear: 2023,
  monthly,
  annual,
  notes:
    'TMYx typical meteorological year, hourly records shifted onto a non-leap 2023 calendar for visualization. Original EPW fields preserved in data/cairo_tmyx.epw.',
};
fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

console.log(`Wrote ${rows.length} rows to ${path.relative(root, csvPath)}`);
console.log(`Wrote metadata to ${path.relative(root, metaPath)}`);
console.log(
  `Annual mean ${annual.tdbMean} °C, max ${annual.tdbMax} °C, min ${annual.tdbMin} °C, GHI ${annual.ghiTotalKwhM2} kWh/m²`,
);
