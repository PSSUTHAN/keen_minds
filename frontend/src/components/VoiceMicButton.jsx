import React, { useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';

const VoiceMicButton = ({ onSpeechResult }) => {
  const { lang, t, speakText } = useKiosk();
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser version. Please use the touch options or keyboard.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    if (lang === 'hi') recognition.lang = 'hi-IN';
    else if (lang === 'ta') recognition.lang = 'ta-IN';
    else recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      speakText(t.speakNow);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (onSpeechResult && transcript) {
        onSpeechResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={startListening}
      disabled={isListening}
      className={`kiosk-btn flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg text-white transition-all ${
        isListening
          ? "bg-red-600 animate-pulse shadow-lg ring-4 ring-red-300"
          : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-xl"
      }`}
    >
      {isListening ? (
        <>
          <Loader2 className="w-7 h-7 animate-spin" />
          <span>{t.speakNow}</span>
        </>
      ) : (
        <>
          <Mic className="w-7 h-7" />
          <span>{t.micBtn}</span>
        </>
      )}
    </button>
  );
};

export default VoiceMicButton;
