import { ColorVisionMode, DistributionMode, PaletteColor, RGB } from '../types/pixelGrid';

export function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: clampByte(a.r + (b.r - a.r) * k),
    g: clampByte(a.g + (b.g - a.g) * k),
    b: clampByte(a.b + (b.b - a.b) * k),
  };
}

export function getLuminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function getBlackInkPercent(rgb: RGB): number {
  const lum = getLuminance(rgb);
  return Math.max(0, Math.min(100, Math.round((1 - lum / 255) * 100)));
}

export function formatTwoPartRatio(darkPct: number): string {
  const d = Math.max(0, Math.min(100, Math.round(darkPct)));
  return `${d}/${100 - d}`;
}

export function getContrastTextColor(rgb: RGB): string {
  return getLuminance(rgb) > 138 ? '#0F172A' : '#FFFFFF';
}

export function rgbToLab({ r, g, b }: RGB): [number, number, number] {
  let sr = r / 255;
  let sg = g / 255;
  let sb = b / 255;

  sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

  const x = (sr * 0.4124564 + sg * 0.3575761 + sb * 0.1804375) / 0.95047;
  const y = (sr * 0.2126729 + sg * 0.7151522 + sb * 0.072175) / 1.0;
  const z = (sr * 0.0193339 + sg * 0.119192 + sb * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labDistanceSq(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const lig = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: clampByte((r1 + m) * 255),
    g: clampByte((g1 + m) * 255),
    b: clampByte((b1 + m) * 255),
  };
}

export function describeBaseColorName(rgb: RGB): string {
  const lum = getLuminance(rgb);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;

  if (lum <= 1 && delta < 4) return 'Negro';
  if (lum >= 254 && delta < 4) return 'Blanco';
  if (delta < 12) return 'Gris';

  let h = 0;
  if (delta > 0) {
    if (max === rgb.r) h = 60 * (((rgb.g - rgb.b) / delta) % 6);
    else if (max === rgb.g) h = 60 * ((rgb.b - rgb.r) / delta + 2);
    else h = 60 * ((rgb.r - rgb.g) / delta + 4);
  }
  if (h < 0) h += 360;

  if (h < 15 || h >= 345) return 'Rojo';
  if (h < 38) return 'Naranja';
  if (h < 62) return 'Amarillo';
  if (h < 150) return 'Verde';
  if (h < 195) return 'Turquesa';
  if (h < 250) return 'Azul';
  if (h < 290) return 'Violeta';
  return 'Magenta';
}

export function describeToneSpanish(rgb: RGB): string {
  const lum = getLuminance(rgb);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;

  if (lum <= 1 && delta < 4) return 'Negro Puro';
  if (lum >= 254 && delta < 4) return 'Blanco Puro';

  if (delta < 12) {
    const blackPct = getBlackInkPercent(rgb);
    return `Gris ${formatTwoPartRatio(blackPct)}`;
  }

  const base = describeBaseColorName(rgb);
  const tone = lum < 80 ? 'Oscuro' : lum > 185 ? 'Claro' : 'Puro';
  return `${base} ${tone}`;
}

export function makePaletteColor(
  index: number,
  rgb: RGB,
  visionMode: ColorVisionMode,
  customName?: string,
  isAnchor?: boolean,
  tonalPosition?: number,
  customRatioLabel?: string,
  usesRatio = false
): PaletteColor {
  const cleanRgb: RGB =
    visionMode === 'grayscale'
      ? (() => {
          const lum = clampByte(getLuminance(rgb));
          return { r: lum, g: lum, b: lum };
        })()
      : {
          r: clampByte(rgb.r),
          g: clampByte(rgb.g),
          b: clampByte(rgb.b),
        };

  const lum = getLuminance(cleanRgb);
  const blackPct = getBlackInkPercent(cleanRgb);
  const prefix = visionMode === 'grayscale' ? 'G' : 'C';
  const id = `${prefix}${String(index).padStart(2, '0')}`;

  return {
    id,
    index,
    hex: rgbToHex(cleanRgb),
    rgb: cleanRgb,
    rgbLabel: `${cleanRgb.r}, ${cleanRgb.g}, ${cleanRgb.b}`,
    name: customName ?? describeToneSpanish(cleanRgb),
    luminance: lum,
    tonalPosition: tonalPosition ?? lum / 255,
    blackInkPercent: blackPct,
    ratioLabel: customRatioLabel ?? formatTwoPartRatio(blackPct),
    usesRatio,
    isAnchor,
  };
}

// 1D deterministic K-Means on luminance values, keeping 0 (black) and 255 (white) anchored
export function computeAdaptiveLuminanceLevels(luminances: number[], count: number): number[] {
  const safeCount = Math.max(2, count);
  const interiorCount = Math.max(0, safeCount - 2);
  if (interiorCount === 0) return [0, 255];

  const interiorSamples = luminances.filter((l) => l > 4 && l < 251);
  const pool = interiorSamples.length >= interiorCount ? interiorSamples : luminances;
  const sorted = [...pool].sort((a, b) => a - b);

  const centroids: number[] = [];
  for (let i = 1; i <= interiorCount; i++) {
    const q = i / (interiorCount + 1);
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    const uniform = (i / (interiorCount + 1)) * 255;
    centroids.push(sorted.length > 0 ? sorted[idx] * 0.72 + uniform * 0.28 : uniform);
  }

  for (let iter = 0; iter < 14; iter++) {
    const sums = new Array<number>(interiorCount).fill(0);
    const counts = new Array<number>(interiorCount).fill(0);

    for (const val of pool) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < interiorCount; c++) {
        const d = Math.abs(val - centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }
      sums[bestIdx] += val;
      counts[bestIdx]++;
    }

    for (let c = 0; c < interiorCount; c++) {
      if (counts[c] > 0) {
        centroids[c] = sums[c] / counts[c];
      }
    }
  }

  const minGap = Math.max(3, Math.floor(220 / (safeCount + 4)));
  const rounded = centroids
    .map((c) => Math.max(6, Math.min(249, Math.round(c))))
    .sort((a, b) => a - b);
  for (let i = 1; i < rounded.length; i++) {
    if (rounded[i] < rounded[i - 1] + minGap) {
      rounded[i] = Math.min(249 - (rounded.length - 1 - i) * minGap, rounded[i - 1] + minGap);
    }
  }

  return [0, ...rounded, 255];
}

// Compute N normalized tonal steps (0..1) either adapted to the image histogram or uniform
export function computeTonalSteps(
  pixels: RGB[],
  totalColors: number,
  distributionMode: DistributionMode
): number[] {
  const safeCount = Math.max(2, totalColors);
  if (distributionMode === 'uniform') {
    return Array.from({ length: safeCount }, (_, i) => i / (safeCount - 1));
  }
  const luminances = pixels.map(getLuminance);
  const levels = computeAdaptiveLuminanceLevels(luminances, safeCount);
  return levels.map((l) => l / 255);
}

// Grayscale (Black -> White)
export function computeGrayscalePalette(
  pixels: RGB[],
  totalColors: number,
  distributionMode: DistributionMode
): PaletteColor[] {
  const steps = computeTonalSteps(pixels, totalColors, distributionMode);

  return steps.map((t, idx) => {
    const lum = idx === 0 ? 0 : idx === steps.length - 1 ? 255 : Math.round(t * 255);
    const blackPct = Math.round((1 - lum / 255) * 100);
    const ratio = formatTwoPartRatio(blackPct);
    const isAnchor = idx === 0 || idx === steps.length - 1;
    const name =
      idx === 0 ? 'Negro Puro' : idx === steps.length - 1 ? 'Blanco Puro' : `Gris ${ratio}`;
    return makePaletteColor(
      idx + 1,
      { r: lum, g: lum, b: lum },
      'grayscale',
      name,
      isAnchor,
      t,
      ratio,
      true
    );
  });
}

// Replace Black with a Pure Color (Color -> White)
export function computeReplaceBlackPalette(
  pixels: RGB[],
  baseHex: string,
  totalColors: number,
  distributionMode: DistributionMode
): PaletteColor[] {
  const steps = computeTonalSteps(pixels, totalColors, distributionMode);
  const baseRgb = hexToRgb(baseHex);
  const white: RGB = { r: 255, g: 255, b: 255 };
  const baseName = describeBaseColorName(baseRgb);

  return steps.map((t, idx) => {
    const rgb = lerpRgb(baseRgb, white, t);
    const colorPct = Math.round((1 - t) * 100);
    const ratio = formatTwoPartRatio(colorPct);
    const isAnchor = idx === 0 || idx === steps.length - 1;
    const name =
      idx === 0
        ? `${baseName} Puro`
        : idx === steps.length - 1
          ? 'Blanco Puro'
          : `${baseName} ${ratio}`;
    return makePaletteColor(idx + 1, rgb, 'color', name, isAnchor, t, ratio, true);
  });
}

// 2-Color Gradient Mix (Color 1 -> Color 2)
export function computeTwoColorMixPalette(
  pixels: RGB[],
  color1Hex: string,
  color2Hex: string,
  totalColors: number,
  distributionMode: DistributionMode
): PaletteColor[] {
  const steps = computeTonalSteps(pixels, totalColors, distributionMode);
  const c1 = hexToRgb(color1Hex);
  const c2 = hexToRgb(color2Hex);
  const n1 = describeBaseColorName(c1);
  const n2 = describeBaseColorName(c2);

  return steps.map((t, idx) => {
    const rgb = lerpRgb(c1, c2, t);
    const pct1 = Math.round((1 - t) * 100);
    const ratio = formatTwoPartRatio(pct1);
    const isAnchor = idx === 0 || idx === steps.length - 1;
    const name =
      idx === 0
        ? `${n1} Puro`
        : idx === steps.length - 1
          ? `${n2} Puro`
          : `Mezcla ${n1}/${n2} (${ratio})`;
    return makePaletteColor(idx + 1, rgb, 'color', name, isAnchor, t, ratio, true);
  });
}

// 3-Color Gradient Mix (Color 1 -> Color 2 -> Color 3)
export function computeThreeColorMixPalette(
  pixels: RGB[],
  color1Hex: string,
  color2Hex: string,
  color3Hex: string,
  totalColors: number,
  distributionMode: DistributionMode
): PaletteColor[] {
  const steps = computeTonalSteps(pixels, totalColors, distributionMode);
  const c1 = hexToRgb(color1Hex);
  const c2 = hexToRgb(color2Hex);
  const c3 = hexToRgb(color3Hex);
  const n1 = describeBaseColorName(c1);
  const n2 = describeBaseColorName(c2);
  const n3 = describeBaseColorName(c3);

  return steps.map((t, idx) => {
    let rgb: RGB;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;

    if (t <= 0.5) {
      const k = t * 2;
      rgb = lerpRgb(c1, c2, k);
      p1 = Math.round((1 - k) * 100);
      p2 = 100 - p1;
      p3 = 0;
    } else {
      const k = (t - 0.5) * 2;
      rgb = lerpRgb(c2, c3, k);
      p1 = 0;
      p3 = Math.round(k * 100);
      p2 = 100 - p3;
    }

    const ratio = `${p1}/${p2}/${p3}`;
    const isAnchor = idx === 0 || idx === steps.length - 1;
    const name =
      idx === 0
        ? `${n1} Base`
        : idx === steps.length - 1
          ? `${n3} Base`
          : p3 === 0
            ? `${n1}/${n2} (${p1}/${p2})`
            : `${n2}/${n3} (${p2}/${p3})`;

    return makePaletteColor(idx + 1, rgb, 'color', name, isAnchor, t, ratio);
  });
}

// Pure saturated colors (Primaries, Secondaries, Tertiaries) + Pure Black & Pure White
export function computePureColorsPalette(totalColors: number): PaletteColor[] {
  const safeCount = Math.max(3, totalColors);
  const interior = safeCount - 2;
  const pureHues: Array<{ rgb: RGB; name: string }> = [];

  for (let i = 0; i < interior; i++) {
    const hue = Math.round((i / interior) * 360);
    const rgb = hslToRgb(hue, 1.0, 0.5);
    pureHues.push({ rgb, name: `${describeBaseColorName(rgb)} Puro` });
  }

  pureHues.sort((a, b) => getLuminance(a.rgb) - getLuminance(b.rgb));

  const items: Array<{ rgb: RGB; name: string; anchor?: boolean }> = [
    { rgb: { r: 0, g: 0, b: 0 }, name: 'Negro Puro', anchor: true },
    ...pureHues,
    { rgb: { r: 255, g: 255, b: 255 }, name: 'Blanco Puro', anchor: true },
  ];

  return items.map((item, idx) =>
    makePaletteColor(
      idx + 1,
      item.rgb,
      'color',
      item.name,
      item.anchor,
      idx / (items.length - 1)
    )
  );
}

export function computeAdaptiveLabPalette(
  pixels: RGB[],
  totalColors: number,
  smartOptimize = true
): PaletteColor[] {
  const targetCount = Math.max(2, totalColors);
  if (pixels.length === 0) {
    return [
      makePaletteColor(1, { r: 0, g: 0, b: 0 }, 'color', 'Negro Puro', true, 0),
      makePaletteColor(2, { r: 255, g: 255, b: 255 }, 'color', 'Blanco Puro', true, 1),
    ];
  }

  const pixelLabs = pixels.map((rgb) => {
    const lab = rgbToLab(rgb);
    const chroma = Math.hypot(lab[1], lab[2]);
    // Salience weight prioritizes crisp chromatic accents slightly over flat backgrounds
    const weight = smartOptimize ? 1 + Math.min(2.2, chroma / 32) : 1;
    return { rgb, lab, chroma, weight };
  });

  const maxChroma = pixelLabs.reduce((acc, p) => Math.max(acc, p.chroma), 0);
  if (maxChroma < 5) {
    return computeGrayscalePalette(pixels, totalColors, 'adaptive');
  }

  // Deterministic farthest-point / salience-weighted seeding in perceptual CIE Lab space
  const sortedByL = [...pixelLabs].sort((a, b) => a.lab[0] - b.lab[0]);
  const seedIndices: number[] = [];
  const centroids: [number, number, number][] = [];

  // Seed darkest and lightest actual tones first so tonal dynamic range is preserved
  centroids.push([...sortedByL[0].lab]);
  if (targetCount > 1 && sortedByL.length > 1) {
    centroids.push([...sortedByL[sortedByL.length - 1].lab]);
  }

  while (centroids.length < targetCount && centroids.length < pixelLabs.length) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < pixelLabs.length; i++) {
      if (seedIndices.includes(i)) continue;
      const p = pixelLabs[i];
      let minDist = Infinity;
      for (const c of centroids) {
        const d = labDistanceSq(p.lab, c);
        if (d < minDist) minDist = d;
      }
      const score = minDist * p.weight;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    seedIndices.push(bestIdx);
    centroids.push([...pixelLabs[bestIdx].lab]);
  }

  let centroidRgbs: RGB[] = centroids.map((lab) => {
    let closest = pixelLabs[0].rgb;
    let minD = Infinity;
    for (const p of pixelLabs) {
      const d = labDistanceSq(p.lab, lab);
      if (d < minD) {
        minD = d;
        closest = p.rgb;
      }
    }
    return { ...closest };
  });

  // Weighted CIE Lab K-Means refinement
  for (let iter = 0; iter < 12; iter++) {
    const centroidLabs = centroidRgbs.map(rgbToLab);
    const sums = centroidRgbs.map(() => ({ r: 0, g: 0, b: 0, wSum: 0 }));

    for (const p of pixelLabs) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroidLabs.length; c++) {
        const d = labDistanceSq(p.lab, centroidLabs[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }
      sums[bestIdx].r += p.rgb.r * p.weight;
      sums[bestIdx].g += p.rgb.g * p.weight;
      sums[bestIdx].b += p.rgb.b * p.weight;
      sums[bestIdx].wSum += p.weight;
    }

    centroidRgbs = centroidRgbs.map((prev, idx) =>
      sums[idx].wSum > 0
        ? {
            r: clampByte(sums[idx].r / sums[idx].wSum),
            g: clampByte(sums[idx].g / sums[idx].wSum),
            b: clampByte(sums[idx].b / sums[idx].wSum),
          }
        : prev
    );
  }

  // Deduplicate exact hex matches
  const uniqueColors: RGB[] = [];
  for (const c of centroidRgbs) {
    const key = rgbToHex(c);
    if (!uniqueColors.some((u) => rgbToHex(u) === key)) {
      uniqueColors.push(c);
    }
  }

  // Fill any remaining slots from distinct source pixels if image has fewer unique tones
  if (uniqueColors.length < targetCount) {
    for (const p of pixelLabs) {
      const key = rgbToHex(p.rgb);
      if (!uniqueColors.some((u) => rgbToHex(u) === key)) {
        uniqueColors.push({ ...p.rgb });
        if (uniqueColors.length >= targetCount) break;
      }
    }
  }

  uniqueColors.sort((a, b) => getLuminance(a) - getLuminance(b));

  const finalSlice = uniqueColors.slice(0, targetCount);
  const denom = Math.max(1, finalSlice.length - 1);

  return finalSlice.map((rgb, idx) =>
    makePaletteColor(
      idx + 1,
      rgb,
      'color',
      undefined,
      idx === 0 || idx === finalSlice.length - 1,
      idx / denom
    )
  );
}
