import {
  AdjustmentSettings,
  colToLetters,
  ColorUsageStat,
  GridCell,
  PaletteColor,
  ProcessedMosaic,
  RGB,
} from '../types/pixelGrid';
import {
  clampByte,
  computeAdaptiveLabPalette,
  computeGrayscalePalette,
  computePureColorsPalette,
  computeReplaceBlackPalette,
  computeThreeColorMixPalette,
  computeTwoColorMixPalette,
  getLuminance,
  labDistanceSq,
  rgbToLab,
} from './colorMath';

export function buildDefaultStudioCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 500;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 400, 500);
  bgGrad.addColorStop(0, '#0D0D0D');
  bgGrad.addColorStop(1, '#262626');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 400, 500);

  const halo = ctx.createRadialGradient(210, 195, 20, 210, 195, 210);
  halo.addColorStop(0, '#F5F5F5');
  halo.addColorStop(0.55, '#6B6B6B');
  halo.addColorStop(1, 'rgba(13,13,13,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 400, 500);

  ctx.fillStyle = '#080808';
  ctx.beginPath();
  ctx.moveTo(45, 500);
  ctx.quadraticCurveTo(95, 360, 200, 355);
  ctx.quadraticCurveTo(305, 360, 355, 500);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(148, 372);
  ctx.lineTo(200, 448);
  ctx.lineTo(252, 372);
  ctx.stroke();

  ctx.fillStyle = '#B8B8B8';
  ctx.fillRect(168, 285, 64, 88);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(200, 200, 92, 118, 0, 0, Math.PI * 2);
  ctx.clip();

  const faceGrad = ctx.createLinearGradient(108, 130, 292, 260);
  faceGrad.addColorStop(0, '#FFFFFF');
  faceGrad.addColorStop(0.45, '#D4D4D4');
  faceGrad.addColorStop(0.68, '#404040');
  faceGrad.addColorStop(1, '#0F0F0F');
  ctx.fillStyle = faceGrad;
  ctx.fillRect(100, 75, 200, 250);

  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.ellipse(200, 108, 105, 58, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#121212';
  ctx.fillRect(138, 174, 46, 12);
  ctx.fillRect(216, 174, 46, 12);
  ctx.beginPath();
  ctx.arc(162, 198, 11, 0, Math.PI * 2);
  ctx.arc(238, 198, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#262626';
  ctx.beginPath();
  ctx.moveTo(200, 192);
  ctx.lineTo(214, 244);
  ctx.lineTo(192, 248);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#171717';
  ctx.fillRect(172, 272, 56, 10);
  ctx.restore();

  return canvas;
}

function getCropRect(
  srcW: number,
  srcH: number,
  settings: AdjustmentSettings
): { sx: number; sy: number; cropW: number; cropH: number } {
  const targetRatio = settings.gridCols / settings.gridRows;
  const srcRatio = srcW / srcH;

  let baseCropW = srcW;
  let baseCropH = srcH;
  if (srcRatio > targetRatio) {
    baseCropW = srcH * targetRatio;
  } else {
    baseCropH = srcW / targetRatio;
  }

  const zoom = Math.max(1, settings.zoom);
  const cropW = baseCropW / zoom;
  const cropH = baseCropH / zoom;

  const maxOffsetX = Math.max(0, (srcW - cropW) / 2);
  const maxOffsetY = Math.max(0, (srcH - cropH) / 2);
  const sx = (srcW - cropW) / 2 + settings.panX * maxOffsetX;
  const sy = (srcH - cropH) / 2 + settings.panY * maxOffsetY;

  return { sx, sy, cropW, cropH };
}

function buildAdjustTransform(settings: AdjustmentSettings) {
  const contrastFactor =
    (259 * (settings.contrast * 2.55 + 255)) / (255 * (259 - settings.contrast * 2.55));
  const brightnessOffset = settings.brightness * 2.55;
  const gammaInv = 1 / Math.max(0.2, settings.gamma);
  const forceGrayscale = settings.visionMode === 'grayscale' || settings.grayscaleSource;

  return (rIn: number, gIn: number, bIn: number): RGB => {
    const adj = (v: number) => {
      let val = v + brightnessOffset;
      val = contrastFactor * (val - 128) + 128;
      val = Math.max(0, Math.min(255, val));
      val = 255 * Math.pow(val / 255, gammaInv);
      return clampByte(val);
    };

    let r = adj(rIn);
    let g = adj(gIn);
    let b = adj(bIn);

    if (forceGrayscale) {
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = lum;
      g = lum;
      b = lum;
    }

    if (settings.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    return { r, g, b };
  };
}

export function renderOriginalPreview(
  source: HTMLImageElement | HTMLCanvasElement,
  settings: AdjustmentSettings,
  targetCanvas: HTMLCanvasElement
): void {
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!srcW || !srcH) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const { sx, sy, cropW, cropH } = getCropRect(srcW, srcH, settings);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, w, h);
}

export function renderHighResAdjustedPreview(
  source: HTMLImageElement | HTMLCanvasElement,
  settings: AdjustmentSettings,
  targetCanvas: HTMLCanvasElement
): void {
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!srcW || !srcH) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const { sx, sy, cropW, cropH } = getCropRect(srcW, srcH, settings);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const transform = buildAdjustTransform(settings);

  for (let i = 0; i < data.length; i += 4) {
    const out = transform(data[i], data[i + 1], data[i + 2]);
    data[i] = out.r;
    data[i + 1] = out.g;
    data[i + 2] = out.b;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function sampleAdjustedPixels(
  source: HTMLImageElement | HTMLCanvasElement,
  settings: AdjustmentSettings
): RGB[] {
  const cols = settings.gridCols;
  const rows = settings.gridRows;
  const total = cols * rows;
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  if (!srcW || !srcH) {
    return Array.from({ length: total }, () => ({ r: 128, g: 128, b: 128 }));
  }

  const oversample = 8;
  const workW = cols * oversample;
  const workH = rows * oversample;
  const workCanvas = document.createElement('canvas');
  workCanvas.width = workW;
  workCanvas.height = workH;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true })!;

  workCtx.fillStyle = '#FFFFFF';
  workCtx.fillRect(0, 0, workW, workH);

  const { sx, sy, cropW, cropH } = getCropRect(srcW, srcH, settings);
  workCtx.imageSmoothingEnabled = true;
  workCtx.imageSmoothingQuality = 'high';
  workCtx.drawImage(source, sx, sy, cropW, cropH, 0, 0, workW, workH);

  const imgData = workCtx.getImageData(0, 0, workW, workH).data;
  const transform = buildAdjustTransform(settings);
  const blockPixels = oversample * oversample;

  const pixels: RGB[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sumR = 0,
        sumG = 0,
        sumB = 0;
      const startX = col * oversample;
      const startY = row * oversample;

      for (let dy = 0; dy < oversample; dy++) {
        for (let dx = 0; dx < oversample; dx++) {
          const idx = ((startY + dy) * workW + (startX + dx)) * 4;
          sumR += imgData[idx];
          sumG += imgData[idx + 1];
          sumB += imgData[idx + 2];
        }
      }

      pixels.push(
        transform(sumR / blockPixels, sumG / blockPixels, sumB / blockPixels)
      );
    }
  }

  return pixels;
}

export function elaboratePaletteFromPixels(
  pixels: RGB[],
  settings: AdjustmentSettings
): PaletteColor[] {
  const count = settings.paletteSize;
  if (settings.visionMode === 'grayscale') {
    return computeGrayscalePalette(pixels, count, settings.distributionMode);
  }

  switch (settings.paletteMode) {
    case 'replace-black':
      return computeReplaceBlackPalette(
        pixels,
        settings.color1Hex,
        count,
        settings.distributionMode
      );
    case 'mix-2-colors':
      return computeTwoColorMixPalette(
        pixels,
        settings.color1Hex,
        settings.color2Hex,
        count,
        settings.distributionMode
      );
    case 'mix-3-colors':
      return computeThreeColorMixPalette(
        pixels,
        settings.color1Hex,
        settings.color2Hex,
        settings.color3Hex,
        count,
        settings.distributionMode
      );
    case 'pure-colors':
      return computePureColorsPalette(count);
    case 'adaptive-kmeans':
      return computeAdaptiveLabPalette(pixels, count);
    case 'grayscale':
    default:
      return computeGrayscalePalette(pixels, count, settings.distributionMode);
  }
}

export function mapPixelsToGrid(
  sampledPixels: RGB[],
  palette: PaletteColor[],
  settings: AdjustmentSettings
): { cells: GridCell[]; stats: ColorUsageStat[] } {
  const cols = settings.gridCols;
  const rows = settings.gridRows;
  const ditherFactor = settings.dithering ? settings.ditherStrength / 100 : 0;
  const cells: GridCell[] = [];

  const isTonalColorPipeline =
    settings.visionMode === 'grayscale' ||
    settings.paletteMode === 'replace-black' ||
    settings.paletteMode === 'mix-2-colors' ||
    settings.paletteMode === 'mix-3-colors' ||
    settings.paletteMode === 'pure-colors';

  if (isTonalColorPipeline) {
    // Map cleanly in tonal luminance space (0..1) so 1/2/3-color gradients configure pixelation identically to black!
    const workingTones = sampledPixels.map((p) => getLuminance(p) / 255);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const currT = Math.max(0, Math.min(1, workingTones[idx]));

        let chosen = palette[0];
        let bestDiff = Infinity;
        for (const c of palette) {
          const d = Math.abs(c.tonalPosition - currT);
          if (d < bestDiff) {
            bestDiff = d;
            chosen = c;
          }
        }

        const colLetter = colToLetters(col);
        const alphaCoord = `${colLetter}${row + 1}`;
        const numericCoord = `C${String(col + 1).padStart(2, '0')}-F${String(row + 1).padStart(2, '0')}`;

        cells.push({
          col,
          row,
          alphaCoord,
          numericCoord,
          colorId: chosen.id,
          colorIndex: chosen.index,
          hex: chosen.hex,
          sourceRgb: sampledPixels[idx],
          sourceLuminance: getLuminance(sampledPixels[idx]),
        });

        if (ditherFactor > 0) {
          const errT = (currT - chosen.tonalPosition) * ditherFactor;
          const distribute = (nc: number, nr: number, weight: number) => {
            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
              const targetIdx = nr * cols + nc;
              workingTones[targetIdx] = Math.max(
                0,
                Math.min(1, workingTones[targetIdx] + errT * weight)
              );
            }
          };

          distribute(col + 1, row, 7 / 16);
          distribute(col - 1, row + 1, 3 / 16);
          distribute(col, row + 1, 5 / 16);
          distribute(col + 1, row + 1, 1 / 16);
        }
      }
    }

    const stats = computeColorUsageStats(cells, palette, cols * rows);
    return { cells, stats };
  }

  // Perceptual CIE Lab matching for full-color real photo extraction
  const workingPixels: RGB[] = sampledPixels.map((p) => ({ ...p }));
  const paletteLabs = palette.map((c) => rgbToLab(c.rgb));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const curr = workingPixels[idx];
      const lab = rgbToLab(curr);
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < paletteLabs.length; i++) {
        const d = labDistanceSq(lab, paletteLabs[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const chosen = palette[bestIdx];

      const colLetter = colToLetters(col);
      const alphaCoord = `${colLetter}/${row + 1}`;
      const numericCoord = `C${String(col + 1).padStart(2, '0')}-F${String(row + 1).padStart(2, '0')}`;

      cells.push({
        col,
        row,
        alphaCoord,
        numericCoord,
        colorId: chosen.id,
        colorIndex: chosen.index,
        hex: chosen.hex,
        sourceRgb: sampledPixels[idx],
        sourceLuminance: getLuminance(sampledPixels[idx]),
      });

      if (ditherFactor > 0) {
        const errR = (curr.r - chosen.rgb.r) * ditherFactor;
        const errG = (curr.g - chosen.rgb.g) * ditherFactor;
        const errB = (curr.b - chosen.rgb.b) * ditherFactor;

        const distribute = (nc: number, nr: number, weight: number) => {
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
            const target = workingPixels[nr * cols + nc];
            target.r = clampByte(target.r + errR * weight);
            target.g = clampByte(target.g + errG * weight);
            target.b = clampByte(target.b + errB * weight);
          }
        };

        distribute(col + 1, row, 7 / 16);
        distribute(col - 1, row + 1, 3 / 16);
        distribute(col, row + 1, 5 / 16);
        distribute(col + 1, row + 1, 1 / 16);
      }
    }
  }

  const stats = computeColorUsageStats(cells, palette, cols * rows);
  return { cells, stats };
}

export function computeColorUsageStats(
  cells: GridCell[],
  palette: PaletteColor[],
  totalCells: number
): ColorUsageStat[] {
  const byColor = new Map<
    string,
    { alphaCoords: string[]; numericCoords: string[] }
  >();

  for (const color of palette) {
    byColor.set(color.id, { alphaCoords: [], numericCoords: [] });
  }

  for (const cell of cells) {
    const entry = byColor.get(cell.colorId);
    if (entry) {
      entry.alphaCoords.push(cell.alphaCoord);
      entry.numericCoords.push(cell.numericCoord);
    }
  }

  const safeTotal = Math.max(1, totalCells);
  return palette.map((color) => {
    const entry = byColor.get(color.id) ?? { alphaCoords: [], numericCoords: [] };
    const count = entry.alphaCoords.length;
    return {
      color,
      count,
      percentage: Number(((count / safeTotal) * 100).toFixed(1)),
      alphaCoords: entry.alphaCoords,
      numericCoords: entry.numericCoords,
    };
  });
}

export function processMosaicPipeline(
  source: HTMLImageElement | HTMLCanvasElement,
  settings: AdjustmentSettings,
  existingPalette?: PaletteColor[]
): ProcessedMosaic {
  const sampledPixels = sampleAdjustedPixels(source, settings);
  const palette =
    settings.lockPalette &&
    existingPalette &&
    existingPalette.length === settings.paletteSize
      ? existingPalette
      : elaboratePaletteFromPixels(sampledPixels, settings);
  const { cells, stats } = mapPixelsToGrid(sampledPixels, palette, settings);
  return {
    cols: settings.gridCols,
    rows: settings.gridRows,
    totalCells: settings.gridCols * settings.gridRows,
    cells,
    palette,
    stats,
    sampledPixels,
  };
}
