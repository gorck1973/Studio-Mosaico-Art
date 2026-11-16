import React, { useState } from 'react';
import {
  Eraser,
  Eye,
  Grid3X3,
  PaintBucket,
  Paintbrush,
  Pipette,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  ColorUsageStat,
  CoordFormat,
  getColumnLabels,
  GridCell,
  PaletteColor,
  PhysicalUnit,
} from '../types/pixelGrid';
import { getContrastTextColor } from '../utils/colorMath';
import { formatCm, getPhysicalMeasurements } from '../utils/exporters';

type GridEditTool = 'brush' | 'fill' | 'eyedropper' | 'eraser' | 'restore';

interface PixelCanvasProps {
  cols: number;
  rows: number;
  pieceSize: number;
  pieceUnit: PhysicalUnit;
  cells: GridCell[];
  palette: PaletteColor[];
  stats: ColorUsageStat[];
  coordFormat: CoordFormat;
  highlightedColorId: string | null;
  activeBrushColorId: string | null;
  hasManualEdits: boolean;
  canUndo: boolean;
  onBeginEditStroke: () => void;
  onPaintCell: (col: number, row: number, colorId: string) => void;
  onRestoreCell: (col: number, row: number) => void;
  onFloodFill: (col: number, row: number, colorId: string) => void;
  onUndoEdit: () => void;
  onSelectBrushColor: (colorId: string | null) => void;
  onAddCustomColor: (hex: string) => void;
  onDeletePaletteColor: (colorId: string) => void;
  onToggleHighlight: (colorId: string) => void;
  onResetManualEdits: () => void;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  cols,
  rows,
  pieceSize,
  pieceUnit,
  cells,
  palette,
  stats,
  coordFormat,
  highlightedColorId,
  activeBrushColorId,
  hasManualEdits,
  canUndo,
  onBeginEditStroke,
  onPaintCell,
  onRestoreCell,
  onFloodFill,
  onUndoEdit,
  onSelectBrushColor,
  onAddCustomColor,
  onDeletePaletteColor,
  onToggleHighlight,
  onResetManualEdits,
}) => {
  const [showGridLines, setShowGridLines] = useState(true);
  const [showCellCodes, setShowCellCodes] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<GridCell | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [activeTool, setActiveTool] = useState<GridEditTool>('brush');
  const [customColorHex, setCustomColorHex] = useState<string>('#2563EB');

  const colLabels = getColumnLabels(cols);
  const totalCells = cols * rows;
  const paletteMap = new Map(palette.map((c) => [c.id, c]));
  const statMap = new Map(stats.map((s) => [s.color.id, s]));
  const activeBrush = activeBrushColorId ? paletteMap.get(activeBrushColorId) ?? null : null;
  const lightestPaletteColor = palette.reduce<PaletteColor | undefined>(
    (best, c) => (!best || c.luminance > best.luminance ? c : best),
    undefined
  );
  const isEditorOpen = activeBrushColorId !== null;
  const physical = getPhysicalMeasurements(cols, rows, pieceSize, pieceUnit);

  // Dynamic cell pixel sizing so custom sizes from 4 to 40 columns fit crisply
  const cellPx = cols <= 16 ? 31 : cols <= 22 ? 26 : cols <= 27 ? 21 : cols <= 34 ? 17 : 14;
  const gridTemplateCols = `28px repeat(${cols}, ${cellPx}px)`;

  const applyHoverDragTool = (cell: GridCell) => {
    if (activeTool === 'brush' && activeBrushColorId) {
      onPaintCell(cell.col, cell.row, activeBrushColorId);
    } else if (activeTool === 'eraser' && lightestPaletteColor) {
      onPaintCell(cell.col, cell.row, lightestPaletteColor.id);
    } else if (activeTool === 'restore') {
      onRestoreCell(cell.col, cell.row);
    }
  };

  const handleCellPointerDown = (cell: GridCell) => {
    if (!isEditorOpen) return;

    if (activeTool === 'eyedropper') {
      onSelectBrushColor(cell.colorId);
      setActiveTool('brush');
      return;
    }

    if (activeTool === 'fill') {
      if (activeBrushColorId) {
        onFloodFill(cell.col, cell.row, activeBrushColorId);
      }
      return;
    }

    if (activeTool === 'brush' && activeBrushColorId) {
      onBeginEditStroke();
      setIsPointerDown(true);
      onPaintCell(cell.col, cell.row, activeBrushColorId);
    } else if (activeTool === 'eraser' && lightestPaletteColor) {
      onBeginEditStroke();
      setIsPointerDown(true);
      onPaintCell(cell.col, cell.row, lightestPaletteColor.id);
    } else if (activeTool === 'restore') {
      onBeginEditStroke();
      setIsPointerDown(true);
      onRestoreCell(cell.col, cell.row);
    }
  };

  const hoveredStat = hoveredCell ? statMap.get(hoveredCell.colorId) : undefined;
  const hoveredPalette = hoveredCell ? paletteMap.get(hoveredCell.colorId) : undefined;

  return (
    <section
      className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 flex flex-col gap-4"
      onMouseUp={() => setIsPointerDown(false)}
      onMouseLeave={() => {
        setIsPointerDown(false);
        setHoveredCell(null);
      }}
    >
      {/* Pixel View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Cuadrícula de Píxeles ({cols} × {rows})
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="tabular-nums">{cols} col × {rows} filas</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium text-slate-700">
              {totalCells} píxeles totales
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{palette.length} colores</span>
          </div>
          {pieceSize > 0 && (
            <p className="text-xs text-slate-600 mt-1 tabular-nums">
              Medida física estimada:{' '}
              <span className="font-mono font-semibold text-slate-900">
                {formatCm(physical.widthCm)} cm × {formatCm(physical.heightCm)} cm
              </span>
              {pieceUnit === 'in' && (
                <span className="text-slate-500">
                  {' '}
                  ({formatCm(physical.widthIn)} × {formatCm(physical.heightIn)} pulg)
                </span>
              )}{' '}
              · pieza de{' '}
              <span className="font-mono font-medium text-slate-800">
                {formatCm(physical.pieceCm)}×{formatCm(physical.pieceCm)} cm
              </span>
              {pieceUnit === 'in' && (
                <span className="text-slate-500">
                  {' '}
                  ({formatCm(physical.pieceIn)}×{formatCm(physical.pieceIn)} pulg)
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGridLines((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
              showGridLines
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
            Rejilla
          </button>

          <button
            type="button"
            onClick={() => setShowCellCodes((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
              showCellCodes
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            Códigos (01–{palette.length})
          </button>

          {isEditorOpen ? (
            <button
              type="button"
              onClick={() => {
                onSelectBrushColor(null);
                setActiveTool('brush');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              <span
                className="w-3 h-3 rounded-xs border border-slate-400 shrink-0"
                style={{ backgroundColor: activeBrush?.hex }}
              />
              Editando: {activeBrush?.id} (Cerrar)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTool('brush');
                onSelectBrushColor(palette[0]?.id ?? null);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Paintbrush className="w-3.5 h-3.5 shrink-0" />
              Editar cuadrícula
            </button>
          )}

          {hasManualEdits && (
            <button
              type="button"
              onClick={onResetManualEdits}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Revertir todo
            </button>
          )}
        </div>
      </div>

      {/* Simple Grid Editor Bar */}
      {isEditorOpen && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTool('brush')}
                title="Pintar celdas con el color activo (clic o arrastrar)"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  activeTool === 'brush'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Paintbrush className="w-3 h-3 shrink-0" />
                Pintar
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('fill')}
                title="Rellenar área conectada del mismo color (1 clic)"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  activeTool === 'fill'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <PaintBucket className="w-3 h-3 shrink-0" />
                Relleno
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('eyedropper')}
                title="Cuentagotas: haz clic en cualquier cuadro para copiar su tono"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  activeTool === 'eyedropper'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Pipette className="w-3 h-3 shrink-0" />
                Cuentagotas
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('eraser')}
                title={`Borrar píxeles pintando con el tono de fondo (${lightestPaletteColor?.id ?? 'más claro'})`}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  activeTool === 'eraser'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Eraser className="w-3 h-3 shrink-0" />
                Borrar
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('restore')}
                title="Restaurar el cuadro tocado a su color original generado de la imagen"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  activeTool === 'restore'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                Restaurar
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTool === 'eyedropper' && (
                <span className="text-[11px] font-medium text-blue-700">
                  Haz clic en un cuadro para tomar su color
                </span>
              )}
              {activeBrush && (
                <div className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                    <span
                      className="w-3 h-3 rounded-xs border border-slate-300 shrink-0"
                      style={{ backgroundColor: activeBrush.hex }}
                    />
                    <span className="font-semibold text-slate-900">{activeBrush.id}</span>
                    <span className="text-slate-400">·</span>
                    <span>{activeBrush.hex}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onDeletePaletteColor(activeBrush.id)}
                    disabled={palette.length <= 2}
                    title={
                      palette.length <= 2
                        ? 'Se requieren al menos 2 tonos en la paleta'
                        : `Eliminar ${activeBrush.id} de la paleta (sus píxeles pasarán al tono más parecido)`
                    }
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                      palette.length > 2
                        ? 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    Quitar tono
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onUndoEdit}
                disabled={!canUndo}
                title="Deshacer último cambio en la cuadrícula"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                  canUndo
                    ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3 h-3 shrink-0" />
                Deshacer
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-600 shrink-0">Color:</span>
            <div className="flex flex-wrap items-center gap-1">
              {palette.map((color) => {
                const selected = color.id === activeBrushColorId;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => {
                      onSelectBrushColor(color.id);
                      if (activeTool === 'eyedropper' || activeTool === 'eraser' || activeTool === 'restore') {
                        setActiveTool('brush');
                      }
                    }}
                    title={`${color.id} · ${color.name} (${color.hex})`}
                    className={`w-6 h-6 rounded-xs flex items-center justify-center text-[9px] font-mono font-semibold border transition-transform ${
                      selected
                        ? 'ring-2 ring-blue-600 ring-offset-1 scale-110 border-slate-900'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      color: getContrastTextColor(color.rgb),
                    }}
                  >
                    {color.index}
                  </button>
                );
              })}

              <div className="inline-flex items-center gap-1 pl-1 ml-0.5 border-l border-slate-300 shrink-0">
                <input
                  type="color"
                  value={customColorHex}
                  onChange={(e) => setCustomColorHex(e.target.value.toUpperCase())}
                  title="Elegir color personalizado"
                  aria-label="Elegir color personalizado"
                  className="w-6 h-6 p-0 border border-slate-300 rounded-xs bg-white cursor-pointer shrink-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    onAddCustomColor(customColorHex);
                    setActiveTool('brush');
                  }}
                  title={`Agregar ${customColorHex} a la paleta y pintar con él`}
                  className="inline-flex items-center gap-0.5 px-1.5 h-6 rounded-xs border border-slate-300 bg-white hover:bg-slate-100 text-[10px] font-medium text-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3 shrink-0" />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dynamic Pixel Matrix with Rulers */}
      <div className="w-full overflow-x-auto flex justify-center py-1">
        <div className="inline-block select-none">
          <div
            className="grid gap-0 items-center mb-1"
            style={{ gridTemplateColumns: gridTemplateCols }}
          >
            <div />
            {colLabels.map((letter) => (
              <div
                key={letter}
                className="text-center font-mono text-[10px] font-medium text-slate-500 tabular-nums"
              >
                {letter}
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            {Array.from({ length: rows }, (_, row) => (
              <div
                key={row}
                className="grid gap-0 items-center"
                style={{ gridTemplateColumns: gridTemplateCols }}
              >
                <div className="pr-1.5 text-right font-mono text-[10px] font-medium text-slate-500 tabular-nums">
                  {row + 1}
                </div>

                {Array.from({ length: cols }, (_, col) => {
                  const cell = cells[row * cols + col];
                  if (!cell) return null;

                  const paletteColor = paletteMap.get(cell.colorId);
                  const isHighlighted =
                    highlightedColorId !== null && cell.colorId === highlightedColorId;
                  const isDimmed =
                    highlightedColorId !== null && cell.colorId !== highlightedColorId;

                  const textColor = paletteColor
                    ? getContrastTextColor(paletteColor.rgb)
                    : '#FFFFFF';

                  return (
                    <button
                      key={cell.alphaCoord}
                      type="button"
                      onMouseDown={() => handleCellPointerDown(cell)}
                      onMouseEnter={() => {
                        setHoveredCell(cell);
                        if (isPointerDown && isEditorOpen) {
                          applyHoverDragTool(cell);
                        }
                      }}
                      className={`aspect-square w-full flex items-center justify-center font-mono font-semibold leading-none transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        cols > 24 ? 'text-[8px]' : 'text-[10px]'
                      } ${
                        isEditorOpen
                          ? 'cursor-crosshair hover:ring-2 hover:ring-inset hover:ring-blue-500 hover:z-10'
                          : 'cursor-default'
                      } ${
                        showGridLines ? 'border-[0.5px] border-slate-900/20' : ''
                      } ${isHighlighted ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}`}
                      style={{
                        backgroundColor: cell.hex,
                        color: textColor,
                        opacity: isDimmed ? 0.16 : 1,
                      }}
                      aria-label={`Celda ${
                        coordFormat === 'alphaNum' ? cell.alphaCoord : cell.numericCoord
                      }, ${cell.colorId} ${cell.hex}`}
                    >
                      {showCellCodes ? String(cell.colorIndex).padStart(2, '0') : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Cell Inspector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs min-h-[36px]">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Ubicación:{' '}
              {coordFormat === 'alphaNum' ? hoveredCell.alphaCoord : hoveredCell.numericCoord}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-slate-700">
              <span
                className="w-3.5 h-3.5 rounded-xs border border-slate-300 inline-block"
                style={{ backgroundColor: hoveredCell.hex }}
              />
              {hoveredCell.colorId} ({hoveredCell.hex})
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono text-slate-700 tabular-nums">
              {hoveredPalette?.usesRatio ?? true
                ? `Proporción: ${hoveredPalette?.ratioLabel ?? '0/100'}`
                : `RGB: (${hoveredPalette?.rgbLabel})`}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono font-semibold text-blue-700 tabular-nums">
              Total: {hoveredStat?.count ?? 0} px ({hoveredStat?.percentage.toFixed(1)}%)
            </span>
          </div>
        ) : (
          <span className="text-slate-500">
            Pasa el cursor sobre un cuadro o haz clic en un tono abajo para resaltar sus {totalCells} posiciones posibles.
          </span>
        )}
      </div>

      {/* Direct Per-Color Pixel Count Strip */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">
            Cantidad de píxeles por tono ({totalCells} px totales · clic para resaltar)
          </span>
          {highlightedColorId && (
            <button
              type="button"
              onClick={() => onToggleHighlight(highlightedColorId)}
              className="text-blue-600 hover:underline font-medium"
            >
              Mostrar todos
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-2">
          {stats.map((s) => {
            const isHighlighted = highlightedColorId === s.color.id;
            return (
              <button
                key={s.color.id}
                type="button"
                onClick={() => onToggleHighlight(s.color.id)}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-left transition-colors whitespace-nowrap ${
                  isHighlighted
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                } ${s.count === 0 ? 'opacity-45' : ''}`}
                title={`${s.color.id} (${s.color.hex}) · ${
                  s.color.usesRatio
                    ? `Proporción ${s.color.ratioLabel}`
                    : `RGB (${s.color.rgbLabel})`
                } · ${s.count} px`}
              >
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <span
                    className="w-3.5 h-3.5 rounded-xs border border-slate-400/60 shrink-0"
                    style={{ backgroundColor: s.color.hex }}
                  />
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {s.color.id}
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                  {s.count} px
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
