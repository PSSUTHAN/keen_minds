import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';

const AudioGuideButton = ({ textToRead, label = "Read Aloud", size = "normal" }) => {
  const { audioGuidance, speakText } = useKiosk();

  if (!audioGuidance) return null;

  return (
    <button
      type="button"
      onClick={() => speakText(textToRead)}
      className={`inline-flex items-center gap-2 font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-sm active:scale-95 ${
        size === "large" ? "px-5 py-3 text-lg" : "px-3 py-1.5 text-sm"
      }`}
      title="Listen to Audio Guidance"
    >
      <Volume2 className={size === "large" ? "w-6 h-6 text-blue-600 animate-pulse" : "w-4 h-4 text-blue-600"} />
      <span>{label}</span>
    </button>
  );
};

export default AudioGuideButton;
