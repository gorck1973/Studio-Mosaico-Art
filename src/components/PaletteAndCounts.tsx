import React, { useState } from 'react';
import { Copy, Check, LocateFixed } from 'lucide-react';
import { ColorUsageStat, CoordFormat } from '../types/pixelGrid';
import { getContrastTextColor } from '../utils/colorMath';

interface PaletteAndCountsProps {
  totalCells: number;
  stats: ColorUsageStat[];
  coordFormat: CoordFormat;
  highlightedColorId: string | null;
  onToggleHighlight: (colorId: string) => void;
  onUpdatePaletteColorHex: (colorId: string, newHex: string) => void;
  onSelectBrushColor: (colorId: string) => void;
}

export const PaletteAndCounts: React.FC<PaletteAndCountsProps> = ({
  totalCells,
  stats,
  coordFormat,
  highlightedColorId,
  onToggleHighlight,
  onUpdatePaletteColorHex,
  onSelectBrushColor,
}) => {
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUnused, setShowUnused] = useState(true);

  const activeColorsCount = stats.filter((s) => s.count > 0).length;
  const totalCount = stats.reduce((acc, s) => acc + s.count, 0);
  const visibleStats = showUnused ? stats : stats.filter((s) => s.count > 0);
  const usesRatio = stats[0]?.color.usesRatio ?? true;

  const handleCopyCoords = async (stat: ColorUsageStat) => {
    const list =
      coordFormat === 'alphaNum'
        ? stat.alphaCoords.join(', ')
        : stat.numericCoords.join(', ');
    const spec = stat.color.usesRatio
      ? `Proporción ${stat.color.ratioLabel}`
      : `RGB (${stat.color.rgbLabel})`;
    const text = `${stat.color.id} (${stat.color.name} ${stat.color.hex} · ${spec}) · ${stat.count} px:\n${list}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(stat.color.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Clipboard fallback silent
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Detalle de los {stats.length} Colores, {usesRatio ? 'Proporción (100/0)' : 'Valores RGB'} y Ubicaciones
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="tabular-nums">{activeColorsCount} tonos utilizados</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {totalCount} / {totalCells} píxeles asignados
            </span>
            <span aria-hidden="true">·</span>
            <span>Coordenadas Columna/Fila (ej. A/1)</span>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnused}
            onChange={(e) => setShowUnused(e.target.checked)}
            className="rounded border-slate-300 accent-blue-600"
          />
          Mostrar tonos con 0 píxeles
        </label>
      </div>

      {/* Swatch Matrix Strip */}
      <div className="flex flex-wrap gap-1.5">
        {stats.map((stat) => {
          const isHighlighted = highlightedColorId === stat.color.id;
          return (
            <button
              key={stat.color.id}
              type="button"
              onClick={() => onToggleHighlight(stat.color.id)}
              title={`${stat.color.id} · ${stat.color.name} · ${
                stat.color.usesRatio
                  ? `Proporción ${stat.color.ratioLabel}`
                  : `RGB (${stat.color.rgbLabel})`
              } · ${stat.count} px`}
              className={`w-8 h-8 rounded-xs border flex flex-col items-center justify-center font-mono text-[10px] font-semibold transition-transform ${
                isHighlighted
                  ? 'ring-2 ring-blue-600 ring-offset-1 border-slate-900 scale-105'
                  : 'border-slate-300 hover:scale-105'
              } ${stat.count === 0 ? 'opacity-40' : ''}`}
              style={{
                backgroundColor: stat.color.hex,
                color: getContrastTextColor(stat.color.rgb),
              }}
            >
              {stat.color.index}
            </button>
          );
        })}
      </div>

      {/* Tabular Breakdown */}
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <th className="py-2.5 px-3 whitespace-nowrap">Código</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Muestra / HEX</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Nombre</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                {usesRatio ? 'Proporción' : 'RGB'}
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Píxeles</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">% Área</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Ubicaciones en Cuadrícula</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleStats.map((stat) => {
              const isHighlighted = highlightedColorId === stat.color.id;
              const isExpanded = expandedColorId === stat.color.id;
              const coords =
                coordFormat === 'alphaNum' ? stat.alphaCoords : stat.numericCoords;
              const previewCoords = isExpanded ? coords : coords.slice(0, 8);

              return (
                <tr
                  key={stat.color.id}
                  className={`transition-colors ${
                    isHighlighted ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {stat.color.id}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <label
                        className="relative w-5 h-5 rounded-xs border border-slate-300 shrink-0 cursor-pointer overflow-hidden"
                        style={{ backgroundColor: stat.color.hex }}
                        title="Haz clic para personalizar este color"
                      >
                        <input
                          type="color"
                          value={stat.color.hex}
                          onChange={(e) =>
                            onUpdatePaletteColorHex(stat.color.id, e.target.value)
                          }
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          aria-label={`Cambiar color ${stat.color.id}`}
                        />
                      </label>
                      <span className="font-mono text-slate-700 tabular-nums">
                        {stat.color.hex}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                    {stat.color.name}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-800 tabular-nums whitespace-nowrap">
                    {stat.color.usesRatio
                      ? stat.color.ratioLabel
                      : `(${stat.color.rgbLabel})`}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {stat.count}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {stat.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 max-w-[340px]">
                    {coords.length === 0 ? (
                      <span className="text-slate-400">Sin uso en esta imagen</span>
                    ) : (
                      <div className="leading-relaxed">
                        <span>{previewCoords.join(', ')}</span>
                        {coords.length > 8 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedColorId(isExpanded ? null : stat.color.id)
                            }
                            className="ml-1.5 text-blue-600 hover:underline font-sans font-medium"
                          >
                            {isExpanded ? 'Ver menos' : `+${coords.length - 8} más`}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleHighlight(stat.color.id)}
                        className={`p-1.5 rounded border transition-colors ${
                          isHighlighted
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Resaltar ubicaciones en la cuadrícula"
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectBrushColor(stat.color.id)}
                        className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Pintar celdas manualmente con este color"
                      >
                        Pintar
                      </button>
                      {coords.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyCoords(stat)}
                          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Copiar lista de ubicaciones"
                        >
                          {copiedId === stat.color.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
