import React, { useState, useEffect } from 'react';
import { User, UserProfile, Goal, ActivityLevel, Nutrients, Micronutrient } from '../../types';
import { AppView } from '../../App';
import { LeftArrowIcon } from '../shared/Icons';

// Helper functions to recalculate goals, adapted from OnboardingWizard
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

    const proteine = (calorieTarget * 0.30) / 4;
    const grassi = (calorieTarget * 0.25) / 9;
    const carboidrati = (calorieTarget * 0.45) / 4;

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


interface ProfileViewProps {
    user: User;
    onSave: (user: User) => void;
    onNavigate: (view: AppView) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onSave, onNavigate }) => {
    const [formData, setFormData] = useState(user);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name in formData.profile) {
            const isNumeric = ['age', 'height', 'initialWeight'].includes(name);
            setFormData(prev => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    [name]: isNumeric ? Number(value) : value,
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const bmr = calculateBMR(formData.profile);
        const tdee = calculateTDEE(bmr, formData.activityLevel);
        const dailyGoals = calculateDailyGoals(tdee, formData.goal, formData.profile);

        const updatedUser = {
            ...formData,
            dailyGoals,
        };

        onSave(updatedUser);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000); // Hide message after 2 seconds
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center space-x-4 z-10">
                <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                   <LeftArrowIcon className="w-6 h-6 text-gray-700 dark:text-gray-200"/>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">Il Tuo Profilo</h1>
                </div>
            </header>
            <main className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
                <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                    
                    {/* Dati Personali */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4">Dati Personali</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                                <input type="text" name="name" value={formData.profile.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Genere</label>
                                <select name="gender" value={formData.profile.gender} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                                    <option value="femmina">Femmina</option>
                                    <option value="maschio">Maschio</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Età</label>
                                <input type="number" name="age" value={formData.profile.age} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Altezza (cm)</label>
                                <input type="number" name="height" value={formData.profile.height} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Peso (kg)</label>
                                <input type="number" name="initialWeight" value={formData.profile.initialWeight} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                            </div>
                        </div>
                    </section>

                    {/* Obiettivi e Stile di Vita */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4">Obiettivi e Stile di Vita</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Obiettivo</label>
                                <select name="goal" value={formData.goal} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                                    <option value="perdere_peso">Perdere Peso</option>
                                    <option value="mantenere_peso">Mantenere il Peso</option>
                                    <option value="aumentare_massa">Aumentare Massa Muscolare</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Livello di Attività</label>
                                <select name="activityLevel" value={formData.activityLevel} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                                    <option value="sedentario">Sedentario</option>
                                    <option value="leggero">Leggero</option>
                                    <option value="moderato">Moderato</option>
                                    <option value="attivo">Attivo</option>
                                    <option value="molto_attivo">Molto Attivo</option>
                                </select>
                            </div>
                         </div>
                    </section>
                    
                    {/* Preferenze */}
                    <section>
                         <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-4">Preferenze e Allergie</h2>
                         <div>
                            <textarea
                                name="preferences"
                                value={formData.preferences}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                placeholder="Es: Sono vegetariano, allergico alle noci."
                            />
                        </div>
                    </section>

                    <div className="flex justify-end items-center pt-4">
                         {isSaved && <p className="text-green-500 mr-4 transition-opacity duration-300">Profilo salvato!</p>}
                        <button type="submit" className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600 transition">Salva Modifiche</button>
                    </div>
                </form>
            </main>
        </div>
    );
};
