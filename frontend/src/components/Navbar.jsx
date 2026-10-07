import React from 'react';
import { Cross, Volume2, VolumeX } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';

const Navbar = () => {
  const {
    audioGuidance,
    setAudioGuidance,
    resetKiosk,
    t
  } = useKiosk();

  return (
    <header className="bg-white text-slate-900 shadow-sm sticky top-0 z-40 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        
        {/* Logo & Title */}
        <div
          onClick={resetKiosk}
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              resetKiosk();
            }
          }}
        >
          <div className="bg-blue-50 text-blue-600 border border-blue-100 p-2.5 rounded-2xl group-hover:bg-blue-100 group-hover:scale-105 transition-all shadow-sm">
            <Cross className="w-7 h-7 font-extrabold fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-700 flex items-center gap-2">
              {t?.appTitle || 'MediKiosk'}
              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                AI Hospital Kiosk
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {t?.subTitle || 'Smart Outpatient & Health Support'}
            </p>
          </div>
        </div>

        {/* Controls: Sound / Accessibility Button ONLY */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setAudioGuidance(!audioGuidance)}
            aria-label={audioGuidance ? "Toggle Sound (Enabled)" : "Toggle Sound (Disabled)"}
            aria-pressed={audioGuidance}
            title={audioGuidance ? (t?.audioOn || 'Sound Guidance ON') : (t?.audioOff || 'Sound Guidance OFF')}
            className={`p-2.5 rounded-xl transition-all border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer ${
              audioGuidance
                ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                : "bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 border-slate-200"
            }`}
          >
            {audioGuidance ? (
              <Volume2 className="w-5 h-5 text-blue-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400 hover:text-blue-600" />
            )}
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
