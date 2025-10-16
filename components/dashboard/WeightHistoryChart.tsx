import React, { useState, useMemo } from 'react';
import { WeightEntry } from '../../types';

interface WeightHistoryChartProps {
    weightHistory: WeightEntry[];
    initialWeight: number;
    onAddWeight: (weight: number) => void;
}

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
};

const SVGChart: React.FC<{ data: { x: number; y: number }[]; width: number; height: number; minY: number; maxY: number; xLabels: string[] }> = ({ data, width, height, minY, maxY, xLabels }) => {
    if (data.length < 2) {
        return <div className="flex items-center justify-center h-full"><p className="text-gray-500">Aggiungi più dati per vedere il grafico.</p></div>;
    }

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const x = (val: number) => padding.left + (val / (data.length - 1)) * chartWidth;
    const y = (val: number) => padding.top + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;

    const path = data.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(point.y)}`).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Y-axis labels and grid line */}
            <text x={padding.left - 8} y={padding.top} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-400">{Math.round(maxY)}</text>
            <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-400">{Math.round(minY)}</text>
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" />
            
            {/* X-axis labels and grid line */}
            {xLabels.map((label, i) => (
                (i === 0 || i === xLabels.length - 1 || xLabels.length <= 5) && 
                <text key={i} x={x(i)} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-gray-400">{label}</text>
            ))}
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" />
            
            {/* Gradient for line */}
            <defs>
                <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
            </defs>
            
            {/* Line path */}
            <path d={path} fill="none" stroke="url(#line-gradient)" strokeWidth="2" strokeLinecap="round" />

            {/* Data points */}
            {data.map((point, i) => (
                <circle key={i} cx={x(i)} cy={y(point.y)} r="4" className="fill-current text-teal-500" />
            ))}
        </svg>
    );
};

export const WeightHistoryChart: React.FC<WeightHistoryChartProps> = ({ weightHistory, initialWeight, onAddWeight }) => {
    const [newWeight, setNewWeight] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);

    const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : initialWeight;
    const weightChange = latestWeight - initialWeight;

    const chartData = useMemo(() => {
        if (!weightHistory || weightHistory.length === 0) return { data: [], labels: [], minY: 0, maxY: 0 };
        const data = weightHistory.map((entry, index) => ({ x: index, y: entry.weight }));
        const weights = weightHistory.map(d => d.weight);
        const minVal = Math.min(...weights);
        const maxVal = Math.max(...weights);
        const buffer = (maxVal - minVal) * 0.1 || 2;
        const minY = minVal - buffer;
        const maxY = maxVal + buffer;
        const labels = weightHistory.map(d => formatDate(d.date));
        return { data, labels, minY, maxY };
    }, [weightHistory]);

    const handleAddWeight = () => {
        const weightValue = parseFloat(newWeight);
        if (!isNaN(weightValue) && weightValue > 0) {
            onAddWeight(weightValue);
            setIsAdding(false);
            setNewWeight('');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold">Andamento Peso</h2>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{latestWeight.toFixed(1)} <span className="text-lg font-medium">kg</span></p>
                    <p className={`text-sm font-semibold ${weightChange > 0 ? 'text-yellow-500' : (weightChange < 0 ? 'text-green-500' : 'text-gray-500')}`}>
                        {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} kg dall'inizio
                    </p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60 transition">
                        AGGIUNGI
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="flex space-x-2 mb-4">
                    <input
                        type="number"
                        step="0.1"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder={`Oggi (${latestWeight.toFixed(1)} kg)`}
                        className="flex-grow w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                    <button onClick={handleAddWeight} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition">Salva</button>
                    <button onClick={() => setIsAdding(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition">Annulla</button>
                </div>
            )}
            
            <div className="h-48 -mx-2">
                <SVGChart 
                    data={chartData.data}
                    width={400} /* Aspect ratio reference */
                    height={192} /* h-48 */
                    minY={chartData.minY}
                    maxY={chartData.maxY}
                    xLabels={chartData.labels}
                />
            </div>
        </div>
    );
};
