# Cairo TMYx data

## Source

- Dataset: `EGY_QH_Cairo.Intl.AP.623660_TMYx`
- Provider: [Climate.OneBuilding.Org](https://climate.onebuilding.org/)
- Station: Cairo International Airport, Egypt
- Coordinates: 30.122°N, 31.406°E, elevation 116.4 m, UTC+2
- Download:
  <https://climate.onebuilding.org/WMO_Region_1_Africa/EGY_Egypt/QH_Al_Qahirah_Cairo/EGY_QH_Cairo.Intl.AP.623660_TMYx.zip>

The original `cairo_tmyx.epw` is kept for reproducibility. `cairo_hourly.csv` is a normalized 8,760-row extract with:

`index, iso, month, day, hour, dayOfYear, tdb, tdew, rh, pressure, ghi, dni, dhi, windSpeed, windDir, cloud, albedo`

The TMYx months come from different typical years. For visualization and scheduling, the time axis is mapped onto a non-leap 2023 calendar; the thermodynamic calculations keep the original hourly values.

## Regenerate

```bash
npm run weather:prepare
npm run weather:sync
```

`prepare-weather.mjs` validates the 8,760 record count and writes `weather-metadata.json`, including monthly statistics and design extremes.

## Design conditions

The EPW header reports extreme dry-bulb values up to 47.2 °C. The model uses 47.2 °C for the envelope steady-state calibration test and reports 42.4 °C as the maximum TMYx hourly dry-bulb in the dashboard.

## Attribution

Climate.OneBuilding.Org TMYx data is free to use with attribution. See the source URL for the current terms and station notes.
