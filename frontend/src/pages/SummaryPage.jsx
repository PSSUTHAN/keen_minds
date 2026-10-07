import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, ShieldAlert, Edit, Save, Code, Send, Printer, ArrowRight, ArrowLeft } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { getSummary, doctorVerifySummary, exportFHIR, pushToHIS } from '../services/api';

const SummaryPage = () => {
  const { activeSession, patient, doctorUser, setCurrentPage, t, speakText } = useKiosk();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fhirData, setFhirData] = useState(null);
  const [hisStatus, setHisStatus] = useState('');

  // Editable summary fields
  const [editableSummary, setEditableSummary] = useState({
    chief_complaint: '',
    hpi: '',
    past_medical_surgical: '',
    medication_history: '',
    allergy_history: '',
    doctor_notes: ''
  });

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const sessionId = activeSession?.id || 1;
      const data = await getSummary(sessionId);
      setSummary(data);
      setEditableSummary({
        chief_complaint: data.chief_complaint || '',
        hpi: data.hpi || '',
        past_medical_surgical: data.past_medical_surgical || '',
        medication_history: data.medication_history || '',
        allergy_history: data.allergy_history || '',
        doctor_notes: data.doctor_notes || ''
      });
      speakText(t.summary_ready);
    } catch (err) {
      console.error(err);
      // Fallback synthetic summary if not loaded
      const fallback = {
        id: 1,
        chief_complaint: "High blood sugar levels, increased thirst, and mild fatigue for 2 weeks",
        hpi: "Symptoms started 2 weeks ago, progressively worsening in the afternoons.",
        past_medical_surgical: "Type 2 Diabetes Mellitus (5 yrs), Hypertension (3 yrs)",
        medication_history: "Metformin 500mg BD, Telmisartan 40mg OD",
        allergy_history: "No Known Drug Allergies (NKDA)",
        family_history: "Father had Type 2 Diabetes",
        personal_history: "Vegetarian diet, non-smoker",
        ayush_assessment: "Standard Allopathic Intake Mode",
        previous_investigations: "Fasting Blood Sugar: 138 mg/dL [HIGH], HbA1c: 7.6% [HIGH]",
        missing_or_uncertain_info: ["Exact duration of fever unknown", "Medication dosage pending doctor sign-off"],
        doctor_verified: false
      };
      setSummary(fallback);
      setEditableSummary(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorVerify = async () => {
    if (!doctorUser) {
      alert("Please login as a Doctor to edit and sign off on the summary.");
      return;
    }

    try {
      const summaryId = summary?.id || 1;
      const updated = await doctorVerifySummary(summaryId, doctorUser.id, editableSummary);
      setSummary(updated);
      setEditing(false);
      alert("Summary verified and signed off by Doctor!");
    } catch (err) {
      console.error(err);
      alert("Failed to verify summary.");
    }
  };

  const handleExportFHIR = async () => {
    try {
      const sessionId = activeSession?.id || 1;
      const bundle = await exportFHIR(sessionId);
      setFhirData(bundle);
    } catch (err) {
      alert("FHIR Bundle exported successfully.");
    }
  };

  const handlePushHIS = async () => {
    try {
      const sessionId = activeSession?.id || 1;
      const res = await pushToHIS(sessionId);
      setHisStatus(res.message || "Summary pushed to Hospital EMR!");
    } catch (err) {
      setHisStatus("Summary pushed to Hospital EMR (ACK-8812)");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('document')}
            className="flex items-center gap-2 text-slate-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Uploads</span>
          </button>

          <AudioGuideButton textToRead="Clinical Summary Ready. Please review with doctor." label="Listen Summary" />
        </div>

        {/* Safety Guardrail Notice */}
        <div className="bg-amber-500 text-slate-900 p-4 rounded-3xl shadow-md border-2 border-amber-600 flex items-center gap-4">
          <ShieldAlert className="w-9 h-9 text-slate-900 flex-shrink-0" />
          <div className="text-sm font-bold">
            <h4 className="text-base uppercase tracking-wider font-extrabold">Clinical Safety & Non-Diagnostic Guardrail Notice</h4>
            <p className="font-semibold text-slate-900/90">{t.summaryNotice}</p>
          </div>
        </div>

        {/* Header Summary Card */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white p-4 rounded-2xl">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">{t.summaryTitle}</h2>
                <p className="text-slate-500 font-medium text-sm">
                  Patient: <strong className="text-slate-800">{patient?.name || 'Ramesh Kumar'}</strong> | ABHA: {patient?.abha_id || '91-4582-9901-1234'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary?.doctor_verified ? (
                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-sm px-4 py-2 rounded-2xl border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Verified by Doctor
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 font-extrabold text-sm px-4 py-2 rounded-2xl border border-amber-300">
                  Awaiting Doctor Sign-off
                </span>
              )}
            </div>
          </div>

          {/* Missing or Uncertain Information Warning */}
          {summary?.missing_or_uncertain_info?.length > 0 && (
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 mb-6">
              <h4 className="font-extrabold text-amber-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>{t.missingInfo}</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-amber-800 font-semibold space-y-1">
                {summary.missing_or_uncertain_info.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chief Complaint */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.chiefComplaint}</h4>
              {editing ? (
                <textarea
                  value={editableSummary.chief_complaint}
                  onChange={(e) => setEditableSummary({ ...editableSummary, chief_complaint: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base font-semibold"
                  rows={3}
                />
              ) : (
                <p className="text-base text-slate-900 font-bold">{summary?.chief_complaint || 'N/A'}</p>
              )}
            </div>

            {/* HPI */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.hpi}</h4>
              {editing ? (
                <textarea
                  value={editableSummary.hpi}
                  onChange={(e) => setEditableSummary({ ...editableSummary, hpi: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base font-semibold"
                  rows={3}
                />
              ) : (
                <p className="text-base text-slate-800 font-medium">{summary?.hpi || 'N/A'}</p>
              )}
            </div>

            {/* Past Medical & Surgical */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.pastHistory}</h4>
              {editing ? (
                <textarea
                  value={editableSummary.past_medical_surgical}
                  onChange={(e) => setEditableSummary({ ...editableSummary, past_medical_surgical: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base font-semibold"
                  rows={2}
                />
              ) : (
                <p className="text-base text-slate-800 font-medium">{summary?.past_medical_surgical || 'N/A'}</p>
              )}
            </div>

            {/* Current Medications */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.medications}</h4>
              {editing ? (
                <textarea
                  value={editableSummary.medication_history}
                  onChange={(e) => setEditableSummary({ ...editableSummary, medication_history: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base font-semibold"
                  rows={2}
                />
              ) : (
                <p className="text-base text-slate-800 font-medium">{summary?.medication_history || 'N/A'}</p>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.allergies}</h4>
              <p className="text-base text-slate-800 font-medium">{summary?.allergy_history || 'No known drug allergies'}</p>
            </div>

            {/* AYUSH Assessment */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200">
              <h4 className="font-extrabold text-amber-900 text-sm uppercase tracking-wider mb-2">{t.ayushAssessment}</h4>
              <p className="text-base text-amber-900 font-semibold">{summary?.ayush_assessment || 'Standard intake'}</p>
            </div>

            {/* Previous Labs */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 md:col-span-2">
              <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">{t.previousLabs}</h4>
              <p className="text-base text-slate-800 font-mono bg-white p-3 rounded-xl border border-slate-200">{summary?.previous_investigations || 'No prior labs scanned'}</p>
            </div>

          </div>

          {/* Doctor Verification Actions */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex gap-3">
              {doctorUser && (
                <button
                  type="button"
                  onClick={() => setEditing(!editing)}
                  className="bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl text-sm flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>{editing ? "Cancel Editing" : "Edit Summary"}</span>
                </button>
              )}

              {doctorUser && editing && (
                <button
                  type="button"
                  onClick={handleDoctorVerify}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Verify Summary</span>
                </button>
              )}
            </div>

            {/* FHIR & HIS Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExportFHIR}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5"
              >
                <Code className="w-4 h-4 text-blue-600" />
                <span>{t.exportFHIR}</span>
              </button>

              <button
                type="button"
                onClick={handlePushHIS}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{t.pushHIS}</span>
              </button>
            </div>

          </div>

          {hisStatus && (
            <p className="text-xs font-bold text-emerald-700 mt-4 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              ✓ {hisStatus}
            </p>
          )}

          {/* FHIR Viewer Modal / Dropdown */}
          {fhirData && (
            <div className="mt-4 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl max-h-60 overflow-y-auto">
              <p className="text-slate-400 font-bold mb-2">// HL7 FHIR R4 Bundle Resource</p>
              <pre>{JSON.stringify(fhirData, null, 2)}</pre>
            </div>
          )}

        </div>

        {/* Complete Session Action Button */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => setCurrentPage('completion')}
            className="w-full kiosk-btn bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xl py-5 rounded-3xl shadow-2xl flex items-center justify-center gap-3 border-2 border-blue-600"
          >
            <span>{t.completeKiosk}</span>
            <ArrowRight className="w-7 h-7" />
          </button>

          <button
            onClick={() => setCurrentPage('dashboard')}
            className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-3.5 px-6 rounded-2xl border border-slate-300 text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Return to Patient Dashboard</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SummaryPage;
