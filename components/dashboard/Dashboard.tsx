import React, { useState, useMemo, useEffect } from 'react';
import { User, Meal, WeightEntry, Nutrients } from '../../types';
import { AppView } from '../../App';
import { MealLogger } from '../meal/MealLogger';
import { MealDetailModal } from '../meal/MealDetailModal';
import { NutrientTracker, MacroData, MicroData } from './NutrientTracker';
import { WeightHistoryChart } from './WeightHistoryChart';
import { WeeklyCalorieChart } from './WeeklyCalorieChart';
import { getAICoachAdvice } from '../../services/geminiService';
import { TrashIcon } from '../shared/Icons';

const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

const getDayTitle = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return "Pasti di Oggi";
    if (isSameDay(date, yesterday)) return "Pasti di Ieri";
    return `Pasti del ${date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`;
};

const MealCard: React.FC<{ meal: Meal; onSelect: (meal: Meal) => void; onDelete: (mealId: string) => void; }> = ({ meal, onSelect, onDelete }) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Sei sicuro di voler eliminare "${meal.name}"?`)) {
            onDelete(meal.id);
        }
    };

    return (
        <div
            onClick={() => onSelect(meal)}
            className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl flex items-center space-x-4 shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect(meal) }}
            aria-label={`Visualizza dettagli per ${meal.name}`}
        >
            {meal.imageUrl && <img src={meal.imageUrl} alt={meal.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
            <div className="flex-grow min-w-0">
                <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{meal.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(meal.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="font-semibold text-lg text-gray-800 dark:text-gray-100">{Math.round(meal.nutrients.calorie)}</p>
                <p className="text-xs text-gray-400">kcal</p>
            </div>
             <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                aria-label={`Elimina ${meal.name}`}
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const AICoachCard: React.FC<{ advice: string; isLoading: boolean }> = ({ advice, isLoading }) => (
    <div className="bg-gradient-to-r from-green-400 to-teal-500 p-5 rounded-2xl shadow-lg text-white">
        <h3 className="text-lg font-bold mb-2">Consiglio del Coach</h3>
        {isLoading ? (
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            </div>
        ) : (
            <p className="text-sm font-light">{advice}</p>
        )}
    </div>
);


export const Dashboard: React.FC<{
  user: User;
  meals: Meal[];
  weightHistory: WeightEntry[];
  onAddMeal: (meal: Meal) => void;
  onAddWeight: (weight: number) => void;
  onNavigate: (view: AppView) => void;
  onDeleteMeal: (mealId: string) => void;
}> = ({ user, meals, weightHistory, onAddMeal, onAddWeight, onNavigate, onDeleteMeal }) => {
  const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const mealsForSelectedDay = useMemo(() => {
    return meals.filter(meal => isSameDay(new Date(meal.timestamp), currentDate));
  }, [meals, currentDate]);

  const mealsToday = useMemo(() => {
    const today = new Date();
    return meals.filter(meal => isSameDay(new Date(meal.timestamp), today));
  }, [meals]);
  
  const totalIntakeForSelectedDay = useMemo(() => {
    return mealsForSelectedDay.reduce<Nutrients>((acc, meal) => {
        acc.calorie += meal.nutrients.calorie;
        acc.proteine += meal.nutrients.proteine;
        acc.carboidrati += meal.nutrients.carboidrati;
        acc.grassi += meal.nutrients.grassi;

        if (meal.nutrients.micronutrienti) {
            if (!acc.micronutrienti) acc.micronutrienti = [];
            meal.nutrients.micronutrienti.forEach(micro => {
                const existingMicro = acc.micronutrienti!.find(m => m.nome.toLowerCase() === micro.nome.toLowerCase());
                if (existingMicro) {
                    existingMicro.quantita += micro.quantita;
                } else {
                    acc.micronutrienti!.push({ ...micro });
                }
            });
        }
        return acc;
    }, { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, micronutrienti: [] });
  }, [mealsForSelectedDay]);
  
  useEffect(() => {
      // AI advice is always based on today's meals
      setIsAdviceLoading(true);
      getAICoachAdvice(user, mealsToday)
          .then(advice => setAiAdvice(advice))
          .catch(err => {
              console.error(err);
              setAiAdvice("Non è stato possibile caricare il consiglio.");
          })
          .finally(() => setIsAdviceLoading(false));
  }, [mealsToday, user]);

  const handleMealAdded = (meal: Meal) => {
    onAddMeal(meal);
    setCurrentDate(new Date()); // Jump back to today when a new meal is added
    setIsMealLoggerOpen(false);
  };

  const changeDay = (offset: number) => {
      setCurrentDate(prevDate => {
          const newDate = new Date(prevDate);
          newDate.setDate(newDate.getDate() + offset);
          return newDate;
      });
  };
  
  const macroData: MacroData = {
      proteine: { current: totalIntakeForSelectedDay.proteine, goal: user.dailyGoals.proteine },
      carboidrati: { current: totalIntakeForSelectedDay.carboidrati, goal: user.dailyGoals.carboidrati },
      grassi: { current: totalIntakeForSelectedDay.grassi, goal: user.dailyGoals.grassi },
  };

  const microData: MicroData = {
      current: totalIntakeForSelectedDay.micronutrienti || [],
      goals: user.dailyGoals.micronutrienti || [],
  };

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24">
        <header className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ciao, {user.profile.name}!</h1>
          <p className="text-gray-500 dark:text-gray-400">{isToday ? "Ecco il riepilogo della tua giornata." : `Stai visualizzando il giorno ${currentDate.toLocaleDateString('it-IT')}.`}</p>
        </header>

        <NutrientTracker 
            calorieIntake={totalIntakeForSelectedDay.calorie}
            calorieGoal={user.dailyGoals.calorie}
            macroData={macroData}
            microData={microData}
        />
        
        {isToday && <AICoachCard advice={aiAdvice} isLoading={isAdviceLoading} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{getDayTitle(currentDate)}</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => changeDay(1)} disabled={isToday} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {mealsForSelectedDay.length > 0 ? (
                        [...mealsForSelectedDay].reverse().map(meal => 
                            <MealCard 
                                key={meal.id} 
                                meal={meal} 
                                onSelect={setSelectedMeal} 
                                onDelete={(mealId) => {
                                    onDeleteMeal(mealId);
                                    setSelectedMeal(null);
                                }} 
                            />)
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nessun pasto registrato in questo giorno.</p>
                    )}
                </div>
            </div>

            <WeightHistoryChart 
                weightHistory={weightHistory} 
                initialWeight={user.profile.initialWeight}
                onAddWeight={onAddWeight}
            />
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Andamento Calorie Settimanale</h2>
            <WeeklyCalorieChart meals={meals} dailyGoal={user.dailyGoals.calorie} />
        </div>

        {selectedMeal && <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />}
        {isMealLoggerOpen && <MealLogger onClose={() => setIsMealLoggerOpen(false)} onMealAdded={handleMealAdded} />}
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center max-w-4xl mx-auto rounded-t-2xl">
          <button onClick={() => onNavigate('chat')} className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="text-xs font-medium">Coach</span>
          </button>
          <button onClick={() => setIsMealLoggerOpen(true)} className="transform -translate-y-8 bg-green-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition ring-4 ring-white dark:ring-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
           <button onClick={() => onNavigate('profile')} className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-xs font-medium">Profilo</span>
          </button>
      </footer>
    </div>
  );
};