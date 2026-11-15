import React, { useRef } from 'react';
import { Upload, RotateCcw, Lock, Unlock, RefreshCw } from 'lucide-react';
import {
  AdjustmentSettings,
  GRID_PRESETS,
  PaletteMode,
  PURE_COLOR_SWATCHES,
} from '../types/pixelGrid';

interface ControlsSidebarProps {
  settings: AdjustmentSettings;
  onUpdateSettings: (patch: Partial<AdjustmentSettings>) => void;
  onResetAdjustments: () => void;
  onUploadFile: (file: File) => void;
  uploadedFileName: string | null;
  onRecomputePalette: () => void;
}

const COLOR_MODES: Array<{ id: PaletteMode; label: string; desc: string }> = [
  {
    id: 'replace-black',
    label: 'Reemplazar Negro (Color → Blanco)',
    desc: 'Sustituye el negro por un color puro y sus tonos hacia blanco',
  },
  {
    id: 'mix-2-colors',
    label: 'Degradado 2 Colores (C1 → C2)',
    desc: 'Mezcla progresiva entre color de sombras y color de luces',
  },
  {
    id: 'mix-3-colors',
    label: 'Degradado 3 Colores (C1 → C2 → C3)',
    desc: 'Degradación continua por sombras, medios tonos y luces',
  },
  {
    id: 'pure-colors',
    label: 'Colores Puros (Sin degradar)',
    desc: 'Primarios y secundarios puros + Negro y Blanco',
  },
  {
    id: 'adaptive-kmeans',
    label: 'Colores Reales (Foto)',
    desc: 'Extrae los colores originales de la imagen cargada',
  },
];

interface ColorSlotPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const ColorSlotPicker: React.FC<ColorSlotPickerProps> = ({ label, value, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="font-mono text-slate-600">{value}</span>
    </div>
    <div className="flex flex-wrap items-center gap-1">
      {PURE_COLOR_SWATCHES.map((sw) => {
        const selected = value.toUpperCase() === sw.hex.toUpperCase();
        return (
          <button
            key={sw.hex}
            type="button"
            onClick={() => onChange(sw.hex)}
            title={sw.label}
            className={`w-4 h-4 rounded-xs border transition-transform ${
              selected
                ? 'ring-2 ring-blue-600 ring-offset-1 scale-110 border-slate-900'
                : 'border-slate-300 hover:scale-110'
            }`}
            style={{ backgroundColor: sw.hex }}
          />
        );
      })}
      <label
        className="relative w-4 h-4 rounded-xs border border-slate-400 cursor-pointer overflow-hidden flex items-center justify-center bg-white text-[9px] font-bold text-slate-700"
        title="Color personalizado"
      >
        +
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          aria-label={`Elegir ${label}`}
        />
      </label>
    </div>
  </div>
);

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  settings,
  onUpdateSettings,
  onResetAdjustments,
  onUploadFile,
  uploadedFileName,
  onRecomputePalette,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadFile(file);
    }
  };

  const handleDimensionInput = (field: 'gridCols' | 'gridRows', raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clamped =
      field === 'gridCols'
        ? Math.max(8, Math.min(36, parsed))
        : Math.max(8, Math.min(44, parsed));
    onUpdateSettings({ [field]: clamped });
  };

  const handleVisionChange = (mode: 'grayscale' | 'color') => {
    const nextPaletteMode: PaletteMode =
      mode === 'grayscale' ? 'grayscale' : 'replace-black';
    onUpdateSettings({
      visionMode: mode,
      paletteMode: nextPaletteMode,
      grayscaleSource: true,
    });
  };

  const usesTonalDistribution =
    settings.visionMode === 'grayscale' ||
    settings.paletteMode === 'replace-black' ||
    settings.paletteMode === 'mix-2-colors' ||
    settings.paletteMode === 'mix-3-colors';

  return (
    <aside className="w-full lg:w-[310px] shrink-0 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
      {/* 1. Clean Image Upload */}
      <div
        className="p-3.5 space-y-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-900">1. Imagen Fuente</h2>
          <span
            className="text-[11px] text-slate-500 truncate max-w-[165px]"
            title={uploadedFileName ?? 'Imagen base'}
          >
            {uploadedFileName ?? 'Imagen base cargada'}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          Cargar o arrastrar imagen
        </button>
      </div>

      {/* 2. Grid Resolution */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-900">2. Tamaño de Cuadrícula</h2>
          <span className="font-mono text-[11px] font-semibold text-blue-700 tabular-nums">
            {settings.gridCols * settings.gridRows} px totales
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {GRID_PRESETS.map((preset) => {
            const active =
              settings.gridCols === preset.cols && settings.gridRows === preset.rows;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateSettings({ gridCols: preset.cols, gridRows: preset.rows })
                }
                className={`py-1.5 px-2 text-xs font-mono font-medium rounded border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 pt-0.5">
          <label className="flex items-center justify-between gap-1.5 px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[11px] text-slate-600">
            <span>Ancho</span>
            <input
              type="number"
              min={8}
              max={36}
              value={settings.gridCols}
              onChange={(e) => handleDimensionInput('gridCols', e.target.value)}
              className="w-11 text-right font-mono font-semibold text-slate-900 bg-transparent focus:outline-none tabular-nums"
              aria-label="Columnas de cuadrícula"
            />
          </label>
          <span className="text-xs text-slate-400 font-mono">×</span>
          <label className="flex items-center justify-between gap-1.5 px-2 py-1 border border-slate-200 rounded bg-slate-50 text-[11px] text-slate-600">
            <span>Alto</span>
            <input
              type="number"
              min={8}
              max={44}
              value={settings.gridRows}
              onChange={(e) => handleDimensionInput('gridRows', e.target.value)}
              className="w-11 text-right font-mono font-semibold text-slate-900 bg-transparent focus:outline-none tabular-nums"
              aria-label="Filas de cuadrícula"
            />
          </label>
        </div>
      </div>

      {/* 3. Compact Grouped Light & Effect Controls (No Corte B/N) */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-900">3. Luz y Efectos</h2>
          <button
            type="button"
            onClick={onResetAdjustments}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            Restablecer
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <div className="flex justify-between text-[11px]">
              <label htmlFor="c-contrast" className="text-slate-700 font-medium">
                Contraste
              </label>
              <span className="font-mono tabular-nums text-slate-600">{settings.contrast}</span>
            </div>
            <input
              id="c-contrast"
              type="range"
              min={-80}
              max={90}
              value={settings.contrast}
              onChange={(e) => onUpdateSettings({ contrast: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px]">
              <label htmlFor="c-bright" className="text-slate-700 font-medium">
                Brillo
              </label>
              <span className="font-mono tabular-nums text-slate-600">{settings.brightness}</span>
            </div>
            <input
              id="c-bright"
              type="range"
              min={-70}
              max={70}
              value={settings.brightness}
              onChange={(e) => onUpdateSettings({ brightness: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px]">
              <label htmlFor="c-gamma" className="text-slate-700 font-medium">
                Gamma
              </label>
              <span className="font-mono tabular-nums text-slate-600">
                {settings.gamma.toFixed(1)}
              </span>
            </div>
            <input
              id="c-gamma"
              type="range"
              min={0.4}
              max={2.2}
              step={0.1}
              value={settings.gamma}
              onChange={(e) => onUpdateSettings({ gamma: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px]">
              <label htmlFor="c-zoom" className="text-slate-700 font-medium">
                Zoom
              </label>
              <span className="font-mono tabular-nums text-slate-600">
                {settings.zoom.toFixed(1)}×
              </span>
            </div>
            <input
              id="c-zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={settings.zoom}
              onChange={(e) => onUpdateSettings({ zoom: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>
        </div>

        {settings.zoom > 1 && (
          <div className="grid grid-cols-2 gap-x-3 pt-0.5">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Pos. X</span>
                <span className="font-mono tabular-nums">{settings.panX.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={settings.panX}
                onChange={(e) => onUpdateSettings({ panX: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer h-1.5"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Pos. Y</span>
                <span className="font-mono tabular-nums">{settings.panY.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={settings.panY}
                onChange={(e) => onUpdateSettings({ panY: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onUpdateSettings({ invert: !settings.invert })}
            className={`py-1.5 px-2 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              settings.invert
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Invertir tonos
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ dithering: !settings.dithering })}
            className={`py-1.5 px-2 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              settings.dithering
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tramado suave
          </button>
        </div>

        {settings.dithering && (
          <div className="pt-0.5">
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Intensidad de tramado</span>
              <span className="font-mono tabular-nums">{settings.ditherStrength}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.ditherStrength}
              onChange={(e) =>
                onUpdateSettings({ ditherStrength: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>
        )}
      </div>

      {/* 4. Color Count, Pure Color Black Replacement, 2/3-Color Mixes */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-900">4. Gama y Colores</h2>
          <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
            {settings.paletteSize} tonos
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => handleVisionChange('grayscale')}
            className={`py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              settings.visionMode === 'grayscale'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Negro / Grises
          </button>
          <button
            type="button"
            onClick={() => handleVisionChange('color')}
            className={`py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              settings.visionMode === 'color'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            A Color
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <input
            type="range"
            min={4}
            max={30}
            step={1}
            value={settings.paletteSize}
            onChange={(e) =>
              onUpdateSettings({ paletteSize: Number(e.target.value) })
            }
            className="flex-1 accent-blue-600 cursor-pointer h-1.5"
            aria-label="Cantidad de colores"
          />
          <div className="flex items-center gap-1">
            {[8, 12, 16, 20, 26].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onUpdateSettings({ paletteSize: n })}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  settings.paletteSize === n
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Color Mode Selection */}
        {settings.visionMode === 'color' && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-1">
              {COLOR_MODES.map((m) => {
                const active = settings.paletteMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        paletteMode: m.id,
                        grayscaleSource: m.id !== 'adaptive-kmeans',
                      })
                    }
                    className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Color Slot Pickers for 1/2/3-Color Gradients */}
            {settings.paletteMode === 'replace-black' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <ColorSlotPicker
                  label="Color que reemplaza al negro (100/0)"
                  value={settings.color1Hex}
                  onChange={(hex) => onUpdateSettings({ color1Hex: hex })}
                />
                <div
                  className="h-2.5 w-full rounded-xs border border-slate-300"
                  style={{
                    background: `linear-gradient(to right, ${settings.color1Hex}, #FFFFFF)`,
                  }}
                />
              </div>
            )}

            {settings.paletteMode === 'mix-2-colors' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                <ColorSlotPicker
                  label="Color 1 · Sombras (100/0)"
                  value={settings.color1Hex}
                  onChange={(hex) => onUpdateSettings({ color1Hex: hex })}
                />
                <ColorSlotPicker
                  label="Color 2 · Luces (0/100)"
                  value={settings.color2Hex}
                  onChange={(hex) => onUpdateSettings({ color2Hex: hex })}
                />
                <div
                  className="h-2.5 w-full rounded-xs border border-slate-300"
                  style={{
                    background: `linear-gradient(to right, ${settings.color1Hex}, ${settings.color2Hex})`,
                  }}
                />
              </div>
            )}

            {settings.paletteMode === 'mix-3-colors' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                <ColorSlotPicker
                  label="Color 1 · Sombras (100/0/0)"
                  value={settings.color1Hex}
                  onChange={(hex) => onUpdateSettings({ color1Hex: hex })}
                />
                <ColorSlotPicker
                  label="Color 2 · Medios (0/100/0)"
                  value={settings.color2Hex}
                  onChange={(hex) => onUpdateSettings({ color2Hex: hex })}
                />
                <ColorSlotPicker
                  label="Color 3 · Luces (0/0/100)"
                  value={settings.color3Hex}
                  onChange={(hex) => onUpdateSettings({ color3Hex: hex })}
                />
                <div
                  className="h-2.5 w-full rounded-xs border border-slate-300"
                  style={{
                    background: `linear-gradient(to right, ${settings.color1Hex}, ${settings.color2Hex}, ${settings.color3Hex})`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Unified Pixelation Distribution (Same for Black/Gray and Color Mixes) */}
        {usesTonalDistribution && (
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-600">
              Distribución del pixelado
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateSettings({ distributionMode: 'adaptive' })}
                className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors ${
                  settings.distributionMode === 'adaptive'
                    ? 'bg-blue-50 border-blue-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Adaptada al Contraste
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ distributionMode: 'uniform' })}
                className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors ${
                  settings.distributionMode === 'uniform'
                    ? 'bg-blue-50 border-blue-600 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Escala Uniforme
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ lockPalette: !settings.lockPalette })}
            className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              settings.lockPalette
                ? 'bg-amber-50 border-amber-400 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {settings.lockPalette ? (
              <Lock className="w-3 h-3 shrink-0" />
            ) : (
              <Unlock className="w-3 h-3 shrink-0" />
            )}
            {settings.lockPalette ? 'Gama fija' : 'Auto-adaptar'}
          </button>

          <button
            type="button"
            onClick={onRecomputePalette}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3 shrink-0" />
            Recalcular
          </button>
        </div>
      </div>
    </aside>
  );
};
