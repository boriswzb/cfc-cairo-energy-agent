export const SIGMA = 5.670374419e-8;
export const AIR_DENSITY = 1.2;
export const AIR_CP = 1005;
export const LATENT_HEAT = 2.5e6;
export const WATER_VAPOR_R = 461.5;
export const DRY_AIR_R = 287.05;
export const STANDARD_PRESSURE = 101325;

export const COMFORT = {
  coolingSetpointC: 24,
  heatingSetpointC: 21,
  setbackCoolingC: 27,
  setbackHeatingC: 18,
  indoorRh: 0.5,
  rhMin: 0.3,
  rhMax: 0.6,
  maxPeakWm2: 150,
  minComfortCompliance: 0.98,
};

export const PV_DEFAULTS = {
  tiltDeg: 20,
  azimuthDeg: 180,
  albedo: 0.2,
  moduleEfficiency: 0.21,
  systemLoss: 0.86,
  inverterEfficiency: 0.975,
  temperatureCoefficient: -0.0035,
  noctC: 45,
  soiling: 0.97,
  dcAcRatio: 1.1,
  degradation: 0.005,
  usableRoofFraction: 0.62,
};

export const SYSTEM_DEFAULTS = {
  officeCop: 3.0,
  openlabCop: 3.2,
  heatingCop: 2.8,
  auxFactor: 0.08,
  heatRecoverySensible: 0.35,
  coolingCapacityWm2: 150,
  openlabCapacityKW: 55,
  elevatorKW: 5,
  elevatorHours: [7, 20],
};

// Egypt work week: Sunday–Thursday.
export const OCCUPANCY_WEEKDAY = [
  0, 0, 0, 0, 0, 0, 0.04, 0.18, 0.7, 0.92, 1, 1, 0.96, 0.9, 0.88, 0.92, 0.88, 0.72, 0.42, 0.14, 0.04, 0, 0, 0,
];
export const LIGHTING_WEEKDAY = [
  0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.12, 0.35, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 0.85, 0.6, 0.28, 0.12, 0.06, 0.05, 0.05,
];
export const EQUIPMENT_WEEKDAY = [
  0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.2, 0.42, 0.78, 1, 1, 1, 1, 1, 1, 1, 1, 0.92, 0.75, 0.42, 0.22, 0.14, 0.12, 0.12,
];

export const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];
