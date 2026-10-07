import React, { useEffect } from 'react';
import { UserPlus, Stethoscope, FileText, Sparkles, ShieldCheck, Volume2, Leaf, ArrowRight } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';

const LandingPage = () => {
  const { lang, setLang, ayushMode, setAyushMode, setCurrentPage, t, speakText } = useKiosk();

  useEffect(() => {
    speakText(t.welcome);
  }, [lang]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-blue-50 via-slate-50 to-blue-100/50 p-6 flex flex-col justify-between">
      
      {/* Top Banner */}
      <div className="max-w-5xl mx-auto text-center mt-6">
        
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-sm mb-4 border border-blue-200 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
          <span>AI-Powered Digital Clinical History & Triage System for Indian Hospitals</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Welcome to <span className="text-blue-600 underline decoration-blue-400 decoration-4">MediKiosk</span>
        </h1>

        <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto mb-6">
          Record your medical complaints in your native language via voice or touchscreen, scan past prescriptions, and get a structured summary for your doctor.
        </p>

        {/* Read Aloud Helper */}
        <div className="flex justify-center mb-8">
          <AudioGuideButton textToRead={t.welcome} label="Listen Instructions" size="large" />
        </div>

        {/* Language Selection Buttons (Big Touch Targets) */}
        <div className="bg-white p-4 rounded-3xl shadow-xl max-w-xl mx-auto border border-slate-200 mb-10">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {t.selectLanguage}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setLang('en'); speakText("English selected"); }}
              className={`py-4 px-3 rounded-2xl font-bold text-lg transition-all border ${
                lang === 'en'
                  ? "bg-blue-600 text-white border-blue-800 shadow-lg scale-105"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
              }`}
            >
              English
            </button>

            <button
              onClick={() => { setLang('hi'); speakText("हिंदी भाषा चुनी गई", 'hi'); }}
              className={`py-4 px-3 rounded-2xl font-bold text-lg transition-all border ${
                lang === 'hi'
                  ? "bg-blue-600 text-white border-blue-800 shadow-lg scale-105"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
              }`}
            >
              हिंदी
            </button>

            <button
              onClick={() => { setLang('ta'); speakText("தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது", 'ta'); }}
              className={`py-4 px-3 rounded-2xl font-bold text-lg transition-all border ${
                lang === 'ta'
                  ? "bg-blue-600 text-white border-blue-800 shadow-lg scale-105"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
              }`}
            >
              தமிழ்
            </button>
          </div>
        </div>

      </div>

      {/* Main Touchscreen Action Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
        
        {/* Card 1: Start Patient Intake */}
        <button
          onClick={() => setCurrentPage('register')}
          className="kiosk-btn bg-blue-600 hover:bg-blue-700 text-white p-8 rounded-3xl shadow-2xl flex flex-col justify-between text-left group relative overflow-hidden border-2 border-blue-600"
        >
          <div className="absolute right-[-20px] bottom-[-20px] text-blue-600/30 group-hover:scale-110 transition-transform">
            <UserPlus className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <UserPlus className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold mb-2">{t.startKiosk}</h2>
            <p className="text-blue-100 text-lg font-medium">
              Register with ABHA ID or Mobile number to begin AI medical history intake.
            </p>
          </div>

          <div className="relative z-10 mt-8 flex items-center gap-3 bg-white/20 w-fit px-5 py-3 rounded-2xl font-bold">
            <span>Begin Registration</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </div>
        </button>

        {/* Card 2: AYUSH Assessment Mode */}
        <button
          onClick={() => {
            setAyushMode(true);
            setCurrentPage('register');
          }}
          className={`kiosk-btn p-8 rounded-3xl shadow-2xl flex flex-col justify-between text-left group relative overflow-hidden border-2 transition-all ${
            ayushMode
              ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white border-amber-500"
              : "bg-white hover:bg-amber-50/50 text-slate-800 border-amber-200"
          }`}
        >
          <div className="absolute right-[-20px] bottom-[-20px] text-amber-500/10 group-hover:scale-110 transition-transform">
            <Leaf className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${ayushMode ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
              <Leaf className="w-9 h-9" />
            </div>
            <h2 className="text-3xl font-extrabold mb-2">{t.ayushMode}</h2>
            <p className={`text-lg font-medium ${ayushMode ? "text-amber-100" : "text-slate-600"}`}>
              {t.ayushModeDesc} (Dushyam, Agni, Prakriti & 10-fold examination).
            </p>
          </div>

          <div className={`relative z-10 mt-8 flex items-center gap-3 w-fit px-5 py-3 rounded-2xl font-bold ${ayushMode ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"}`}>
            <span>Start AYUSH Kiosk</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </div>
        </button>

      </div>

      {/* Footer Info */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ABDM Compliant Mock Architecture & FHIR R4 Ready</span>
        </div>
        <div>
          <span>Emergency? Triage alerts active for nursing station.</span>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
