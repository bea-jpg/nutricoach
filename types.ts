export interface Micronutrient {
  nome: string;
  quantita: number;
  unita: string;
}

export interface Nutrients {
  calorie: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
  micronutrienti?: Micronutrient[];
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'femmina' | 'maschio';
  height: number;
  initialWeight: number;
}

export type Goal = 'perdere_peso' | 'mantenere_peso' | 'aumentare_massa';

export type ActivityLevel = 'sedentario' | 'leggero' | 'moderato' | 'attivo' | 'molto_attivo';

export interface User {
  profile: UserProfile;
  goal: Goal;
  activityLevel: ActivityLevel;
  preferences: string;
  dailyGoals: Nutrients;
  onboardingComplete: boolean;
  calibrationStartDate: string;
}

export interface Meal {
  id: string;
  name: string;
  timestamp: string;
  nutrients: Nutrients;
  imageUrl?: string;
  description?: string;
  imageMimeType?: string;
  source?: 'image' | 'text' | 'barcode';
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}