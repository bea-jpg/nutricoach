import React, { useState, useEffect, useRef } from 'react';

// BarcodeDetector might not be in the default TS DOM lib yet.
declare global {
  interface Window {
    BarcodeDetector: any;
  }
  const BarcodeDetector: any;
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDetectorSupported, setIsDetectorSupported] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const detectorRef = useRef<any>(null);

    useEffect(() => {
        if ('BarcodeDetector' in window) {
            setIsDetectorSupported(true);
            try {
                detectorRef.current = new BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8', 'code_128', 'qr_code'] });
            } catch (e) {
                console.error("Error creating BarcodeDetector:", e);
                setError("Il rilevatore di codici a barre non è supportato in modo corretto.");
                setIsDetectorSupported(false);
            }
        } else {
            setError("Il tuo browser non supporta la scansione dei codici a barre.");
        }
    }, []);

    useEffect(() => {
        if (!isDetectorSupported) return;

        let stream: MediaStream | null = null;
        let animationFrameId: number;

        const startScan = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().then(() => setIsCameraReady(true));
                    }
                    
                    const detect = async () => {
                        if (detectorRef.current && videoRef.current && videoRef.current.readyState >= 2) {
                            try {
                                const barcodes = await detectorRef.current.detect(videoRef.current);
                                if (barcodes.length > 0) {
                                    onScan(barcodes[0].rawValue);
                                    // Stop further scanning
                                    return; 
                                }
                            } catch (e) {
                                console.error("Detection error:", e);
                            }
                        }
                        animationFrameId = requestAnimationFrame(detect);
                    };
                    detect();
                }
            } catch (err) {
                console.error(err);
                if (err instanceof Error) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setError("Devi consentire l'accesso alla fotocamera per scansionare.");
                    } else {
                        setError("Impossibile accedere alla fotocamera.");
                    }
                }
            }
        };

        startScan();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isDetectorSupported, onScan]);

    if (!isDetectorSupported) {
        return (
            <div className="p-4 text-center text-red-500">
                <p>{error}</p>
                <button onClick={onClose} className="mt-4 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition">Chiudi</button>
            </div>
        );
    }
    
    return (
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center text-white">
            {!isCameraReady && !error && <p>Avvio della fotocamera...</p>}
            <video ref={videoRef} className={`w-full h-full object-cover ${isCameraReady ? 'opacity-100' : 'opacity-0'}`} muted playsInline />
            <div className="absolute inset-0 flex flex-col justify-center items-center">
                <div className="w-4/5 h-2/5 border-2 border-white/50 rounded-lg relative">
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>
                <p className="text-white text-sm mt-4 bg-black/50 p-2 rounded">Inquadra il codice a barre</p>
            </div>
            {error && <p className="absolute bottom-2 left-2 right-2 text-center text-red-500 bg-black/50 p-1 rounded text-xs">{error}</p>}
        </div>
    );
};
