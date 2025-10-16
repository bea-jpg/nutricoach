import React, { useState, useEffect, useRef } from 'react';
import { User, Meal, ChatMessage } from '../../types';
import { AppView } from '../../App';
import { chatWithAICoach, startChat } from '../../services/geminiService';
import { SendIcon, LeftArrowIcon } from '../shared/Icons';

interface AICoachChatProps {
    user: User;
    meals: Meal[];
    onNavigate: (view: AppView) => void;
}

const formatMessage = (text: string): string => {
    // Escape HTML to prevent XSS, except for the tags we're about to add.
    let formattedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Bold: **text** -> <strong>text</strong>
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Lists: * item -> <ul><li>item</li>...</ul>
    // This is a bit more complex as we need to wrap the list items in a <ul> tag.
    formattedText = formattedText.replace(/^\s*[\*\-]\s(.*)$/gm, '<li>$1</li>');
    if (formattedText.includes('<li>')) {
        formattedText = `<ul>${formattedText}</ul>`.replace(/<\/li>\n/g, '</li>').replace(/<\/li>(\s*<ul>)/g, '</li></ul>$1').replace(/(<\/li>)(?!<\/ul>)/g, '</li>\n');
    }
    
    // Newlines: \n -> <br /> (but not inside lists)
    if (!formattedText.includes('<ul>')) {
        formattedText = formattedText.replace(/\n/g, '<br />');
    }
    
    return formattedText;
};


export const AICoachChat: React.FC<AICoachChatProps> = ({ user, meals, onNavigate }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        startChat(user);
        setMessages([{
            role: 'model',
            text: `Ciao ${user.profile.name}! Sono il tuo NutriCoach AI. Come posso aiutarti oggi?`
        }]);
    }, [user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const responseText = await chatWithAICoach([...messages, userMessage], input);
        
        const modelMessage: ChatMessage = { role: 'model', text: responseText };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center space-x-4 z-10">
                <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                   <LeftArrowIcon className="w-6 h-6 text-gray-700 dark:text-gray-200"/>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">NutriCoach AI</h1>
                  <p className="text-sm text-green-500">Online</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-green-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                            <div className="prose prose-sm dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-li:my-0 prose-strong:text-current" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xs px-4 py-3 rounded-2xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="bg-white dark:bg-gray-800 p-4 shadow-top">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading} className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition disabled:bg-gray-400">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </footer>
        </div>
    );
};