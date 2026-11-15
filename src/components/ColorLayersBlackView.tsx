import React, { useEffect, useState } from 'react';
import { Download, Copy, Check, Layers } from 'lucide-react';
import {
  ColorUsageStat,
  CoordFormat,
  getColumnLabels,
  GridCell,
} from '../types/pixelGrid';
import { exportAllMasksSheetPng, exportSingleMaskPng } from '../utils/exporters';

interface ColorLayersBlackViewProps {
  cols: number;
  rows: number;
  cells: GridCell[];
  stats: ColorUsageStat[];
  coordFormat: CoordFormat;
}

export const ColorLayersBlackView: React.FC<ColorLayersBlackViewProps> = ({
  cols,
  rows,
  cells,
  stats,
  coordFormat,
}) => {
  const [selectedColorId, setSelectedColorId] = useState<string>(() => {
    const firstUsed = stats.find((s) => s.count > 0);
    return firstUsed ? firstUsed.color.id : stats[0]?.color.id ?? 'G01';
  });
  const [onlyUsed, setOnlyUsed] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!stats.some((s) => s.color.id === selectedColorId)) {
      const firstUsed = stats.find((s) => s.count > 0);
      setSelectedColorId(firstUsed ? firstUsed.color.id : stats[0]?.color.id ?? '');
    }
  }, [stats, selectedColorId]);

  const colLabels = getColumnLabels(cols);
  const totalCells = cols * rows;
  const visibleStats = onlyUsed ? stats.filter((s) => s.count > 0) : stats;
  const activeStat =
    stats.find((s) => s.color.id === selectedColorId) ?? visibleStats[0] ?? stats[0];

  const inspectorCellSize = cols <= 16 ? 26 : cols <= 22 ? 22 : 18;
  const inspectorGridTemplateCols = `26px repeat(${cols}, ${inspectorCellSize}px)`;

  const handleCopyCoords = async (stat: ColorUsageStat) => {
    const coords =
      coordFormat === 'alphaNum'
        ? stat.alphaCoords.join(', ')
        : stat.numericCoords.join(', ');
    const spec = stat.color.usesRatio
      ? `Proporción: ${stat.color.ratioLabel}`
      : `RGB: (${stat.color.rgbLabel})`;
    try {
      await navigator.clipboard.writeText(
        `${stat.color.id} (${stat.color.hex}) · ${spec} · ${stat.count} px (${stat.percentage.toFixed(1)}%):\n${coords}`
      );
      setCopiedId(stat.color.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failures
    }
  };

  const usesRatio = stats[0]?.color.usesRatio ?? true;

  return (
    <div className="space-y-6">
      {/* Header & Global Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Capas en Negro por Tono ({cols} × {rows} · {totalCells} píxeles totales)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cada tarjeta muestra las posiciones exactas de ese tono pintadas en negro (#000000) sobre blanco e indica su{' '}
            {usesRatio ? 'proporción de mezcla (100/0)' : 'valor RGB exacto'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUsed}
              onChange={(e) => setOnlyUsed(e.target.checked)}
              className="rounded border-slate-300 accent-blue-600"
            />
            Solo tonos usados ({stats.filter((s) => s.count > 0).length}/{stats.length})
          </label>

          <button
            type="button"
            onClick={() => exportAllMasksSheetPng(stats, cells, cols, rows)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            Descargar Todas las Capas (PNG)
          </button>
        </div>
      </section>

      {/* Enlarged Selected Layer Inspector */}
      {activeStat && (
        <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Large Black-on-White Stencil Grid */}
            <div className="overflow-x-auto mx-auto lg:mx-0">
              <div className="inline-block select-none">
                <div
                  className="grid gap-0 mb-1"
                  style={{ gridTemplateColumns: inspectorGridTemplateCols }}
                >
                  <div />
                  {colLabels.map((letter) => (
                    <div
                      key={letter}
                      className="text-center font-mono text-[10px] font-semibold text-slate-500"
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
                      style={{ gridTemplateColumns: inspectorGridTemplateCols }}
                    >
                      <div className="pr-1.5 text-right font-mono text-[10px] font-semibold text-slate-500 tabular-nums">
                        {row + 1}
                      </div>
                      {Array.from({ length: cols }, (_, col) => {
                        const cell = cells[row * cols + col];
                        const isMatch = cell?.colorId === activeStat.color.id;
                        return (
                          <div
                            key={`${row}-${col}`}
                            title={
                              isMatch
                                ? `${
                                    coordFormat === 'alphaNum'
                                      ? cell.alphaCoord
                                      : cell.numericCoord
                                  } · ${activeStat.color.id}`
                                : `${
                                    coordFormat === 'alphaNum'
                                      ? cell?.alphaCoord
                                      : cell?.numericCoord
                                  } (vacío)`
                            }
                            style={{ width: inspectorCellSize, height: inspectorCellSize }}
                            className={`border-[0.5px] border-slate-300 ${
                              isMatch ? 'bg-black' : 'bg-white'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Layer Details & Black-over-White Formula */}
            <div className="flex-1 min-w-0 space-y-4 w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded border border-slate-300 shrink-0"
                    style={{ backgroundColor: activeStat.color.hex }}
                  />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Capa {activeStat.color.id} · {activeStat.color.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                      <span>HEX: {activeStat.color.hex}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">
                        {activeStat.color.usesRatio
                          ? `Proporción: ${activeStat.color.ratioLabel}`
                          : `RGB: (${activeStat.color.rgbLabel})`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-blue-700">
                        {activeStat.count} de {totalCells} px ({activeStat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCoords(activeStat)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    {copiedId === activeStat.color.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copiar posiciones
                  </button>
                  <button
                    type="button"
                    onClick={() => exportSingleMaskPng(activeStat, cells, cols, rows)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PNG Capa {activeStat.color.id}
                  </button>
                </div>
              </div>

              {/* Ink / Black over White Density Bar (only for two-part ratio modes) */}
              {activeStat.color.usesRatio && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      Proporción de mezcla para lograr el tono
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {activeStat.color.ratioLabel}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white border border-slate-300 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-slate-950"
                      style={{ width: `${activeStat.color.blackInkPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-700">
                  Posiciones pintadas en negro dentro de la cuadrícula ({cols}×{rows}):
                </div>
                {activeStat.count === 0 ? (
                  <p className="text-xs text-slate-400">
                    Este tono no tiene píxeles asignados en la imagen actual.
                  </p>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-800 leading-relaxed max-h-[220px] overflow-y-auto tabular-nums">
                    {(coordFormat === 'alphaNum'
                      ? activeStat.alphaCoords
                      : activeStat.numericCoords
                    ).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid of Individual Black-Painted Cards (1 card per tone) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleStats.map((stat) => {
          const isSelected = activeStat?.color.id === stat.color.id;
          return (
            <div
              key={stat.color.id}
              onClick={() => setSelectedColorId(stat.color.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedColorId(stat.color.id);
                }
              }}
              className={`bg-white rounded-lg p-3.5 border transition-colors cursor-pointer flex flex-col gap-2.5 ${
                isSelected
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-5 h-5 rounded-xs border border-slate-300 shrink-0"
                    style={{ backgroundColor: stat.color.hex }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-slate-900 truncate">
                      {stat.color.id} · {stat.color.hex}
                    </div>
                    <div className="text-[11px] font-mono font-medium text-slate-700 tabular-nums">
                      {stat.color.usesRatio
                        ? `Proporción: ${stat.color.ratioLabel}`
                        : `RGB: (${stat.color.rgbLabel})`}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                  {stat.count} px
                </span>
              </div>

              {/* Dynamic Mini Grid with Matching Positions Painted Solid Black */}
              <div
                className="w-full border border-slate-900 bg-white grid"
                style={{
                  aspectRatio: `${cols} / ${rows}`,
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }}
              >
                {cells.map((cell) => {
                  const active = cell.colorId === stat.color.id;
                  return (
                    <div
                      key={cell.alphaCoord}
                      className={`border-[0.5px] border-slate-200/70 ${
                        active ? 'bg-black' : 'bg-white'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <span className="font-mono text-slate-500 tabular-nums">
                  Área: {stat.percentage.toFixed(1)}% ({stat.count}/{totalCells})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSingleMaskPng(stat, cells, cols, rows);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  <Download className="w-3 h-3" />
                  PNG
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
