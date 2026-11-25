import type { DistrictProperties, DiseaseMode, RegionId } from '@sennagrid/engine';

export interface DistrictFeature {
  type: 'Feature';
  id: string;
  properties: DistrictProperties;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface DistrictFeatureCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface RegionPreset {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  defaultDiseaseMode: DiseaseMode;
  anchorLat: number;
  anchorLng: number;
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
  districts: DistrictProperties[];
  featureCollection: DistrictFeatureCollection;
}

export interface GridCellSpec {
  id: string;
  name: string;
  population: number;
  icuBeds: number;
  initialCases: number;
  zoneType: DistrictProperties['zoneType'];
}

export interface MeshSpec {
  rows: number;
  cols: number;
  originLng: number;
  originLat: number;
  cellWidthDeg: number;
  cellHeightDeg: number;
  jitterRatio: number;
  seed: number;
  curveLatFn?: (normX: number, normY: number) => number;
  curveLngFn?: (normX: number, normY: number) => number;
  cells: GridCellSpec[]; // row-major: r * cols + c, r=0 is south, r=rows-1 is north
}

function deterministicHash(seed: number, r: number, c: number, axis: number): number {
  const x = Math.sin(seed * 12.9898 + r * 78.233 + c * 37.719 + axis * 53.17) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
}

function computePolygonCentroid(ring: readonly [number, number][]): [number, number] {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  const count = ring.length - 1;

  for (let i = 0; i < count; i++) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[i + 1]!;
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-12) {
    return ring[0]!;
  }

  return [Number((cx / (6 * signedArea)).toFixed(5)), Number((cy / (6 * signedArea)).toFixed(5))];
}

/**
 * Builds shared, subdivided administrative boundary points between two grid corners
 * so adjacent polygons share identical vertices (reversed) with zero gaps or overlaps.
 */
function buildSubdividedEdge(
  p0: [number, number],
  p1: [number, number],
  seed: number,
  edgeKeyA: number,
  edgeKeyB: number,
  edgeType: number,
): [number, number][] {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  // Normal vector perpendicular to canonical edge p0 -> p1
  const nx = -dy;
  const ny = dx;

  const amp1 = deterministicHash(seed + 101, edgeKeyA, edgeKeyB, edgeType * 2) * 0.085;
  const amp2 = deterministicHash(seed + 211, edgeKeyA, edgeKeyB, edgeType * 2 + 1) * 0.085;

  const m1: [number, number] = [
    Number((p0[0] + dx * 0.33 + nx * amp1).toFixed(5)),
    Number((p0[1] + dy * 0.33 + ny * amp1).toFixed(5)),
  ];
  const m2: [number, number] = [
    Number((p0[0] + dx * 0.67 + nx * amp2).toFixed(5)),
    Number((p0[1] + dy * 0.67 + ny * amp2).toFixed(5)),
  ];

  return [p0, m1, m2, p1];
}

/**
 * Generates contiguous, non-overlapping, RFC 7946 counter-clockwise organic ward polygons
 * while preserving exact cell centroids for deterministic mobility matrix calibration.
 */
export function buildContiguousDistrictMesh(spec: MeshSpec): {
  districts: DistrictProperties[];
  featureCollection: DistrictFeatureCollection;
} {
  const { rows, cols, originLng, originLat, cellWidthDeg, cellHeightDeg, seed, cells } = spec;
  const jitter = Math.min(0.2, Math.max(0, spec.jitterRatio));

  const vertices: [number, number][][] = [];
  for (let r = 0; r <= rows; r++) {
    const rowVerts: [number, number][] = [];
    const normY = r / rows;
    for (let c = 0; c <= cols; c++) {
      const normX = c / cols;
      const dx = deterministicHash(seed, r, c, 0) * cellWidthDeg * jitter;
      const dy = deterministicHash(seed, r, c, 1) * cellHeightDeg * jitter;
      const curveLng = spec.curveLngFn ? spec.curveLngFn(normX, normY) : 0;
      const curveLat = spec.curveLatFn ? spec.curveLatFn(normX, normY) : 0;

      const lng = Number((originLng + c * cellWidthDeg + dx + curveLng).toFixed(5));
      const lat = Number((originLat + r * cellHeightDeg + dy + curveLat).toFixed(5));
      rowVerts.push([lng, lat]);
    }
    vertices.push(rowVerts);
  }

  // Precompute canonical horizontal edges (west -> east) and vertical edges (south -> north)
  const horizEdges: [number, number][][][] = [];
  for (let r = 0; r <= rows; r++) {
    const rowEdges: [number, number][][] = [];
    for (let c = 0; c < cols; c++) {
      rowEdges.push(buildSubdividedEdge(vertices[r]![c]!, vertices[r]![c + 1]!, seed, r, c, 1));
    }
    horizEdges.push(rowEdges);
  }

  const vertEdges: [number, number][][][] = [];
  for (let r = 0; r < rows; r++) {
    const colEdges: [number, number][][] = [];
    for (let c = 0; c <= cols; c++) {
      colEdges.push(buildSubdividedEdge(vertices[r]![c]!, vertices[r + 1]![c]!, seed, r, c, 2));
    }
    vertEdges.push(colEdges);
  }

  const districts: DistrictProperties[] = [];
  const features: DistrictFeature[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]!;
      const bl = vertices[r]![c]!;
      const br = vertices[r]![c + 1]!;
      const tr = vertices[r + 1]![c + 1]!;
      const tl = vertices[r + 1]![c]!;

      // Preserve exact canonical 4-corner centroid so mobility calibration stays bit-identical
      const baseRing: [number, number][] = [bl, br, tr, tl, bl];
      const centroid = computePolygonCentroid(baseRing);

      // Stitch organic counter-clockwise ring from shared canonical edges:
      // bottom (W->E), right (S->N), top reversed (E->W), left reversed (N->S)
      const bottom = horizEdges[r]![c]!;
      const right = vertEdges[r]![c + 1]!;
      const topRev = [...horizEdges[r + 1]![c]!].reverse();
      const leftRev = [...vertEdges[r]![c]!].reverse();

      const organicRing: [number, number][] = [
        ...bottom.slice(0, -1),
        ...right.slice(0, -1),
        ...topRev.slice(0, -1),
        ...leftRev.slice(0, -1),
        bottom[0]!,
      ];

      const props: DistrictProperties = {
        id: cell.id,
        name: cell.name,
        population: cell.population,
        icuBeds: cell.icuBeds,
        centroid,
        initialCases: cell.initialCases,
        zoneType: cell.zoneType,
      };

      districts.push(props);
      features.push({
        type: 'Feature',
        id: cell.id,
        properties: props,
        geometry: {
          type: 'Polygon',
          coordinates: [organicRing],
        },
      });
    }
  }

  return {
    districts,
    featureCollection: {
      type: 'FeatureCollection',
      features,
    },
  };
}
