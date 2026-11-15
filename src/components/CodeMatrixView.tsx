import React, { useMemo, useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import {
  ColorUsageStat,
  CoordFormat,
  getColumnLabels,
  GridCell,
} from '../types/pixelGrid';
import { getContrastTextColor } from '../utils/colorMath';

interface CodeMatrixViewProps {
  cols: number;
  rows: number;
  cells: GridCell[];
  stats: ColorUsageStat[];
  coordFormat: CoordFormat;
}

export const CodeMatrixView: React.FC<CodeMatrixViewProps> = ({
  cols,
  rows,
  cells,
  stats,
  coordFormat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColorId, setFilterColorId] = useState<string>('ALL');
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);
  const [copiedMatrix, setCopiedMatrix] = useState(false);
  const [copiedColorId, setCopiedColorId] = useState<string | null>(null);

  const colLabels = useMemo(() => getColumnLabels(cols), [cols]);
  const totalCells = cols * rows;
  const activeStats = useMemo(() => stats.filter((s) => s.count > 0), [stats]);
  const usesRatio = stats[0]?.color.usesRatio ?? true;

  const colorMap = useMemo(
    () => new Map(stats.map((s) => [s.color.id, s.color])),
    [stats]
  );

  // Maintain initial palette/color order (01..N) and unify locations per color
  const filteredStats = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return stats.filter((stat) => {
      if (filterColorId !== 'ALL' && stat.color.id !== filterColorId) return false;
      if (!q) return true;
      const coordList =
        coordFormat === 'alphaNum' ? stat.alphaCoords : stat.numericCoords;
      const matchesMeta =
        stat.color.id.toUpperCase().includes(q) ||
        stat.color.hex.toUpperCase().includes(q) ||
        stat.color.name.toUpperCase().includes(q) ||
        stat.color.rgbLabel.includes(q);
      const matchesCoord = coordList.some((c) => c.toUpperCase().includes(q));
      return matchesMeta || matchesCoord;
    });
  }, [stats, filterColorId, searchQuery, coordFormat]);

  const handleCopyMatrix = async () => {
    const matrixRows: string[] = [];
    matrixRows.push(`\t${colLabels.join('\t')}`);
    for (let r = 0; r < rows; r++) {
      const rowCodes: string[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        rowCodes.push(cell ? cell.colorId : '--');
      }
      matrixRows.push(`${r + 1}\t${rowCodes.join('\t')}`);
    }
    try {
      await navigator.clipboard.writeText(matrixRows.join('\n'));
      setCopiedMatrix(true);
      setTimeout(() => setCopiedMatrix(false), 1600);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleCopyColorCoords = async (stat: ColorUsageStat) => {
    const list =
      coordFormat === 'alphaNum'
        ? stat.alphaCoords.join(', ')
        : stat.numericCoords.join(', ');
    const spec = stat.color.usesRatio
      ? `Proporción ${stat.color.ratioLabel}`
      : `RGB (${stat.color.rgbLabel})`;
    try {
      await navigator.clipboard.writeText(
        `${stat.color.id} (${stat.color.name} ${stat.color.hex} · ${spec}) · ${stat.count} px:\n${list}`
      );
      setCopiedColorId(stat.color.id);
      setTimeout(() => setCopiedColorId(null), 1600);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Strip for Total Pixels per Case */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Mapa de Códigos y Píxeles Totales ({cols} × {rows} = {totalCells} px)
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="tabular-nums font-medium text-slate-700">
                Total en cuadrícula: {totalCells} píxeles
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {activeStats.length} de {stats.length} colores utilizados
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Coordenadas Columna/Fila: {colLabels[0]}/1–{colLabels[colLabels.length - 1]}/{rows}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyMatrix}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            {copiedMatrix ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedMatrix ? 'Matriz copiada' : 'Copiar matriz para Excel'}
          </button>
        </div>

        {/* Pixel Count Summary per Active Color */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {stats.map((s) => (
            <div
              key={s.color.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-[11px] font-mono tabular-nums whitespace-nowrap ${
                s.count === 0 ? 'opacity-45' : ''
              }`}
              title={`${s.color.id} · ${s.color.hex} · ${
                s.color.usesRatio
                  ? `Proporción ${s.color.ratioLabel}`
                  : `RGB (${s.color.rgbLabel})`
              }`}
            >
              <span
                className="w-3 h-3 rounded-xs border border-slate-400/60 shrink-0"
                style={{ backgroundColor: s.color.hex }}
              />
              <span className="font-semibold text-slate-800">{s.color.id}:</span>
              <span className="font-semibold text-slate-900">{s.count} px</span>
            </div>
          ))}
        </div>

        {/* Full Code Matrix */}
        <div className="overflow-x-auto pt-2">
          <table className="border-collapse font-mono text-[10px] tabular-nums mx-auto">
            <thead>
              <tr>
                <th className="p-1 text-right text-slate-400 font-medium">F\C</th>
                {colLabels.map((col) => (
                  <th
                    key={col}
                    className="p-1 text-center text-slate-600 font-semibold min-w-[24px]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, row) => (
                <tr key={row}>
                  <td className="pr-2 py-0.5 text-right text-slate-500 font-semibold">
                    {row + 1}
                  </td>
                  {Array.from({ length: cols }, (_, col) => {
                    const cell = cells[row * cols + col];
                    if (!cell) return null;
                    const pColor = colorMap.get(cell.colorId);
                    const textColor = pColor ? getContrastTextColor(pColor.rgb) : '#FFFFFF';
                    return (
                      <td
                        key={cell.alphaCoord}
                        title={`${
                          coordFormat === 'alphaNum' ? cell.alphaCoord : cell.numericCoord
                        } → ${cell.colorId} (${cell.hex}) · ${
                          pColor?.usesRatio
                            ? `Proporción ${pColor.ratioLabel}`
                            : `RGB (${pColor?.rgbLabel ?? ''})`
                        }`}
                        className="border border-slate-900/15 text-center py-1 px-0.5 font-semibold"
                        style={{
                          backgroundColor: cell.hex,
                          color: textColor,
                        }}
                      >
                        {String(cell.colorIndex).padStart(2, '0')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Unified Coordinate Index Ordered by Initial Palette Order */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Índice de Ubicaciones por Color (Orden Inicial · {totalCells} px)
            </h3>
            <p className="text-xs text-slate-500 tabular-nums">
              Mostrando {filteredStats.length} de {stats.length} tonos · Ubicaciones unificadas en formato Columna/Fila (ej. K/8)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ej. K/8, G05, #000..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 w-56"
              />
            </div>

            <select
              value={filterColorId}
              onChange={(e) => setFilterColorId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Filtrar por color"
            >
              <option value="ALL">Todos los tonos ({stats.length})</option>
              {stats.map((s) => (
                <option key={s.color.id} value={s.color.id}>
                  {s.color.id} — {s.color.name} ({s.count} px)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600 font-medium">
                <th className="py-2.5 px-3 whitespace-nowrap">Código</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Muestra / HEX</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nombre</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  {usesRatio ? 'Proporción' : 'RGB'}
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Píxeles</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Ubicaciones (Columna/Fila)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Copiar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.map((stat) => {
                const coords =
                  coordFormat === 'alphaNum' ? stat.alphaCoords : stat.numericCoords;
                const isExpanded = expandedColorId === stat.color.id;
                const q = searchQuery.trim().toUpperCase();
                const displayCoords = isExpanded || q ? coords : coords.slice(0, 16);

                return (
                  <tr key={stat.color.id} className="hover:bg-slate-50 align-top">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {stat.color.id}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 font-mono text-slate-700">
                        <span
                          className="w-3.5 h-3.5 rounded-xs border border-slate-300 inline-block shrink-0"
                          style={{ backgroundColor: stat.color.hex }}
                        />
                        {stat.color.hex}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {stat.color.name}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {stat.color.usesRatio
                        ? stat.color.ratioLabel
                        : `(${stat.color.rgbLabel})`}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {stat.count}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-700 min-w-[260px]">
                      {coords.length === 0 ? (
                        <span className="text-slate-400">Sin píxeles asignados</span>
                      ) : (
                        <div className="leading-relaxed">
                          {displayCoords.map((coord, idx) => {
                            const isMatch = q.length > 0 && coord.toUpperCase().includes(q);
                            return (
                              <React.Fragment key={coord}>
                                {idx > 0 && ', '}
                                <span
                                  className={
                                    isMatch
                                      ? 'bg-blue-100 text-blue-900 font-semibold px-1 rounded-xs'
                                      : ''
                                  }
                                >
                                  {coord}
                                </span>
                              </React.Fragment>
                            );
                          })}
                          {!q && coords.length > 16 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedColorId(isExpanded ? null : stat.color.id)
                              }
                              className="ml-2 text-blue-600 hover:underline font-sans font-medium"
                            >
                              {isExpanded ? 'Ver menos' : `+${coords.length - 16} más`}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {coords.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyColorCoords(stat)}
                          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Copiar ubicaciones de este color"
                        >
                          {copiedColorId === stat.color.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
