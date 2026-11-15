import { useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet, Layers } from 'lucide-react';
import { CodeMatrixView } from './components/CodeMatrixView';
import { ColorLayersBlackView } from './components/ColorLayersBlackView';
import { ControlsSidebar } from './components/ControlsSidebar';
import { ImageComparisonPanel } from './components/ImageComparisonPanel';
import { PaletteAndCounts } from './components/PaletteAndCounts';
import { PixelCanvas } from './components/PixelCanvas';
import {
  AdjustmentSettings,
  colToLetters,
  CoordFormat,
  PaletteColor,
} from './types/pixelGrid';
import { hexToRgb, makePaletteColor } from './utils/colorMath';
import { buildTextGuide, exportMosaicCsv, exportMosaicPng } from './utils/exporters';
import {
  buildDefaultStudioCanvas,
  computeColorUsageStats,
  mapPixelsToGrid,
  processMosaicPipeline,
  sampleAdjustedPixels,
} from './utils/imageProcessor';

const DEFAULT_SETTINGS: AdjustmentSettings = {
  gridCols: 20,
  gridRows: 25,
  visionMode: 'grayscale',
  distributionMode: 'adaptive',
  grayscaleSource: true,
  brightness: 0,
  contrast: 24,
  gamma: 1.0,
  invert: false,
  dithering: false,
  ditherStrength: 55,
  zoom: 1,
  panX: 0,
  panY: 0,
  paletteSize: 20,
  paletteMode: 'grayscale',
  color1Hex: '#DC2626',
  color2Hex: '#9333EA',
  color3Hex: '#EAB308',
  lockPalette: false,
};

export default function App() {
  const [settings, setSettings] = useState<AdjustmentSettings>(DEFAULT_SETTINGS);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'studio' | 'layers' | 'matrix'>('studio');
  const [coordFormat, setCoordFormat] = useState<CoordFormat>('alphaNum');
  const [highlightedColorId, setHighlightedColorId] = useState<string | null>(null);
  const [activeBrushColorId, setActiveBrushColorId] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [customPalette, setCustomPalette] = useState<PaletteColor[] | null>(null);
  const [copiedGuide, setCopiedGuide] = useState(false);

  const lastAutoPaletteRef = useRef<PaletteColor[] | undefined>(undefined);

  const sourceElement = useMemo(() => {
    if (uploadedImage) return uploadedImage;
    return buildDefaultStudioCanvas();
  }, [uploadedImage]);

  const baseMosaic = useMemo(() => {
    if (customPalette && customPalette.length === settings.paletteSize) {
      const sampledPixels = sampleAdjustedPixels(sourceElement, settings);
      const { cells, stats } = mapPixelsToGrid(sampledPixels, customPalette, settings);
      return {
        cols: settings.gridCols,
        rows: settings.gridRows,
        totalCells: settings.gridCols * settings.gridRows,
        cells,
        palette: customPalette,
        stats,
        sampledPixels,
      };
    }

    const result = processMosaicPipeline(
      sourceElement,
      settings,
      settings.lockPalette ? lastAutoPaletteRef.current : undefined
    );
    lastAutoPaletteRef.current = result.palette;
    return result;
  }, [sourceElement, settings, customPalette]);

  const finalMosaic = useMemo(() => {
    const overrideKeys = Object.keys(manualOverrides);
    if (overrideKeys.length === 0) return baseMosaic;

    const paletteById = new Map(baseMosaic.palette.map((c) => [c.id, c]));
    const updatedCells = baseMosaic.cells.map((cell) => {
      const overrideColorId = manualOverrides[cell.alphaCoord];
      if (!overrideColorId) return cell;
      const targetColor = paletteById.get(overrideColorId);
      if (!targetColor) return cell;
      return {
        ...cell,
        colorId: targetColor.id,
        colorIndex: targetColor.index,
        hex: targetColor.hex,
      };
    });

    const stats = computeColorUsageStats(
      updatedCells,
      baseMosaic.palette,
      baseMosaic.totalCells
    );
    return {
      ...baseMosaic,
      cells: updatedCells,
      stats,
    };
  }, [baseMosaic, manualOverrides]);

  const handleUpdateSettings = (patch: Partial<AdjustmentSettings>) => {
    if (
      patch.paletteMode !== undefined ||
      patch.paletteSize !== undefined ||
      patch.visionMode !== undefined ||
      patch.distributionMode !== undefined ||
      patch.color1Hex !== undefined ||
      patch.color2Hex !== undefined ||
      patch.color3Hex !== undefined
    ) {
      setCustomPalette(null);
      setActiveBrushColorId(null);
      setHighlightedColorId(null);
    }
    if (patch.gridCols !== undefined || patch.gridRows !== undefined) {
      setManualOverrides({});
    }
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleResetAdjustments = () => {
    setCustomPalette(null);
    setManualOverrides({});
    setHighlightedColorId(null);
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      gridCols: prev.gridCols,
      gridRows: prev.gridRows,
      paletteSize: prev.paletteSize,
      visionMode: prev.visionMode,
      distributionMode: prev.distributionMode,
      color1Hex: prev.color1Hex,
      color2Hex: prev.color2Hex,
      color3Hex: prev.color3Hex,
      paletteMode: prev.visionMode === 'grayscale' ? 'grayscale' : prev.paletteMode,
      grayscaleSource:
        prev.visionMode === 'grayscale' || prev.paletteMode !== 'adaptive-kmeans',
    }));
  };

  const handleUploadFile = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setUploadedFileName(file.name);
        setManualOverrides({});
        setCustomPalette(null);
      };
      img.onerror = () => {
        setUploadError('No se pudo leer el archivo de imagen seleccionado.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRecomputePalette = () => {
    setCustomPalette(null);
    setSettings((prev) => ({ ...prev, lockPalette: false }));
  };

  const handlePaintCell = (col: number, row: number, colorId: string) => {
    const cell = finalMosaic.cells[row * finalMosaic.cols + col];
    if (!cell) return;
    setManualOverrides((prev) => ({
      ...prev,
      [cell.alphaCoord]: colorId,
    }));
  };

  const handleUpdatePaletteColorHex = (colorId: string, newHex: string) => {
    const current = finalMosaic.palette;
    const next = current.map((c) => {
      if (c.id !== colorId) return c;
      const rgb = hexToRgb(newHex);
      return makePaletteColor(
        c.index,
        rgb,
        settings.visionMode,
        undefined,
        c.isAnchor,
        c.tonalPosition,
        undefined,
        c.usesRatio
      );
    });
    setCustomPalette(next);
    setSettings((prev) => ({ ...prev, lockPalette: true }));
  };

  const handleCopyTextGuide = async () => {
    const guide = buildTextGuide(
      finalMosaic.stats,
      coordFormat,
      finalMosaic.cols,
      finalMosaic.rows
    );
    try {
      await navigator.clipboard.writeText(guide);
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 1800);
    } catch {
      // Clipboard fallback silent
    }
  };

  const usedColorsCount = finalMosaic.stats.filter((s) => s.count > 0).length;
  const lastColLetter = colToLetters(finalMosaic.cols - 1);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-900">
      {/* Top Bar Contract: Brand wordmark — 4 nav links — 1 primary CTA */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="w-7 h-7 shrink-0"
            aria-hidden="true"
          >
            <rect
              x="1.5"
              y="1.5"
              width="13.5"
              height="13.5"
              rx="2"
              fill="#E15546"
              stroke="#991B1B"
              strokeOpacity="0.25"
              strokeWidth="0.8"
            />
            <rect
              x="17"
              y="1.5"
              width="13.5"
              height="13.5"
              rx="2"
              fill="#DDA842"
              stroke="#854D0E"
              strokeOpacity="0.25"
              strokeWidth="0.8"
            />
            <rect
              x="1.5"
              y="17"
              width="13.5"
              height="13.5"
              rx="2"
              fill="#2FB3AA"
              stroke="#115E59"
              strokeOpacity="0.25"
              strokeWidth="0.8"
            />
            <rect
              x="17"
              y="17"
              width="13.5"
              height="13.5"
              rx="2"
              fill="#244E78"
              stroke="#0F172A"
              strokeOpacity="0.28"
              strokeWidth="0.8"
            />
          </svg>
          <span>Studio Mosaico Art</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#cuadricula"
            onClick={() => setActiveTab('studio')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Imagen y Cuadrícula
          </a>
          <a
            href="#capas"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('layers');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Capas en Negro
          </a>
          <a
            href="#matriz"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('matrix');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Matriz de Códigos
          </a>
          <a
            href="#exportar"
            onClick={(e) => {
              e.preventDefault();
              exportMosaicCsv(
                finalMosaic.cells,
                finalMosaic.stats,
                coordFormat,
                finalMosaic.cols,
                finalMosaic.rows
              );
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Exportar CSV
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              exportMosaicPng(
                finalMosaic.cells,
                finalMosaic.palette,
                finalMosaic.stats,
                true,
                finalMosaic.cols,
                finalMosaic.rows
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            Descargar Plantilla PNG
          </button>
        </div>
      </header>

      {/* Workspace Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === 'studio'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Imagen y Cuadrícula ({finalMosaic.cols}×{finalMosaic.rows})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('layers')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === 'layers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                Capas en Negro ({finalMosaic.palette.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === 'matrix'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matriz de Códigos
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="tabular-nums font-medium text-slate-700">
                {finalMosaic.totalCells} píxeles ({finalMosaic.cols}×{finalMosaic.rows})
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {usedColorsCount} de {settings.paletteSize} tonos activos
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setCoordFormat('alphaNum')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap ${
                  coordFormat === 'alphaNum'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A/1–{lastColLetter}/{finalMosaic.rows}
              </button>
              <button
                type="button"
                onClick={() => setCoordFormat('colRow')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap ${
                  coordFormat === 'colRow'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                C01-F01
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                exportMosaicCsv(
                  finalMosaic.cells,
                  finalMosaic.stats,
                  coordFormat,
                  finalMosaic.cols,
                  finalMosaic.rows
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              CSV
            </button>

            <button
              type="button"
              onClick={handleCopyTextGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copiedGuide ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0" />
              )}
              {copiedGuide ? 'Guía copiada' : 'Copiar Guía'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <main
        id="top"
        className="flex-1 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        {uploadError && (
          <div className="mb-4 px-4 py-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md">
            {uploadError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start gap-6">
          <ControlsSidebar
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetAdjustments={handleResetAdjustments}
            onUploadFile={handleUploadFile}
            uploadedFileName={uploadedFileName}
            onRecomputePalette={handleRecomputePalette}
          />

          <div className="flex-1 min-w-0 w-full space-y-6">
            {activeTab === 'studio' && (
              <>
                <div
                  id="cuadricula"
                  className="grid grid-cols-1 xl:grid-cols-[minmax(310px,380px)_1fr] gap-6 items-stretch"
                >
                  <ImageComparisonPanel
                    sourceElement={sourceElement}
                    settings={settings}
                    uploadedFileName={uploadedFileName}
                  />

                  <PixelCanvas
                    cols={finalMosaic.cols}
                    rows={finalMosaic.rows}
                    cells={finalMosaic.cells}
                    palette={finalMosaic.palette}
                    stats={finalMosaic.stats}
                    coordFormat={coordFormat}
                    highlightedColorId={highlightedColorId}
                    activeBrushColorId={activeBrushColorId}
                    hasManualEdits={Object.keys(manualOverrides).length > 0}
                    onPaintCell={handlePaintCell}
                    onSelectBrushColor={setActiveBrushColorId}
                    onToggleHighlight={(id) =>
                      setHighlightedColorId((prev) => (prev === id ? null : id))
                    }
                    onResetManualEdits={() => setManualOverrides({})}
                  />
                </div>

                <div id="paleta">
                  <PaletteAndCounts
                    totalCells={finalMosaic.totalCells}
                    stats={finalMosaic.stats}
                    coordFormat={coordFormat}
                    highlightedColorId={highlightedColorId}
                    onToggleHighlight={(id) =>
                      setHighlightedColorId((prev) => (prev === id ? null : id))
                    }
                    onUpdatePaletteColorHex={handleUpdatePaletteColorHex}
                    onSelectBrushColor={(id) => setActiveBrushColorId(id)}
                  />
                </div>
              </>
            )}

            {activeTab === 'layers' && (
              <div id="capas">
                <ColorLayersBlackView
                  cols={finalMosaic.cols}
                  rows={finalMosaic.rows}
                  cells={finalMosaic.cells}
                  stats={finalMosaic.stats}
                  coordFormat={coordFormat}
                />
              </div>
            )}

            {activeTab === 'matrix' && (
              <div id="matriz">
                <CodeMatrixView
                  cols={finalMosaic.cols}
                  rows={finalMosaic.rows}
                  cells={finalMosaic.cells}
                  stats={finalMosaic.stats}
                  coordFormat={coordFormat}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
