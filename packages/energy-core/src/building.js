export const ZONE_PROFILES = {
  open_office: {
    label: '开放办公区',
    color: '#38bdf8',
    peopleDensity: 0.085,
    lightingWm2: 8,
    equipmentWm2: 12,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.3,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  private_office: {
    label: '独立办公室',
    color: '#22d3ee',
    peopleDensity: 0.07,
    lightingWm2: 8,
    equipmentWm2: 12,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.3,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  meeting: {
    label: '会议室',
    color: '#a78bfa',
    peopleDensity: 0.25,
    lightingWm2: 7,
    equipmentWm2: 10,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.4,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  lobby: {
    label: '前台 / 大厅',
    color: '#fbbf24',
    peopleDensity: 0.035,
    lightingWm2: 9,
    equipmentWm2: 5,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.5,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'lobby',
  },
  reception: {
    label: '接待',
    color: '#f59e0b',
    peopleDensity: 0.04,
    lightingWm2: 8,
    equipmentWm2: 6,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.4,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'lobby',
  },
  canteen: {
    label: '食堂',
    color: '#fb7185',
    peopleDensity: 0.45,
    lightingWm2: 10,
    equipmentWm2: 15,
    freshAirLpsPerson: 10,
    freshAirLpsM2: 0.5,
    sensibleWPerson: 80,
    latentWPerson: 70,
    schedule: 'canteen',
  },
  training: {
    label: '培训室',
    color: '#c084fc',
    peopleDensity: 0.25,
    lightingWm2: 9,
    equipmentWm2: 12,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.4,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'training',
  },
  exhibition: {
    label: '展区',
    color: '#f472b6',
    peopleDensity: 0.08,
    lightingWm2: 8,
    equipmentWm2: 8,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.4,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  support: {
    label: '辅助用房',
    color: '#94a3b8',
    peopleDensity: 0.03,
    lightingWm2: 7,
    equipmentWm2: 6,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.3,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  core: {
    label: '电梯厅 / 洗手间',
    color: '#64748b',
    peopleDensity: 0.01,
    lightingWm2: 5,
    equipmentWm2: 2,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.2,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'office',
  },
  openlab: {
    label: 'Openlab 机房',
    color: '#f97316',
    peopleDensity: 0.02,
    lightingWm2: 8,
    equipmentWm2: 5,
    freshAirLpsPerson: 8,
    freshAirLpsM2: 0.8,
    sensibleWPerson: 75,
    latentWPerson: 55,
    schedule: 'openlab',
    itLoadKW: 12,
    upsLossKW: 1.5,
    setpointC: 22,
    freshAirLps: 150,
    ach: 0.8,
  },
};

export const FLOOR_META = [
  { level: 0, name: '大堂与配套', short: '0F', tagline: 'Lobby · Canteen · Reception' },
  { level: 1, name: '培训与展示', short: '1F', tagline: 'Training · Exhibition · Openlab' },
  { level: 2, name: '标准办公层', short: '2F', tagline: 'Open Office · Private · Meeting' },
  { level: 3, name: '标准办公层', short: '3F', tagline: 'Open Office · Private · Meeting' },
  { level: 4, name: '标准办公层', short: '4F', tagline: 'Open Office · Private · Meeting' },
  { level: 5, name: '标准办公层', short: '5F', tagline: 'Open Office · Private · Meeting · Roof PV' },
];

const CORE_PARTS = [
  { id: 'elevator', name: '电梯', kind: 'elevator', x: 0, z: 0, w: 5, d: 4, color: '#cbd5e1' },
  { id: 'wc_male', name: '男洗手间', kind: 'wc', x: -4.5, z: 0, w: 4.2, d: 4, color: '#60a5fa' },
  { id: 'wc_female', name: '女洗手间', kind: 'wc', x: 4.5, z: 0, w: 4.2, d: 4, color: '#f9a8d4' },
];

function zone(level, id, name, type, x, z, w, d) {
  return {
    id,
    floor: level,
    name,
    type,
    x,
    z,
    width: w,
    depth: d,
    area: Number((w * d).toFixed(2)),
    height: 2.75,
    profile: ZONE_PROFILES[type],
  };
}

function standardZones(level) {
  return [
    zone(level, `f${level}-open-n`, '开放办公区 · 北', 'open_office', 0, -9, 45, 9),
    zone(level, `f${level}-open-s`, '开放办公区 · 南', 'open_office', 0, 9, 45, 9),
    zone(level, `f${level}-private-nw`, '独立办公室 01', 'private_office', -18.875, -2.25, 7.75, 4.5),
    zone(level, `f${level}-private-ne`, '独立办公室 02', 'private_office', -11.125, -2.25, 7.75, 4.5),
    zone(level, `f${level}-private-sw`, '独立办公室 03', 'private_office', -18.875, 2.25, 7.75, 4.5),
    zone(level, `f${level}-private-se`, '独立办公室 04', 'private_office', -11.125, 2.25, 7.75, 4.5),
    zone(level, `f${level}-meeting-n`, '会议室 A', 'meeting', 14.75, -2.25, 15.5, 4.5),
    zone(level, `f${level}-meeting-s`, '会议室 B', 'meeting', 14.75, 2.25, 15.5, 4.5),
    zone(level, `f${level}-core`, '电梯厅 / 洗手间', 'core', 0, 0, 14, 9),
  ];
}

function lobbyZones(level) {
  return [
    zone(level, 'f0-lobby', '前台 / 大厅', 'lobby', 0, -9, 45, 9),
    zone(level, 'f0-canteen', '食堂', 'canteen', 11.25, 9, 22.5, 9),
    zone(level, 'f0-office', '办公区', 'open_office', -11.25, 9, 22.5, 9),
    zone(level, 'f0-reception', '接待', 'reception', -14.75, 0, 15.5, 9),
    zone(level, 'f0-security', '安保 / 辅助', 'support', 14.75, 0, 15.5, 9),
    zone(level, 'f0-core', '电梯厅 / 洗手间', 'core', 0, 0, 14, 9),
  ];
}

function trainingZones(level) {
  return [
    zone(level, 'f1-training', '培训室', 'training', 0, -9, 45, 9),
    zone(level, 'f1-exhibition', '展区', 'exhibition', 0, 9, 45, 9),
    zone(level, 'f1-openlab', 'Openlab 机房', 'openlab', -17.5, 0, 10, 9),
    zone(level, 'f1-lab-support', '机房支持间', 'support', -9.75, 0, 5.5, 9),
    zone(level, 'f1-meeting', '培训洽谈室', 'meeting', 14.75, 0, 15.5, 9),
    zone(level, 'f1-core', '电梯厅 / 洗手间', 'core', 0, 0, 14, 9),
  ];
}

const floors = FLOOR_META.map((meta) => {
  let zones;
  if (meta.level === 0) zones = lobbyZones(0);
  else if (meta.level === 1) zones = trainingZones(1);
  else zones = standardZones(meta.level);
  const area = zones.reduce((sum, item) => sum + item.area, 0);
  return {
    ...meta,
    area: Number(area.toFixed(2)),
    zones,
    coreParts: CORE_PARTS,
  };
});

export const BUILDING = {
  id: 'huawei-cfc-cairo',
  name: 'Huawei CFC Cairo',
  fullName: '华为埃及开罗 CFC 办公楼',
  city: 'Cairo',
  country: 'Egypt',
  address: 'Cairo Festival City, New Cairo, Egypt',
  latitude: 30.122,
  longitude: 31.406,
  timezone: 2,
  elevation: 116.4,
  climate: 'BWh · 热带干旱沙漠气候',
  width: 45,
  depth: 27,
  floorHeight: 4.2,
  floorArea: 1215,
  floors: floors,
  totalArea: 7290,
  conditionedArea: 7200,
  openlabArea: 90,
  roofArea: 1215,
  coreArea: 126,
  envelope: {
    wallInsulationMm: 80,
    roofInsulationMm: 100,
    wwr: 0.38,
    glazing: 'low_e_double',
    shading: 'seasonal',
    wallAbsorptance: 0.55,
    roofAbsorptance: 0.68,
    groundAlbedo: 0.2,
    pvRoofShade: 0.62,
  },
  pv: {
    capacityKWp: 160,
    tiltDeg: 20,
    azimuthDeg: 180,
    areaM2: 753,
    moduleEfficiency: 0.21,
  },
  occupancy: {
    workWeek: '周日至周四',
    weekend: '周五、周六',
    officeStartHour: 7,
    officeEndHour: 19,
  },
  special: {
    openlab: {
      floor: 1,
      itLoadKW: 12,
      upsLossKW: 1.5,
      freshAirLps: 150,
      setpointC: 22,
      schedule: '24/7',
    },
    pv: '屋顶光伏方阵 · 160 kWp · 20° 南向',
  },
};

export const DEFAULT_DESIGN = {
  wallInsulationMm: 80,
  wwr: 0.38,
  glazing: 'low_e_double',
  shading: 'seasonal',
  roofInsulationMm: 100,
  pvCapacityKWp: 160,
};

export const BASE_SCENARIO = {
  id: 'baseline',
  name: '基准方案',
  description: '华为节能保温外墙 80 mm + Low-E 中空玻璃 + 季节遮阳 + 160 kWp 光伏',
  design: { ...DEFAULT_DESIGN },
};

export function floorByLevel(level) {
  return BUILDING.floors.find((floor) => floor.level === level);
}

export function allZones() {
  return BUILDING.floors.flatMap((floor) => floor.zones);
}
