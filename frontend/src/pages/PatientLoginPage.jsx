import React, { useState, useEffect } from 'react';
import { User, Phone, CreditCard, ArrowRight, Sparkles, CheckCircle2, UserCheck, ShieldCheck, HeartPulse, UserPlus, LogIn, RefreshCw } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { patientLogin, registerPatient, listPatients } from '../services/api';

const PatientLoginPage = () => {
  const { lang, setLang, setPatient, setCurrentPage, t, speakText } = useKiosk();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [loginInput, setLoginInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoPatients, setDemoPatients] = useState([]);

  // New Patient Registration form
  const [regForm, setRegForm] = useState({
    name: '',
    age: '45',
    gender: 'Male',
    phone: '',
    emergency_contact: '',
    abha_id: ''
  });

  useEffect(() => {
    speakText(t.loginPrompt || "Welcome to MediKiosk. Please enter your mobile number or ABHA ID to log in.");
    loadDemoPatients();
  }, [lang]);

  const loadDemoPatients = async () => {
    try {
      const list = await listPatients();
      if (list && list.length > 0) {
        setDemoPatients(list.slice(0, 4));
      }
    } catch (err) {
      console.warn("Could not load patient list from backend", err);
    }
  };

  const handleLogin = async (overrideValue = null) => {
    const val = (overrideValue || loginInput).trim();
    if (!val) {
      setErrorMsg("Please enter your Mobile Number or ABHA ID.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // Try login by phone or ABHA
      const isAbha = val.includes('-') || val.length > 12;
      const patient = await patientLogin(isAbha ? null : val, isAbha ? val : null);
      setPatient(patient);
      speakText(`${t.welcomePatient || 'Welcome'}, ${patient.name}`);
      setCurrentPage('dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg("Patient record not found. Please check number or register as a new patient.");
      speakText("Patient record not found. Please register as a new patient.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      setErrorMsg("Please enter Full Name and Mobile Number.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const newPatient = await registerPatient({
        name: regForm.name.trim(),
        age: parseInt(regForm.age, 10) || 45,
        gender: regForm.gender,
        phone: regForm.phone.trim(),
        emergency_contact: regForm.emergency_contact?.trim() || null,
        preferred_language: lang,
        abha_id: regForm.abha_id?.trim() || null
      });

      setPatient(newPatient);
      speakText(`${t.welcomePatient || 'Welcome'}, ${newPatient.name}`);
      setCurrentPage('dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg("Registration failed. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (p) => {
    setPatient(p);
    speakText(`${t.welcomePatient || 'Welcome'}, ${p.name}`);
    setCurrentPage('dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b bg-slate-50 p-4 sm:p-8 flex flex-col justify-between">
      
      {/* Top Banner */}
      <div className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm mb-3 border border-blue-200 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
          <span>{t.subTitle || "AI-Powered Digital Clinical History Platform"}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
          {t.appTitle} – <span className="text-blue-600">{t.patientPortalLogin || "Patient Login"}</span>
        </h1>
        <p className="text-slate-600 font-medium text-sm sm:text-base max-w-xl mx-auto">
          {t.loginPrompt || "Enter your Mobile Number or ABHA ID to access your dashboard"}
        </p>

        {/* Audio Assistance */}
        <div className="flex justify-center mt-3">
          <AudioGuideButton textToRead={t.loginPrompt || "Please enter your mobile number or ABHA ID to log in"} label="Listen Instructions" />
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'login'
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-5 h-5" />
            <span>{t.existingPatientTab || "Existing Patient Login"}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'register'
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>{t.newPatientTab || "New Patient Registration"}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Existing Patient Login */}
        {activeTab === 'login' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span>{t.phone} / {t.abhaNumber}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter Mobile (e.g. 9876543210) or ABHA ID"
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLogin()}
              disabled={loading}
              className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-2 transition-transform disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Log In to Dashboard</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>

            {/* Quick Demo Patients Section */}
            <div className="pt-6 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>{t.quickDemoLogin || "Quick 1-Click Demo Patients"}</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLogin('9876543210')}
                  className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition-all group"
                >
                  <p className="font-extrabold text-slate-900 group-hover:text-blue-900 text-sm">
                    Ramesh Kumar (58 M)
                  </p>
                  <p className="text-xs text-blue-700 font-medium">
                    Phone: 9876543210 • English Mode
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin('9876543220')}
                  className="p-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left transition-all group"
                >
                  <p className="font-extrabold text-slate-900 group-hover:text-amber-900 text-sm">
                    Sunita Devi (46 F)
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    Phone: 9876543220 • AYUSH Mode
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin('9876543230')}
                  className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition-all group sm:col-span-2"
                >
                  <p className="font-extrabold text-slate-900 group-hover:text-blue-900 text-sm">
                    Muthu Kumar (62 M)
                  </p>
                  <p className="text-xs text-blue-700 font-medium">
                    Phone: 9876543230 • தமிழ் (Tamil)
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: New Patient Registration */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {t.fullName} *
              </label>
              <input
                type="text"
                required
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.age} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={regForm.age}
                  onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.gender} *
                </label>
                <select
                  value={regForm.gender}
                  onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {t.phone} *
              </label>
              <input
                type="tel"
                required
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {t.abhaNumber} (Optional)
              </label>
              <input
                type="text"
                value={regForm.abha_id}
                onChange={(e) => setRegForm({ ...regForm, abha_id: e.target.value })}
                placeholder="e.g. 91-4582-9901-1234"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-2 transition-transform disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register & Go to Dashboard</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ayushman Bharat Digital Mission (ABDM) Compatible</span>
        </div>
        <div>
          <span>Emergency Triage Alert active on all hospital kiosks</span>
        </div>
      </div>

    </div>
  );
};

export default PatientLoginPage;

