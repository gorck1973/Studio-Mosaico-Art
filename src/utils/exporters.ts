import {
  colToLetters,
  ColorUsageStat,
  CoordFormat,
  getColumnLabels,
  GridCell,
  PaletteColor,
} from '../types/pixelGrid';
import { getContrastTextColor } from './colorMath';

export function exportMosaicCsv(
  cells: GridCell[],
  stats: ColorUsageStat[],
  coordFormat: CoordFormat,
  cols: number,
  rows: number
): void {
  const total = cols * rows;
  const usesRatio = stats[0]?.color.usesRatio ?? true;
  const lines: string[] = [];
  lines.push(`RESUMEN POR COLOR (${cols}x${rows} = ${total} PIXELES)`);
  lines.push(
    usesRatio
      ? 'Codigo,Nombre,HEX,Proporcion,Cantidad_Pixeles,Porcentaje_Area,Ubicaciones'
      : 'Codigo,Nombre,HEX,RGB,Cantidad_Pixeles,Porcentaje_Area,Ubicaciones'
  );

  for (const s of stats) {
    const coords =
      coordFormat === 'alphaNum'
        ? s.alphaCoords.join(' ')
        : s.numericCoords.join(' ');
    const metricVal = usesRatio ? s.color.ratioLabel : `"rgb(${s.color.rgbLabel})"`;
    lines.push(
      `${s.color.id},"${s.color.name}",${s.color.hex},${metricVal},${s.count},${s.percentage}%,"${coords}"`
    );
  }

  lines.push('');
  lines.push('DETALLE DE CELDAS');
  lines.push(
    usesRatio
      ? 'Ubicacion,Columna,Fila,Codigo_Color,Nombre,HEX,Proporcion'
      : 'Ubicacion,Columna,Fila,Codigo_Color,Nombre,HEX,RGB'
  );

  for (const cell of cells) {
    const color = stats.find((s) => s.color.id === cell.colorId)?.color;
    const coord = coordFormat === 'alphaNum' ? cell.alphaCoord : cell.numericCoord;
    const metricVal = usesRatio
      ? (color?.ratioLabel ?? '0/100')
      : `"rgb(${color?.rgbLabel ?? '0, 0, 0'})"`;
    lines.push(
      `${coord},${colToLetters(cell.col)},${cell.row + 1},${cell.colorId},"${color?.name ?? ''}",${cell.hex},${metricVal}`
    );
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studio-mosaico-${cols}x${rows}-${stats.length}-colores.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMosaicPng(
  cells: GridCell[],
  palette: PaletteColor[],
  stats: ColorUsageStat[],
  showCodes: boolean,
  cols: number,
  rows: number
): void {
  const cellSize = cols > 26 ? 34 : 42;
  const rulerLeft = 48;
  const rulerTop = 44;
  const padding = 36;
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const legendCols = Math.min(4, Math.max(2, Math.floor(gridWidth / 200)));
  const legendRows = Math.ceil(palette.length / legendCols);
  const legendHeight = 76 + legendRows * 42;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(640, padding * 2 + rulerLeft + gridWidth);
  canvas.height = padding * 2 + rulerTop + gridHeight + legendHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 19px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `Studio Mosaico Art · ${cols}×${rows} (${palette.length} colores · ${cols * rows} px)`,
    padding,
    padding + 12
  );

  const originX = padding + rulerLeft;
  const originY = padding + rulerTop + 18;
  const colLabels = getColumnLabels(cols);

  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c++) {
    ctx.fillStyle = '#475569';
    ctx.fillText(colLabels[c], originX + c * cellSize + cellSize / 2, originY - 16);
  }

  ctx.textAlign = 'right';
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = '#475569';
    ctx.fillText(String(r + 1), originX - 12, originY + r * cellSize + cellSize / 2);
  }

  ctx.textAlign = 'center';
  for (const cell of cells) {
    const x = originX + cell.col * cellSize;
    const y = originY + cell.row * cellSize;
    ctx.fillStyle = cell.hex;
    ctx.fillRect(x, y, cellSize, cellSize);

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);

    if (showCodes) {
      const pColor = palette.find((p) => p.id === cell.colorId);
      ctx.fillStyle = pColor ? getContrastTextColor(pColor.rgb) : '#FFFFFF';
      ctx.font = `600 ${cols > 26 ? 10 : 12}px "JetBrains Mono", monospace`;
      ctx.fillText(String(cell.colorIndex).padStart(2, '0'), x + cellSize / 2, y + cellSize / 2);
    }
  }

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.strokeRect(originX, originY, gridWidth, gridHeight);

  const legendStartY = originY + gridHeight + 34;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = '600 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Cantidad de píxeles y proporción (ej. 100/0):', padding, legendStartY);

  const itemW = (canvas.width - padding * 2) / legendCols;
  stats.forEach((stat, idx) => {
    const lc = idx % legendCols;
    const lr = Math.floor(idx / legendCols);
    const lx = padding + lc * itemW;
    const ly = legendStartY + 24 + lr * 42;

    ctx.fillStyle = stat.color.hex;
    ctx.fillRect(lx, ly, 24, 24);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, 24, 24);

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${stat.color.id}: ${stat.count} px`, lx + 32, ly + 8);
    ctx.fillStyle = '#64748B';
    ctx.font = '400 11px "JetBrains Mono", monospace';
    const subMetric = stat.color.usesRatio
      ? stat.color.ratioLabel
      : `rgb(${stat.color.rgbLabel})`;
    ctx.fillText(`${stat.color.hex} · ${subMetric}`, lx + 32, ly + 22);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-mosaico-${cols}x${rows}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function exportSingleMaskPng(
  stat: ColorUsageStat,
  cells: GridCell[],
  cols: number,
  rows: number
): void {
  const cellSize = cols > 26 ? 32 : 40;
  const rulerLeft = 44;
  const rulerTop = 44;
  const padding = 32;
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(540, padding * 2 + rulerLeft + gridWidth);
  canvas.height = padding * 2 + rulerTop + gridHeight + 48;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 17px "Plus Jakarta Sans", system-ui, sans-serif';
  const maskMetric = stat.color.usesRatio
    ? `Proporción ${stat.color.ratioLabel}`
    : `RGB (${stat.color.rgbLabel})`;
  ctx.fillText(
    `Capa ${stat.color.id} (${stat.color.hex}) · ${maskMetric} · ${stat.count} px`,
    padding,
    padding + 10
  );

  const originX = padding + rulerLeft;
  const originY = padding + rulerTop + 18;
  const colLabels = getColumnLabels(cols);

  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c++) {
    ctx.fillStyle = '#475569';
    ctx.fillText(colLabels[c], originX + c * cellSize + cellSize / 2, originY - 14);
  }
  ctx.textAlign = 'right';
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = '#475569';
    ctx.fillText(String(r + 1), originX - 10, originY + r * cellSize + cellSize / 2);
  }

  for (const cell of cells) {
    const x = originX + cell.col * cellSize;
    const y = originY + cell.row * cellSize;
    const active = cell.colorId === stat.color.id;
    ctx.fillStyle = active ? '#000000' : '#FFFFFF';
    ctx.fillRect(x, y, cellSize, cellSize);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(originX, originY, gridWidth, gridHeight);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capa-${stat.color.id}-negro-${cols}x${rows}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function exportAllMasksSheetPng(
  stats: ColorUsageStat[],
  cells: GridCell[],
  cols: number,
  rows: number
): void {
  const activeStats = stats.filter((s) => s.count > 0);
  if (activeStats.length === 0) return;

  const colsPerRow = 4;
  const rowsCount = Math.ceil(activeStats.length / colsPerRow);
  const miniCell = Math.max(9, Math.min(16, Math.floor(280 / cols)));
  const gridW = cols * miniCell;
  const gridH = rows * miniCell;
  const cardPad = 18;
  const cardW = Math.max(260, gridW + cardPad * 2);
  const cardH = gridH + 86;
  const gap = 24;
  const outerPad = 36;

  const canvas = document.createElement('canvas');
  canvas.width = outerPad * 2 + colsPerRow * cardW + (colsPerRow - 1) * gap;
  canvas.height = outerPad * 2 + 54 + rowsCount * cardH + (rowsCount - 1) * gap;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `Studio Mosaico Art · Capas en Negro (${cols}×${rows} · ${activeStats.length} tonos activos)`,
    outerPad,
    outerPad + 16
  );

  activeStats.forEach((stat, idx) => {
    const colIdx = idx % colsPerRow;
    const rowIdx = Math.floor(idx / colsPerRow);
    const cx = outerPad + colIdx * (cardW + gap);
    const cy = outerPad + 54 + rowIdx * (cardH + gap);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = stat.color.hex;
    ctx.fillRect(cx + cardPad, cy + 14, 24, 24);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(cx + cardPad, cy + 14, 24, 24);

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${stat.color.id} (${stat.color.hex}) · ${stat.count} px`, cx + cardPad + 32, cy + 24);
    ctx.fillStyle = '#475569';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    const cardMetric = stat.color.usesRatio
      ? `Proporción ${stat.color.ratioLabel}`
      : `RGB (${stat.color.rgbLabel})`;
    ctx.fillText(
      `${cardMetric} · Área: ${stat.percentage.toFixed(1)}%`,
      cx + cardPad + 32,
      cy + 40
    );

    const gx = cx + (cardW - gridW) / 2;
    const gy = cy + 62;
    for (const cell of cells) {
      const x = gx + cell.col * miniCell;
      const y = gy + cell.row * miniCell;
      ctx.fillStyle = cell.colorId === stat.color.id ? '#000000' : '#FFFFFF';
      ctx.fillRect(x, y, miniCell, miniCell);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, miniCell, miniCell);
    }

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gx, gy, gridW, gridH);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capas-negras-${cols}x${rows}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function buildTextGuide(
  stats: ColorUsageStat[],
  coordFormat: CoordFormat,
  cols: number,
  rows: number
): string {
  const used = stats.filter((s) => s.count > 0);
  const header = `STUDIO MOSAICO ART — GUÍA ${cols}×${rows} (${cols * rows} PÍXELES · ${stats.length} COLORES)\n`;
  const rowsText = used.map((s) => {
    const coords =
      coordFormat === 'alphaNum'
        ? s.alphaCoords.join(', ')
        : s.numericCoords.join(', ');
    const metricText = s.color.usesRatio
      ? `Proporción: ${s.color.ratioLabel}`
      : `RGB: (${s.color.rgbLabel})`;
    return `${s.color.id} | ${s.color.name} (${s.color.hex}) · ${metricText} — ${s.count} px (${s.percentage}%)\nUbicaciones: ${coords}`;
  });
  return `${header}\n${rowsText.join('\n\n')}`;
}
