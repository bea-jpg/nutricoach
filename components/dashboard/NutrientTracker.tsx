import React from 'react';
import { FireIcon, ProteinIcon, CarbIcon, FatIcon } from '../shared/Icons';
import { Micronutrient } from '../../types';

export interface MacroData {
  proteine: { current: number; goal: number };
  carboidrati: { current: number; goal: number };
  grassi: { current: number; goal: number };
}

export interface MicroData {
  current: Micronutrient[];
  goals: Micronutrient[];
}

interface NutrientTrackerProps {
  calorieIntake: number;
  calorieGoal: number;
  macroData: MacroData;
  microData: MicroData;
}

const CircularProgress: React.FC<{ percentage: number; colorClass: string; children: React.ReactNode }> = ({ percentage, colorClass, children }) => {
  const sqSize = 180;
  const strokeWidth = 15;
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const dashArray = radius * Math.PI * 2;
  const dashOffset = dashArray - (dashArray * Math.min(percentage, 100)) / 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: sqSize, height: sqSize }}>
      <svg width={sqSize} height={sqSize} viewBox={viewBox}>
        <circle
          className="stroke-current text-gray-200 dark:text-gray-700"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
          fill="none"
        />
        <circle
          className={`stroke-current ${colorClass} transition-all duration-1000 ease-in-out`}
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
          transform={`rotate(-90 ${sqSize / 2} ${sqSize / 2})`}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: dashArray,
            strokeDashoffset: dashOffset,
          }}
        />
      </svg>
      <div className="absolute text-center">
        {children}
      </div>
    </div>
  );
};


const MacroBar: React.FC<{ icon: React.ReactNode; label: string; current: number; goal: number; colorClass: string }> = ({ icon, label, current, goal, colorClass }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <div>
        <div className="flex justify-between items-center mb-1">
            <div className="flex items-center space-x-2">
                <span className={colorClass}>{icon}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{Math.round(current)} / {Math.round(goal)}g</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full ${colorClass.replace('text-', 'bg-')} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    </div>
  );
};

const MicroStat: React.FC<{ name: string; current: number; goal: number; unit: string }> = ({ name, current, goal, unit }) => {
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    
    // For Sodium, being over is bad. For others, it's generally okay (within limits, but for UI we simplify).
    const barColor = name.toLowerCase() === 'sodio' && percentage >= 100 ? 'bg-yellow-500' : 'bg-green-500';
    const textColor = name.toLowerCase() === 'sodio' && percentage >= 100 ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="text-sm">
            <div className="flex justify-between items-baseline">
                <p className="font-semibold text-gray-700 dark:text-gray-300">{name}</p>
                <p className={`font-mono text-xs ${textColor}`}>
                    {Math.round(current)} / {goal} {unit}
                </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <div 
                    className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};


export const NutrientTracker: React.FC<NutrientTrackerProps> = ({ calorieIntake, calorieGoal, macroData, microData }) => {
  const caloriePercentage = calorieGoal > 0 ? (calorieIntake / calorieGoal) * 100 : 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold mb-4">Riepilogo Giornaliero</h2>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0">
          <CircularProgress percentage={caloriePercentage} colorClass="text-green-500">
             <div className="text-3xl font-bold text-gray-800 dark:text-white">{Math.round(calorieIntake)}</div>
             <div className="text-sm text-gray-500 dark:text-gray-400">/ {calorieGoal} kcal</div>
          </CircularProgress>
        </div>
        <div className="w-full flex-grow space-y-4">
          <MacroBar 
            icon={<ProteinIcon className="w-5 h-5" />} 
            label="Proteine" 
            current={macroData.proteine.current}
            goal={macroData.proteine.goal}
            colorClass="text-blue-500"
          />
           <MacroBar 
            icon={<CarbIcon className="w-5 h-5" />} 
            label="Carboidrati" 
            current={macroData.carboidrati.current}
            goal={macroData.carboidrati.goal}
            colorClass="text-orange-500"
          />
           <MacroBar 
            icon={<FatIcon className="w-5 h-5" />} 
            label="Grassi" 
            current={macroData.grassi.current}
            goal={macroData.grassi.goal}
            colorClass="text-yellow-500"
          />
        </div>
      </div>
       {microData.goals.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Micronutrienti Chiave</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              {microData.goals.map(goal => {
                const currentMicro = microData.current.find(c => c.nome.toLowerCase() === goal.nome.toLowerCase());
                const currentAmount = currentMicro ? currentMicro.quantita : 0;
                return (
                  <MicroStat 
                    key={goal.nome}
                    name={goal.nome}
                    current={currentAmount}
                    goal={goal.quantita}
                    unit={goal.unita}
                  />
                )
              })}
            </div>
          </div>
        )}
    </div>
  );
};