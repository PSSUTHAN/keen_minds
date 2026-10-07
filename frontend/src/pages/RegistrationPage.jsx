import React, { useState } from 'react';
import { User, Phone, CreditCard, Calendar, ArrowRight, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { registerPatient, lookupPatient, startKioskSession } from '../services/api';

const RegistrationPage = () => {
  const { lang, ayushMode, setPatient, setActiveSession, setCurrentPage, t, speakText } = useKiosk();

  const [formData, setFormData] = useState({
    name: '',
    age: '45',
    gender: 'Male',
    phone: '',
    emergency_contact: '',
    abha_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');

  const handleLookup = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setLookupMessage('');
    try {
      const found = await lookupPatient(searchQuery, searchQuery);
      setFormData({
        name: found.name,
        age: String(found.age),
        gender: found.gender,
        phone: found.phone,
        emergency_contact: found.emergency_contact || '',
        abha_id: found.abha_id || ''
      });
      setLookupMessage(`Found record for ${found.name}!`);
      speakText(`Found existing record for ${found.name}`);
    } catch (err) {
      setLookupMessage("No existing record found. Please fill in details below.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please enter Name and Phone number.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register Patient
      const registeredPatient = await registerPatient({
        name: formData.name,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        phone: formData.phone,
        emergency_contact: formData.emergency_contact,
        preferred_language: lang,
        abha_id: formData.abha_id || null
      });

      setPatient(registeredPatient);

      // 2. Start Session
      const session = await startKioskSession(registeredPatient.id, lang, ayushMode);
      setActiveSession(session);

      speakText(t.consent);
      setCurrentPage('consent');
    } catch (err) {
      console.error(err);
      alert("Registration failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <AudioGuideButton textToRead="Please enter your registration details or mobile number" label="Listen Instructions" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          
          <div className="border-b border-slate-100 pb-6 mb-6">
            <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              <span>{t.patientRegTitle}</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Quick patient check-in. Fill in details or search existing record by Mobile/ABHA ID.
            </p>
          </div>

          {/* Quick Lookup Bar */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 mb-8">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
              Already visited this hospital? Quick Search
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Mobile (e.g. 9876543210) or ABHA ID"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-base"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md"
              >
                <Search className="w-5 h-5" />
                <span>Lookup</span>
              </button>
            </div>
            {lookupMessage && (
              <p className="text-xs font-semibold text-blue-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>{lookupMessage}</span>
              </p>
            )}
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ABHA Number */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>{t.abhaNumber}</span>
              </label>
              <input
                type="text"
                value={formData.abha_id}
                onChange={(e) => setFormData({ ...formData, abha_id: e.target.value })}
                placeholder="e.g. 91-4582-9901-1234 (Optional)"
                className="w-full px-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 font-mono text-base bg-slate-50/50"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>{t.fullName} *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter patient full name"
                className="w-full px-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
              />
            </div>

            {/* Age & Gender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>{t.age} *</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {t.gender} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-3.5 rounded-2xl font-bold text-sm border transition-all ${
                        formData.gender === g
                          ? "bg-blue-600 text-white border-blue-800 shadow-md scale-105"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Phone & Emergency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span>{t.phone} *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-500" />
                  <span>{t.emergencyContact}</span>
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Family / Attender number"
                  className="w-full px-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                />
              </div>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full kiosk-btn bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xl py-5 rounded-3xl shadow-2xl flex items-center justify-center gap-3 border-2 border-blue-600 mt-8"
            >
              {loading ? (
                <span>Registering Kiosk Session...</span>
              ) : (
                <>
                  <span>{t.registerBtn}</span>
                  <ArrowRight className="w-7 h-7" />
                </>
              )}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};

export default RegistrationPage;
