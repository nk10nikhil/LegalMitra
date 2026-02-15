'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'bn';

type Dictionary = Record<string, string>;

const dictionaries: Record<SupportedLanguage, Dictionary> = {
  en: {
    roleDashboard: 'Role Dashboard',
    askLegalAI: 'Ask Legal AI',
    myDocuments: 'My Documents',
    summarizeJudgment: 'Summarize Judgment',
    caseLawSearch: 'Case Law Search',
    profile: 'Profile',
    trackCase: 'Track Case',
    myCases: 'My Cases',
    hearings: 'Hearings',
    notifications: 'Notifications',
    auditTrail: 'Audit Trail',
    myReports: 'My Reports',
    odrRooms: 'ODR Rooms',
    logout: 'Logout',
    skipToContent: 'Skip to content',
    language: 'Language',
  },
  hi: {
    roleDashboard: 'भूमिका डैशबोर्ड',
    askLegalAI: 'कानूनी AI से पूछें',
    myDocuments: 'मेरे दस्तावेज़',
    summarizeJudgment: 'निर्णय सारांश',
    caseLawSearch: 'केस लॉ खोज',
    profile: 'प्रोफ़ाइल',
    trackCase: 'केस ट्रैक करें',
    myCases: 'मेरे केस',
    hearings: 'सुनवाई',
    notifications: 'सूचनाएँ',
    auditTrail: 'ऑडिट ट्रेल',
    myReports: 'मेरी रिपोर्ट्स',
    odrRooms: 'ODR कक्ष',
    logout: 'लॉग आउट',
    skipToContent: 'मुख्य सामग्री पर जाएँ',
    language: 'भाषा',
  },
  ta: {
    roleDashboard: 'பங்கு டாஷ்போர்டு',
    askLegalAI: 'சட்ட AI-யிடம் கேளுங்கள்',
    myDocuments: 'என் ஆவணங்கள்',
    summarizeJudgment: 'தீர்ப்பை சுருக்குக',
    caseLawSearch: 'வழக்கு சட்ட தேடல்',
    profile: 'சுயவிவரம்',
    trackCase: 'வழக்கை கண்காணிக்கவும்',
    myCases: 'என் வழக்குகள்',
    hearings: 'விசாரணைகள்',
    notifications: 'அறிவிப்புகள்',
    auditTrail: 'தணிக்கை பதிவேடு',
    myReports: 'என் அறிக்கைகள்',
    odrRooms: 'ODR அறைகள்',
    logout: 'வெளியேறு',
    skipToContent: 'முக்கிய உள்ளடக்கத்துக்கு செல்லவும்',
    language: 'மொழி',
  },
  te: {
    roleDashboard: 'పాత్ర డ్యాష్‌బోర్డ్',
    askLegalAI: 'లీగల్ AIని అడగండి',
    myDocuments: 'నా పత్రాలు',
    summarizeJudgment: 'తీర్పు సారాంశం',
    caseLawSearch: 'కేసు చట్ట శోధన',
    profile: 'ప్రొఫైల్',
    trackCase: 'కేసును ట్రాక్ చేయండి',
    myCases: 'నా కేసులు',
    hearings: 'విచారణలు',
    notifications: 'నోటిఫికేషన్లు',
    auditTrail: 'ఆడిట్ ట్రైల్',
    myReports: 'నా రిపోర్టులు',
    odrRooms: 'ODR గదులు',
    logout: 'లాగ్ అవుట్',
    skipToContent: 'ప్రధాన విషయానికి వెళ్ళండి',
    language: 'భాష',
  },
  bn: {
    roleDashboard: 'রোল ড্যাশবোর্ড',
    askLegalAI: 'লিগ্যাল AI-কে জিজ্ঞাসা করুন',
    myDocuments: 'আমার ডকুমেন্ট',
    summarizeJudgment: 'রায়ের সারাংশ',
    caseLawSearch: 'কেস ল’ অনুসন্ধান',
    profile: 'প্রোফাইল',
    trackCase: 'কেস ট্র্যাক করুন',
    myCases: 'আমার কেস',
    hearings: 'শুনানি',
    notifications: 'নোটিফিকেশন',
    auditTrail: 'অডিট ট্রেইল',
    myReports: 'আমার রিপোর্ট',
    odrRooms: 'ODR রুম',
    logout: 'লগ আউট',
    skipToContent: 'মূল কন্টেন্টে যান',
    language: 'ভাষা',
  },
};

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (value: SupportedLanguage) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'legalmitra-language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (stored && dictionaries[stored]) {
      setLanguage(stored);
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        setLanguage(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      t: (key) => dictionaries[language][key] ?? dictionaries.en[key] ?? key,
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}

export const languageOptions: Array<{ value: SupportedLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'bn', label: 'বাংলা' },
];
