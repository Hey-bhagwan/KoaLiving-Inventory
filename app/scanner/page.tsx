'use client';

import dynamic from 'next/dynamic';

// Dynamically import ScannerScreen with SSR disabled — html5-qrcode is browser-only
const ScannerScreen = dynamic(() => import('@/components/ScannerScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px] text-gray-400 text-sm">
      Loading scanner...
    </div>
  ),
});

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Barcode Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Use your device camera to scan barcodes and update inventory in real time.
        </p>
      </div>
      <ScannerScreen />
    </div>
  );
}
