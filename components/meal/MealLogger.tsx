import React, { useState, useRef, useEffect } from 'react';
import { analyzeMealFromImageAndText, analyzeMealFromText, fetchProductFromBarcode } from '../../services/geminiService';
import { Meal, Nutrients } from '../../types';
import { CameraIcon, UploadIcon, BarcodeIcon, DocumentTextIcon } from '../shared/Icons';
import { BarcodeScanner } from './BarcodeScanner';

interface MealLoggerProps {
  onClose: () => void;
  onMealAdded: (meal: Meal) => void;
}

type LogMode = 'image' | 'text' | 'barcode';
type AnalysisResult = Nutrients & { name: string; description: string; imageUrl?: string };

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to convert blob to base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const CameraView: React.FC<{ onCapture: (file: File) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Impossibile accedere alla fotocamera. Assicurati di aver dato i permessi necessari.");
                onClose();
            }
        };
        startCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(blob => {
                if (blob) {
                    onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" }));
                }
            }, 'image/jpeg');
        }
    };

    return (
        <div className="absolute inset-0 bg-black z-10 flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={onClose} className="absolute top-4 left-4 text-white bg-black/50 rounded-full p-2">
                &times;
            </button>
            <div className="absolute bottom-8 flex justify-center">
                <button onClick={handleCapture} className="w-16 h-16 bg-white rounded-full border-4 border-gray-400" aria-label="Scatta foto" />
            </div>
        </div>
    );
};

export const MealLogger: React.FC<MealLoggerProps> = ({ onClose, onMealAdded }) => {
    const [mode, setMode] = useState<LogMode>('image');
    const [image, setImage] = useState<{ preview: string; file: File } | null>(null);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if(image?.preview) URL.revokeObjectURL(image.preview);
        setImage({ preview: URL.createObjectURL(file), file: file });
      }
    };

    const handleAnalyze = async () => {
      setIsLoading(true);
      setError(null);
      setAnalysisResult(null);
      
      try {
        let result: AnalysisResult;
        if (mode === 'image') {
            if (!image) {
              setError("Per favore, carica o scatta un'immagine del tuo pasto.");
              setIsLoading(false);
              return;
            }
            const base64Image = await blobToBase64(image.file);
            result = await analyzeMealFromImageAndText(base64Image, image.file.type, description);
        } else { // mode === 'text'
            if (!description.trim()) {
                setError("Per favore, descrivi il tuo pasto.");
                setIsLoading(false);
                return;
            }
            result = await analyzeMealFromText(description);
        }
        setAnalysisResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Si è verificato un errore sconosciuto.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleBarcodeScan = async (barcode: string) => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const product = await fetchProductFromBarcode(barcode);
            if(product) {
                setAnalysisResult(product);
            } else {
                setError("Prodotto non trovato nel database. Prova a registrarlo tramite foto o testo.");
            }
        } catch (err) {
            setError("Errore durante la ricerca del prodotto.");
        } finally {
            setIsLoading(false);
        }
    }
  
    const handleSaveMeal = () => {
        if (!analysisResult) return;
        const finalImage = mode === 'barcode' ? analysisResult.imageUrl : image?.preview;
        const newMeal: Meal = {
            id: new Date().toISOString() + Math.random(),
            name: analysisResult.name,
            timestamp: new Date().toISOString(),
            nutrients: {
                calorie: analysisResult.calorie,
                proteine: analysisResult.proteine,
                carboidrati: analysisResult.carboidrati,
                grassi: analysisResult.grassi,
                micronutrienti: analysisResult.micronutrienti,
            },
            imageUrl: finalImage,
            description: analysisResult.description,
            imageMimeType: image?.file.type,
            source: mode,
        };
        onMealAdded(newMeal);
    };

    const handleReset = () => {
        if(image?.preview) URL.revokeObjectURL(image.preview);
        setImage(null);
        setDescription('');
        setAnalysisResult(null);
        setError(null);
        if (mode === 'barcode') setMode('image');
    }

    const TabButton: React.FC<{ logMode: LogMode, label: string, icon: React.ReactNode }> = ({ logMode, label, icon }) => (
        <button onClick={() => setMode(logMode)} className={`flex-1 flex flex-col items-center p-2 text-sm transition-colors ${mode === logMode ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}>
            {icon}
            <span>{label}</span>
            {mode === logMode && <div className="w-1/2 h-0.5 bg-green-500 mt-1 rounded-full"></div>}
        </button>
    );
  
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            {showCamera && <CameraView onClose={() => setShowCamera(false)} onCapture={(file) => {
                if(image?.preview) URL.revokeObjectURL(image.preview);
                setImage({ preview: URL.createObjectURL(file), file });
                setShowCamera(false);
            }} />}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md m-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registra Pasto</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                    </div>
                    
                    {!analysisResult ? (
                        <>
                            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                                <TabButton logMode="image" label="Foto" icon={<CameraIcon className="w-6 h-6 mb-1"/>} />
                                <TabButton logMode="text" label="Testo" icon={<DocumentTextIcon className="w-6 h-6 mb-1"/>} />
                                <TabButton logMode="barcode" label="Codice" icon={<BarcodeIcon className="w-6 h-6 mb-1"/>} />
                            </div>
                            
                            <div className="space-y-4">
                                {mode === 'image' && (
                                    <>
                                        <div className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex justify-center items-center bg-gray-50 dark:bg-gray-700/50">
                                            {image ? <img src={image.preview} alt="Anteprima pasto" className="w-full h-full object-cover rounded-lg"/> : <span className="text-gray-500 dark:text-gray-400">Anteprima immagine</span>}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setShowCamera(true)} className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"><CameraIcon className="w-5 h-5 mr-2"/> Fotocamera</button>
                                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"><UploadIcon className="w-5 h-5 mr-2"/> Carica</button>
                                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                        </div>
                                    </>
                                )}

                                {mode === 'barcode' && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setMode('image')} />}
                                
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={mode === 'text' ? 5 : 2}
                                    className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                    placeholder={mode === 'text' ? "Descrivi il tuo pasto nel dettaglio..." : "Aggiungi una descrizione (opzionale)"}
                                />
                                
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                
                                {(mode === 'image' || mode === 'text') && (
                                    <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 transition disabled:bg-gray-400">
                                        {isLoading ? 'Analisi in corso...' : 'Analizza con AI'}
                                    </button>
                                )}
                                {mode === 'barcode' && isLoading && <p className="text-center text-gray-500">Ricerca prodotto in corso...</p>}
                            </div>
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            {analysisResult.imageUrl && <img src={analysisResult.imageUrl} alt={analysisResult.name} className="w-full h-40 object-cover rounded-lg mb-4 bg-gray-200" />}
                            <h3 className="text-xl font-semibold">{analysisResult.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">"{analysisResult.description}"</p>
                            <div className="mt-4 space-y-2 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <p><strong>Calorie:</strong> {Math.round(analysisResult.calorie)} kcal</p>
                                <p><strong>Proteine:</strong> {Math.round(analysisResult.proteine)} g</p>
                                <p><strong>Carboidrati:</strong> {Math.round(analysisResult.carboidrati)} g</p>
                                <p><strong>Grassi:</strong> {Math.round(analysisResult.grassi)} g</p>
                            </div>
                             <div className="mt-4 flex justify-between space-x-2">
                                <button onClick={handleReset} className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition">Indietro</button>
                                <button onClick={handleSaveMeal} className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition">Salva Pasto</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
