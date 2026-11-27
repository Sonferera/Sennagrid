import { buildContiguousDistrictMesh, type RegionPreset } from './meshBuilder';

const ANCHOR_LAT = 13.806;
const ANCHOR_LNG = 100.548;

const mesh = buildContiguousDistrictMesh({
  rows: 3,
  cols: 6,
  originLng: 100.38,
  originLat: 13.71,
  cellWidthDeg: 0.056,
  cellHeightDeg: 0.064,
  jitterRatio: 0.15,
  seed: 59,
  curveLatFn: (nx) => 0.012 * Math.sin(nx * Math.PI * 1.4),
  cells: [
    // Row 0 (South canal flats)
    { id: 'md-01', name: 'West Canal Fringe', population: 44_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'md-02', name: 'Thonburi Terrace', population: 68_000, icuBeds: 11, initialCases: 0, zoneType: 'residential' },
    { id: 'md-03', name: 'Riverbend South', population: 74_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },
    { id: 'md-04', name: 'Khlong Toei Flats', population: 80_000, icuBeds: 9, initialCases: 0, zoneType: 'residential' },
    { id: 'md-05', name: 'Phrakanong Ward', population: 70_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },
    { id: 'md-06', name: 'Bang Na Gate', population: 48_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },

    // Row 1 (Central medical & rail spine)
    { id: 'md-07', name: 'Taling Chan Belt', population: 60_000, icuBeds: 12, initialCases: 0, zoneType: 'residential' },
    { id: 'md-08', name: 'Hua Lamphong Hub', population: 98_000, icuBeds: 9, initialCases: 12, zoneType: 'transit_hub' },
    { id: 'md-09', name: 'Siam Medical Core', population: 132_000, icuBeds: 38, initialCases: 22, zoneType: 'core' },
    { id: 'md-10', name: 'Pathum Wan Core', population: 126_000, icuBeds: 36, initialCases: 20, zoneType: 'core' },
    { id: 'md-11', name: 'Asok Rail Junction', population: 102_000, icuBeds: 9, initialCases: 13, zoneType: 'transit_hub' },
    { id: 'md-12', name: 'Ramkhamhaeng East', population: 72_000, icuBeds: 10, initialCases: 0, zoneType: 'residential' },

    // Row 2 (North delta transit belt)
    { id: 'md-13', name: 'Nonthaburi Fringe', population: 42_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'md-14', name: 'Bang Sue Exchange', population: 92_000, icuBeds: 9, initialCases: 11, zoneType: 'transit_hub' },
    { id: 'md-15', name: 'Chatuchak Civic Core', population: 118_000, icuBeds: 34, initialCases: 18, zoneType: 'core' },
    { id: 'md-16', name: 'Lat Phrao Hub', population: 88_000, icuBeds: 10, initialCases: 0, zoneType: 'transit_hub' },
    { id: 'md-17', name: 'Bang Kapi Ward', population: 64_000, icuBeds: 11, initialCases: 0, zoneType: 'residential' },
    { id: 'md-18', name: 'Min Buri Outer Belt', population: 40_000, icuBeds: 12, initialCases: 0, zoneType: 'peri_urban' },
  ],
});

export const MONSOON_DELTA_PRESET: RegionPreset = {
  id: 'monsoon_delta',
  name: 'Monsoon Delta',
  subtitle: '18 Districts | Tropical River Plain',
  description:
    'Humid river delta metropolis linking dense canal-side residential blocks, intercity rail junctions, and central referral wards.',
  defaultDiseaseMode: 'vector_seir_sei',
  anchorLat: ANCHOR_LAT,
  anchorLng: ANCHOR_LNG,
  mapCenter: [ANCHOR_LNG, ANCHOR_LAT],
  mapZoom: 10.3,
  districts: mesh.districts,
  featureCollection: mesh.featureCollection,
};
