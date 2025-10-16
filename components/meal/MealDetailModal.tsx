import React from 'react';
import { Meal, Micronutrient } from '../../types';
import { FireIcon, ProteinIcon, CarbIcon, FatIcon } from '../shared/Icons';

// FIX: Changed icon prop type to be more specific for proper type inference with React.cloneElement.
const NutrientDisplay: React.FC<{ icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; label: string; value: number; unit: string; colorClass: string }> = ({ icon, label, value, unit, colorClass }) => (
    <div className={`flex items-center space-x-3 p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
        <div className={`p-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}>
            {React.cloneElement(icon, { className: 'w-5 h-5 text-white' })}
        </div>
        <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{Math.round(value)} {unit}</p>
        </div>
    </div>
);

const MicronutrientItem: React.FC<{ micro: Micronutrient }> = ({ micro }) => (
    <li className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <span className="text-gray-700 dark:text-gray-300">{micro.nome}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{micro.quantita.toLocaleString()} {micro.unita}</span>
    </li>
);


export const MealDetailModal: React.FC<{ meal: Meal; onClose: () => void }> = ({ meal, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg m-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    {meal.imageUrl && <img src={meal.imageUrl} alt={meal.name} className="w-full h-48 object-cover" />}
                     <button onClick={onClose} className="absolute top-3 right-3 bg-gray-800/50 text-white rounded-full p-1.5 leading-none text-2xl hover:bg-gray-900/70 transition" aria-label="Chiudi">&times;</button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{meal.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{new Date(meal.timestamp).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                    
                    {meal.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-6 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg italic">"{meal.description}"</p>
                    )}

                    <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Riepilogo Nutrienti</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                         <NutrientDisplay
                            icon={<FireIcon />}
                            label="Calorie"
                            value={meal.nutrients.calorie}
                            unit="kcal"
                            colorClass="text-green-500"
                        />
                        <NutrientDisplay
                            icon={<ProteinIcon />}
                            label="Proteine"
                            value={meal.nutrients.proteine}
                            unit="g"
                            colorClass="text-blue-500"
                        />
                        <NutrientDisplay
                            icon={<CarbIcon />}
                            label="Carboidrati"
                            value={meal.nutrients.carboidrati}
                            unit="g"
                            colorClass="text-orange-500"
                        />
                        <NutrientDisplay
                            icon={<FatIcon />}
                            label="Grassi"
                            value={meal.nutrients.grassi}
                            unit="g"
                            colorClass="text-yellow-500"
                        />
                    </div>

                    {meal.nutrients.micronutrienti && meal.nutrients.micronutrienti.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Micronutrienti</h3>
                            <ul className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg">
                                {meal.nutrients.micronutrienti.map(micro => (
                                    <MicronutrientItem key={micro.nome} micro={micro} />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};