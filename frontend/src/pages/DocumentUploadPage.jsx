import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Edit3, ArrowRight, ArrowLeft, RefreshCw, FileCode, Check } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { uploadDocument, verifyDocumentEntities, generateSummary } from '../services/api';

const DocumentUploadPage = () => {
  const { activeSession, setCurrentPage, t, speakText } = useKiosk();

  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState('prescription');
  const [editingDocId, setEditingDocId] = useState(null);

  useEffect(() => {
    speakText(t.docDesc);
  }, []);

  // Simulate file upload or sample document loading
  const handleFileUpload = async (fileObj = null, sampleName = null) => {
    setLoading(true);
    try {
      const sessionId = activeSession?.id || 1;
      
      let fileToUpload = fileObj;
      if (!fileToUpload) {
        // Create a dummy blob file if loading sample
        const blob = new Blob(["Sample Prescription Image Content"], { type: "image/jpeg" });
        fileToUpload = new File([blob], sampleName || "sample_prescription.jpg", { type: "image/jpeg" });
      }

      const docResult = await uploadDocument(sessionId, docType, fileToUpload);
      setUploadedDocs([...uploadedDocs, docResult]);
      speakText("Document scanned successfully. OCR text and candidate entities extracted.");
    } catch (err) {
      console.error(err);
      alert("Error scanning document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToSummary = async () => {
    setLoading(true);
    try {
      const sessionId = activeSession?.id || 1;
      await generateSummary(sessionId);
      speakText(t.summary_ready || "Your clinical summary is ready for review.");
      setCurrentPage('summary');
    } catch (err) {
      console.error(err);
      setCurrentPage('summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('chatbot')}
            className="flex items-center gap-2 text-slate-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Chatbot</span>
          </button>

          <AudioGuideButton textToRead={t.docDesc} label="Listen Instructions" />
        </div>

        {/* Upload Header Card */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="bg-blue-100 text-blue-700 p-4 rounded-2xl">
              <FileText className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">{t.docTitle}</h2>
              <p className="text-slate-500 font-medium text-sm mt-1">{t.docDesc}</p>
            </div>
          </div>

          {/* Doc Type Selector */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Document Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'prescription', label: t.uploadPrescription },
                { id: 'lab_report', label: t.uploadLab },
                { id: 'discharge_summary', label: t.uploadDischarge }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDocType(item.id)}
                  className={`p-4 rounded-2xl font-bold text-sm border transition-all ${
                    docType === item.id
                      ? "bg-blue-600 text-white border-blue-800 shadow-md scale-105"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Drop Zone & Sample Triggers */}
          <div className="border-3 border-dashed border-blue-300 bg-blue-50/40 rounded-3xl p-8 text-center hover:bg-blue-50 transition-colors">
            
            <Upload className="w-14 h-14 text-blue-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              Drag & Drop Prescription or Click to Scan
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              Supports JPG, PNG, PDF document scans up to 10MB
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              
              <label className="kiosk-btn bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <span>Upload From Kiosk Scanner</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* Quick Sample Trigger Buttons */}
              <button
                type="button"
                onClick={() => handleFileUpload(null, "sample_prescription.jpg")}
                className="bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold px-5 py-3.5 rounded-2xl text-xs shadow-sm"
              >
                + Load Sample Prescription
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocType('lab_report');
                  handleFileUpload(null, "lab_report_feb2026.pdf");
                }}
                className="bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold px-5 py-3.5 rounded-2xl text-xs shadow-sm"
              >
                + Load Sample Lab Report
              </button>

            </div>

          </div>
        </div>

        {/* OCR Result Cards */}
        {uploadedDocs.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
              <span>{t.ocrResults}</span>
            </h3>

            {uploadedDocs.map((doc, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-7 h-7 text-blue-600" />
                    <div>
                      <h4 className="font-extrabold text-lg text-slate-800">{doc.file_name}</h4>
                      <p className="text-xs text-slate-500 font-medium">Category: <span className="uppercase">{doc.doc_type}</span></p>
                    </div>
                  </div>

                  <div className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1.5 rounded-full border border-emerald-300">
                    OCR Confidence: {int(doc.ocr_confidence * 100)}%
                  </div>
                </div>

                {/* Warning banner for low confidence */}
                <div className="bg-amber-50 text-amber-900 p-3 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>{t.lowConfidenceWarning}</span>
                </div>

                {/* Candidate Entities Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Diagnoses */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="font-bold text-sm text-slate-700 mb-2">Diagnoses Extracted</h5>
                    {doc.extracted_entities?.diagnoses?.length > 0 ? (
                      <ul className="space-y-1.5 text-sm font-semibold">
                        {doc.extracted_entities.diagnoses.map((d, dIdx) => (
                          <li key={dIdx} className={`p-2 rounded-xl border flex items-center justify-between ${
                            (d.confidence || 0.8) < 0.75 ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <span>{d.term}</span>
                            <span className="text-xs text-slate-400">{int((d.confidence || 0.8)*100)}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No primary diagnoses found.</p>
                    )}
                  </div>

                  {/* Medications */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="font-bold text-sm text-slate-700 mb-2">Prescribed Medications</h5>
                    {doc.extracted_entities?.medications?.length > 0 ? (
                      <ul className="space-y-1.5 text-sm font-semibold">
                        {doc.extracted_entities.medications.map((m, mIdx) => (
                          <li key={mIdx} className={`p-2 rounded-xl border flex items-center justify-between ${
                            (m.confidence || 0.8) < 0.75 ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <span>{m.name} {m.dosage} ({m.frequency})</span>
                            <span className="text-xs text-slate-400">{int((m.confidence || 0.8)*100)}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No medications parsed.</p>
                    )}
                  </div>

                  {/* Lab Test Values */}
                  {doc.extracted_entities?.lab_values?.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 sm:col-span-2">
                      <h5 className="font-bold text-sm text-slate-700 mb-2">Laboratory Test Results</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {doc.extracted_entities.lab_values.map((l, lIdx) => (
                          <div key={lIdx} className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            (l.confidence || 0.8) < 0.75 ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <div>
                              <span className="font-bold">{l.test}</span>
                              <span className="text-xs text-slate-500 block">{l.val}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded font-extrabold ${
                              l.status === 'HIGH' ? "bg-red-100 text-red-700" : (l.status === 'LOW' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")
                            }`}>
                              {l.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            ))}
          </div>
        )}

        {/* Action Options */}
        <div className="pt-4 space-y-3">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const sessionId = activeSession?.id || 1;
                await generateSummary(sessionId);
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
                setCurrentPage('dashboard');
              }
            }}
            disabled={loading}
            className="w-full kiosk-btn bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg sm:text-xl py-4 sm:py-5 rounded-2xl sm:rounded-3xl shadow-xl flex items-center justify-center gap-3 border-2 border-blue-600"
          >
            {loading ? (
              <span>Updating Patient History & Summary...</span>
            ) : (
              <>
                <span>Save Documents & Return to Patient Dashboard</span>
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleProceedToSummary}
              disabled={loading}
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-4 rounded-2xl border border-slate-300 text-sm flex items-center justify-center gap-2"
            >
              <span>{t.verifyDocsBtn || "Review Full Clinical Summary"}</span>
            </button>

            <button
              onClick={() => setCurrentPage('completion')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <span>Finish & Get Hospital Queue Token</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper function safely defined
function int(val) {
  return Math.round(val);
}

export default DocumentUploadPage;
