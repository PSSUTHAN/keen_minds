import React, { useState } from 'react';
import { ShieldCheck, CheckSquare, Square, Volume2, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { updateSessionConsent } from '../services/api';

const ConsentPage = () => {
  const { activeSession, setCurrentPage, t, speakText } = useKiosk();

  const [agreed, setAgreed] = useState(true);
  const [abdmAgreed, setAbdmAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!agreed) {
      alert("Please accept the clinical history record consent to proceed.");
      return;
    }

    setLoading(true);
    try {
      if (activeSession) {
        await updateSessionConsent(activeSession.id, true);
      }
      speakText(t.chief_complaint || "Please share your main symptom today.");
      setCurrentPage('history');
    } catch (err) {
      console.error(err);
      setCurrentPage('history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentPage('register')}
            className="flex items-center gap-2 text-slate-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <AudioGuideButton textToRead={t.consentDetail} label="Read Consent Aloud" size="large" />
        </div>

        {/* Consent Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="bg-blue-100 text-blue-700 p-4 rounded-2xl">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">{t.consentTitle}</h2>
              <p className="text-sm text-slate-500 font-medium">Digital Data Protection & Patient Rights Protocol</p>
            </div>
          </div>

          {/* Consent Text */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-700 font-medium leading-relaxed mb-6 space-y-3">
            <p className="text-base">{t.consentDetail}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pt-2 border-t border-slate-200">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>All medical information is encrypted end-to-end and stored locally in compliance with Indian healthcare regulations.</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 mb-8">
            
            <div
              onClick={() => setAgreed(!agreed)}
              className={`p-4 rounded-2xl border-2 flex items-start gap-4 cursor-pointer transition-all ${
                agreed ? "bg-blue-50/70 border-blue-600 text-blue-900" : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              {agreed ? <CheckSquare className="w-7 h-7 text-blue-600 flex-shrink-0 mt-0.5" /> : <Square className="w-7 h-7 text-slate-400 flex-shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-bold text-lg">I consent to AI history taking and OCR document scanning</h4>
                <p className="text-sm text-slate-600">Allows MediKiosk to structure clinical records for doctor consultation.</p>
              </div>
            </div>

            <div
              onClick={() => setAbdmAgreed(!abdmAgreed)}
              className={`p-4 rounded-2xl border-2 flex items-start gap-4 cursor-pointer transition-all ${
                abdmAgreed ? "bg-blue-50/70 border-blue-600 text-blue-900" : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              {abdmAgreed ? <CheckSquare className="w-7 h-7 text-blue-600 flex-shrink-0 mt-0.5" /> : <Square className="w-7 h-7 text-slate-400 flex-shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-bold text-lg">{t.abdmConsent}</h4>
                <p className="text-sm text-slate-600">Formats clinical summaries into FHIR R4 Bundle resources for Ayushman Bharat Digital Mission.</p>
              </div>
            </div>

          </div>

          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setCurrentPage('landing')}
              className="py-4 px-6 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-lg"
            >
              {t.declineConsent}
            </button>

            <button
              onClick={handleAccept}
              disabled={loading}
              className="kiosk-btn py-4 px-6 rounded-2xl font-extrabold text-white bg-blue-600 hover:bg-blue-700 text-xl shadow-xl flex items-center justify-center gap-3"
            >
              {loading ? (
                <span>Loading Interview...</span>
              ) : (
                <>
                  <span>{t.acceptConsent}</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ConsentPage;
