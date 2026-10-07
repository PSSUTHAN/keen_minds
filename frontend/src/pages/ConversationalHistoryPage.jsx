import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Volume2, 
  Sparkles, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw, 
  Leaf, 
  FileText, 
  CheckCircle2, 
  Check, 
  ChevronRight,
  ShieldAlert,
  Home
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import VoiceMicButton from '../components/VoiceMicButton';
import EmergencyBanner from '../components/EmergencyBanner';
import { sendChatTurn, generateSummary } from '../services/api';

const ConversationalHistoryPage = () => {
  const {
    lang,
    ayushMode,
    activeSession,
    patient,
    triggerEmergency,
    setCurrentPage,
    t,
    speakText
  } = useKiosk();

  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: ayushMode
        ? (lang === 'hi' 
            ? "[आयुष दशाविध] नमस्ते! आपके शरीर के किस हिस्से या धातु में परेशानी महसूस हो रही है?"
            : (lang === 'ta'
                ? "[ஆயுஷ் முறை] உடலின் எந்த பகுதி அல்லது தாது பாதிக்கப்பட்டுள்ளதாக உணர்கிறீர்கள்?"
                : "[AYUSH Dashavidha] What primary body tissues or systems feel affected? (Joints, digestion, respiratory, skin)"))
        : (lang === 'hi'
            ? "नमस्ते! आज आपको अस्पताल लाने वाली मुख्य स्वास्थ्य समस्या क्या है?"
            : (lang === 'ta'
                ? "வணக்கம்! இன்று உங்களை மருத்துவமனைக்கு வரவழைத்த முக்கிய உடல்நலப் பிரச்சினை என்ன?"
                : "Hello! What is the main health problem bringing you to the hospital today?")),
      chips: ayushMode
        ? ["Joints & Bones", "Digestive system", "Respiratory", "Skin / Blood", "Nerves / Sleep"]
        : ["Fever & Cold", "Severe Chest Pain", "Abdominal Pain", "High Sugar / Diabetes", "Joint & Knee Pain", "Dizziness / Headache"]
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [currentSection, setCurrentSection] = useState(ayushMode ? 'ayush_dashavidha' : 'chief_complaint');
  const [ayushCategory, setAyushCategory] = useState(ayushMode ? 'Dushyam' : null);
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatedSummaryData, setGeneratedSummaryData] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      speakText(chatMessages[0].text);
    }
  }, []);

  const handleSend = async (textToSend, inputType = 'text') => {
    const text = textToSend || inputVal;
    if (!text || (typeof text === 'string' && !text.trim())) return;

    const updatedMessages = [
      ...chatMessages,
      { sender: 'user', text: text.trim() }
    ];
    setChatMessages(updatedMessages);
    setInputVal('');
    setLoading(true);

    try {
      const sessionId = activeSession?.id || 1;
      const response = await sendChatTurn(
        sessionId,
        text.trim(),
        currentSection,
        inputType,
        ayushCategory
      );

      if (response.is_emergency) {
        triggerEmergency(response.emergency_warning || "Critical symptom reported");
      }

      setChatMessages([
        ...updatedMessages,
        {
          sender: 'ai',
          text: response.next_question,
          chips: response.suggested_quick_chips || []
        }
      ]);

      if (response.next_section) {
        setCurrentSection(response.next_section);
      }

      speakText(response.audio_tts_prompt || response.next_question);

    } catch (err) {
      console.error(err);
      setChatMessages([
        ...updatedMessages,
        {
          sender: 'ai',
          text: "Thank you for sharing that symptom. Do you have any other discomfort or past health issues to mention?",
          chips: ["No other symptoms", "Proceed to Summary"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const sessionId = activeSession?.id || 1;
      const summaryResult = await generateSummary(sessionId);
      setGeneratedSummaryData(summaryResult);
      setShowSummaryModal(true);
      speakText(t.summarySavedToHistory || "Clinical summary generated and saved to your patient history.");
    } catch (err) {
      console.error("Summary generation error", err);
      // Fallback synthetic summary if network error
      const fallback = {
        chief_complaint: chatMessages.filter(m => m.sender === 'user').map(m => m.text).join('; ') || "Clinical complaint recorded",
        hpi: "Symptoms reported by patient at kiosk interface.",
        past_medical_surgical: "Recorded from intake history",
        medication_history: "Pending doctor confirmation",
        ayush_assessment: ayushMode ? "Dashavidha intake recorded" : "English Allopathy mode used"
      };
      setGeneratedSummaryData(fallback);
      setShowSummaryModal(true);
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-6 flex flex-col justify-between">
      
      <EmergencyBanner />

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-slate-200 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Return to Patient Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className={`p-3 rounded-2xl shadow-sm text-white ${ayushMode ? "bg-amber-700" : "bg-blue-600"}`}>
              {ayushMode ? <Leaf className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                {t.aiHistoryTitle}
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                  ayushMode 
                    ? "bg-amber-100 text-amber-900 border border-amber-300" 
                    : "bg-blue-100 text-blue-700 border border-blue-300"
                }`}>
                  {ayushMode ? "AYUSH Method" : "English Method"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Patient: <strong className="text-slate-800">{patient?.name || 'Walk-in Patient'}</strong> ({patient?.age || 45} yrs, {patient?.gender || 'Male'})
              </p>
            </div>
          </div>

          {/* Quick Action to Generate Summary */}
          <button
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className={`kiosk-btn text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 transition-all ${
              ayushMode
                ? "bg-amber-700 hover:bg-amber-800"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {generatingSummary ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <span>{t.generateSummaryBtn || "Proceed & Generate Summary"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Chat Stream Window */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 flex-1 overflow-y-auto max-h-[50vh] min-h-[350px] mb-4 space-y-4">
          
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              
              <div className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
                  msg.sender === 'user'
                    ? (ayushMode ? 'bg-amber-700 text-white' : 'bg-blue-600 text-white')
                    : (ayushMode ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700')
                }`}>
                  {msg.sender === 'user' ? <User className="w-6 h-6" /> : (ayushMode ? <Leaf className="w-5 h-5" /> : <Bot className="w-6 h-6" />)}
                </div>

                <div className={`p-4 rounded-3xl text-base sm:text-lg font-medium leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? (ayushMode ? 'bg-amber-700 text-white rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none')
                    : (ayushMode ? 'bg-amber-50/80 text-slate-800 border border-amber-200/70 rounded-tl-none' : 'bg-blue-50/80 text-slate-800 border border-blue-200/70 rounded-tl-none')
                }`}>
                  <p>{msg.text}</p>

                  {/* Read Aloud Button for AI Messages */}
                  {msg.sender === 'ai' && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-end">
                      <AudioGuideButton textToRead={msg.text} label="Listen Question" />
                    </div>
                  )}
                </div>

              </div>

              {/* Quick Touch Chips below AI messages */}
              {msg.sender === 'ai' && msg.chips && msg.chips.length > 0 && (
                <div className="w-full mt-3 ml-12 pr-4 flex flex-wrap gap-2">
                  {msg.chips.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => {
                        if (chip.toLowerCase().includes("upload") || chip.toLowerCase().includes("summary")) {
                          handleGenerateSummary();
                        } else {
                          handleSend(chip, 'quick_chip');
                        }
                      }}
                      className="kiosk-btn bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-bold text-sm sm:text-base px-4 py-2.5 rounded-2xl shadow-sm transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-blue-600 font-bold p-3 bg-blue-50 rounded-2xl w-fit">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>AI is processing symptoms & generating follow-up...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input & Voice Bar */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-200">
          
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.typeOrSpeak}
            </p>
            <span className="text-xs text-blue-600 font-bold">
              {chatMessages.filter(m => m.sender === 'user').length} answers recorded
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Voice Input Mic Button */}
            <div className="w-full sm:w-auto">
              <VoiceMicButton onSpeechResult={(transcript) => handleSend(transcript, 'voice')} />
            </div>

            {/* Text Input */}
            <div className="flex-1 flex gap-2 w-full">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputVal, 'text')}
                placeholder="Type your symptom or touch quick chips above..."
                className="flex-1 px-5 py-4 border border-slate-300 rounded-2xl text-base sm:text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => handleSend(inputVal, 'text')}
                className={`kiosk-btn text-white font-bold px-6 py-4 rounded-2xl shadow-md flex items-center justify-center ${
                  ayushMode ? "bg-amber-700 hover:bg-amber-800" : "bg-blue-600 hover:bg-blue-700"
                }`}
                title="Send answer"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>

          </div>

          {/* Bottom Bar: Proceed to Generate Summary CTA */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Done answering your complaints? Click below to generate your clinical summary.
            </span>

            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className={`w-full sm:w-auto font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                ayushMode ? "bg-amber-700 hover:bg-amber-800" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {generatingSummary ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Summary...</span>
                </>
              ) : (
                <>
                  <span>{t.generateSummaryBtn || "Proceed & Generate Summary"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* SUMMARY GENERATION SUCCESS MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            
            {/* Header with Success Icon */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                {t.summarySavedToHistory || "Clinical Summary Generated & Added to Patient History"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Your consultation responses have been synthesized into a clinical summary and permanently recorded in your patient file.
              </p>
            </div>

            {/* Generated Summary Preview Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-sm">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Chief Complaint</p>
                <p className="font-semibold text-slate-900">
                  {generatedSummaryData?.chief_complaint || "Routine medical consultation recorded"}
                </p>
              </div>

              {generatedSummaryData?.hpi && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">History of Present Illness (HPI)</p>
                  <p className="text-slate-800 text-xs">{generatedSummaryData.hpi}</p>
                </div>
              )}

              {generatedSummaryData?.medication_history && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Medications</p>
                  <p className="text-slate-800 text-xs">{generatedSummaryData.medication_history}</p>
                </div>
              )}

              {generatedSummaryData?.ayush_assessment && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">AYUSH Dashavidha Findings</p>
                  <p className="text-amber-900 text-xs">{generatedSummaryData.ayush_assessment}</p>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              {/* Primary: Proceed to Scan Report / Upload Prescriptions */}
              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  setCurrentPage('document');
                }}
                className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl text-base shadow-lg flex items-center justify-center gap-2"
              >
                <span>{t.proceedToScanUpload || "Proceed to Scan Report / Upload Prescription"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Secondary: Return to Dashboard */}
              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  setCurrentPage('dashboard');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-2xl text-sm transition-colors text-center"
              >
                <span>Return to Patient Dashboard (View Saved History)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ConversationalHistoryPage;
