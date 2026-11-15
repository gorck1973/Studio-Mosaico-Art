import React, { useEffect } from 'react';
import { X, Grid3X3, Palette, Layers } from 'lucide-react';

interface WorkshopGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkshopGuideModal: React.FC<WorkshopGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workshop-guide-title"
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2
              id="workshop-guide-title"
              className="text-base font-semibold text-slate-900"
            >
              Guía de Taller — Del Pixel Art Digital al Mural Físico
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cómo preparar tus cubos de madera, teselas o mosaicos en 3 pasos simples.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar guía de taller"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5 p-3.5 rounded-md border border-slate-200 bg-slate-50">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Grid3X3 className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-900">
                1. Ajusta la cuadrícula y la medida de tus bloques
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Carga tu imagen y define el número de columnas y filas (por ejemplo{' '}
                <span className="font-mono font-medium text-slate-800">20×25</span>). En{' '}
                <span className="font-medium text-slate-800">Tamaño de pieza física (cm)</span>{' '}
                indica cuánto mide cada cubo o azulejo para obtener al instante el ancho y alto real de tu obra.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-md border border-slate-200 bg-slate-50">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-900">
                2. Prepara pintura y piezas según la tabla de colores
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Revisa la tabla inferior de detalle para saber la cantidad exacta de piezas por tono. En escalas de grises o mezclas de 2 colores verás la{' '}
                <span className="font-mono font-medium text-slate-800">Proporción (ej. 96/4)</span>{' '}
                para dosificar pintura; en mezclas múltiples o foto real verás su código{' '}
                <span className="font-mono font-medium text-slate-800">RGB</span> y{' '}
                <span className="font-mono font-medium text-slate-800">HEX</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-md border border-slate-200 bg-slate-50">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-900">
                3. Ensambla usando las coordenadas y capas en negro
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Usa la pestaña <span className="font-medium text-slate-800">Matriz de Códigos</span>{' '}
                para ubicar cada pieza por su coordenada <span className="font-mono font-medium text-slate-800">Columna/Fila (ej. K/8)</span>, o abre{' '}
                <span className="font-medium text-slate-800">Capas en Negro</span> para trabajar tono por tono sin errores. Descarga tu{' '}
                <span className="font-medium text-slate-800">Plantilla PNG</span> o{' '}
                <span className="font-medium text-slate-800">CSV</span> para imprimir y llevar al taller.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Entendido, volver al taller
          </button>
        </div>
      </div>
    </div>
  );
};
