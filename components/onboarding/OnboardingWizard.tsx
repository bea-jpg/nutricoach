import React, { useState } from 'react';
import { User, UserProfile, Goal, ActivityLevel, Nutrients, Micronutrient } from '../../types';

interface OnboardingWizardProps {
  onOnboardingComplete: (user: User) => void;
}

const calculateBMR = (profile: UserProfile): number => {
    const { gender, initialWeight, height, age } = profile;
    if (gender === 'maschio') {
        return 88.362 + (13.397 * initialWeight) + (4.799 * height) - (5.677 * age);
    } else {
        return 447.593 + (9.247 * initialWeight) + (3.098 * height) - (4.330 * age);
    }
};

const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
    const multipliers = {
        sedentario: 1.2,
        leggero: 1.375,
        moderato: 1.55,
        attivo: 1.725,
        molto_attivo: 1.9,
    };
    return bmr * multipliers[activityLevel];
};

const calculateDailyGoals = (tdee: number, goal: Goal, profile: UserProfile): Nutrients => {
    let calorieTarget = tdee;
    if (goal === 'perdere_peso') calorieTarget -= 500;
    if (goal === 'aumentare_massa') calorieTarget += 500;

    const proteine = (calorieTarget * 0.30) / 4; // 30% from protein
    const grassi = (calorieTarget * 0.25) / 9;   // 25% from fat
    const carboidrati = (calorieTarget * 0.45) / 4; // 45% from carbs

    const micronutrientGoals: Micronutrient[] = [
        { nome: 'Calcio', quantita: 1000, unita: 'mg' },
        { nome: 'Ferro', quantita: profile.gender === 'femmina' ? 18 : 8, unita: 'mg' },
        { nome: 'Potassio', quantita: 3500, unita: 'mg' },
        { nome: 'Sodio', quantita: 2300, unita: 'mg' },
        { nome: 'Vitamina C', quantita: 90, unita: 'mg' },
        { nome: 'Vitamina A', quantita: 900, unita: 'mcg' },
        { nome: 'Vitamina D', quantita: 15, unita: 'mcg' },
    ];

    return {
        calorie: Math.round(calorieTarget),
        proteine: Math.round(proteine),
        carboidrati: Math.round(carboidrati),
        grassi: Math.round(grassi),
        micronutrienti: micronutrientGoals,
    };
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onOnboardingComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({ name: '', age: 25, gender: 'femmina', height: 165, initialWeight: 60 });
  const [goal, setGoal] = useState<Goal>('mantenere_peso');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderato');
  const [preferences, setPreferences] = useState('');

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    const bmr = calculateBMR(profile);
    const tdee = calculateTDEE(bmr, activityLevel);
    const dailyGoals = calculateDailyGoals(tdee, goal, profile);
    
    const newUser: User = {
      profile,
      goal,
      activityLevel,
      preferences,
      dailyGoals,
      onboardingComplete: true,
      calibrationStartDate: new Date().toISOString(),
    };
    onOnboardingComplete(newUser);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 profile={profile} setProfile={setProfile} onNext={handleNext} />;
      case 2:
        return <Step2 goal={goal} setGoal={setGoal} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Step3 activityLevel={activityLevel} setActivityLevel={setActivityLevel} onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Step4 preferences={preferences} setPreferences={setPreferences} onSubmit={handleSubmit} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-green-500 mb-2">Benvenuto in NutriCoach AI</h1>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">Iniziamo a configurare il tuo profilo.</p>
            <div className="relative pt-1 mb-6">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                    <div style={{ width: `${(step / 4) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"></div>
                </div>
            </div>
            {renderStep()}
        </div>
    </div>
  );
};

// Helper Components for each step
const Step1: React.FC<{ profile: UserProfile, setProfile: React.Dispatch<React.SetStateAction<UserProfile>>, onNext: () => void }> = ({ profile, setProfile, onNext }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: name === 'age' || name === 'height' || name === 'initialWeight' ? Number(value) : value }));
    };
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200">Parlaci di te</h2>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input type="text" name="name" value={profile.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium">Genere</label>
                <select name="gender" value={profile.gender} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                    <option value="femmina">Femmina</option>
                    <option value="maschio">Maschio</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium">Età</label>
                <input type="number" name="age" value={profile.age} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium">Altezza (cm)</label>
                <input type="number" name="height" value={profile.height} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium">Peso (kg)</label>
                <input type="number" name="initialWeight" value={profile.initialWeight} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
            </div>
            <button onClick={onNext} className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition">Avanti</button>
        </div>
    );
};

const Step2: React.FC<{ goal: Goal, setGoal: React.Dispatch<React.SetStateAction<Goal>>, onNext: () => void, onBack: () => void }> = ({ goal, setGoal, onNext, onBack }) => {
    const goals: { id: Goal; label: string; description: string }[] = [
        { id: 'perdere_peso', label: 'Perdere Peso', description: 'Creeremo un deficit calorico sostenibile.' },
        { id: 'mantenere_peso', label: 'Mantenere il Peso', description: 'Ti aiuteremo a trovare il tuo equilibrio.' },
        { id: 'aumentare_massa', label: 'Aumentare Massa Muscolare', description: 'Imposteremo un surplus calorico controllato.' },
    ];
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200">Qual è il tuo obiettivo?</h2>
            <div className="space-y-3">
                {goals.map(g => (
                    <button key={g.id} onClick={() => setGoal(g.id)} className={`w-full text-left p-4 rounded-lg border-2 transition ${goal === g.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                        <p className="font-semibold">{g.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{g.description}</p>
                    </button>
                ))}
            </div>
            <div className="flex justify-between">
                <button onClick={onBack} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition">Indietro</button>
                <button onClick={onNext} className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition">Avanti</button>
            </div>
        </div>
    );
};

const Step3: React.FC<{ activityLevel: ActivityLevel, setActivityLevel: React.Dispatch<React.SetStateAction<ActivityLevel>>, onNext: () => void, onBack: () => void }> = ({ activityLevel, setActivityLevel, onNext, onBack }) => {
    const levels: { id: ActivityLevel; label: string; description: string }[] = [
        { id: 'sedentario', label: 'Sedentario', description: 'Poco o nessun esercizio.' },
        { id: 'leggero', label: 'Leggero', description: 'Esercizio leggero 1-3 giorni/settimana.' },
        { id: 'moderato', label: 'Moderato', description: 'Esercizio moderato 3-5 giorni/settimana.' },
        { id: 'attivo', label: 'Attivo', description: 'Esercizio intenso 6-7 giorni/settimana.' },
        { id: 'molto_attivo', label: 'Molto Attivo', description: 'Esercizio molto intenso e lavoro fisico.' },
    ];
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200">Qual è il tuo livello di attività?</h2>
             <div className="space-y-3">
                {levels.map(l => (
                    <button key={l.id} onClick={() => setActivityLevel(l.id)} className={`w-full text-left p-4 rounded-lg border-2 transition ${activityLevel === l.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                        <p className="font-semibold">{l.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{l.description}</p>
                    </button>
                ))}
            </div>
            <div className="flex justify-between">
                <button onClick={onBack} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition">Indietro</button>
                <button onClick={onNext} className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition">Avanti</button>
            </div>
        </div>
    );
};

const Step4: React.FC<{ preferences: string, setPreferences: React.Dispatch<React.SetStateAction<string>>, onSubmit: () => void, onBack: () => void }> = ({ preferences, setPreferences, onSubmit, onBack }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200">Preferenze e Allergie</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">Indica eventuali preferenze alimentari, diete (es. vegetariana), o allergie. L'AI ne terrà conto.</p>
        <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            placeholder="Es: Sono vegetariano, allergico alle noci."
        />
        <div className="flex justify-between">
            <button onClick={onBack} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition">Indietro</button>
            <button onClick={onSubmit} className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition">Completa Profilo</button>
        </div>
    </div>
);