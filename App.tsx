import React, { useState, useEffect } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { AICoachChat } from './components/coach/AICoachChat';
import { ProfileView } from './components/profile/ProfileView';
import { User, Meal, WeightEntry } from './types';
import { startChat } from './services/geminiService';

export type AppView = 'dashboard' | 'chat' | 'profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('nutricoach_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  });

  const [meals, setMeals] = useState<Meal[]>(() => {
    try {
      const savedMeals = localStorage.getItem('nutricoach_meals');
      return savedMeals ? JSON.parse(savedMeals) : [];
    } catch (error) {
      console.error("Failed to parse meals from localStorage", error);
      return [];
    }
  });

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    try {
      const savedHistory = localStorage.getItem('nutricoach_weight_history');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse weight history from localStorage", error);
      return [];
    }
  });
  
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  useEffect(() => {
    if (user) {
      localStorage.setItem('nutricoach_user', JSON.stringify(user));
      if(user.onboardingComplete) {
        startChat(user);
      }
    } else {
        localStorage.removeItem('nutricoach_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('nutricoach_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('nutricoach_weight_history', JSON.stringify(weightHistory));
  }, [weightHistory]);

  const handleOnboardingComplete = (newUser: User) => {
    setUser(newUser);
    setWeightHistory([{ date: new Date().toISOString().split('T')[0], weight: newUser.profile.initialWeight }]);
    setCurrentView('dashboard');
  };

  const handleAddMeal = (newMeal: Meal) => {
    setMeals(prevMeals => [...prevMeals, newMeal]);
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals(prevMeals => prevMeals.filter(meal => meal.id !== mealId));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleAddWeight = (newWeight: number) => {
      const newEntry: WeightEntry = {
          date: new Date().toISOString().split('T')[0],
          weight: newWeight,
      };
      setWeightHistory(prev => {
          const todayIndex = prev.findIndex(entry => entry.date === newEntry.date);
          if (todayIndex > -1) {
              const updatedHistory = [...prev];
              updatedHistory[todayIndex] = newEntry;
              return updatedHistory;
          }
          return [...prev, newEntry].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
  };
  
  if (!user || !user.onboardingComplete) {
    return <OnboardingWizard onOnboardingComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'chat') {
    return <AICoachChat user={user} meals={meals} onNavigate={handleNavigate} />;
  }

  if (currentView === 'profile') {
    return <ProfileView user={user} onSave={handleUpdateUser} onNavigate={handleNavigate} />;
  }

  return (
    <Dashboard 
      user={user}
      meals={meals}
      weightHistory={weightHistory}
      onAddMeal={handleAddMeal}
      onAddWeight={handleAddWeight}
      onNavigate={handleNavigate}
      onDeleteMeal={handleDeleteMeal}
    />
  );
};

export default App;