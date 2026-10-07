import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const KioskContext = createContext();

export const KioskProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const [audioGuidance, setAudioGuidance] = useState(true);
  const [ayushMode, setAyushMode] = useState(false);

  // Authentication & RBAC states
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('medikiosk_token') || null);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('medikiosk_role') || null);
  const [patient, setPatient] = useState(() => {
    try {
      const saved = localStorage.getItem('medikiosk_patient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [doctorUser, setDoctorUser] = useState(() => {
    try {
      const saved = localStorage.getItem('medikiosk_doctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeSession, setActiveSession] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  
  // Starting page based on active role
  const [currentPage, setCurrentPage] = useState(() => {
    const role = localStorage.getItem('medikiosk_role');
    if (role === 'DOCTOR') return 'doctor';
    if (role === 'PATIENT') return 'dashboard';
    return 'login';
  });

  const t = translations[lang] || translations.en;

  // Web Speech Synthesis (Text-to-Speech) wrapper for Accessible Kiosk
  const speakText = (text, overrideLang = null) => {
    if (!audioGuidance || !text || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const targetLang = overrideLang || lang;
    if (targetLang === 'hi') utterance.lang = 'hi-IN';
    else if (targetLang === 'ta') utterance.lang = 'ta-IN';
    else utterance.lang = 'en-IN';

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const triggerEmergency = (warningSymptom) => {
    setEmergencyAlert({
      symptom: warningSymptom,
      timestamp: new Date().toLocaleTimeString()
    });
    speakText("Warning! Critical symptom detected. Hospital staff have been notified immediately.", lang);
  };

  const clearEmergency = () => {
    setEmergencyAlert(null);
  };

  // RBAC Login Handlers
  const loginAsPatient = (token, patientData) => {
    setAuthToken(token);
    setUserRole('PATIENT');
    setPatient(patientData);
    setDoctorUser(null);
    localStorage.setItem('medikiosk_token', token);
    localStorage.setItem('medikiosk_role', 'PATIENT');
    localStorage.setItem('medikiosk_patient', JSON.stringify(patientData));
    localStorage.removeItem('medikiosk_doctor');
    setCurrentPage('dashboard');
  };

  const loginAsDoctor = (token, doctorData) => {
    setAuthToken(token);
    setUserRole('DOCTOR');
    setDoctorUser(doctorData);
    setPatient(null);
    localStorage.setItem('medikiosk_token', token);
    localStorage.setItem('medikiosk_role', 'DOCTOR');
    localStorage.setItem('medikiosk_doctor', JSON.stringify(doctorData));
    localStorage.removeItem('medikiosk_patient');
    setCurrentPage('doctor');
  };

  const logout = () => {
    setAuthToken(null);
    setUserRole(null);
    setPatient(null);
    setDoctorUser(null);
    setActiveSession(null);
    setEmergencyAlert(null);
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_role');
    localStorage.removeItem('medikiosk_patient');
    localStorage.removeItem('medikiosk_doctor');
    setCurrentPage('login');
  };

  const logoutPatient = () => {
    logout();
  };

  const logoutDoctor = () => {
    setAuthToken(null);
    setUserRole(null);
    setDoctorUser(null);
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_role');
    localStorage.removeItem('medikiosk_doctor');
    setCurrentPage('doctor-login');
  };

  const resetKiosk = () => {
    logout();
  };

  return (
    <KioskContext.Provider
      value={{
        lang,
        setLang,
        audioGuidance,
        setAudioGuidance,
        ayushMode,
        setAyushMode,
        authToken,
        userRole,
        patient,
        setPatient,
        doctorUser,
        setDoctorUser,
        activeSession,
        setActiveSession,
        emergencyAlert,
        triggerEmergency,
        clearEmergency,
        currentPage,
        setCurrentPage,
        t,
        speakText,
        loginAsPatient,
        loginAsDoctor,
        logout,
        logoutPatient,
        logoutDoctor,
        resetKiosk
      }}
    >
      {children}
    </KioskContext.Provider>
  );
};

export const useKiosk = () => useContext(KioskContext);
