import { buildContiguousDistrictMesh, type RegionPreset } from './meshBuilder';

const ANCHOR_LAT = -6.2088;
const ANCHOR_LNG = 106.8456;

const mesh = buildContiguousDistrictMesh({
  rows: 3,
  cols: 6,
  originLng: 106.68,
  originLat: -6.32,
  cellWidthDeg: 0.055,
  cellHeightDeg: 0.068,
  jitterRatio: 0.16,
  seed: 17,
  curveLatFn: (nx) => 0.015 * Math.sin(nx * Math.PI),
  cells: [
    // Row 0 (South basin residential & fringe belt)
    { id: 'mt-01', name: 'Cisadane Fringe', population: 42_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'mt-02', name: 'Bintaro Terrace', population: 64_000, icuBeds: 12, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-03', name: 'South Basin Ward', population: 72_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-04', name: 'Ciliwung Bend', population: 78_000, icuBeds: 9, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-05', name: 'Kampung Melayu Flats', population: 76_000, icuBeds: 9, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-06', name: 'Bekasi Gate', population: 46_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },

    // Row 1 (Central medical cores + primary east-west rail hubs)
    { id: 'mt-07', name: 'West Industrial Park', population: 58_000, icuBeds: 12, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-08', name: 'Palmerah Rail Hub', population: 95_000, icuBeds: 9, initialCases: 14, zoneType: 'transit_hub' },
    { id: 'mt-09', name: 'Central Basin Core', population: 130_000, icuBeds: 36, initialCases: 19, zoneType: 'core' },
    { id: 'mt-10', name: 'Menteng Medical Core', population: 125_000, icuBeds: 38, initialCases: 18, zoneType: 'core' },
    { id: 'mt-11', name: 'Jatinegara Junction', population: 98_000, icuBeds: 9, initialCases: 15, zoneType: 'transit_hub' },
    { id: 'mt-12', name: 'East Canal Flats', population: 68_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },

    // Row 2 (North canal & freight corridor)
    { id: 'mt-13', name: 'Muara Coastal Fringe', population: 40_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'mt-14', name: 'Kota Tua Exchange', population: 88_000, icuBeds: 9, initialCases: 13, zoneType: 'transit_hub' },
    { id: 'mt-15', name: 'Kemayoran Civic Core', population: 118_000, icuBeds: 32, initialCases: 17, zoneType: 'core' },
    { id: 'mt-16', name: 'Sunter Freight Hub', population: 86_000, icuBeds: 10, initialCases: 0, zoneType: 'transit_hub' },
    { id: 'mt-17', name: 'Kelapa Canal Ward', population: 62_000, icuBeds: 11, initialCases: 0, zoneType: 'residential' },
    { id: 'mt-18', name: 'Marunda Outer Belt', population: 40_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
  ],
});

export const METRO_TROPICA_PRESET: RegionPreset = {
  id: 'metro_tropica',
  name: 'Metro Tropica',
  subtitle: '18 Districts | Tropical Urban Basin',
  description:
    'Dense tropical river basin with high-mobility rail junctions and asymmetric ICU capacity between central referral hospitals and surrounding wards.',
  defaultDiseaseMode: 'vector_seir_sei',
  anchorLat: ANCHOR_LAT,
  anchorLng: ANCHOR_LNG,
  mapCenter: [ANCHOR_LNG, ANCHOR_LAT],
  mapZoom: 10.2,
  districts: mesh.districts,
  featureCollection: mesh.featureCollection,
};
