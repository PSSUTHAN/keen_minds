import React from 'react';
import { AlertTriangle, BellRing, X } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';

const EmergencyBanner = () => {
  const { emergencyAlert, clearEmergency, t } = useKiosk();

  if (!emergencyAlert) return null;

  return (
    <div className="bg-red-600 text-white px-6 py-4 shadow-xl border-b-4 border-red-800 animate-bounce sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white text-red-600 p-3 rounded-full animate-ping">
            <BellRing className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              {t.emergencyAlertTitle}: {emergencyAlert.symptom}
            </h3>
            <p className="text-red-100 font-medium text-base mt-0.5">
              {t.emergencyAlertDesc} Please remain seated.
            </p>
          </div>
        </div>
        <button
          onClick={clearEmergency}
          className="bg-red-800 hover:bg-red-900 text-white p-2 rounded-xl transition-all"
          title="Dismiss Alert Overlay"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default EmergencyBanner;
