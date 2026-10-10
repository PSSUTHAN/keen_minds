import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  User, 
  Search, 
  FileText, 
  PlusCircle, 
  Edit3, 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  BellRing, 
  Clock, 
  Calendar, 
  Pill, 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  Eye, 
  X, 
  Send, 
  Database, 
  Download,
  Activity,
  History,
  Phone,
  Droplet,
  Trash2,
  Plus,
  Sun,
  Moon,
  Info,
  Menu,
  ChevronRight,
  ArrowLeft,
  Users,
  UserPlus,
  Home,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RotateCcw,
  UserCheck,
  KeyRound,
  ClipboardList
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { 
  searchPatients, 
  getPatientMedicalRecord, 
  createPatientPrescription, 
  updatePrescription, 
  finalizePrescription,
  fetchPatientReportBlob,
  getDoctorDashboardStats,
  getDoctorViewedPatients,
  getAvailablePatients,
  requestPatientAccess,
  verifyPatientAccess,
  doctorCheckPatientByMobile,
  doctorSendPatientAssociationOTP,
  doctorVerifyPatientAssociationOTP,
  doctorCheckPatientPhone,
  doctorSendPatientOTP,
  doctorCreatePatientWithOTP
} from '../services/api';

const DOSAGE_UNITS = [
  'Tablet',
  'Capsule',
  'Spoon',
  'ml',
  'Drop',
  'Puff',
  'Injection',
  'Other'
];

const QUICK_DURATIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  '3 months'
];

const QUICK_INSTRUCTIONS = [
  'Before food',
  'After food',
  'With food',
  'Empty stomach',
  'Bedtime',
  'With warm water'
];

const PrescriptionMedicineCard = ({
  item,
  index,
  totalItems,
  handleMedicineChange,
  handleTimingSlotChange,
  handleDosageUnitChange,
  handleRemoveMedicineRow,
  DOSAGE_UNITS,
  QUICK_DURATIONS,
  QUICK_INSTRUCTIONS,
  themeColor = 'blue'
}) => {
  const accentBorder = 'border-blue-200';
  const badgeBg = 'bg-blue-100 text-blue-900 border-blue-200';
  const chipActive = 'bg-blue-600 text-white border-blue-700';

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
      {/* Top Header: Medicine # and Delete */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
            {index + 1}
          </div>
          <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
            Medication #{index + 1}
          </span>
        </div>
        {totalItems > 1 && (
          <button
            type="button"
            onClick={() => handleRemoveMedicineRow(index)}
            className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
            title="Remove medicine"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* 1. Medicine Name & Strength */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Medicine Name & Strength *
          </label>
          <span className="text-[11px] text-slate-400 font-medium">e.g. Metformin 500mg, Amoxicillin 250mg</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            required
            value={item.medicine_name || ''}
            onChange={(e) => handleMedicineChange(index, 'medicine_name', e.target.value)}
            placeholder="Medicine Name (e.g. Paracetamol)"
            className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={item.strength || ''}
            onChange={(e) => handleMedicineChange(index, 'strength', e.target.value)}
            placeholder="Strength (e.g. 500mg)"
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 2. Structured Medicine Timing: Morning / Afternoon / Night */}
      <div className={`p-3.5 rounded-2xl bg-slate-50 border ${accentBorder} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <span>Dosage / Timing</span>
            </span>
            <p className="text-[11px] text-slate-500 font-medium">Morning • Afternoon • Night schedule</p>
          </div>

          {/* Dosage Unit Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Unit:</span>
            <select
              value={item.dosage_unit || 'Tablet'}
              onChange={(e) => handleDosageUnitChange(index, e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              {DOSAGE_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3-Box Morning, Afternoon, Night Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          
          {/* Morning Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-center gap-1 text-amber-800 text-xs font-extrabold uppercase">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Morning</span>
            </div>
            <input
              type="number"
              min="0"
              max="10"
              value={item.morning_dose !== undefined ? item.morning_dose : 1}
              onChange={(e) => handleTimingSlotChange(index, 'morning_dose', e.target.value)}
              className="w-full text-center font-black text-lg py-1 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-center gap-1">
              {[0, 1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTimingSlotChange(index, 'morning_dose', val)}
                  className={`w-6 h-6 text-[10px] font-black rounded cursor-pointer transition-all ${
                    Number(item.morning_dose) === val
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Afternoon Box */}
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-center gap-1 text-orange-800 text-xs font-extrabold uppercase">
              <Sun className="w-3.5 h-3.5 text-orange-500" />
              <span>Afternoon</span>
            </div>
            <input
              type="number"
              min="0"
              max="10"
              value={item.afternoon_dose !== undefined ? item.afternoon_dose : 0}
              onChange={(e) => handleTimingSlotChange(index, 'afternoon_dose', e.target.value)}
              className="w-full text-center font-black text-lg py-1 border border-orange-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex justify-center gap-1">
              {[0, 1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTimingSlotChange(index, 'afternoon_dose', val)}
                  className={`w-6 h-6 text-[10px] font-black rounded cursor-pointer transition-all ${
                    Number(item.afternoon_dose) === val
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white hover:bg-orange-100 text-orange-900 border border-orange-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Night Box */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-center gap-1 text-blue-900 text-xs font-extrabold uppercase">
              <Moon className="w-3.5 h-3.5 text-blue-500" />
              <span>Night</span>
            </div>
            <input
              type="number"
              min="0"
              max="10"
              value={item.night_dose !== undefined ? item.night_dose : 0}
              onChange={(e) => handleTimingSlotChange(index, 'night_dose', e.target.value)}
              className="w-full text-center font-black text-lg py-1 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-center gap-1">
              {[0, 1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTimingSlotChange(index, 'night_dose', val)}
                  className={`w-6 h-6 text-[10px] font-black rounded cursor-pointer transition-all ${
                    Number(item.night_dose) === val
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-blue-100 text-blue-950 border border-blue-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Auto-Calculated Schedule Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Generated Schedule:</span>
            <span className={`px-2.5 py-0.5 rounded-md font-mono font-black border text-xs ${badgeBg}`}>
              {item.timing_code || `${item.morning_dose || 0}-${item.afternoon_dose || 0}-${item.night_dose || 0}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Frequency:</span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {item.frequency || 'Once daily'}
            </span>
          </div>
        </div>

        {/* Timing Legend */}
        <div className="bg-blue-50/60 p-2 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-600 text-[10px]">
            <strong>1-0-0</strong> = Morning only • <strong>1-1-0</strong> = Morning + Afternoon • <strong>1-0-1</strong> = Morning + Night • <strong>1-1-1</strong> = Morning + Afternoon + Night
          </p>
        </div>
      </div>

      {/* 3. Duration & Instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Duration *
          </label>
          <input
            type="text"
            required
            value={item.duration || ''}
            onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
            placeholder="e.g. 5 days, 1 month"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {QUICK_DURATIONS.slice(0, 4).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => handleMedicineChange(index, 'duration', dur)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  item.duration === dur
                    ? chipActive
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Instructions
          </label>
          <input
            type="text"
            value={item.instructions || ''}
            onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
            placeholder="e.g. After food"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {QUICK_INSTRUCTIONS.slice(0, 4).map((inst) => (
              <button
                key={inst}
                type="button"
                onClick={() => handleMedicineChange(index, 'instructions', inst)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  item.instructions === inst
                    ? chipActive
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DoctorDashboardPage = () => {
  const { doctorUser, logoutDoctor, t } = useKiosk();

  // Sidebar Tab: 'dashboard' | 'viewed_patients' | 'new_patient'
  const [sidebarTab, setSidebarTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Statistics State
  const [stats, setStats] = useState({
    viewed_patients_count: 0,
    today_patients_count: 0,
    active_cases_count: 0,
    doctor: null
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Viewed Patients List State
  const [viewedPatientsList, setViewedPatientsList] = useState([]);
  const [loadingViewedList, setLoadingViewedList] = useState(false);

  // Search Patients State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Selected Patient Record View State
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [recordError, setRecordError] = useState('');

  // Prescription Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingRx, setSubmittingRx] = useState(false);
  const [rxFormError, setRxFormError] = useState('');
  const [viewingReportModal, setViewingReportModal] = useState(null);
  const [reportBlobUrl, setReportBlobUrl] = useState(null);
  const [loadingReportBlob, setLoadingReportBlob] = useState(false);
  const [reportBlobError, setReportBlobError] = useState('');
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // New Patient (Find & Add via Patient OTP) State (Tab 3)
  const [addPatientPhone, setAddPatientPhone] = useState('');
  const [addPatientStage, setAddPatientStage] = useState('INPUT'); // 'INPUT', 'NOT_FOUND', 'ALREADY_ADDED', 'FOUND', 'OTP_INPUT', 'SUCCESS'
  const [patientLookupResult, setPatientLookupResult] = useState(null);
  const [patientAddOtp, setPatientAddOtp] = useState('');
  const [patientAddDemoOtp, setPatientAddDemoOtp] = useState(null);
  const [patientAddCooldown, setPatientAddCooldown] = useState(0);
  const [checkingPatient, setCheckingPatient] = useState(false);
  const [sendingPatientOtp, setSendingPatientOtp] = useState(false);
  const [verifyingPatientOtp, setVerifyingPatientOtp] = useState(false);
  const [addPatientError, setAddPatientError] = useState('');
  const [addPatientSuccessData, setAddPatientSuccessData] = useState(null);

  // Available Patients State (Tab: 'available_patients')
  const [availablePatientsList, setAvailablePatientsList] = useState([]);
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [accessModalPatient, setAccessModalPatient] = useState(null);
  const [accessOtp, setAccessOtp] = useState('');
  const [accessDemoOtp, setAccessDemoOtp] = useState(null);
  const [accessCooldown, setAccessCooldown] = useState(0);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessSuccessMessage, setAccessSuccessMessage] = useState('');

  // Prescription Form
  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    doctor_notes: '',
    items: [
      {
        medicine_name: '',
        strength: '',
        dosage_unit: 'Tablet',
        morning_dose: 1,
        afternoon_dose: 0,
        night_dose: 0,
        timing_code: '1-0-0',
        frequency: 'Once daily',
        dosage: '1 Tablet',
        dosage_amount: 1,
        duration: '5 days',
        instructions: 'After food'
      }
    ]
  });

  // Cooldown countdown for patient association OTP
  useEffect(() => {
    let timer;
    if (patientAddCooldown > 0) {
      timer = setInterval(() => {
        setPatientAddCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [patientAddCooldown]);

  // Cooldown countdown for patient access request OTP
  useEffect(() => {
    let timer;
    if (accessCooldown > 0) {
      timer = setInterval(() => {
        setAccessCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [accessCooldown]);

  // Initial Load
  useEffect(() => {
    fetchDashboardStats();
    fetchViewedPatients();
    fetchAvailablePatients('');
    handleSearch('');
  }, []);

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getDoctorDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Error loading doctor stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchViewedPatients = async () => {
    setLoadingViewedList(true);
    try {
      const data = await getDoctorViewedPatients();
      setViewedPatientsList(data);
    } catch (err) {
      console.error("Error loading viewed patients", err);
    } finally {
      setLoadingViewedList(false);
    }
  };

  const fetchAvailablePatients = async (query = '') => {
    setLoadingAvailable(true);
    try {
      const data = await getAvailablePatients(query);
      setAvailablePatientsList(data);
    } catch (err) {
      console.error("Error loading available patients", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleOpenAccessModal = async (patient, isDirectOtp = false) => {
    setAccessModalPatient(patient);
    setAccessOtp('');
    setAccessDemoOtp(null);
    setAccessError('');
    setAccessSuccessMessage('');
    if (isDirectOtp) {
      return;
    }
    setRequestingAccess(true);
    try {
      const res = await requestPatientAccess(patient.patient_id);
      if (res.status === 'AUTHORIZED') {
        setAccessSuccessMessage(res.message);
        fetchAvailablePatients(availableSearchQuery);
        fetchViewedPatients();
      } else {
        setAccessCooldown(res.cooldown_seconds || 60);
        setAccessDemoOtp(res.demo_otp || null);
      }
    } catch (err) {
      console.error("Request access error", err);
      setAccessError(err.response?.data?.detail || "Failed to dispatch access OTP to patient.");
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleResendAccessOtp = async () => {
    if (!accessModalPatient || accessCooldown > 0) return;
    setRequestingAccess(true);
    setAccessError('');
    try {
      const res = await requestPatientAccess(accessModalPatient.patient_id);
      setAccessCooldown(res.cooldown_seconds || 60);
      setAccessDemoOtp(res.demo_otp || null);
    } catch (err) {
      console.error("Resend access OTP error", err);
      setAccessError(err.response?.data?.detail || "Failed to resend access OTP.");
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleVerifyAccessOtp = async (e) => {
    if (e) e.preventDefault();
    if (!accessModalPatient) return;
    const cleanOtp = accessOtp.trim();
    if (cleanOtp.length !== 6) {
      setAccessError("Please enter the complete 6-digit OTP received by the patient.");
      return;
    }
    setVerifyingAccess(true);
    setAccessError('');
    try {
      const res = await verifyPatientAccess(accessModalPatient.patient_id, cleanOtp);
      setAccessSuccessMessage(res.message || "Access successfully authorized!");
      fetchAvailablePatients(availableSearchQuery);
      fetchViewedPatients();
      fetchDashboardStats();
    } catch (err) {
      console.error("Verify access OTP error", err);
      setAccessError(err.response?.data?.detail || "Invalid OTP code. Please check with the patient.");
    } finally {
      setVerifyingAccess(false);
    }
  };

  const handleSearch = async (queryToSearch = null) => {
    const q = queryToSearch !== null ? queryToSearch : searchQuery;
    setSearching(true);
    try {
      const data = await searchPatients(q);
      setSearchResults(data);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setSearching(false);
    }
  };

  // Open Full Patient Medical Record (Records in Viewed Patients table via backend)
  const handleOpenPatientRecord = async (patientId) => {
    setSelectedPatientId(patientId);
    setLoadingRecord(true);
    setRecordError('');
    try {
      const record = await getPatientMedicalRecord(patientId);
      setMedicalRecord(record);
      // Refresh stats & viewed patients after viewing
      fetchDashboardStats();
      fetchViewedPatients();
    } catch (err) {
      console.error("Error loading patient record", err);
      if (err.response?.status === 403) {
        setRecordError("Access Denied: You must verify patient consent via OTP before viewing their medical history.");
      } else {
        setRecordError(err.response?.data?.detail || "Could not load medical record.");
      }
      setMedicalRecord(null);
    } finally {
      setLoadingRecord(false);
    }
  };

  const closePatientRecord = () => {
    setSelectedPatientId(null);
    setMedicalRecord(null);
    setRecordError('');
  };

  useEffect(() => {
    let activeUrl = null;
    const patientId = medicalRecord?.patient_info?.id;
    if (viewingReportModal && patientId) {
      setLoadingReportBlob(true);
      setReportBlobError('');
      fetchPatientReportBlob(patientId, viewingReportModal.id, 'view')
        .then((blob) => {
          activeUrl = URL.createObjectURL(blob);
          setReportBlobUrl(activeUrl);
        })
        .catch((err) => {
          console.error("Failed to load report blob", err);
          setReportBlobError("Failed to load document securely.");
        })
        .finally(() => {
          setLoadingReportBlob(false);
        });
    } else {
      setReportBlobUrl(null);
      setReportBlobError('');
    }

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [viewingReportModal, medicalRecord?.patient_info?.id]);

  const handleDownloadReport = async (report) => {
    const patientId = medicalRecord?.patient_info?.id;
    if (!patientId || !report?.id) return;
    setDownloadingReportId(report.id);
    try {
      const blob = await fetchPatientReportBlob(patientId, report.id, 'download');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.file_name || `report-${report.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to download report", err);
      alert("Failed to download report file securely.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  // ===================== NEW PATIENT (OTP-VERIFIED ADDITION) HANDLERS =====================

  const handleCheckPatientByMobile = async (e) => {
    if (e) e.preventDefault();
    const phone = addPatientPhone.replace(/\D/g, '').trim();
    if (!phone || phone.length < 10) {
      setAddPatientError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setCheckingPatient(true);
    setAddPatientError('');
    try {
      const res = await doctorCheckPatientByMobile(phone);
      setPatientLookupResult(res.patient);
      if (res.status === 'NOT_FOUND' || !res.exists) {
        setAddPatientStage('NOT_FOUND');
      } else if (res.status === 'ALREADY_ADDED' || res.already_added) {
        setAddPatientStage('ALREADY_ADDED');
      } else {
        setAddPatientStage('FOUND');
      }
    } catch (err) {
      console.error("Check patient error", err);
      setAddPatientError(err.response?.data?.detail || "Failed to check patient mobile. Please try again.");
    } finally {
      setCheckingPatient(false);
    }
  };

  const handleSendPatientAddOtp = async () => {
    const phone = addPatientPhone.replace(/\D/g, '').trim();
    if (!phone || phone.length < 10) {
      setAddPatientError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSendingPatientOtp(true);
    setAddPatientError('');
    try {
      const res = await doctorSendPatientAssociationOTP(phone);
      setAddPatientStage('OTP_INPUT');
      setPatientAddOtp('');
      setPatientAddDemoOtp(res.demo_otp || null);
      setPatientAddCooldown(res.cooldown_seconds || 60);
    } catch (err) {
      console.error("Send OTP error", err);
      setAddPatientError(err.response?.data?.detail || "Failed to send OTP to patient mobile.");
    } finally {
      setSendingPatientOtp(false);
    }
  };

  const handleVerifyPatientAddOtp = async (e) => {
    if (e) e.preventDefault();
    const phone = addPatientPhone.replace(/\D/g, '').trim();
    const otp = patientAddOtp.replace(/\D/g, '').trim();
    if (!otp || otp.length < 6) {
      setAddPatientError("Please enter the 6-digit OTP provided by the patient.");
      return;
    }

    setVerifyingPatientOtp(true);
    setAddPatientError('');
    try {
      const res = await doctorVerifyPatientAssociationOTP(phone, otp);
      setAddPatientSuccessData(res.patient);
      setAddPatientStage('SUCCESS');
      // Refresh dashboard stats and viewed patients list
      fetchDashboardStats();
      fetchViewedPatients();
    } catch (err) {
      console.error("Verify OTP error", err);
      setAddPatientError(err.response?.data?.detail || "Invalid or expired OTP. Please verify and try again.");
    } finally {
      setVerifyingPatientOtp(false);
    }
  };

  const handleResetAddPatient = () => {
    setAddPatientPhone('');
    setAddPatientStage('INPUT');
    setPatientLookupResult(null);
    setPatientAddOtp('');
    setAddPatientError('');
    setAddPatientSuccessData(null);
  };

  // ===================== PRESCRIPTION HELPERS =====================

  const calculateTimingSchedule = (morning, afternoon, night, unit = 'Tablet') => {
    const m = Math.max(0, parseInt(morning, 10) || 0);
    const a = Math.max(0, parseInt(afternoon, 10) || 0);
    const n = Math.max(0, parseInt(night, 10) || 0);
    const timing_code = `${m}-${a}-${n}`;
    const slots = (m > 0 ? 1 : 0) + (a > 0 ? 1 : 0) + (n > 0 ? 1 : 0);

    let frequency = 'As directed';
    if (slots === 1) frequency = 'Once daily';
    else if (slots === 2) frequency = 'Twice daily';
    else if (slots === 3) frequency = 'Three times daily';
    else if (slots === 0) frequency = 'Not specified';

    const maxDose = Math.max(m, a, n) || 1;
    const unitLabel = maxDose > 1 && !unit.endsWith('s') && ['Tablet', 'Capsule', 'Spoon', 'Drop', 'Puff'].includes(unit)
      ? `${unit}s`
      : unit;
    const dosage = `${maxDose} ${unitLabel}`;

    return { m, a, n, timing_code, frequency, dosage, maxDose, slots };
  };

  const createEmptyMedicineRow = () => ({
    medicine_name: '',
    strength: '',
    dosage_unit: 'Tablet',
    morning_dose: 1,
    afternoon_dose: 0,
    night_dose: 0,
    timing_code: '1-0-0',
    frequency: 'Once daily',
    dosage: '1 Tablet',
    dosage_amount: 1,
    duration: '5 days',
    instructions: 'After food'
  });

  const handleAddMedicineRow = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      items: [...prescriptionForm.items, createEmptyMedicineRow()]
    });
  };

  const handleRemoveMedicineRow = (index) => {
    if (prescriptionForm.items.length <= 1) return;
    setPrescriptionForm({
      ...prescriptionForm,
      items: prescriptionForm.items.filter((_, i) => i !== index)
    });
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...prescriptionForm.items];
    updated[index][field] = value;
    setPrescriptionForm({ ...prescriptionForm, items: updated });
  };

  const handleTimingSlotChange = (index, slot, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const updated = [...prescriptionForm.items];
    const curr = { ...updated[index], [slot]: num };
    const sched = calculateTimingSchedule(
      slot === 'morning_dose' ? num : curr.morning_dose,
      slot === 'afternoon_dose' ? num : curr.afternoon_dose,
      slot === 'night_dose' ? num : curr.night_dose,
      curr.dosage_unit || 'Tablet'
    );
    curr.morning_dose = sched.m;
    curr.afternoon_dose = sched.a;
    curr.night_dose = sched.n;
    curr.timing_code = sched.timing_code;
    curr.frequency = sched.frequency;
    curr.dosage = sched.dosage;
    curr.dosage_amount = sched.maxDose;
    updated[index] = curr;
    setPrescriptionForm({ ...prescriptionForm, items: updated });
  };

  const handleDosageUnitChange = (index, unit) => {
    const updated = [...prescriptionForm.items];
    const curr = { ...updated[index], dosage_unit: unit };
    const sched = calculateTimingSchedule(
      curr.morning_dose,
      curr.afternoon_dose,
      curr.night_dose,
      unit
    );
    curr.dosage = sched.dosage;
    curr.dosage_amount = sched.maxDose;
    updated[index] = curr;
    setPrescriptionForm({ ...prescriptionForm, items: updated });
  };

  const openCreatePrescriptionModal = () => {
    setRxFormError('');
    setPrescriptionForm({
      diagnosis: '',
      doctor_notes: '',
      items: [createEmptyMedicineRow()]
    });
    setIsCreateModalOpen(true);
  };

  const openEditPrescriptionModal = (rx) => {
    setRxFormError('');
    setPrescriptionForm({
      diagnosis: rx.diagnosis || '',
      doctor_notes: rx.doctor_notes || '',
      items: rx.items && rx.items.length > 0 ? rx.items.map(item => {
        let m = item.morning_dose !== undefined && item.morning_dose !== null ? Number(item.morning_dose) : 1;
        let a = item.afternoon_dose !== undefined && item.afternoon_dose !== null ? Number(item.afternoon_dose) : 0;
        let n = item.night_dose !== undefined && item.night_dose !== null ? Number(item.night_dose) : 0;
        const unit = item.dosage_unit || 'Tablet';
        const timing_code = item.timing_code || `${m}-${a}-${n}`;
        const sched = calculateTimingSchedule(m, a, n, unit);

        return {
          medicine_name: item.medicine_name || '',
          strength: item.strength || '',
          dosage_unit: unit,
          morning_dose: m,
          afternoon_dose: a,
          night_dose: n,
          timing_code: timing_code,
          frequency: item.frequency || sched.frequency,
          dosage: item.dosage || sched.dosage,
          dosage_amount: item.dosage_amount || sched.maxDose,
          duration: item.duration || '5 days',
          instructions: item.instructions || ''
        };
      }) : [createEmptyMedicineRow()]
    });
    setIsEditModalOpen(true);
  };

  const validatePrescriptionSubmission = () => {
    if (!prescriptionForm.diagnosis.trim()) {
      return "Please enter clinical diagnosis.";
    }
    const invalidItem = prescriptionForm.items.find(i => !i.medicine_name.trim());
    if (invalidItem) {
      return "Please provide medicine name for all medicine entries.";
    }
    for (let idx = 0; idx < prescriptionForm.items.length; idx++) {
      const it = prescriptionForm.items[idx];
      const m = parseInt(it.morning_dose, 10) || 0;
      const a = parseInt(it.afternoon_dose, 10) || 0;
      const n = parseInt(it.night_dose, 10) || 0;
      if (m === 0 && a === 0 && n === 0) {
        return `Please specify at least one medicine timing for '${it.medicine_name || `Medicine #${idx + 1}`}'. (0-0-0 is not allowed)`;
      }
      if (m < 0 || a < 0 || n < 0) {
        return `Timing values cannot be negative for '${it.medicine_name || `Medicine #${idx + 1}`}'.`;
      }
      if (!it.duration || !it.duration.trim()) {
        return `Please provide duration for '${it.medicine_name || `Medicine #${idx + 1}`}'.`;
      }
    }
    return null;
  };

  const handleSavePrescription = async (isEdit = false) => {
    const error = validatePrescriptionSubmission();
    if (error) {
      setRxFormError(error);
      return;
    }

    setSubmittingRx(true);
    setRxFormError('');

    const payloadItems = prescriptionForm.items.map(it => {
      const m = parseInt(it.morning_dose, 10) || 0;
      const a = parseInt(it.afternoon_dose, 10) || 0;
      const n = parseInt(it.night_dose, 10) || 0;
      const sched = calculateTimingSchedule(m, a, n, it.dosage_unit || 'Tablet');
      return {
        medicine_name: it.medicine_name.trim(),
        strength: it.strength ? it.strength.trim() : null,
        dosage_unit: it.dosage_unit || 'Tablet',
        morning_dose: m,
        afternoon_dose: a,
        night_dose: n,
        timing_code: sched.timing_code,
        frequency: sched.frequency,
        dosage: sched.dosage,
        dosage_amount: sched.maxDose,
        duration: it.duration.trim(),
        instructions: it.instructions ? it.instructions.trim() : null
      };
    });

    try {
      if (isEdit) {
        const rxId = medicalRecord?.current_prescription?.id;
        await updatePrescription(rxId, {
          diagnosis: prescriptionForm.diagnosis.trim(),
          doctor_notes: prescriptionForm.doctor_notes ? prescriptionForm.doctor_notes.trim() : null,
          items: payloadItems
        });
        setIsEditModalOpen(false);
      } else {
        await createPatientPrescription(selectedPatientId, {
          diagnosis: prescriptionForm.diagnosis.trim(),
          doctor_notes: prescriptionForm.doctor_notes ? prescriptionForm.doctor_notes.trim() : null,
          items: payloadItems
        });
        setIsCreateModalOpen(false);
      }

      // Reload record
      handleOpenPatientRecord(selectedPatientId);
    } catch (err) {
      console.error(err);
      setRxFormError(err.response?.data?.detail || "Failed to save prescription.");
    } finally {
      setSubmittingRx(false);
    }
  };

  // Nav handler that closes patient detail if opened
  const handleNavSelect = (tabName) => {
    setSidebarTab(tabName);
    setSelectedPatientId(null);
    setMobileSidebarOpen(false);
    if (tabName === 'dashboard') {
      fetchDashboardStats();
    } else if (tabName === 'viewed_patients') {
      fetchViewedPatients();
    } else if (tabName === 'available_patients') {
      fetchAvailablePatients(availableSearchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* MOBILE HEADER BAR: ☰ MediKiosk Doctor */}
      <div className="lg:hidden bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-xl bg-blue-700 text-white hover:bg-blue-600 cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-black text-lg flex items-center gap-2">
              MediKiosk
              <span className="text-[10px] bg-blue-600 text-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                Doctor
              </span>
            </h1>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold text-blue-200">
            {doctorUser?.name || "Dr. Rajesh Sharma"}
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ============================================================== */}
        {/* DOCTOR SIDEBAR (LEFT)                                          */}
        {/* ============================================================== */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            w-64 sm:w-72 bg-white text-slate-800 border-r border-slate-200
            flex flex-col shadow-sm transition-transform duration-300 ease-in-out
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {/* Sidebar Top Branding */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">MediKiosk</h2>
                <p className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
                  Doctor Portal
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Doctor Info Card in Sidebar */}
          <div className="p-4 mx-4 my-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Logged In</p>
            <p className="text-sm font-black text-slate-900 mt-0.5 truncate">
              {doctorUser?.name || "Dr. Rajesh Sharma"}
            </p>
            <p className="text-[11px] text-slate-600 font-medium truncate">
              {doctorUser?.specialty || "General Physician"}
            </p>
            <p className="text-[10px] font-mono text-blue-700 font-bold mt-1">
              Reg: {doctorUser?.registration_no || "TN-2026-881"}
            </p>
          </div>

          {/* Navigation Links: Dashboard, My Patients, New Patient */}
          <nav className="flex-1 px-3 py-2 space-y-1.5">
            <button
              type="button"
              onClick={() => handleNavSelect('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                sidebarTab === 'dashboard' && !selectedPatientId
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              }`}
            >
              <Home className={`w-5 h-5 ${sidebarTab === 'dashboard' && !selectedPatientId ? "text-blue-600" : "text-slate-500"}`} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavSelect('viewed_patients')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                sidebarTab === 'viewed_patients' && !selectedPatientId
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${sidebarTab === 'viewed_patients' && !selectedPatientId ? "text-blue-600" : "text-slate-500"}`} />
                <span>My Patients</span>
              </div>
              {viewedPatientsList.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {viewedPatientsList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavSelect('new_patient')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                sidebarTab === 'new_patient' && !selectedPatientId
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              }`}
            >
              <UserPlus className={`w-5 h-5 ${sidebarTab === 'new_patient' && !selectedPatientId ? "text-blue-600" : "text-slate-500"}`} />
              <span>New Patient</span>
            </button>
          </nav>

          {/* Bottom Sidebar: Logout (margin-top: auto) */}
          <div className="p-3 border-t border-slate-200 mt-auto bg-slate-50/50">
            <button
              type="button"
              onClick={logoutDoctor}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div 
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* ============================================================== */}
        {/* MAIN CONTENT AREA (RIGHT)                                      */}
        {/* ============================================================== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          
          {/* TOP DOCTOR PROFILE BANNER */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {doctorUser?.name || "Dr. Rajesh Sharma"}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-600 font-semibold">
                  <span className="text-blue-700 font-bold">
                    Specialization: {doctorUser?.specialty || "General Physician & Internal Medicine"}
                  </span>
                  <span>•</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    Medical Reg No: {doctorUser?.registration_no || "TN-2026-881"}
                  </span>
                  {doctorUser?.hospital_name && (
                    <>
                      <span>•</span>
                      <span>{doctorUser.hospital_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedPatientId && (
              <button
                type="button"
                onClick={closePatientRecord}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {sidebarTab === 'viewed_patients' ? 'My Patients' : 'Dashboard'}</span>
              </button>
            )}
          </div>

          {/* ============================================================== */}
          {/* VIEW: FULL PATIENT MEDICAL RECORD (When a patient is active)    */}
          {/* ============================================================== */}
          {selectedPatientId ? (
            <div className="space-y-6">
              {loadingRecord ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                  <p className="font-bold text-slate-700">Loading comprehensive medical record...</p>
                </div>
              ) : recordError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-3xl">
                  <p className="font-bold">{recordError}</p>
                  <button
                    type="button"
                    onClick={closePatientRecord}
                    className="mt-3 text-xs font-bold bg-rose-700 text-white px-4 py-2 rounded-xl"
                  >
                    Return
                  </button>
                </div>
              ) : medicalRecord ? (
                <div className="space-y-6">
                  
                  {/* Top Patient Header Bar */}
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-2xl border border-white/20">
                        {medicalRecord.patient_info?.name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black">
                            {medicalRecord.patient_info?.name}
                          </h2>
                          <span className="bg-blue-700 text-blue-100 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                            PT-{medicalRecord.patient_info?.id?.toString().padStart(3, '0')}
                          </span>
                        </div>
                        <p className="text-xs text-blue-200 font-medium mt-0.5">
                          {medicalRecord.patient_info?.age} yrs • {medicalRecord.patient_info?.gender} • Blood Group: <strong>{medicalRecord.patient_info?.blood_group || 'O+'}</strong> • 📞 +91 {medicalRecord.patient_info?.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openCreatePrescriptionModal}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create New Prescription</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. PATIENT INFORMATION */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span>Patient Information</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block">Full Name</span>
                        <span className="font-black text-slate-800 text-sm">{medicalRecord.patient_info?.name}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block">Patient ID</span>
                        <span className="font-mono font-black text-blue-700 text-sm">PT-{medicalRecord.patient_info?.id?.toString().padStart(3, '0')}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block">Age / Gender</span>
                        <span className="font-bold text-slate-800 text-sm">{medicalRecord.patient_info?.age} yrs / {medicalRecord.patient_info?.gender}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase block">Blood Group</span>
                        <span className="font-extrabold text-rose-700 text-sm">{medicalRecord.patient_info?.blood_group || 'O+'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                        <span className="text-slate-400 font-bold uppercase block">Mobile & Email</span>
                        <span className="font-medium text-slate-800">+91 {medicalRecord.patient_info?.phone} • {medicalRecord.patient_info?.email || 'No email provided'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
                        <span className="text-slate-400 font-bold uppercase block">Address</span>
                        <span className="font-medium text-slate-800">{medicalRecord.patient_info?.address || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. CURRENT PRESCRIPTION */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                        <Pill className="w-5 h-5 text-blue-600" />
                        <span>Current Prescription</span>
                      </h3>

                      {medicalRecord.current_prescription && (
                        medicalRecord.current_prescription.can_edit ? (
                          <button
                            type="button"
                            onClick={() => openEditPrescriptionModal(medicalRecord.current_prescription)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Current RX</span>
                          </button>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Read-Only (Prescribed by {medicalRecord.current_prescription.doctor_name})</span>
                          </span>
                        )
                      )}
                    </div>

                    {medicalRecord.current_prescription ? (
                      <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-200/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-200/60">
                          <div>
                            <span className="text-xs font-mono font-black text-blue-900">
                              {medicalRecord.current_prescription.prescription_number}
                            </span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">
                              Diagnosis: <strong className="text-slate-900">{medicalRecord.current_prescription.diagnosis}</strong>
                            </p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-0.5 rounded-full">
                            ACTIVE
                          </span>
                        </div>

                        {/* Prescription Items */}
                        <div className="space-y-3">
                          {medicalRecord.current_prescription.items?.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {item.medicine_name} {item.strength && `(${item.strength})`}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="bg-blue-100 text-blue-900 text-[11px] font-mono font-black px-2 py-0.5 rounded">
                                    Schedule: {item.timing_code}
                                  </span>
                                  <span className="text-xs text-slate-600 font-medium">
                                    • {item.dosage} • {item.frequency}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    • Duration: {item.duration}
                                  </span>
                                </div>
                                {item.instructions && (
                                  <p className="text-xs text-blue-700 font-semibold mt-1">
                                    Advice: {item.instructions}
                                  </p>
                                )}
                              </div>

                              {/* Morning / Afternoon / Night Breakdown Pills */}
                              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                <span className={`px-2 py-1 rounded text-[11px] font-bold ${item.morning_dose > 0 ? "bg-amber-100 text-amber-900 font-black" : "bg-slate-100 text-slate-400"}`}>
                                  M: {item.morning_dose || 0}
                                </span>
                                <span className={`px-2 py-1 rounded text-[11px] font-bold ${item.afternoon_dose > 0 ? "bg-orange-100 text-orange-900 font-black" : "bg-slate-100 text-slate-400"}`}>
                                  A: {item.afternoon_dose || 0}
                                </span>
                                <span className={`px-2 py-1 rounded text-[11px] font-bold ${item.night_dose > 0 ? "bg-blue-100 text-blue-900 font-black" : "bg-slate-100 text-slate-400"}`}>
                                  N: {item.night_dose || 0}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-bold">No active prescription found.</p>
                        <button
                          type="button"
                          onClick={openCreatePrescriptionModal}
                          className="mt-2 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          + Prescribe now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. PAST MEDICAL HISTORY */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-600" />
                      <span>Past Medical History</span>
                    </h3>

                    {medicalRecord.past_medical_history?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No past history consultations recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {medicalRecord.past_medical_history?.map((hist, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{hist.method}</span>
                              <span className="text-slate-400 font-mono">{new Date(hist.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 font-medium">Chief Complaint: <strong>{hist.chief_complaint}</strong></p>
                            {hist.doctor_notes && (
                              <p className="text-blue-900 bg-blue-50 p-2 rounded-lg font-medium mt-1">
                                Doctor Notes: {hist.doctor_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. UPLOADED MEDICAL REPORTS */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                      <span>Uploaded Medical Reports</span>
                    </h3>

                    {medicalRecord.medical_reports?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No scanned reports or lab tests uploaded.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {medicalRecord.medical_reports?.map((rep) => (
                          <div key={rep.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{rep.report_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{rep.report_type} • {rep.report_date || 'Undated'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingReportModal(rep)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadReport(rep)}
                                disabled={downloadingReportId === rep.id}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-800 p-1.5 rounded-lg cursor-pointer"
                                title="Download Report"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. PRESCRIPTION HISTORY */}
                  {medicalRecord.prescription_history?.length > 0 && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span>Prescription History</span>
                      </h3>

                      <div className="space-y-3">
                        {medicalRecord.prescription_history.map((pastRx) => (
                          <div key={pastRx.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-700">{pastRx.prescription_number}</span>
                              <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                {pastRx.status}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800">Diagnosis: {pastRx.diagnosis}</p>
                            <div className="flex flex-wrap gap-2">
                              {pastRx.items?.map((it, i) => (
                                <span key={i} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">
                                  {it.medicine_name} ({it.timing_code})
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          ) : (
            /* ============================================================== */
            /* SIDEBAR TAB 1, 2, 3 VIEWS                                      */
            /* ============================================================== */
            <div>
              
              {/* ------------------------------------------------------------ */}
              {/* TAB 1: 🏠 DASHBOARD                                         */}
              {/* ------------------------------------------------------------ */}
              {sidebarTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Summary Header */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Doctor Dashboard
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      Welcome, {doctorUser?.name || "Dr. Rajesh Sharma"}. Here is your clinical overview today.
                    </p>
                  </div>

                  {/* 3 STATISTICS CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    
                    {/* Stat 1: Viewed Patients */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Viewed Patients
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-blue-900 mt-2">
                          {stats.viewed_patients_count}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Stat 2: Today's Patients */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Today's Patients
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-emerald-800 mt-2">
                          {stats.today_patients_count}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Stat 3: Active Cases */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Active Cases
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-blue-700 mt-2">
                          {stats.active_cases_count}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Pill className="w-6 h-6" />
                      </div>
                    </div>

                  </div>

                  {/* PATIENT SEARCH SECTION */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Search Patient
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Find any registered patient by Patient ID, Mobile Number, or Patient Name
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNavSelect('new_patient')}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add New Patient</span>
                      </button>
                    </div>

                    {/* Search Bar Input */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative flex-1 w-full">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                          }}
                          placeholder="Search by Patient ID / Mobile / Name"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleSearch()}
                          disabled={searching}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          <span>Search</span>
                        </button>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); handleSearch(''); }}
                            className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-2xl cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search Results List */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                          Search Results ({searchResults.length})
                        </span>
                      </div>

                      {searchResults.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                          <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-semibold">No patients found matching your search.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {searchResults.map((p) => (
                            <div
                              key={p.id}
                              className="bg-slate-50 hover:bg-blue-50/50 p-4 rounded-2xl border border-slate-200 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-extrabold text-slate-900 text-sm">{p.name}</h4>
                                  <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    PT-{p.id.toString().padStart(3, '0')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                  Age: <strong>{p.age}</strong> • Gender: <strong>{p.gender}</strong>
                                </p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                  📞 +91 {p.phone}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-200/60">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPatientRecord(p.id)}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Patient</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* TAB 2: 👥 MY PATIENTS (AUTHORIZED)                           */}
              {/* ------------------------------------------------------------ */}
              {sidebarTab === 'viewed_patients' && (
                <div className="space-y-6">
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-6 h-6 text-blue-600" />
                      <span>My Patients</span>
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      Patients with authorized medical record access for {doctorUser?.name || "Dr. Rajesh Sharma"}.
                    </p>
                  </div>

                  {loadingViewedList ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                      <p className="font-bold text-slate-600 text-sm">Loading your authorized patients...</p>
                    </div>
                  ) : viewedPatientsList.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center space-y-3">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <h3 className="font-bold text-slate-700 text-base">No authorized patients yet</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Patients will appear here once you add them using New Patient.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNavSelect('new_patient')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
                      >
                        Add New Patient
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
                            <tr>
                              <th className="py-4 px-6">Patient</th>
                              <th className="py-4 px-6">Patient ID</th>
                              <th className="py-4 px-6">Access Status</th>
                              <th className="py-4 px-6">Last Viewed</th>
                              <th className="py-4 px-6 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {viewedPatientsList.map((vp) => (
                              <tr key={vp.patient_id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="font-extrabold text-slate-900 text-sm">
                                    {vp.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {vp.age} yrs • {vp.gender} • 📞 +91 {vp.phone}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-md">
                                    {vp.formatted_patient_id}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Authorized</span>
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-semibold text-slate-700">
                                    {vp.last_viewed_display}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPatientRecord(vp.patient_id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* TAB: 📋 AVAILABLE PATIENTS (DISCOVERY & AUTHORIZATION)       */}
              {/* ------------------------------------------------------------ */}
              {sidebarTab === 'available_patients' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        <span>Available Patients</span>
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Registered patients available for authorized access.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchAvailablePatients(availableSearchQuery)}
                      className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingAvailable ? 'animate-spin text-blue-600' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Search Bar Input */}
                  <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative flex-1 w-full">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          value={availableSearchQuery}
                          onChange={(e) => {
                            setAvailableSearchQuery(e.target.value);
                            fetchAvailablePatients(e.target.value);
                          }}
                          placeholder="Search Patient by Name / Patient ID / Mobile"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => fetchAvailablePatients(availableSearchQuery)}
                          disabled={loadingAvailable}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          {loadingAvailable ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          <span>Search</span>
                        </button>
                        {availableSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvailableSearchQuery('');
                              fetchAvailablePatients('');
                            }}
                            className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-2xl cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table / List */}
                  {loadingAvailable ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                      <p className="font-bold text-slate-600 text-sm">Loading available registered patients...</p>
                    </div>
                  ) : availablePatientsList.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center space-y-3">
                      <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                      <h3 className="font-bold text-slate-700 text-base">No registered patients found</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No patients matched your search criteria. You can search by Name, PT-001, or 10-digit mobile number.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
                            <tr>
                              <th className="py-4 px-6">Patient</th>
                              <th className="py-4 px-6">Patient ID</th>
                              <th className="py-4 px-6">Masked Mobile</th>
                              <th className="py-4 px-6">Access Status</th>
                              <th className="py-4 px-6 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {availablePatientsList.map((p) => {
                              const isAuthorized = p.status === 'AUTHORIZED';
                              const isPending = p.status === 'ACCESS_PENDING';
                              const isRevoked = p.status === 'ACCESS_DENIED' || p.status === 'REVOKED';

                              return (
                                <tr key={p.patient_id} className="hover:bg-blue-50/40 transition-colors">
                                  <td className="py-4 px-6">
                                    <div className="font-extrabold text-slate-900 text-sm">
                                      {p.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-medium">
                                      {p.age} yrs • {p.gender}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-md">
                                      {p.formatted_patient_id}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="font-mono text-slate-600 font-semibold">
                                      {p.masked_phone}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    {isAuthorized ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Authorized</span>
                                      </span>
                                    ) : isPending ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>OTP Sent</span>
                                      </span>
                                    ) : isRevoked ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Revoked</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Available</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    {isAuthorized ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPatientRecord(p.patient_id)}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View Patient</span>
                                      </button>
                                    ) : isPending ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAccessModal(p, true)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                        <span>Enter OTP</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAccessModal(p, false)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Request Access</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* TAB 3: ➕ NEW PATIENT                                        */}
              {/* ------------------------------------------------------------ */}
              {/* ------------------------------------------------------------ */}
              {/* TAB 3: ➕ NEW PATIENT (ADD PATIENT BY MOBILE & OTP)         */}
              {/* ------------------------------------------------------------ */}
              {sidebarTab === 'new_patient' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                      <UserPlus className="w-6 h-6 text-blue-600" />
                      <span>Add Patient</span>
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      Find a registered patient using mobile number and request OTP verification.
                    </p>
                  </div>

                  {/* STAGE 1: INPUT MOBILE NUMBER */}
                  {addPatientStage === 'INPUT' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                      <form onSubmit={handleCheckPatientByMobile} className="space-y-6">
                        <div className="text-center space-y-2 pb-2">
                          <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-xs">
                            <Phone className="w-7 h-7" />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">Enter Patient Mobile Number</h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            The patient's information will be retrieved from the database. No manual details entry required.
                          </p>
                        </div>

                        {addPatientError && (
                          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                            <span>{addPatientError}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                            Patient Mobile Number *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-base font-mono">
                              +91
                            </span>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={addPatientPhone}
                              onChange={(e) => {
                                setAddPatientPhone(e.target.value.replace(/\D/g, ''));
                                setAddPatientError('');
                              }}
                              placeholder="10-digit mobile number"
                              className="w-full pl-14 pr-4 py-3.5 border border-slate-300 rounded-2xl font-mono text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-1.5 ml-1">
                            Enter 10-digit mobile number (e.g. 98765 43210).
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={checkingPatient || addPatientPhone.length < 10}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          {checkingPatient ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Checking Patient...</span>
                            </>
                          ) : (
                            <>
                              <span>Check Patient</span>
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* STAGE 2: PATIENT NOT FOUND */}
                  {addPatientStage === 'NOT_FOUND' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
                      <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
                        <AlertCircle className="w-8 h-8" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-rose-900">❌ Patient Not Found</h3>
                        <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                          The patient must register in MediKiosk before being added.
                        </p>
                        <div className="inline-block mt-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-600">
                          Searched: +91 {addPatientPhone}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleResetAddPatient}
                          className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-2xl text-sm cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Try Another Number</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: PATIENT ALREADY ADDED */}
                  {addPatientStage === 'ALREADY_ADDED' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
                      <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-emerald-900">✓ Patient Already Added</h3>
                        <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                          This patient is already present in your patient list.
                        </p>
                      </div>

                      {patientLookupResult && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase">Patient Name:</span>
                            <span className="font-black text-slate-900 text-sm">{patientLookupResult.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase">Patient ID:</span>
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{patientLookupResult.formatted_id}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase">Mobile:</span>
                            <span className="font-mono font-bold text-slate-700">{patientLookupResult.masked_phone || ('+91 ' + patientLookupResult.phone)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPatientRecord(patientLookupResult?.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl text-sm shadow-md cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Patient</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetAddPatient}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-2xl text-sm cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                        >
                          <span>Try Another Number</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: PATIENT FOUND (CONFIRM IDENTITY & SEND OTP) */}
                  {addPatientStage === 'FOUND' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-blue-600">
                          <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900">Patient Found</h3>
                          <p className="text-xs text-slate-500 font-medium">Limited identity confirmation before requesting patient OTP consent.</p>
                        </div>
                      </div>

                      {patientLookupResult && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2.5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Patient Name:</span>
                            <span className="font-black text-slate-900 text-base">{patientLookupResult.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Patient ID:</span>
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm">{patientLookupResult.formatted_id}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Registered Mobile:</span>
                            <span className="font-mono font-bold text-slate-700">{patientLookupResult.masked_phone || ('+91 ' + patientLookupResult.phone)}</span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                        <p>
                          An OTP will be sent to the patient's registered mobile number to confirm consent.
                        </p>
                      </div>

                      {addPatientError && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                          <span>{addPatientError}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSendPatientAddOtp}
                          disabled={sendingPatientOtp}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          {sendingPatientOtp ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Sending OTP...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Send OTP</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetAddPatient}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm cursor-pointer transition-all"
                        >
                          Cancel / Try Another
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 5: OTP INPUT SCREEN */}
                  {addPatientStage === 'OTP_INPUT' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                      <form onSubmit={handleVerifyPatientAddOtp} className="space-y-6">
                        <div className="text-center space-y-2 pb-1">
                          <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                            <KeyRound className="w-7 h-7" />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">
                            OTP Sent to {patientLookupResult?.masked_phone || ('+91 ' + addPatientPhone)}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Please enter the 6-digit OTP provided by the patient:
                          </p>
                        </div>

                        {addPatientError && (
                          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                            <span>{addPatientError}</span>
                          </div>
                        )}

                        <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-3">
                          <input
                            type="text"
                            maxLength={6}
                            value={patientAddOtp}
                            onChange={(e) => {
                              setPatientAddOtp(e.target.value.replace(/\D/g, ''));
                              setAddPatientError('');
                            }}
                            placeholder="• • • • • •"
                            className="w-full text-center tracking-[1em] font-mono text-2xl font-black py-3 border border-blue-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                            autoFocus
                          />

                          {patientAddDemoOtp && (
                            <div className="bg-white border border-blue-200 rounded-xl p-3 text-center shadow-xs">
                              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                                DEVELOPMENT DEMO OTP
                              </p>
                              <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                                {patientAddDemoOtp}
                              </p>
                              <p className="text-xs text-blue-600 font-medium mt-1">
                                Demo Mode Active — No SMS gateway required
                              </p>
                            </div>
                          )}


                          <div className="text-center pt-1">
                            {patientAddCooldown > 0 ? (
                              <p className="text-xs text-slate-500 font-bold">
                                Resend OTP in {patientAddCooldown}s
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendPatientAddOtp}
                                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="submit"
                            disabled={verifyingPatientOtp || patientAddOtp.length < 6}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            {verifyingPatientOtp ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verifying & Linking...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>Verify & Add Patient</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleResetAddPatient}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* STAGE 6: SUCCESS CONFIRMATION */}
                  {addPatientStage === 'SUCCESS' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
                      <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-2xl font-black text-slate-900">✓ Patient Added Successfully!</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                          Patient identity confirmed and securely added to your patient list.
                        </p>
                      </div>

                      {addPatientSuccessData && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left max-w-md mx-auto space-y-2.5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Patient Name:</span>
                            <span className="font-black text-slate-900 text-base">{addPatientSuccessData.name}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Patient ID:</span>
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm">{addPatientSuccessData.formatted_id}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Status:</span>
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{addPatientSuccessData.status || 'Verified & Linked'}</span>
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPatientRecord(addPatientSuccessData?.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm shadow-md cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Patient Record</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleResetAddPatient();
                            setSidebarTab('dashboard');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-2xl text-sm cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Home className="w-4 h-4" />
                          <span>Done / Back to Dashboard</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE NEW PRESCRIPTION                               */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Create New Prescription</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Patient: {medicalRecord?.patient_info?.name} (PT-{selectedPatientId?.toString().padStart(3, '0')})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rxFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{rxFormError}</span>
              </div>
            )}

            {/* Diagnosis & Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                  placeholder="e.g. Type 2 Diabetes Mellitus with Essential Hypertension"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Doctor Clinical Notes
                </label>
                <textarea
                  rows={2}
                  value={prescriptionForm.doctor_notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctor_notes: e.target.value })}
                  placeholder="Dietary instructions, lifestyle modifications, or follow-up notes..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Prescribed Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Prescribed Medications ({prescriptionForm.items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-emerald-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              <div className="space-y-4">
                {prescriptionForm.items.map((item, idx) => (
                  <PrescriptionMedicineCard
                    key={idx}
                    item={item}
                    index={idx}
                    totalItems={prescriptionForm.items.length}
                    handleMedicineChange={handleMedicineChange}
                    handleTimingSlotChange={handleTimingSlotChange}
                    handleDosageUnitChange={handleDosageUnitChange}
                    handleRemoveMedicineRow={handleRemoveMedicineRow}
                    DOSAGE_UNITS={DOSAGE_UNITS}
                    QUICK_DURATIONS={QUICK_DURATIONS}
                    QUICK_INSTRUCTIONS={QUICK_INSTRUCTIONS}
                    themeColor="emerald"
                  />
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePrescription(false)}
                disabled={submittingRx}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                {submittingRx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Finalize & Issue Prescription</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PRESCRIPTION (Only for Creator Doctor)           */}
      {/* ============================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Active Prescription</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    RX: {medicalRecord?.current_prescription?.prescription_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rxFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{rxFormError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Doctor Clinical Notes
                </label>
                <textarea
                  rows={2}
                  value={prescriptionForm.doctor_notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctor_notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Medication Items ({prescriptionForm.items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-blue-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              <div className="space-y-4">
                {prescriptionForm.items.map((item, idx) => (
                  <PrescriptionMedicineCard
                    key={idx}
                    item={item}
                    index={idx}
                    totalItems={prescriptionForm.items.length}
                    handleMedicineChange={handleMedicineChange}
                    handleTimingSlotChange={handleTimingSlotChange}
                    handleDosageUnitChange={handleDosageUnitChange}
                    handleRemoveMedicineRow={handleRemoveMedicineRow}
                    DOSAGE_UNITS={DOSAGE_UNITS}
                    QUICK_DURATIONS={QUICK_DURATIONS}
                    QUICK_INSTRUCTIONS={QUICK_INSTRUCTIONS}
                    themeColor="blue"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePrescription(true)}
                disabled={submittingRx}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                {submittingRx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: VIEW REPORT MODAL                                     */}
      {/* ============================================================== */}
      {viewingReportModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{viewingReportModal.report_name}</p>
                <p className="text-[11px] text-slate-400">{viewingReportModal.report_type} • {viewingReportModal.file_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReport(viewingReportModal)}
                  disabled={downloadingReportId === viewingReportModal.id}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  title="Download Report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReportModal(null)}
                  className="text-white hover:text-rose-400 p-1 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 p-2 overflow-hidden flex items-center justify-center">
              {loadingReportBlob ? (
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold">Loading document securely...</span>
                </div>
              ) : reportBlobError ? (
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-rose-200 text-rose-600">
                  <p className="font-bold">{reportBlobError}</p>
                </div>
              ) : reportBlobUrl ? (
                viewingReportModal.mime_type?.includes('pdf') || viewingReportModal.file_name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={reportBlobUrl}
                    title={viewingReportModal.report_name}
                    className="w-full h-full rounded-2xl border-0 bg-white"
                  />
                ) : (
                  <img
                    src={reportBlobUrl}
                    alt={viewingReportModal.report_name}
                    className="max-h-full max-w-full object-contain rounded-2xl"
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: REQUEST ACCESS / VERIFY PATIENT OTP MODAL             */}
      {/* ============================================================== */}
      {accessModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/20">
                  <KeyRound className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-base font-black">Patient Access Authorization</h3>
                  <p className="text-xs text-blue-200 font-medium">OTP Verification Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccessModalPatient(null);
                  setAccessError('');
                  setAccessSuccessMessage('');
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Patient Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{accessModalPatient.name}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {accessModalPatient.age} yrs • {accessModalPatient.gender}
                  </p>
                  <p className="text-xs font-mono font-bold text-blue-600 mt-1">
                    📞 {accessModalPatient.masked_phone}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-900 font-mono font-black text-xs px-2.5 py-1 rounded-lg border border-blue-200">
                  {accessModalPatient.formatted_patient_id}
                </span>
              </div>

              {accessSuccessMessage ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Access Granted!</h4>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      {accessSuccessMessage}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pid = accessModalPatient.patient_id;
                        setAccessModalPatient(null);
                        setAccessSuccessMessage('');
                        handleOpenPatientRecord(pid);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Patient Record</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccessModalPatient(null);
                        setAccessSuccessMessage('');
                      }}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVerifyAccessOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Enter Patient's 6-Digit OTP *
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      An authorization code was dispatched to the patient's registered mobile number <strong>{accessModalPatient.masked_phone}</strong>.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      value={accessOtp}
                      onChange={(e) => setAccessOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 border-2 border-blue-200 focus:border-blue-600 rounded-2xl bg-blue-50/30 focus:bg-white focus:outline-hidden transition-all"
                      autoFocus
                    />

                    {accessDemoOtp && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center my-2">
                        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                          DEVELOPMENT DEMO OTP
                        </p>
                        <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                          {accessDemoOtp}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Demo Mode Active — No SMS gateway required
                        </p>
                      </div>
                    )}
                  </div>


                  {/* Cooldown and Resend */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Didn't receive OTP?</span>
                    {accessCooldown > 0 ? (
                      <span className="text-blue-600 font-bold font-mono">
                        Resend in {accessCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendAccessOtp}
                        disabled={requestingAccess}
                        className="text-blue-600 hover:text-blue-900 font-bold underline cursor-pointer"
                      >
                        {requestingAccess ? "Sending..." : "Resend OTP"}
                      </button>
                    )}
                  </div>

                  {accessError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{accessError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAccessModalPatient(null);
                        setAccessError('');
                      }}
                      className="flex-1 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifyingAccess || accessOtp.trim().length !== 6}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      {verifyingAccess ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Grant Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboardPage;
