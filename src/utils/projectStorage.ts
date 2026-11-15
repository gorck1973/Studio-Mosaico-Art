import {
  AdjustmentSettings,
  CoordFormat,
  PaletteColor,
} from '../types/pixelGrid';

export interface MosaicProjectFile {
  version: 1;
  app: 'Studio Mosaico Art';
  savedAt: string;
  fileName: string | null;
  sourceImageDataUrl: string | null;
  settings: AdjustmentSettings;
  pieceSizeCm: number;
  coordFormat: CoordFormat;
  customPalette: PaletteColor[] | null;
  manualOverrides: Record<string, string>;
}

const AUTOSAVE_STORAGE_KEY = 'studio-mosaico-art:autosave-v1';

export function imageElementToDataUrl(img: HTMLImageElement): string | null {
  try {
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function downloadProjectFile(project: MosaicProjectFile): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proyecto-mosaico-${project.settings.gridCols}x${project.settings.gridRows}.mosaico.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseProjectFile(rawJson: string): MosaicProjectFile {
  const parsed = JSON.parse(rawJson) as Partial<MosaicProjectFile>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.version !== 1 ||
    !parsed.settings ||
    typeof parsed.settings.gridCols !== 'number' ||
    typeof parsed.settings.gridRows !== 'number'
  ) {
    throw new Error('El archivo seleccionado no es un proyecto válido de Studio Mosaico Art.');
  }

  return {
    version: 1,
    app: 'Studio Mosaico Art',
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    fileName: typeof parsed.fileName === 'string' ? parsed.fileName : null,
    sourceImageDataUrl:
      typeof parsed.sourceImageDataUrl === 'string' ? parsed.sourceImageDataUrl : null,
    settings: parsed.settings,
    pieceSizeCm: typeof parsed.pieceSizeCm === 'number' ? parsed.pieceSizeCm : 5,
    coordFormat: parsed.coordFormat === 'colRow' ? 'colRow' : 'alphaNum',
    customPalette: Array.isArray(parsed.customPalette) ? parsed.customPalette : null,
    manualOverrides:
      parsed.manualOverrides && typeof parsed.manualOverrides === 'object'
        ? parsed.manualOverrides
        : {},
  };
}

export function saveAutosaveToStorage(project: MosaicProjectFile): void {
  try {
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(project));
  } catch {
    // If image data exceeds localStorage quota, save settings + manual overrides without image dataUrl
    try {
      const compact: MosaicProjectFile = {
        ...project,
        sourceImageDataUrl: null,
      };
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage unavailable errors
    }
  }
}

export function loadAutosaveFromStorage(): MosaicProjectFile | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    return parseProjectFile(raw);
  } catch {
    return null;
  }
}
