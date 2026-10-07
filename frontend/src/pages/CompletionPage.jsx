import React, { useEffect } from 'react';
import { CheckCircle2, Printer, QrCode, Home, Sparkles } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';

const CompletionPage = () => {
  const { patient, activeSession, resetKiosk, t, speakText } = useKiosk();

  const tokenNumber = activeSession ? `OPD-${activeSession.id + 40}` : "OPD-A48";

  useEffect(() => {
    speakText("Session completed. Please collect your OPD token.");
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-blue-50 via-slate-50 to-blue-100/40 p-6 flex items-center justify-center">
      <div className="max-w-xl w-full text-center">

        {/* Completion Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
          
          <div className="bg-emerald-100 text-emerald-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-2">{t.completionTitle}</h2>
          <p className="text-slate-500 font-medium text-base mb-8">
            Your clinical history has been formatted and pushed to your attending physician's OPD dashboard.
          </p>

          {/* Queue Token Ticket Container */}
          <div className="bg-gradient-to-br from-blue-900 to-health-dark text-white p-6 rounded-3xl shadow-xl border-2 border-blue-500 mb-8 text-center relative overflow-hidden">
            
            <div className="text-xs uppercase tracking-widest font-extrabold text-blue-300 mb-2">
              {t.queueToken}
            </div>

            <div className="text-6xl font-black tracking-tight text-white my-3 font-mono">
              {tokenNumber}
            </div>

            <div className="text-sm font-bold text-blue-100 border-t border-blue-700/60 pt-3 mt-3">
              Patient: {patient?.name || "Ramesh Kumar"} | Age: {patient?.age || 45} yrs
            </div>

            {/* QR Code Graphic */}
            <div className="bg-white p-3 rounded-2xl w-fit mx-auto mt-4 shadow-md">
              <QrCode className="w-24 h-24 text-slate-900" />
            </div>

            <p className="text-xs text-blue-300 mt-3">
              Scan at Doctor Desk or Nursing Station
            </p>

          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePrint}
              className="w-full kiosk-btn bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-blue-600"
            >
              <Printer className="w-6 h-6" />
              <span>{t.printSummary}</span>
            </button>

            <button
              onClick={() => setCurrentPage('dashboard')}
              className="w-full py-4 rounded-2xl font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 text-base flex items-center justify-center gap-2 border border-blue-200"
            >
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span>Return to Patient Dashboard</span>
            </button>

            <button
              onClick={resetKiosk}
              className="w-full py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Log Out & Return to Login</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default CompletionPage;
