import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard,
  Pill, 
  History, 
  FileText, 
  FileUp, 
  Sparkles, 
  User, 
  LogOut, 
  Camera, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Eye, 
  Download, 
  RefreshCw, 
  Menu, 
  Trash2, 
  Printer, 
  HeartPulse, 
  Lock, 
  Phone, 
  Droplet, 
  CreditCard, 
  Globe, 
  Stethoscope, 
  Leaf, 
  ArrowRight, 
  Edit2, 
  Save,
  Clock,
  Calendar,
  Upload,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { 
  getPatientMedicalRecord, 
  getPatientReports,
  uploadPatientReport,
  deletePatientReport,
  getPatientReportViewUrl,
  getPatientReportDownloadUrl,
  startKioskSession,
  updatePatientProfile 
} from '../services/api';

const REPORT_TYPE_OPTIONS = [
  'Blood Test',
  'X-Ray',
  'CT Scan',
  'MRI',
  'ECG',
  'Ultrasound',
  'Prescription',
  'Lab Report',
  'Other'
];

const PatientDashboardPage = () => {
  const { 
    lang, 
    setLang, 
    ayushMode, 
    setAyushMode, 
    patient, 
    setPatient,
    setActiveSession, 
    setCurrentPage, 
    logout, 
    t, 
    speakText 
  } = useKiosk();

  // Navigation tab strictly according to medical dashboard requirements:
  // 'dashboard' | 'prescriptions' | 'history' | 'reports' | 'consultation' | 'profile'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Safety redirect: If activeTab is ever set to 'rx_history', redirect to 'dashboard'
  useEffect(() => {
    if (activeTab === 'rx_history') {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Patient Medical Record State
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingConsultation, setStartingConsultation] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: '',
    blood_group: '',
    address: '',
    emergency_contact: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // ----------------- REPORT UPLOAD & SCAN STATE -----------------
  const [reportFile, setReportFile] = useState(null);
  const [reportType, setReportType] = useState('Blood Test');
  const [reportName, setReportName] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportDescription, setReportDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Camera Scanning State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);

  // Document Viewer Modal State
  const [viewingReportModal, setViewingReportModal] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);

  useEffect(() => {
    if (!patient) {
      setCurrentPage('login');
      return;
    }
    fetchPatientRecord();
  }, [patient?.id]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const fetchPatientRecord = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const data = await getPatientMedicalRecord(patient.id);
      setMedicalRecord(data);
      if (data?.patient_info) {
        setProfileForm({
          email: data.patient_info.email || '',
          blood_group: data.patient_info.blood_group || '',
          address: data.patient_info.address || '',
          emergency_contact: data.patient_info.emergency_contact || ''
        });
      }
    } catch (err) {
      console.warn("Could not load medical record", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    if (!patient?.id) return;
    setStartingConsultation(true);
    try {
      const session = await startKioskSession(patient.id, lang, ayushMode);
      setActiveSession(session);
      const methodText = ayushMode ? "AYUSH Ayurvedic Method" : "English Allopathy Method";
      speakText(`Starting consultation with ${methodText}.`);
      setCurrentPage('chatbot');
    } catch (err) {
      console.error(err);
      alert("Could not start consultation session. Please try again.");
    } finally {
      setStartingConsultation(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const updated = await updatePatientProfile(patient.id, profileForm);
      setPatient(updated);
      setIsEditingProfile(false);
      setProfileMsg('Profile information updated successfully!');
      fetchPatientRecord();
    } catch (err) {
      console.error(err);
      setProfileMsg('Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Recent Date";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  // ----------------- FILE VALIDATION & SELECTION -----------------
  const validateAndSetFile = (file) => {
    setUploadError('');
    setUploadSuccess(null);
    if (!file) return;

    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
    if (!validExtensions.includes(ext)) {
      setUploadError("Unsupported file format. Please upload a PDF, JPG, JPEG, or PNG document.");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError(`File size must be less than 10 MB (Selected file: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setReportFile(file);
    if (!reportName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setReportName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // ----------------- CAMERA SCANNING WORKFLOW -----------------
  const startCameraScan = async () => {
    setCameraError('');
    setCapturedImage(null);
    setCameraModalOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in your browser. Please use 'Browse Files' instead.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError(err.message || "Camera access was denied or is unavailable. Please click 'Browse Files' to select a document.");
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Stop live stream after photo taken
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError("Could not reactivate camera feed. Please browse files instead.");
    }
  };

  const useCapturedScan = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const file = new File([blob], `scanned_report_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setReportFile(file);
        if (!reportName.trim()) {
          setReportName(`Scanned ${reportType} (${timestamp})`);
        }
        stopCameraStream();
      })
      .catch(err => {
        alert("Failed to process scanned image: " + err.message);
      });
  };

  // ----------------- UPLOAD REPORT HANDLER -----------------
  const handleUploadReport = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess(null);

    if (!reportFile) {
      setUploadError("Please select a file.");
      return;
    }
    if (!reportType) {
      setUploadError("Please select a report type.");
      return;
    }
    if (!reportName.trim()) {
      setUploadError("Please enter a report name.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', reportFile);
      formData.append('report_name', reportName.trim());
      formData.append('report_type', reportType);
      if (reportDate) formData.append('report_date', reportDate);
      if (reportDescription) formData.append('description', reportDescription.trim());

      const result = await uploadPatientReport(patient.id, formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(percent, 95));
        }
      });

      setUploadProgress(100);
      setUploadSuccess(result);
      setReportFile(null);
      setReportName('');
      setReportDescription('');
      fetchPatientRecord();
    } catch (err) {
      console.error("Upload failed", err);
      const detail = err.response?.data?.detail || "Upload failed. Please verify file format and try again.";
      setUploadError(detail);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    setDeletingReportId(reportId);
    try {
      await deletePatientReport(patient.id, reportId);
      fetchPatientRecord();
    } catch (err) {
      alert("Could not delete report: " + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingReportId(null);
    }
  };

  const currentRx = medicalRecord?.current_prescription;
  const rxHistory = medicalRecord?.prescription_history || [];
  const pastHistory = medicalRecord?.past_medical_history || [];
  const medicalReports = medicalRecord?.medical_reports || [];
  const patientInfo = medicalRecord?.patient_info || patient;

  // PATIENT SIDEBAR NAVIGATION ITEMS:
  // 1. Dashboard
  // 2. Current Prescription
  // 3. Past Medical History
  // 4. Upload / Scan Report
  // 5. New AI Consultation Kiosk
  // 6. Personal Profile
  // 7. Logout
  const sidebarNavItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: 'prescriptions', 
      label: 'Current Prescription', 
      icon: Pill,
      badge: currentRx ? 'Active' : null
    },
    { 
      id: 'history', 
      label: 'Past Medical History', 
      icon: FileText,
      badge: pastHistory.length > 0 ? `${pastHistory.length}` : null
    },
    { 
      id: 'reports', 
      label: 'Upload / Scan Report', 
      icon: FileUp,
      badge: medicalReports.length > 0 ? `${medicalReports.length}` : 'New'
    },
    { 
      id: 'consultation', 
      label: 'New AI Consultation Kiosk', 
      icon: Sparkles,
      badge: null,
      highlight: true
    },
    { 
      id: 'profile', 
      label: 'Personal Profile', 
      icon: User,
      badge: null
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">

      {/* ============================================================== */}
      {/* MOBILE TOP HEADER BAR (with ☰ Hamburger)                       */}
      {/* ============================================================== */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-base leading-none block">MediKiosk</span>
              <span className="text-blue-600 font-bold text-[10px] uppercase tracking-wider block">Patient Portal</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {patientInfo?.name?.split(' ')[0] || 'Patient'}
          </span>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MOBILE DRAWER OVERLAY & SIDEBAR                                */}
      {/* ============================================================== */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black">
                  <HeartPulse className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-lg tracking-tight leading-tight">MediKiosk</h2>
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Patient Portal</p>
                </div>
              </div>
              <button 
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {sidebarNavItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all text-left ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-5 h-5 ${isActive ? "text-white" : item.highlight ? "text-amber-500" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isActive 
                          ? "bg-white/25 text-white" 
                          : item.badge === 'Active'
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Drawer Footer with Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 py-3 rounded-2xl font-bold text-sm border border-slate-200 shadow-sm transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. PERMANENT LEFT SIDEBAR (Desktop & Tablet)                   */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen shadow-sm z-20 flex-shrink-0">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-white">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black shadow-xs">
            <HeartPulse className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-xl tracking-tight leading-tight">MediKiosk</h2>
            <p className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Patient Portal</p>
          </div>
        </div>

        {/* Patient Quick Card */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm flex-shrink-0">
              {patientInfo?.name ? patientInfo.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 truncate">
                {patientInfo?.name || "Patient"}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <span className="font-mono text-blue-700 font-bold">#{patientInfo?.id || 1}</span>
                <span>•</span>
                <span>{patientInfo?.gender || "Male"}, {patientInfo?.age || 45}y</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sidebarNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all text-left group ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-xs" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive 
                      ? "text-blue-600" 
                      : item.highlight 
                        ? "text-amber-500" 
                        : "text-slate-500 group-hover:text-blue-600"
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ml-1 ${
                    isActive 
                      ? "bg-blue-100 text-blue-800" 
                      : item.badge === 'Active'
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT AREA (ON THE RIGHT)                             */}
      {/* ============================================================== */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ============================================================== */}
          {/* TAB A: 🏠 DASHBOARD (OVERVIEW & QUICK ACTIONS)                 */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Welcome Hero Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold px-3 py-1 rounded-full">
                      Patient ID: #{patientInfo?.id || 1}
                    </span>
                    {patientInfo?.blood_group && (
                      <span className="bg-rose-500/20 text-rose-200 border border-rose-400/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-rose-400" />
                        Blood: {patientInfo.blood_group}
                      </span>
                    )}
                    {patientInfo?.abha_id && (
                      <span className="bg-white/10 text-slate-200 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 font-mono">
                        <CreditCard className="w-3 h-3" />
                        ABHA: {patientInfo.abha_id}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {t.welcomePatient || "Welcome"}, <span className="text-blue-200">{patientInfo?.name || "Patient"}</span>
                  </h1>

                  <p className="text-blue-100/90 text-xs sm:text-sm font-medium mt-1 max-w-xl">
                    MediKiosk Digital Health Hub — Access your doctor prescriptions, upload laboratory reports, and complete AI clinical intakes with voice support.
                  </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-3">
                  <AudioGuideButton 
                    textToRead={`Welcome ${patientInfo?.name}. This is your MediKiosk patient dashboard. You can view your current prescriptions, upload lab reports, or begin a new clinical intake consultation.`} 
                    label="Listen Guide" 
                  />
                  <button
                    onClick={() => setActiveTab('consultation')}
                    className="bg-white hover:bg-blue-50 text-blue-900 font-extrabold px-5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-102"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>New Consfultation</span>
                  </button>
                </div>
              </div>

              {/* KPI Quick Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Active Medication Card */}
                <div 
                  onClick={() => setActiveTab('prescriptions')}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Pill className="w-6 h-6" />
                    </div>
                    {currentRx ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        None
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Current Prescription</h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {currentRx ? currentRx.diagnosis : "No active medication orders"}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>{currentRx?.items?.length || 0} Prescribed Meds</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. Medical Reports Card */}
                <div 
                  onClick={() => setActiveTab('reports')}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      {medicalReports.length} Files
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Medical Reports</h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      Blood tests, scans, and PDFs
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Upload & Scan →</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 3. Past Medical History Card */}
                <div 
                  onClick={() => setActiveTab('history')}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      {pastHistory.length} Sessions
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Past Medical History</h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      Intake sessions & summaries
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>View Records →</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Active Medication Snapshot (if present) */}
              {currentRx && (
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">Active Medication Orders</h3>
                        <p className="text-xs text-slate-500 font-medium">Prescribed for: <strong>{currentRx.diagnosis}</strong> ({formatDate(currentRx.created_at)})</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('prescriptions')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-900 hover:underline flex items-center gap-1"
                    >
                      <span>Full Prescription Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentRx.items?.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-blue-50/40 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-slate-900 text-sm">{item.medicine_name}</p>
                            <span className="font-mono text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                              {item.timing_code || `${item.morning_dose || 0}-${item.afternoon_dose || 0}-${item.night_dose || 0}`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{item.frequency} • {item.duration}</p>
                        </div>
                        <span className="bg-white border border-blue-200 text-blue-900 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs">
                          {item.dosage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Report Quick Tile */}
                <div 
                  onClick={() => setActiveTab('reports')}
                  className="bg-gradient-to-br from-blue-50 to-slate-50 p-6 rounded-3xl border border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">Upload or Scan Medical Report</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Add lab tests, radiology scans, or past records (PDF, JPG, PNG)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* AI Consultation Quick Tile */}
                <div 
                  onClick={() => setActiveTab('consultation')}
                  className="bg-gradient-to-br from-amber-50 to-slate-50 p-6 rounded-3xl border border-amber-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">Start AI Consultation Kiosk</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Choose English Allopathy or AYUSH Dashavidha Pariksha
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-700 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB B: 💊 CURRENT PRESCRIPTION                                 */}
          {/* ============================================================== */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill className="w-7 h-7 text-blue-600" />
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Current Prescription
                      </h2>
                    </div>
                    <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                      Active doctor medication orders and instructions prescribed for your ongoing treatment.
                    </p>
                  </div>

                  {/* Visual Permission Indicator */}
                  <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Read-Only for Patient (Physician Prescribed)</span>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <span>Loading current prescription...</span>
                  </div>
                ) : !currentRx ? (
                  <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">
                      No Active Prescription on File
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      You currently do not have an active prescription. When your doctor issues a prescription during your OPD consultation, it will appear here.
                    </p>
                    <button
                      onClick={() => setActiveTab('consultation')}
                      className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md"
                    >
                      Start Intake Consultation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Header Information Banner */}
                    <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-blue-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-blue-400 text-slate-900 text-xs font-mono font-black px-3 py-1 rounded-full uppercase">
                            {currentRx.prescription_number}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-3 py-1 rounded-full">
                            ● Active Status
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          Diagnosis: {currentRx.diagnosis}
                        </h3>
                        <p className="text-xs text-blue-200 font-medium mt-1">
                          Prescribed on: <strong>{formatDate(currentRx.created_at)}</strong>
                        </p>
                      </div>

                      {/* Prescribing Doctor Information */}
                      {currentRx.doctor && (
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-right sm:text-left">
                          <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Prescribed By</p>
                          <p className="font-extrabold text-base text-white">{currentRx.doctor.name}</p>
                          <p className="text-xs text-blue-200">{currentRx.doctor.specialty} ({currentRx.doctor.department})</p>
                          <p className="text-[11px] text-blue-300/80 font-mono">Reg No: {currentRx.doctor.registration_no}</p>
                        </div>
                      )}
                    </div>

                    {/* Normalized Medicines Breakdown */}
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>Prescribed Medications & Dosages</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentRx.items && currentRx.items.map((item, idx) => {
                          const m = item.morning_dose !== undefined && item.morning_dose !== null ? item.morning_dose : 0;
                          const a = item.afternoon_dose !== undefined && item.afternoon_dose !== null ? item.afternoon_dose : 0;
                          const n = item.night_dose !== undefined && item.night_dose !== null ? item.night_dose : 0;
                          const timingCode = item.timing_code || `${m}-${a}-${n}`;
                          const unit = item.dosage_unit || 'tablet';

                          return (
                            <div 
                              key={idx}
                              className="bg-white hover:bg-blue-50/30 border-2 border-slate-200 rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-3"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <h5 className="font-black text-slate-900 text-lg">
                                      {item.medicine_name}
                                    </h5>
                                    {item.strength && (
                                      <span className="text-xs text-slate-500 font-semibold">{item.strength}</span>
                                    )}
                                  </div>
                                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-xl flex-shrink-0">
                                    {item.dosage}
                                  </span>
                                </div>

                                {/* Generated Schedule Pill */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="font-mono text-xs font-extrabold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                    Timing: {timingCode}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                                    {item.frequency}
                                  </span>
                                </div>

                                {/* Morning / Afternoon / Night 3-box breakdown */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                  <div className={`p-1.5 rounded-xl border ${m > 0 ? 'bg-amber-50 font-bold text-amber-900 border-amber-300' : 'text-slate-400 bg-white border-slate-200'}`}>
                                    <p className="text-[10px] uppercase font-extrabold text-slate-500">🌅 Morning</p>
                                    <p className="mt-0.5 text-xs font-bold">{m > 0 ? `${m} ${unit}` : '—'}</p>
                                  </div>
                                  <div className={`p-1.5 rounded-xl border ${a > 0 ? 'bg-orange-50 font-bold text-orange-900 border-orange-300' : 'text-slate-400 bg-white border-slate-200'}`}>
                                    <p className="text-[10px] uppercase font-extrabold text-slate-500">☀️ Afternoon</p>
                                    <p className="mt-0.5 text-xs font-bold">{a > 0 ? `${a} ${unit}` : '—'}</p>
                                  </div>
                                  <div className={`p-1.5 rounded-xl border ${n > 0 ? 'bg-blue-50 font-bold text-blue-900 border-blue-300' : 'text-slate-400 bg-white border-slate-200'}`}>
                                    <p className="text-[10px] uppercase font-extrabold text-slate-500">🌙 Night</p>
                                    <p className="mt-0.5 text-xs font-bold">{n > 0 ? `${n} ${unit}` : '—'}</p>
                                  </div>
                                </div>

                                <div className="space-y-1 text-xs text-slate-600 font-medium mt-3">
                                  <p>Duration: <strong className="text-slate-900">{item.duration}</strong></p>
                                </div>
                              </div>

                              {item.instructions && (
                                <div className="pt-2 border-t border-slate-200 bg-blue-50/40 p-2.5 rounded-xl text-xs text-slate-900 font-semibold">
                                  📌 Instructions: {item.instructions}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Doctor Notes */}
                    {currentRx.doctor_notes && (
                      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                        <h5 className="font-bold text-xs text-amber-900 uppercase tracking-wider mb-1">
                          Doctor Clinical Advice & Diet Instructions
                        </h5>
                        <p className="text-sm text-slate-800 font-medium leading-relaxed">
                          {currentRx.doctor_notes}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs border border-slate-300"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Active Prescription</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>
          )}



          {/* ============================================================== */}
          {/* TAB D: 📄 PAST MEDICAL HISTORY (READ-ONLY)                     */}
          {/* ============================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-7 h-7 text-blue-600" />
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Past Medical History
                      </h2>
                    </div>
                    <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                      Chronological record of past hospital encounters, chief complaints, AI intake summaries, and laboratory test reports.
                    </p>
                  </div>

                  {/* Visual Permission Indicator */}
                  <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-300 text-xs font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>🔒 Historical Record • Read Only</span>
                  </div>
                </div>

                {pastHistory.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700 mb-1">
                      No Past Medical Intake Records
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your past conversational intake sessions and hospital summaries will appear here in immutable chronological order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastHistory.map((item, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-5 sm:p-6 transition-all shadow-sm space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white px-3 py-1 rounded-xl border border-slate-200">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(item.date)}
                            </span>
                            <span className="text-xs font-bold bg-white text-slate-700 px-3 py-1 rounded-xl border border-slate-200">
                              Session: {item.session_token}
                            </span>
                            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-xl">
                              {item.method}
                            </span>
                            {item.doctor_verified && (
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Doctor Verified
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-bold text-slate-400">
                            🔒 Read-Only History
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900">
                          Chief Complaint: <span className="font-semibold text-slate-700">{item.chief_complaint || "Routine review"}</span>
                        </p>

                        {item.hpi && (
                          <p className="text-xs text-slate-600">
                            <strong>HPI:</strong> {item.hpi}
                          </p>
                        )}

                        {item.past_medical_surgical && (
                          <p className="text-xs text-slate-600">
                            <strong>Past Conditions:</strong> {item.past_medical_surgical}
                          </p>
                        )}

                        {item.medication_history && (
                          <p className="text-xs text-slate-600">
                            <strong>Medication History:</strong> {item.medication_history}
                          </p>
                        )}

                        {item.ayush_assessment && (
                          <p className="text-xs text-amber-800">
                            <strong>AYUSH Assessment:</strong> {item.ayush_assessment}
                          </p>
                        )}

                        {item.documents && item.documents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-bold text-slate-400">Attached Reports:</span>
                            {item.documents.map((d, dIdx) => (
                              <span key={dIdx} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                                {d.file_name} ({d.doc_type})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB E: 📤 UPLOAD / SCAN REPORT (NEW COMPREHENSIVE FEATURE)     */}
          {/* ============================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              {/* Main Upload / Scan Interface Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileUp className="w-7 h-7 text-blue-600" />
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Upload / Scan Report
                      </h2>
                    </div>
                    <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                      Securely upload your medical reports and documents.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3.5 py-1.5 rounded-2xl border border-blue-200 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Encrypted & Private to Your Medical Profile</span>
                  </div>
                </div>

                {/* Validation / Error Alert */}
                {uploadError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Upload Success Alert */}
                {uploadSuccess && (
                  <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span className="font-extrabold text-base">✓ Report uploaded successfully</span>
                      </div>
                      <span className="text-xs bg-emerald-200/60 text-emerald-950 font-bold px-2.5 py-0.5 rounded-full">
                        {uploadSuccess.report_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/70 p-3 rounded-2xl border border-emerald-100">
                      <p><strong>Report Name:</strong> {uploadSuccess.report_name}</p>
                      <p><strong>Date:</strong> {uploadSuccess.report_date || "Today"}</p>
                      <p><strong>File Name:</strong> {uploadSuccess.file_name}</p>
                      <p><strong>File Size:</strong> {(uploadSuccess.file_size_bytes / 1024).toFixed(0)} KB</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setViewingReportModal(uploadSuccess)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Report</span>
                      </button>
                      <a
                        href={getPatientReportDownloadUrl(patient.id, uploadSuccess.id)}
                        download={uploadSuccess.file_name}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Main Upload Box (Drag & Drop + Secondary Camera Scan) */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-3 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all flex flex-col items-center justify-center ${
                    isDragging 
                      ? "border-blue-600 bg-blue-50/80 scale-101" 
                      : reportFile 
                        ? "border-blue-400 bg-blue-50/30" 
                        : "border-slate-300 hover:border-blue-400 bg-slate-50/60"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        validateAndSetFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                    <FileUp className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1">
                    Upload Medical Report
                  </h3>
                  
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mb-4">
                    Drag & Drop your file here or browse from your device
                  </p>

                  {/* Primary & Secondary Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all hover:scale-102"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Browse Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={startCameraScan}
                      className="bg-white hover:bg-slate-100 text-slate-700 font-extrabold px-5 py-2.5 rounded-2xl text-xs sm:text-sm border border-slate-300 shadow-sm flex items-center gap-2 transition-all hover:scale-102"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Scan Document</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 font-semibold">
                    Supported formats: PDF, JPG, JPEG, PNG • Maximum size: 10 MB
                  </p>

                  {/* Selected File Feedback Badge */}
                  {reportFile && (
                    <div className="mt-5 inline-flex items-center gap-3 bg-white border-2 border-blue-500 px-4 py-2.5 rounded-2xl shadow-md text-xs sm:text-sm">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="font-black text-slate-900 block truncate max-w-xs">{reportFile.name}</span>
                        <span className="text-[11px] text-slate-500 font-semibold">{(reportFile.size / 1024).toFixed(0)} KB • Ready to upload</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportFile(null)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Report Metadata Details Form */}
                <form onSubmit={handleUploadReport} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Report Type Selector */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Report Type <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {REPORT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Report Name Input */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Report Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="e.g. Complete Blood Count, Liver Function Test"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Report Date Input */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Report Date
                      </label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                  </div>

                  {/* Description / Clinical Notes */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Description & Hospital Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Add any specific clinical notes, diagnostic findings, or hospital / laboratory name..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Upload Progress Bar (when uploading) */}
                  {isUploading && (
                    <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-extrabold text-blue-800">
                        <span>Uploading Report...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isUploading || !reportFile}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-sm shadow-md flex items-center gap-2 transition-all hover:scale-102"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Uploading Document...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4" />
                          <span>Upload Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>

              {/* ============================================================== */}
              {/* SECTION: MY UPLOADED REPORTS (TABLE & CARDS)                   */}
              {/* ============================================================== */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        My Uploaded Reports
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Stored medical records and diagnostic files available to you and your attending doctors.
                      </p>
                    </div>
                  </div>

                  <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full">
                    {medicalReports.length} {medicalReports.length === 1 ? 'Report' : 'Reports'}
                  </span>
                </div>

                {medicalReports.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-slate-700 mb-1">
                      No Uploaded Reports Yet
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Use the upload box above to add your blood tests, X-Rays, discharge summaries, or previous prescriptions.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Report</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">File Details</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                        {medicalReports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div>
                                  <span className="block">{rep.report_name}</span>
                                  {rep.description && (
                                    <span className="text-[11px] font-normal text-slate-500 block truncate max-w-xs">
                                      {rep.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="bg-blue-50 text-blue-800 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-blue-200">
                                {rep.report_type}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              {rep.report_date || formatDate(rep.created_at)}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                              <span className="truncate block max-w-[140px]">{rep.file_name}</span>
                              {rep.file_size_bytes && (
                                <span className="text-[10px] text-slate-400">
                                  {(rep.file_size_bytes / 1024).toFixed(0)} KB
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setViewingReportModal(rep)}
                                  className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
                                  title="View document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                                <a
                                  href={getPatientReportDownloadUrl(patient.id, rep.id)}
                                  download={rep.file_name}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-slate-200 transition-all"
                                  title="Download original file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                                <button
                                  onClick={() => handleDeleteReport(rep.id)}
                                  disabled={deletingReportId === rep.id}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete report"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB F: ✨ NEW AI CONSULTATION KIOSK                            */}
          {/* ============================================================== */}
          {activeTab === 'consultation' && (
            <div className="space-y-6">
              
              {/* Language Selection Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {t.selectLanguage}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Voice & Screen Language
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <button
                    onClick={() => { setLang('en'); speakText("English selected"); }}
                    className={`py-3.5 px-3 rounded-2xl font-bold text-base transition-all border-2 flex flex-col items-center justify-center ${
                      lang === 'en'
                        ? "bg-blue-600 text-white border-blue-800 shadow-md scale-102"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>English</span>
                  </button>

                  <button
                    onClick={() => { setLang('hi'); speakText("हिंदी भाषा चुनी गई", 'hi'); }}
                    className={`py-3.5 px-3 rounded-2xl font-bold text-base transition-all border-2 flex flex-col items-center justify-center ${
                      lang === 'hi'
                        ? "bg-blue-600 text-white border-blue-800 shadow-md scale-102"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>हिंदी</span>
                  </button>

                  <button
                    onClick={() => { setLang('ta'); speakText("தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது", 'ta'); }}
                    className={`py-3.5 px-3 rounded-2xl font-bold text-base transition-all border-2 flex flex-col items-center justify-center ${
                      lang === 'ta'
                        ? "bg-blue-600 text-white border-blue-800 shadow-md scale-102"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50"
                    }`}
                  >
                    <span>தமிழ்</span>
                  </button>
                </div>
              </div>

              {/* Medical Support Method Selector */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {t.medicalSupportSection || "Select Medical Support Method"}
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">
                    Choose the clinical consultation approach for today's intake interview:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* English Method */}
                  <div
                    onClick={() => { setAyushMode(false); speakText("English Allopathy method selected"); }}
                    className={`cursor-pointer rounded-3xl p-6 border-3 transition-all flex flex-col justify-between ${
                      !ayushMode
                        ? "bg-blue-50/90 border-blue-600 shadow-xl ring-4 ring-blue-500/20"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          !ayushMode ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          Modern Clinical Medicine
                        </span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                          !ayushMode ? "bg-blue-600 text-white" : "border-2 border-slate-300 text-transparent"
                        }`}>
                          <Check className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className={`p-3.5 rounded-2xl ${!ayushMode ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                          <Stethoscope className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 mb-1">English Method (Allopathy)</h3>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Standard allopathic consultation focusing on primary symptoms, duration, severity, past conditions, and active medications.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AYUSH Method */}
                  <div
                    onClick={() => { setAyushMode(true); speakText("AYUSH Ayurvedic method selected"); }}
                    className={`cursor-pointer rounded-3xl p-6 border-3 transition-all flex flex-col justify-between ${
                      ayushMode
                        ? "bg-amber-50/90 border-amber-600 shadow-xl ring-4 ring-amber-500/20"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          ayushMode ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          Ayurvedic 10-Fold Assessment
                        </span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                          ayushMode ? "bg-amber-700 text-white" : "border-2 border-slate-300 text-transparent"
                        }`}>
                          <Check className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className={`p-3.5 rounded-2xl ${ayushMode ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-600"}`}>
                          <Leaf className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 mb-1">AYUSH Method (Ayurvedic)</h3>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Dashavidha Pariksha evaluating Dushyam (tissues), Agni (digestive fire), Prakriti (constitution), Bala, and Satmyam.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartConsultation}
                  disabled={startingConsultation}
                  className={`kiosk-btn w-full py-4 px-6 rounded-2xl text-lg font-extrabold shadow-xl flex items-center justify-center gap-3 text-white transition-all ${
                    ayushMode ? "bg-amber-700 hover:bg-amber-800" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {startingConsultation ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Initializing Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Begin AI Conversational Intake</span>
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB G: 👤 PERSONAL PROFILE (VIEW & EDIT)                       */}
          {/* ============================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Patient Personal Profile
                    </h2>
                    <p className="text-slate-500 font-medium text-xs mt-1">
                      Demographic and emergency contact details on file with the hospital.
                    </p>
                  </div>

                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-xl text-xs border border-blue-200 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {profileMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                    {profileMsg}
                  </div>
                )}

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Full Name</span>
                      <span className="font-extrabold text-slate-900">{patientInfo?.name}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Mobile Number</span>
                      <span className="font-mono font-bold text-slate-900">+91 {patientInfo?.phone}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Date of Birth / Age</span>
                      <span className="font-bold text-slate-900">{patientInfo?.dob || 'N/A'} ({patientInfo?.age} yrs)</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Blood Group</span>
                      <span className="font-extrabold text-rose-700">{patientInfo?.blood_group || 'Not specified'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Email Address</span>
                      <span className="font-medium text-slate-900">{patientInfo?.email || 'None on record'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Emergency Contact</span>
                      <span className="font-mono text-slate-900">{patientInfo?.emergency_contact || 'None'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Residential Address</span>
                      <span className="text-slate-800">{patientInfo?.address || 'None on record'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="patient@example.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group</label>
                        <select
                          value={profileForm.blood_group}
                          onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                        >
                          <option value="O+">O+</option>
                          <option value="A+">A+</option>
                          <option value="B+">B+</option>
                          <option value="AB+">AB+</option>
                          <option value="O-">O-</option>
                          <option value="A-">A-</option>
                          <option value="B-">B-</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Emergency Contact Person / Phone</label>
                      <input
                        type="text"
                        value={profileForm.emergency_contact}
                        onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                        placeholder="Name / Relationship / Phone"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        placeholder="Full street address"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ============================================================== */}
      {/* 📷 CAMERA SCANNING MODAL                                       */}
      {/* ============================================================== */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <Camera className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-lg">Scan Document with Camera</h3>
              </div>
              <button 
                onClick={stopCameraStream}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">{cameraError}</p>
                <button
                  onClick={() => {
                    stopCameraStream();
                    fileInputRef.current?.click();
                  }}
                  className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
                >
                  Browse Files Instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {!capturedImage ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-4 border-2 border-dashed border-white/60 pointer-events-none rounded-xl flex items-center justify-center">
                      <span className="bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                        Align medical report inside box
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center border border-slate-200">
                    <img 
                      src={capturedImage} 
                      alt="Captured Scan Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {!capturedImage ? (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm"
                      >
                        Retake
                      </button>
                      <button
                        type="button"
                        onClick={useCapturedScan}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Use Scan</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📄 REPORT PREVIEW MODAL (INLINE VIEWING)                       */}
      {/* ============================================================== */}
      {viewingReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">{viewingReportModal.report_name}</h3>
                  <p className="text-xs text-slate-400">
                    Type: {viewingReportModal.report_type} • Date: {viewingReportModal.report_date || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getPatientReportDownloadUrl(patient?.id, viewingReportModal.id)}
                  download={viewingReportModal.file_name}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  onClick={() => setViewingReportModal(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-[420px]">
              {viewingReportModal.mime_type?.includes('pdf') || viewingReportModal.file_name?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getPatientReportViewUrl(patient?.id, viewingReportModal.id)}
                  title={viewingReportModal.report_name}
                  className="w-full h-[68vh] rounded-2xl border border-slate-300 bg-white"
                />
              ) : (
                <img
                  src={getPatientReportViewUrl(patient?.id, viewingReportModal.id)}
                  alt={viewingReportModal.report_name}
                  className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-md bg-white p-2"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDashboardPage;
