import React, { useEffect, useRef, useState } from 'react';
import { Columns2, SplitSquareHorizontal, Image as ImageIcon } from 'lucide-react';
import { AdjustmentSettings, ComparisonMode } from '../types/pixelGrid';
import {
  renderHighResAdjustedPreview,
  renderOriginalPreview,
} from '../utils/imageProcessor';

interface ImageComparisonPanelProps {
  sourceElement: HTMLImageElement | HTMLCanvasElement;
  settings: AdjustmentSettings;
  uploadedFileName: string | null;
}

export const ImageComparisonPanel: React.FC<ImageComparisonPanelProps> = ({
  sourceElement,
  settings,
  uploadedFileName,
}) => {
  const [mode, setMode] = useState<ComparisonMode>('development');
  const [splitPercent, setSplitPercent] = useState(50);

  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const devCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const canvasW = 360;
  const canvasH = Math.max(180, Math.round((canvasW * settings.gridRows) / settings.gridCols));

  useEffect(() => {
    if (devCanvasRef.current) {
      renderHighResAdjustedPreview(sourceElement, settings, devCanvasRef.current);
    }
    if (origCanvasRef.current) {
      renderOriginalPreview(sourceElement, settings, origCanvasRef.current);
    }
  }, [sourceElement, settings, mode, canvasH]);

  const handleSplitPointer = (clientX: number) => {
    const el = splitContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSplitPercent(Math.round(pct));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 lg:p-5 flex flex-col gap-3">
      {/* Header + Comparison Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Imagen Principal · Inicio y Desarrollo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {uploadedFileName ? uploadedFileName : 'Estudio de prueba'} · Proporción {settings.gridCols}:{settings.gridRows}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => setMode('development')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'development'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Ver imagen en desarrollo con ajustes aplicados"
          >
            <ImageIcon className="w-3 h-3 shrink-0" />
            Desarrollo
          </button>
          <button
            type="button"
            onClick={() => setMode('side-by-side')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'side-by-side'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Confrontar imagen inicial vs desarrollo lado a lado"
          >
            <Columns2 className="w-3 h-3 shrink-0" />
            Lado a lado
          </button>
          <button
            type="button"
            onClick={() => setMode('split-slider')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'split-slider'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Cortina interactiva Inicio / Desarrollo"
          >
            <SplitSquareHorizontal className="w-3 h-3 shrink-0" />
            Cortina
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 flex flex-col justify-center bg-slate-100 border border-slate-200 rounded-md p-3">
        {mode === 'development' && (
          <div className="flex justify-center">
            <canvas
              ref={devCanvasRef}
              width={canvasW}
              height={canvasH}
              className="w-full max-w-[380px] object-contain bg-white border border-slate-300 shadow-xs"
              style={{ aspectRatio: `${settings.gridCols} / ${settings.gridRows}` }}
              aria-label="Imagen en desarrollo con ajustes aplicados"
            />
          </div>
        )}

        {mode === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-600 text-center">
                Inicio (Original)
              </div>
              <canvas
                ref={origCanvasRef}
                width={canvasW}
                height={canvasH}
                className="w-full bg-white border border-slate-300 shadow-xs"
                style={{ aspectRatio: `${settings.gridCols} / ${settings.gridRows}` }}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-900 text-center">
                Desarrollo (Ajustado)
              </div>
              <canvas
                ref={devCanvasRef}
                width={canvasW}
                height={canvasH}
                className="w-full bg-white border border-slate-300 shadow-xs"
                style={{ aspectRatio: `${settings.gridCols} / ${settings.gridRows}` }}
              />
            </div>
          </div>
        )}

        {mode === 'split-slider' && (
          <div className="space-y-2 flex flex-col items-center">
            <div
              ref={splitContainerRef}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleSplitPointer(e.clientX);
              }}
              onClick={(e) => handleSplitPointer(e.clientX)}
              onTouchMove={(e) => {
                if (e.touches[0]) handleSplitPointer(e.touches[0].clientX);
              }}
              className="relative w-full max-w-[380px] select-none cursor-ew-resize overflow-hidden border border-slate-300 bg-white shadow-xs"
              style={{ aspectRatio: `${settings.gridCols} / ${settings.gridRows}` }}
            >
              {/* Base: Development */}
              <canvas
                ref={devCanvasRef}
                width={canvasW}
                height={canvasH}
                className="w-full h-full block"
              />
              {/* Overlay clipped: Original */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
              >
                <canvas
                  ref={origCanvasRef}
                  width={canvasW}
                  height={canvasH}
                  className="w-full h-full block"
                />
              </div>
              {/* Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600 pointer-events-none"
                style={{ left: `${splitPercent}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-mono flex items-center justify-center shadow-xs">
                  ↔
                </div>
              </div>
              <span className="absolute bottom-2 left-2 bg-slate-900/75 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-xs pointer-events-none">
                Inicio
              </span>
              <span className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-xs pointer-events-none">
                Desarrollo
              </span>
            </div>

            <div className="w-full max-w-[380px] flex items-center gap-2 text-[11px] text-slate-600">
              <span>Inicio</span>
              <input
                type="range"
                min={0}
                max={100}
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
                aria-label="Deslizador de comparación inicio y desarrollo"
              />
              <span>Desarrollo</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="tabular-nums">
          Salida: {settings.gridCols} × {settings.gridRows} ({settings.gridCols * settings.gridRows} px)
        </span>
        <span className="font-mono tabular-nums">Zoom {settings.zoom.toFixed(2)}×</span>
      </div>
    </section>
  );
};
