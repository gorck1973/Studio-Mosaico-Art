import {
  ColorUsageStat,
  CoordFormat,
  getColumnLabels,
  GridCell,
  PaletteColor,
  PhysicalUnit,
} from '../types/pixelGrid';
import { getContrastTextColor } from './colorMath';
import { formatPhysicalSummaryText } from './exporters';

interface RenderedPdfPage {
  widthPx: number;
  heightPx: number;
  jpegBytes: Uint8Array;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function createA4Canvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } {
  // A4 at 150 DPI (595.28 x 841.89 pt -> 1240 x 1754 px)
  const w = 1240;
  const h = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  return { canvas, ctx, w, h };
}

function renderGridPage(
  cells: GridCell[],
  palette: PaletteColor[],
  cols: number,
  rows: number,
  pieceSize: number,
  pieceUnit: PhysicalUnit
): RenderedPdfPage {
  const { canvas, ctx, w, h } = createA4Canvas();
  const margin = 64;

  // Header
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Studio Mosaico Art — Plantilla de Taller', margin, margin);

  ctx.fillStyle = '#475569';
  ctx.font = '500 15px "DM Sans", system-ui, sans-serif';
  const physicalInfo =
    pieceSize > 0
      ? ` · Medida: ${formatPhysicalSummaryText(cols, rows, pieceSize, pieceUnit)}`
      : '';
  ctx.fillText(
    `Cuadrícula: ${cols} × ${rows} (${cols * rows} px) · ${palette.length} colores${physicalInfo}`,
    margin,
    margin + 38
  );

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, margin + 72);
  ctx.lineTo(w - margin, margin + 72);
  ctx.stroke();

  // Compute grid fit inside A4 body
  const rulerLeft = 44;
  const rulerTop = 34;
  const maxGridW = w - margin * 2 - rulerLeft;
  const maxGridH = h - margin * 2 - 110 - rulerTop;
  const cellSize = Math.floor(Math.min(maxGridW / cols, maxGridH / rows));
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;

  const originX = Math.round((w - (gridW + rulerLeft)) / 2) + rulerLeft;
  const originY = margin + 96 + rulerTop;
  const colLabels = getColumnLabels(cols);

  // Column & Row Rulers
  ctx.font = `600 ${Math.min(16, Math.max(10, Math.floor(cellSize * 0.36)))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#334155';

  for (let c = 0; c < cols; c++) {
    ctx.fillText(colLabels[c], originX + c * cellSize + cellSize / 2, originY - 16);
  }
  ctx.textAlign = 'right';
  for (let r = 0; r < rows; r++) {
    ctx.fillText(String(r + 1), originX - 12, originY + r * cellSize + cellSize / 2);
  }

  // Cells
  ctx.textAlign = 'center';
  const codeFontSize = Math.min(15, Math.max(9, Math.floor(cellSize * 0.34)));
  for (const cell of cells) {
    const x = originX + cell.col * cellSize;
    const y = originY + cell.row * cellSize;
    ctx.fillStyle = cell.hex;
    ctx.fillRect(x, y, cellSize, cellSize);

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);

    const pColor = palette.find((p) => p.id === cell.colorId);
    ctx.fillStyle = pColor ? getContrastTextColor(pColor.rgb) : '#FFFFFF';
    ctx.font = `600 ${codeFontSize}px "JetBrains Mono", monospace`;
    ctx.fillText(String(cell.colorIndex).padStart(2, '0'), x + cellSize / 2, y + cellSize / 2);
  }

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(originX, originY, gridW, gridH);

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '400 13px "DM Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    'Página 1 · Cuadrícula y códigos de color (ver detalle de conteos y ubicaciones en la página siguiente)',
    margin,
    h - 42
  );

  return {
    widthPx: w,
    heightPx: h,
    jpegBytes: dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.92)),
  };
}

function renderSummaryAndLocationsPages(
  stats: ColorUsageStat[],
  coordFormat: CoordFormat,
  cols: number,
  rows: number,
  pieceSize: number,
  pieceUnit: PhysicalUnit
): RenderedPdfPage[] {
  const pages: RenderedPdfPage[] = [];
  const margin = 64;
  const usesRatio = stats[0]?.color.usesRatio ?? true;
  const activeStats = stats.filter((s) => s.count > 0);

  let pageCtxObj = createA4Canvas();
  let pageNumber = 2;

  const drawPageHeader = (ctx: CanvasRenderingContext2D, w: number, continued: boolean) => {
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      continued
        ? 'Studio Mosaico Art — Conteos y Ubicaciones (cont.)'
        : 'Studio Mosaico Art — Conteos, Mezclas y Ubicaciones',
      margin,
      margin
    );

    ctx.fillStyle = '#475569';
    ctx.font = '500 14px "DM Sans", system-ui, sans-serif';
    const physicalText =
      pieceSize > 0
        ? ` · Mural: ${formatPhysicalSummaryText(cols, rows, pieceSize, pieceUnit)}`
        : '';
    ctx.fillText(
      `${cols}×${rows} (${cols * rows} px) · ${activeStats.length}/${stats.length} tonos${physicalText}`,
      margin,
      margin + 34
    );

    // Table header bar
    const headerY = margin + 68;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(margin, headerY, w - margin * 2, 34);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, headerY, w - margin * 2, 34);

    ctx.fillStyle = '#334155';
    ctx.font = '600 13px "DM Sans", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('Código', margin + 10, headerY + 17);
    ctx.fillText('Color / HEX', margin + 82, headerY + 17);
    ctx.fillText(usesRatio ? 'Proporción' : 'RGB', margin + 220, headerY + 17);
    ctx.fillText('Cant.', margin + 335, headerY + 17);
    ctx.fillText('Ubicaciones (Columna/Fila)', margin + 405, headerY + 17);

    return headerY + 42;
  };

  let cursorY = drawPageHeader(pageCtxObj.ctx, pageCtxObj.w, false);

  const finalizeCurrentPage = () => {
    const { canvas, ctx, w, h } = pageCtxObj;
    ctx.fillStyle = '#64748B';
    ctx.font = '400 13px "DM Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Página ${pageNumber} · Studio Mosaico Art — Lista de piezas y coordenadas de taller`,
      margin,
      h - 42
    );
    pages.push({
      widthPx: w,
      heightPx: h,
      jpegBytes: dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.92)),
    });
    pageNumber++;
  };

  for (const stat of stats) {
    const coordsList =
      coordFormat === 'alphaNum' ? stat.alphaCoords : stat.numericCoords;
    const coordString =
      coordsList.length > 0 ? coordsList.join(', ') : 'Sin uso en esta imagen';

    pageCtxObj.ctx.font = '400 12px "JetBrains Mono", monospace';
    const maxCoordWidth = pageCtxObj.w - margin - (margin + 405) - 10;
    const coordLines = wrapTextLines(pageCtxObj.ctx, coordString, maxCoordWidth);
    const rowHeight = Math.max(38, coordLines.length * 16 + 14);

    if (cursorY + rowHeight > pageCtxObj.h - 70) {
      finalizeCurrentPage();
      pageCtxObj = createA4Canvas();
      cursorY = drawPageHeader(pageCtxObj.ctx, pageCtxObj.w, true);
    }

    const ctx = pageCtxObj.ctx;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, cursorY + rowHeight);
    ctx.lineTo(pageCtxObj.w - margin, cursorY + rowHeight);
    ctx.stroke();

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(stat.color.id, margin + 10, cursorY + 10);

    // Swatch + HEX
    ctx.fillStyle = stat.color.hex;
    ctx.fillRect(margin + 82, cursorY + 8, 18, 18);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(margin + 82, cursorY + 8, 18, 18);
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillText(stat.color.hex, margin + 108, cursorY + 10);

    // Proportion or RGB
    ctx.fillStyle = '#0F172A';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    const metricVal = stat.color.usesRatio
      ? stat.color.ratioLabel
      : `(${stat.color.rgbLabel})`;
    ctx.fillText(metricVal, margin + 220, cursorY + 10);

    // Count
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText(`${stat.count} px`, margin + 335, cursorY + 10);

    // Wrapped coordinates
    ctx.fillStyle = stat.count === 0 ? '#94A3B8' : '#334155';
    ctx.font = '400 12px "JetBrains Mono", monospace';
    coordLines.forEach((line, idx) => {
      ctx.fillText(line, margin + 405, cursorY + 9 + idx * 16);
    });

    cursorY += rowHeight;
  }

  finalizeCurrentPage();
  return pages;
}

function buildPdfBlobFromJpegPages(pages: RenderedPdfPage[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;

  const pushText = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  pushText('%PDF-1.4\n');
  pushBytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Object numbering:
  // 1: Catalog, 2: Pages
  // For each page i: pageObj = 3 + i*3, contentObj = 4 + i*3, imgObj = 5 + i*3
  const offsets: number[] = [];
  const totalObjects = 2 + pages.length * 3;
  offsets.length = totalObjects + 1;

  const pageKidsRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');

  // 1: Catalog
  offsets[1] = byteOffset;
  pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets[2] = byteOffset;
  pushText(`2 0 obj\n<< /Type /Pages /Kids [${pageKidsRefs}] /Count ${pages.length} >>\nendobj\n`);

  // Pages + Contents + Images
  pages.forEach((page, i) => {
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imgObjId = 5 + i * 3;

    offsets[pageObjId] = byteOffset;
    pushText(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    const streamCmd = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    offsets[contentObjId] = byteOffset;
    pushText(
      `${contentObjId} 0 obj\n<< /Length ${streamCmd.length} >>\nstream\n${streamCmd}\nendstream\nendobj\n`
    );

    offsets[imgObjId] = byteOffset;
    pushText(
      `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\nstream\n`
    );
    pushBytes(page.jpegBytes);
    pushText('\nendstream\nendobj\n');
  });

  // Cross-reference table
  const xrefStart = byteOffset;
  pushText(`xref\n0 ${totalObjects + 1}\n`);
  pushText('0000000000 65535 f \n');
  for (let objId = 1; objId <= totalObjects; objId++) {
    const padded = String(offsets[objId]).padStart(10, '0');
    pushText(`${padded} 00000 n \n`);
  }

  pushText(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  );

  const blobParts: BlobPart[] = chunks.map((chunk) => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
    return copy;
  });

  return new Blob(blobParts, { type: 'application/pdf' });
}

export function exportMosaicPdf(
  cells: GridCell[],
  palette: PaletteColor[],
  stats: ColorUsageStat[],
  coordFormat: CoordFormat,
  cols: number,
  rows: number,
  pieceSize = 0,
  pieceUnit: PhysicalUnit = 'cm'
): void {
  const page1 = renderGridPage(cells, palette, cols, rows, pieceSize, pieceUnit);
  const summaryPages = renderSummaryAndLocationsPages(
    stats,
    coordFormat,
    cols,
    rows,
    pieceSize,
    pieceUnit
  );

  const blob = buildPdfBlobFromJpegPages([page1, ...summaryPages]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla-mosaico-${cols}x${rows}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
