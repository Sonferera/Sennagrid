import type { CustomRegionId } from '@sennagrid/engine';
import type { CitySearchResult } from '../../services/geocoding';
import { buildContiguousDistrictMesh, type GridCellSpec, type RegionPreset } from './meshBuilder';

const TROPICAL_TEMPLATE_CELLS: readonly Omit<GridCellSpec, 'id'>[] = [
  // Row 0 (South perimeter)
  { name: 'South West Fringe', population: 42_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
  { name: 'South Inner Terrace', population: 64_000, icuBeds: 12, initialCases: 0, zoneType: 'residential' },
  { name: 'South Basin Ward', population: 72_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },
  { name: 'Mid-South Flats', population: 78_000, icuBeds: 9, initialCases: 0, zoneType: 'residential' },
  { name: 'South East Ward', population: 76_000, icuBeds: 9, initialCases: 0, zoneType: 'residential' },
  { name: 'Outer East Gate', population: 46_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },

  // Row 1 (Central hospital & transit axis)
  { name: 'West Industrial Zone', population: 58_000, icuBeds: 12, initialCases: 0, zoneType: 'residential' },
  { name: 'West Rail Hub', population: 95_000, icuBeds: 9, initialCases: 14, zoneType: 'transit_hub' },
  { name: 'Central Basin Core', population: 130_000, icuBeds: 36, initialCases: 19, zoneType: 'core' },
  { name: 'General Medical Core', population: 125_000, icuBeds: 38, initialCases: 18, zoneType: 'core' },
  { name: 'East Rail Junction', population: 98_000, icuBeds: 9, initialCases: 15, zoneType: 'transit_hub' },
  { name: 'East Residential Belt', population: 68_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },

  // Row 2 (North urban perimeter)
  { name: 'North West Fringe', population: 40_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
  { name: 'North Exchange Hub', population: 88_000, icuBeds: 9, initialCases: 13, zoneType: 'transit_hub' },
  { name: 'Civic Center Core', population: 118_000, icuBeds: 32, initialCases: 17, zoneType: 'core' },
  { name: 'Freight Transit Hub', population: 86_000, icuBeds: 10, initialCases: 0, zoneType: 'transit_hub' },
  { name: 'North Commons', population: 62_000, icuBeds: 11, initialCases: 0, zoneType: 'residential' },
  { name: 'North East Belt', population: 40_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
];

// Calibrated 18-ward respiratory (direct_seir) template for temperate latitudes (|lat| > 23.5 deg)
const TEMPERATE_TEMPLATE_CELLS: readonly Omit<GridCellSpec, 'id'>[] = [
  // Row 0 (South perimeter)
  { name: 'South West Fringe', population: 3_500, icuBeds: 30, initialCases: 680, zoneType: 'peri_urban' },
  { name: 'South Inner Terrace', population: 44_000, icuBeds: 92, initialCases: 0, zoneType: 'residential' },
  { name: 'South Basin Ward', population: 46_000, icuBeds: 96, initialCases: 0, zoneType: 'residential' },
  { name: 'Mid-South Flats', population: 48_000, icuBeds: 100, initialCases: 0, zoneType: 'residential' },
  { name: 'South East Ward', population: 44_000, icuBeds: 92, initialCases: 0, zoneType: 'residential' },
  { name: 'Outer East Gate', population: 3_500, icuBeds: 30, initialCases: 640, zoneType: 'peri_urban' },

  // Row 1 (Central hospital & transit axis)
  { name: 'West Industrial Zone', population: 38_000, icuBeds: 82, initialCases: 0, zoneType: 'residential' },
  { name: 'West Rail Hub', population: 64_000, icuBeds: 118, initialCases: 8, zoneType: 'transit_hub' },
  { name: 'Central Basin Core', population: 78_000, icuBeds: 162, initialCases: 8, zoneType: 'core' },
  { name: 'General Medical Core', population: 76_000, icuBeds: 158, initialCases: 8, zoneType: 'core' },
  { name: 'East Rail Junction', population: 62_000, icuBeds: 116, initialCases: 8, zoneType: 'transit_hub' },
  { name: 'East Residential Belt', population: 42_000, icuBeds: 90, initialCases: 0, zoneType: 'residential' },

  // Row 2 (North urban perimeter)
  { name: 'North West Fringe', population: 30_000, icuBeds: 72, initialCases: 0, zoneType: 'peri_urban' },
  { name: 'North Exchange Hub', population: 58_000, icuBeds: 112, initialCases: 6, zoneType: 'transit_hub' },
  { name: 'Civic Center Core', population: 74_000, icuBeds: 154, initialCases: 0, zoneType: 'core' },
  { name: 'Freight Transit Hub', population: 54_000, icuBeds: 106, initialCases: 0, zoneType: 'transit_hub' },
  { name: 'North Commons', population: 40_000, icuBeds: 86, initialCases: 0, zoneType: 'residential' },
  { name: 'North East Belt', population: 3_200, icuBeds: 28, initialCases: 620, zoneType: 'peri_urban' },
];

export function buildCustomCityId(cityId: number): CustomRegionId {
  return `custom_${Math.max(1, Math.round(cityId))}`;
}

export function buildCustomCityPreset(city: CitySearchResult): RegionPreset {
  const rows = 3;
  const cols = 6;
  const cellHeightDeg = 0.052;
  const cosLat = Math.max(0.35, Math.cos((city.latitude * Math.PI) / 180));
  const cellWidthDeg = Number((cellHeightDeg / cosLat).toFixed(5));

  const halfHeight = (rows * cellHeightDeg) / 2;
  const halfWidth = (cols * cellWidthDeg) / 2;
  const originLat = Number(Math.max(-80, Math.min(80, city.latitude - halfHeight)).toFixed(5));
  const originLng = Number(Math.max(-175, Math.min(175, city.longitude - halfWidth)).toFixed(5));

  const isTropicalBand = Math.abs(city.latitude) <= 23.5;
  const templateCells = isTropicalBand ? TROPICAL_TEMPLATE_CELLS : TEMPERATE_TEMPLATE_CELLS;
  const regionId = buildCustomCityId(city.id);
  const seed = Math.abs(Math.round(city.id)) % 997 + 11;

  const mesh = buildContiguousDistrictMesh({
    rows,
    cols,
    originLng,
    originLat,
    cellWidthDeg,
    cellHeightDeg,
    jitterRatio: 0.14,
    seed,
    curveLatFn: (nx) => 0.01 * Math.sin(nx * Math.PI),
    cells: templateCells.map((cell, idx) => ({
      ...cell,
      id: `${regionId}-w${String(idx + 1).padStart(2, '0')}`,
    })),
  });
  const locationLabel = city.admin1
    ? `${city.name}, ${city.admin1}, ${city.country}`
    : `${city.name}, ${city.country}`;

  return {
    id: regionId,
    name: city.name,
    subtitle: `18 wards · ${city.country}`,
    description: `Normalized 18-district benchmark topology centered on ${locationLabel} (${city.latitude.toFixed(2)}, ${city.longitude.toFixed(2)}) with real local Open-Meteo climate forcing.`,
    defaultDiseaseMode: isTropicalBand ? 'vector_seir_sei' : 'direct_seir',
    anchorLat: city.latitude,
    anchorLng: city.longitude,
    mapCenter: [city.longitude, city.latitude],
    mapZoom: 10.2,
    districts: mesh.districts,
    featureCollection: mesh.featureCollection,
  };
}
