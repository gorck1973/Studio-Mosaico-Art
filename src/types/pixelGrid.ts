export type GridPresetId = '15x19' | '20x25' | '25x31' | '30x38' | 'custom';

export const GRID_PRESETS: Array<{ id: Exclude<GridPresetId, 'custom'>; cols: number; rows: number; label: string }> = [
  { id: '15x19', cols: 15, rows: 19, label: '15 × 19 (285 px)' },
  { id: '20x25', cols: 20, rows: 25, label: '20 × 25 (500 px)' },
  { id: '25x31', cols: 25, rows: 31, label: '25 × 31 (775 px)' },
  { id: '30x38', cols: 30, rows: 38, label: '30 × 38 (1140 px)' },
];

export type PhysicalUnit = 'cm' | 'in';

export const PHYSICAL_SIZE_PRESETS: Record<PhysicalUnit, Array<{ value: number; label: string }>> = {
  cm: [
    { value: 1, label: '1 × 1 cm (mini tesela)' },
    { value: 2, label: '2 × 2 cm (cubo pequeño)' },
    { value: 2.5, label: '2.5 × 2.5 cm' },
    { value: 3, label: '3 × 3 cm' },
    { value: 5, label: '5 × 5 cm (cubo estándar)' },
    { value: 7.5, label: '7.5 × 7.5 cm' },
    { value: 10, label: '10 × 10 cm (bloque grande)' },
  ],
  in: [
    { value: 0.5, label: '0.5" × 0.5" (1/2 pulg.)' },
    { value: 1, label: '1" × 1" (pulgada estándar)' },
    { value: 1.5, label: '1.5" × 1.5" (1 1/2 pulg.)' },
    { value: 2, label: '2" × 2" (bloque 2 pulg.)' },
    { value: 3, label: '3" × 3"' },
    { value: 4, label: '4" × 4"' },
  ],
};

export type ColorVisionMode = 'grayscale' | 'color';

export type DistributionMode = 'adaptive' | 'uniform';

export type PaletteMode =
  | 'grayscale'
  | 'replace-black'
  | 'mix-2-colors'
  | 'mix-3-colors'
  | 'pure-colors'
  | 'adaptive-kmeans';

export const PURE_COLOR_SWATCHES: Array<{ hex: string; label: string }> = [
  { hex: '#000000', label: 'Negro' },
  { hex: '#DC2626', label: 'Rojo' },
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#16A34A', label: 'Verde' },
  { hex: '#EAB308', label: 'Amarillo' },
  { hex: '#EA580C', label: 'Naranja' },
  { hex: '#9333EA', label: 'Violeta' },
  { hex: '#0891B2', label: 'Turquesa' },
  { hex: '#DB2777', label: 'Magenta' },
  { hex: '#FFFFFF', label: 'Blanco' },
];

export type CoordFormat = 'alphaNum' | 'colRow';

export type ComparisonMode = 'development' | 'side-by-side' | 'split-slider';

export function colToLetters(col: number): string {
  let n = col;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export function getColumnLabels(cols: number): string[] {
  return Array.from({ length: cols }, (_, i) => colToLetters(i));
}

export function isTwoPartRatioMode(mode: PaletteMode): boolean {
  return mode === 'grayscale' || mode === 'replace-black' || mode === 'mix-2-colors';
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  id: string; // e.g., "G01" or "C01"
  index: number; // 1..N
  hex: string;
  rgb: RGB;
  rgbLabel: string; // e.g., "225, 29, 72"
  name: string;
  luminance: number; // 0..255
  tonalPosition: number; // 0 (shadows) .. 1 (highlights)
  blackInkPercent: number; // 0..100
  ratioLabel: string; // e.g., "100/0", "96/4", "50/50"
  usesRatio: boolean; // true for grayscale, replace-black, mix-2-colors
  isAnchor?: boolean;
}

export interface GridCell {
  col: number;
  row: number;
  alphaCoord: string; // e.g., "K/8"
  numericCoord: string; // e.g., "C11-F08"
  colorId: string;
  colorIndex: number;
  hex: string;
  sourceRgb: RGB;
  sourceLuminance: number;
}

export interface ColorUsageStat {
  color: PaletteColor;
  count: number;
  percentage: number;
  alphaCoords: string[];
  numericCoords: string[];
}

export interface AdjustmentSettings {
  gridCols: number;
  gridRows: number;
  visionMode: ColorVisionMode;
  distributionMode: DistributionMode;
  grayscaleSource: boolean;
  smartColorOptimize: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  dithering: boolean;
  ditherStrength: number;
  zoom: number;
  panX: number;
  panY: number;
  paletteSize: number;
  paletteMode: PaletteMode;
  color1Hex: string; // Shadows / Primary replacement for black
  color2Hex: string; // Midtones (3-color) or Highlights (2-color)
  color3Hex: string; // Highlights (3-color)
  lockPalette: boolean;
}

export interface ProcessedMosaic {
  cols: number;
  rows: number;
  totalCells: number;
  cells: GridCell[];
  palette: PaletteColor[];
  stats: ColorUsageStat[];
  sampledPixels: RGB[];
}
