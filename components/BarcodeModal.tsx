'use client';

import { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { toCanvas } from 'bwip-js';

interface BarcodeModalProps {
  sku: string;
  productName: string;
  onClose: () => void;
}

export default function BarcodeModal({ sku, productName, onClose }: BarcodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!sku || !canvasRef.current) return;
    try {
      toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: sku,
        scale: 3,
        height: 14,
        includetext: true,
        textxalign: 'center',
        textsize: 12,
        backgroundcolor: 'FFFFFF',
        paddingwidth: 8,
        paddingheight: 6,
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

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcode - ${sku}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;font-family:sans-serif;}
      img{max-width:100%;} p{margin:4px 0;font-size:13px;color:#555;}</style></head>
      <body>
        <img src="${dataUrl}" />
        <p><strong>${productName}</strong></p>
        <p>SKU: ${sku}</p>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{productName}</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {sku}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barcode Canvas */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white flex justify-center">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            <Download size={15} />
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}
