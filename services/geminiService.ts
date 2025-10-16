import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { User, Meal, ChatMessage, Nutrients } from './types';

let ai: GoogleGenAI;
let chat: Chat;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const getSystemInstruction = (user: User): string => {
    return `Sei NutriCoach AI, un coach nutrizionale esperto e amichevole.
    Il tuo obiettivo è aiutare l'utente, ${user.profile.name}, a raggiungere il suo obiettivo: ${user.goal}.
    Ecco i dettagli dell'utente:
    - Età: ${user.profile.age}
    - Sesso: ${user.profile.gender}
    - Altezza: ${user.profile.height} cm
    - Peso iniziale: ${user.profile.initialWeight} kg
    - Livello di attività: ${user.activityLevel}
    - Preferenze/Allergie: ${user.preferences || 'Nessuna specificata'}
    - Obiettivi giornalieri: ${user.dailyGoals.calorie} kcal, ${user.dailyGoals.proteine}g proteine, ${user.dailyGoals.carboidrati}g carboidrati, ${user.dailyGoals.grassi}g grassi.

    Parla in italiano. Sii incoraggiante, positivo e fornisci consigli basati su prove scientifiche, ma in modo semplice e comprensibile.
    Non dare consigli medici. Se ti vengono chieste informazioni mediche, consiglia di consultare un medico.
    Personalizza le tue risposte in base ai dati dell'utente.`;
};

export const startChat = (user: User) => {
    const ai = getAI();
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: getSystemInstruction(user),
        },
    });
};

export const chatWithAICoach = async (messages: ChatMessage[], latestMessage: string): Promise<string> => {
    if (!chat) {
        throw new Error("Chat not initialized. Please start the chat first.");
    }
    try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: latestMessage });
        return result.text;
    } catch (error) {
        console.error("Error chatting with AI coach:", error);
        return "Mi dispiace, sto avendo qualche problema a connettermi. Riprova tra poco.";
    }
};

export const getAICoachAdvice = async (user: User, mealsToday: Meal[]): Promise<string> => {
    const ai = getAI();

    const mealsSummary = mealsToday.length > 0 
        ? `I pasti di oggi sono: ${mealsToday.map(m => m.name).join(', ')}.`
        : "L'utente non ha ancora registrato pasti oggi.";

    const totalIntake = mealsToday.reduce((acc, meal) => {
        acc.calorie += meal.nutrients.calorie;
        acc.proteine += meal.nutrients.proteine;
        return acc;
    }, { calorie: 0, proteine: 0 });

    const prompt = `L'utente ${user.profile.name} ha consumato ${Math.round(totalIntake.calorie)} calorie e ${Math.round(totalIntake.proteine)}g di proteine oggi. ${mealsSummary}
    Il suo obiettivo giornaliero è di ${user.dailyGoals.calorie} calorie.
    Basandoti su questi dati, fornisci un breve (1-2 frasi) consiglio personalizzato, incoraggiante e pratico per il resto della giornata. 
    Parla direttamente all'utente (es. "Ciao ${user.profile.name}, ..."). Sii conciso e positivo. Non ripetere i dati numerici che ti ho dato.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: getSystemInstruction(user),
                temperature: 0.7,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting AI coach advice:", error);
        return "Non è stato possibile caricare il consiglio in questo momento.";
    }
};

const nutrientSchema = {
    type: Type.OBJECT,
    properties: {
        calorie: { type: Type.NUMBER, description: "Calorie totali del pasto (in kcal)" },
        proteine: { type: Type.NUMBER, description: "Proteine totali del pasto (in grammi)" },
        carboidrati: { type: Type.NUMBER, description: "Carboidrati totali del pasto (in grammi)" },
        grassi: { type: Type.NUMBER, description: "Grassi totali del pasto (in grammi)" },
        description: { type: Type.STRING, description: "Una breve descrizione del pasto analizzato, 1-2 frasi." },
        nome: { type: Type.STRING, description: "Un nome breve e descrittivo per il pasto (es. 'Insalata di pollo', 'Piatto di pasta al pesto')." },
        micronutrienti: {
            type: Type.ARRAY,
            description: "Elenco dei 3-5 micronutrienti più significativi (vitamine, minerali) presenti nel pasto. Includi solo quelli presenti in quantità rilevanti.",
            items: {
                type: Type.OBJECT,
                properties: {
                    nome: { type: Type.STRING, description: "Nome del micronutriente (es. 'Vitamina C', 'Ferro')" },
                    quantita: { type: Type.NUMBER, description: "Quantità del micronutriente." },
                    unita: { type: Type.STRING, description: "Unità di misura (es. 'mg', 'mcg')" }
                },
                required: ["nome", "quantita", "unita"]
            }
        }
    },
    required: ["calorie", "proteine", "carboidrati", "grassi", "description", "nome"]
};

const parseAndValidateNutrients = (jsonText: string): Nutrients & { name: string; description: string } => {
    const parsedJson = JSON.parse(jsonText);
    
    const nutrients: Nutrients = {
        calorie: Number(parsedJson.calorie) || 0,
        proteine: Number(parsedJson.proteine) || 0,
        carboidrati: Number(parsedJson.carboidrati) || 0,
        grassi: Number(parsedJson.grassi) || 0,
        micronutrienti: parsedJson.micronutrienti || [],
    };

    return {
        ...nutrients,
        name: parsedJson.nome || "Pasto Analizzato",
        description: parsedJson.description || "Descrizione non disponibile."
    };
};

export const analyzeMealFromImageAndText = async (imageDataBase64: string, imageMimeType: string, mealDescription: string): Promise<Nutrients & { name: string; description: string }> => {
    const ai = getAI();
    const imagePart = {
        inlineData: {
            data: imageDataBase64,
            mimeType: imageMimeType,
        },
    };
    
    const textPart = {
        text: `Analizza l'immagine di questo pasto. Se l'utente fornisce una descrizione, usala per migliorare l'analisi. Descrizione utente: "${mealDescription || 'Nessuna'}".
        Fornisci una stima dei valori nutrizionali (calorie, proteine, carboidrati, grassi) e dei principali micronutrienti.
        Restituisci anche un nome per il piatto e una breve descrizione. Parla in italiano.`,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: nutrientSchema,
            },
        });
        
        return parseAndValidateNutrients(response.text.trim());

    } catch (error) {
        console.error("Error analyzing meal with AI:", error);
        throw new Error("Non è stato possibile analizzare il pasto. Riprova.");
    }
};

export const analyzeMealFromText = async (mealDescription: string): Promise<Nutrients & { name: string; description: string }> => {
    const ai = getAI();
    
    const textPart = {
        text: `Analizza questo pasto descritto dall'utente: "${mealDescription}".
        Fornisci una stima dei valori nutrizionali (calorie, proteine, carboidrati, grassi) e dei principali micronutrienti.
        Restituisci anche un nome per il piatto e una breve descrizione. Parla in italiano.`,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: nutrientSchema,
            },
        });
        
        return parseAndValidateNutrients(response.text.trim());

    } catch (error) {
        console.error("Error analyzing meal from text:", error);
        throw new Error("Non è stato possibile analizzare il pasto. Riprova.");
    }
};

export const fetchProductFromBarcode = async (barcode: string): Promise<(Nutrients & { name: string; description: string, imageUrl?: string }) | null> => {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.status === 0 || !data.product) return null;

        const p = data.product;
        const n = p.nutriments;
        
        const nutrients: Nutrients = {
            calorie: n['energy-kcal_100g'] || n.energy_100g / 4.184 || 0,
            proteine: n.proteins_100g || 0,
            carboidrati: n.carbohydrates_100g || 0,
            grassi: n.fat_100g || 0,
            micronutrienti: [], // OFF has too many to parse simply, so we skip for now.
        };

        return {
            ...nutrients,
            name: p.product_name || 'Prodotto Sconosciuto',
            description: `Dati nutrizionali per 100g di prodotto, forniti da Open Food Facts.`,
            imageUrl: p.image_url,
        };
    } catch (error) {
        console.error("Error fetching product from barcode:", error);
        return null;
    }
};
