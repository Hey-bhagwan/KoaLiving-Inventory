'use client';

import { useEffect, useRef } from 'react';
import { Download, Barcode } from 'lucide-react';
import { toCanvas } from 'bwip-js';

interface BarcodeDisplayProps {
  sku: string;
  productName?: string;
}

export default function BarcodeDisplay({ sku, productName }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!sku || !canvasRef.current) return;

    try {
      toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: sku,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center',
        textsize: 11,
        backgroundcolor: 'FFFFFF',
        paddingwidth: 6,
        paddingheight: 4,
      });
    } catch (err) {
      console.error('Barcode generation error:', err);
    }
  }, [sku]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `barcode-${sku}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (!sku) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[180px]">
        <Barcode size={40} />
        <p className="text-sm">Add a product to see its barcode</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center gap-4">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 self-start">
        <Barcode size={20} className="text-indigo-500" /> Generated Barcode
      </h2>

      <div className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col items-center gap-2">
        <canvas ref={canvasRef} className="max-w-full" />
        {productName && (
          <p className="text-xs text-gray-600 font-medium mt-1">{productName}</p>
        )}
        <p className="text-xs text-gray-400">SKU: {sku}</p>
      </div>

      <button
        onClick={handleDownload}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
      >
        <Download size={16} />
        Download PNG
      </button>
    </div>
  );
}
