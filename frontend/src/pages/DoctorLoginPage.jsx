import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  User,
  UserCheck,
  LogIn,
  UserPlus,
  Mail,
  Building,
  Award,
  FileText
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { doctorSendOTP, doctorVerifyLogin, doctorVerifyRegister } from '../services/api';

const SPECIALIZATIONS = [
  "General Physician & Internal Medicine",
  "Family Medicine & General Practice",
  "Ayurvedic Physician (BAMS, MD - AYUSH)",
  "Cardiology & Cardiovascular Diseases",
  "Pediatrics & Child Health",
  "Orthopedics & Joint Care",
  "Pulmonology & Respiratory Medicine",
  "Dermatology & Skin Care",
  "ENT & Head Neck Surgery",
  "Obstetrics & Gynecology",
  "Neurology",
  "Emergency & Critical Care",
  "Other Specialization"
];

const DoctorLoginPage = ({ initialTab = 'login' }) => {
  const { loginAsDoctor, setCurrentPage, speakText } = useKiosk();

  // Active Tab: 'login' (Registered Doctor Login) or 'register' (New Doctor Registration)
  const [doctorTab, setDoctorTab] = useState(initialTab);

  // --- LOGIN STATE ---
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginDemoOtp, setLoginDemoOtp] = useState(null);
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [loginLoading, setLoginLoading] = useState(false);
  const [doctorNotFound, setDoctorNotFound] = useState(false);

  // --- REGISTRATION STATE ---
  const [regForm, setRegForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    registrationNo: '',
    specialization: 'General Physician & Internal Medicine',
    qualification: '',
    experience: '',
    hospitalClinic: '',
    department: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [regOtp, setRegOtp] = useState('');
  const [regDemoOtp, setRegDemoOtp] = useState(null);
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regCooldown, setRegCooldown] = useState(0);
  const [regLoading, setRegLoading] = useState(false);

  // Common Feedback State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync initialTab if prop changes
  useEffect(() => {
    if (initialTab) {
      setDoctorTab(initialTab);
    }
  }, [initialTab]);

  // Login Cooldown countdown
  useEffect(() => {
    let timer;
    if (loginCooldown > 0) {
      timer = setInterval(() => {
        setLoginCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loginCooldown]);

  // Registration Cooldown countdown
  useEffect(() => {
    let timer;
    if (regCooldown > 0) {
      timer = setInterval(() => {
        setRegCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [regCooldown]);

  // Reset feedback and OTP on tab switch
  const switchTab = (tab) => {
    setDoctorTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
    setDoctorNotFound(false);
    setFieldErrors({});
    if (tab === 'login') {
      speakText("Registered Doctor Login. Enter your registered mobile number to receive OTP.");
    } else {
      speakText("New Doctor Registration. Please enter your credentials and verify with mobile OTP.");
    }
  };

  // ==============================================================
  // 1. REGISTERED DOCTOR LOGIN HANDLERS
  // ==============================================================
  const handleLoginContinue = async (customPhone = null) => {
    const phoneNumber = (customPhone || loginPhone).trim();
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      setDoctorNotFound(false);
      return;
    }

    setLoginLoading(true);
    setErrorMsg('');
    setDoctorNotFound(false);
    setSuccessMsg('');

    try {
      const res = await doctorSendOTP(phoneNumber, 'LOGIN');
      setLoginPhone(phoneNumber);
      setLoginOtpSent(true);
      setLoginDemoOtp(res.demo_otp || null);
      setLoginCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || (res.demo_otp ? "Doctor Demo OTP generated successfully!" : "OTP sent successfully to registered physician number."));
      if (res.demo_otp) {
        speakText("Demo mode active. Your verification code is displayed on screen.");
      } else {
        speakText("OTP sent to your registered mobile number.");
      }
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "Doctor verification failed. Please try again.";

      if (status === 404 || detail.toLowerCase().includes("not found")) {
        setDoctorNotFound(true);
        setErrorMsg("Doctor account not found. Please switch to 'New Doctor Registration' to register your profile.");
        speakText("Doctor account not found. Please register your profile.");
      } else {
        setErrorMsg(detail);
        speakText(detail);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginVerifyOTP = async () => {
    if (!loginOtp.trim() || loginOtp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    setLoginLoading(true);
    setErrorMsg('');

    try {
      const res = await doctorVerifyLogin(loginPhone, loginOtp.trim());
      speakText(`Welcome, Dr. ${res.name}. Redirecting to Doctor Dashboard.`);
      loginAsDoctor(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Invalid or expired OTP. Please check and try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const triggerDemoDoctor = (demoPhone) => {
    setLoginPhone(demoPhone);
    setLoginOtp('');
    setLoginOtpSent(false);
    handleLoginContinue(demoPhone);
  };

  // ==============================================================
  // 2. NEW DOCTOR REGISTRATION HANDLERS & VALIDATION
  // ==============================================================
  const validateRegistrationForm = () => {
    const errors = {};

    // 1. Full Name
    const nameTrimmed = regForm.fullName.trim();
    if (!nameTrimmed) {
      errors.fullName = "Full name is required.";
    } else if (nameTrimmed.length < 3) {
      errors.fullName = "Please enter full name (minimum 3 characters).";
    }

    // 2. Mobile Number
    const cleanMobile = regForm.mobile.replace(/\D/g, '').trim();
    if (!cleanMobile) {
      errors.mobile = "Mobile number is required.";
    } else if (cleanMobile.length !== 10) {
      errors.mobile = "Please enter a valid 10-digit mobile number.";
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobile = "Mobile number must be a valid 10-digit Indian number starting with 6-9.";
    }

    // 3. Email Address
    const emailTrimmed = regForm.email.trim();
    if (!emailTrimmed) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = "Please enter a valid email address (e.g. doctor@hospital.com).";
    }

    // 4. Medical Registration Number
    const regNoTrimmed = regForm.registrationNo.trim();
    if (!regNoTrimmed) {
      errors.registrationNo = "Medical registration number is required.";
    } else if (regNoTrimmed.length < 3) {
      errors.registrationNo = "Please enter a valid registration number (e.g. TN-2026-881).";
    }

    // 5. Specialization
    if (!regForm.specialization.trim()) {
      errors.specialization = "Specialization is required.";
    }

    // 6. Qualification
    const qualTrimmed = regForm.qualification.trim();
    if (!qualTrimmed) {
      errors.qualification = "Qualification is required (e.g. MBBS, MD).";
    }

    // 7. Years of Experience
    if (regForm.experience === '' || regForm.experience === null || regForm.experience === undefined) {
      errors.experience = "Years of experience is required.";
    } else {
      const expNum = Number(regForm.experience);
      if (isNaN(expNum) || expNum < 0) {
        errors.experience = "Years of experience must be 0 or greater.";
      }
    }

    // 8. Hospital / Clinic
    const hospTrimmed = regForm.hospitalClinic.trim();
    if (!hospTrimmed) {
      errors.hospitalClinic = "Hospital or clinic name is required.";
    }

    // 9. Department
    const deptTrimmed = regForm.department.trim();
    if (!deptTrimmed) {
      errors.department = "Department is required (e.g. OPD Medicine).";
    }

    return errors;
  };

  const handleRegFieldChange = (field, value) => {
    setRegForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
    setErrorMsg('');
  };

  // Step 1: Send OTP for Registration
  const handleSendRegOTP = async () => {
    const errors = validateRegistrationForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg("Please fill all required fields correctly before requesting OTP.");
      return;
    }

    const cleanMobile = regForm.mobile.replace(/\D/g, '').trim();
    setRegLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFieldErrors({});

    try {
      const res = await doctorSendOTP(cleanMobile, 'REGISTER');
      setRegOtpSent(true);
      setRegDemoOtp(res.demo_otp || null);
      setRegCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || (res.demo_otp ? "Doctor Demo OTP generated successfully!" : `Verification OTP sent to +91 ${cleanMobile}`));
      if (res.demo_otp) {
        speakText("Demo mode active. Your verification code is displayed on screen.");
      } else {
        speakText("Verification code sent to your mobile number.");
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || "Failed to send OTP. Please check your mobile number.";
      setErrorMsg(detail);
      speakText(detail);
    } finally {
      setRegLoading(false);
    }
  };

  // Step 2: Verify OTP & Complete Doctor Registration
  const handleDoctorRegisterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // If OTP not yet sent, trigger send OTP first
    if (!regOtpSent) {
      await handleSendRegOTP();
      return;
    }

    // Validate fields again
    const errors = validateRegistrationForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg("Please fill all required fields correctly.");
      return;
    }

    if (!regOtp.trim() || regOtp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit verification OTP received on your mobile.");
      return;
    }

    const cleanMobile = regForm.mobile.replace(/\D/g, '').trim();
    setRegLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        full_name: regForm.fullName.trim(),
        name: regForm.fullName.trim(),
        mobile: cleanMobile,
        phone: cleanMobile,
        email: regForm.email.trim(),
        medical_registration_number: regForm.registrationNo.trim(),
        registration_no: regForm.registrationNo.trim(),
        specialization: regForm.specialization.trim(),
        specialty: regForm.specialization.trim(),
        qualification: regForm.qualification.trim(),
        experience: parseInt(regForm.experience, 10),
        experience_years: parseInt(regForm.experience, 10),
        hospital_clinic: regForm.hospitalClinic.trim(),
        hospital_name: regForm.hospitalClinic.trim(),
        department: regForm.department.trim(),
        otp: regOtp.trim()
      };

      const res = await doctorVerifyRegister(payload);
      speakText(`Registration successful. Welcome, Dr. ${res.name}. Redirecting to Doctor Dashboard.`);
      loginAsDoctor(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || "Registration failed. Please check the information and OTP.";
      setErrorMsg(detail);
      speakText(detail);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8 flex flex-col justify-between">
      
      {/* Top Header */}
      <div className="max-w-xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm mb-3 border border-blue-200 shadow-sm">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>Physician & OPD Clinical Portal</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          MediKiosk <span className="text-blue-700">Doctor Portal</span>
        </h1>
        <p className="text-slate-600 font-medium text-sm mt-1">
          {doctorTab === 'login'
            ? "Enter your mobile number to sign in securely."
            : "Register your medical credentials to join MediKiosk OPD network."}
        </p>

        <div className="flex justify-center mt-3">
          <AudioGuideButton 
            textToRead={doctorTab === 'login' 
              ? "Doctor Login. Please enter your registered physician mobile number to receive a one-time password." 
              : "New Doctor Registration. Please enter your credentials and verify with mobile OTP."} 
            label="Audio Guidance" 
          />
        </div>
      </div>

      {/* Main Card Container */}
      <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        
        {/* PRIMARY ROLE PORTAL TOGGLE: PATIENT vs DOCTOR */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setCurrentPage('login')}
            aria-label="Switch to Patient Portal"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all text-slate-600 hover:text-blue-700 hover:bg-slate-200/80 cursor-pointer"
          >
            <User className="w-5 h-5 text-slate-600" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            aria-label="Doctor Portal (Active)"
            className="flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer bg-blue-600 text-white shadow-md"
          >
            <Stethoscope className="w-5 h-5 text-white" />
            <span>Doctor Portal</span>
          </button>
        </div>

        {/* SUB-TABS: REGISTERED DOCTOR LOGIN vs NEW DOCTOR REGISTRATION */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              doctorTab === 'login'
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Registered Doctor Login</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              doctorTab === 'register'
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>New Doctor Registration</span>
          </button>
        </div>

        {/* FEEDBACK MESSAGES */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {doctorNotFound && (
                <div className="mt-3 pt-2 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-xs font-normal text-rose-700">Are you a new doctor?</span>
                  <button
                    type="button"
                    onClick={() => switchTab('register')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                  >
                    New Doctor Registration Tab →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 1: REGISTERED DOCTOR LOGIN FLOW                           */}
        {/* ============================================================== */}
        {doctorTab === 'login' && (
          <div className="space-y-6">
            
            <div className="text-center pb-2">
              <h2 className="text-xl font-black text-slate-900">Registered Doctor Login</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Enter your mobile number to sign in securely
              </p>
            </div>

            {/* STEP 1: MOBILE NUMBER INPUT */}
            {!loginOtpSent ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-base font-mono">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value.replace(/\D/g, ''));
                        setDoctorNotFound(false);
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoginContinue()}
                      placeholder="Enter 10-digit mobile"
                      autoFocus
                      className="w-full pl-14 pr-4 py-3.5 border border-slate-300 rounded-2xl text-lg font-mono font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoginContinue()}
                  disabled={loginLoading || loginPhone.length < 10}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Checking Doctor Records...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* STEP 2: ENTER OTP */
              <div className="space-y-5 bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Enter Doctor OTP
                    </label>
                    <p className="text-xs text-slate-500 font-medium">Sent to +91 {loginPhone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLoginOtpSent(false); setLoginOtp(''); setLoginDemoOtp(null); }}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Change Phone
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoginVerifyOTP()}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none shadow-sm transition-all"
                  autoFocus
                />

                {loginDemoOtp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center my-3">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      DEVELOPMENT DEMO OTP
                    </p>
                    <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                      {loginDemoOtp}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Demo Mode Active — No SMS gateway required
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLoginVerifyOTP}
                  disabled={loginLoading || loginOtp.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Verifying Physician...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Enter Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown Timer */}
                <div className="text-center pt-1">
                  {loginCooldown > 0 ? (
                    <p className="text-xs font-bold text-slate-500">
                      Resend OTP in 00:{loginCooldown < 10 ? `0${loginCooldown}` : loginCooldown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLoginContinue()}
                      disabled={loginLoading}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Demo Physician Login Buttons */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Instant Demo Doctor Access</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => triggerDemoDoctor('9876500001')}
                  className="p-2.5 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Dr. Rajesh Sharma</p>
                  <p className="text-[10px] text-blue-700 font-medium">+91 9876500001 • Allopathy</p>
                </button>

                <button
                  type="button"
                  onClick={() => triggerDemoDoctor('9876500002')}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Dr. Ananya Sundaram</p>
                  <p className="text-[10px] text-slate-600 font-medium">+91 9876500002 • AYUSH OPD</p>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 2: NEW DOCTOR REGISTRATION FLOW                           */}
        {/* ============================================================== */}
        {doctorTab === 'register' && (
          <form onSubmit={handleDoctorRegisterSubmit} className="space-y-4">
            
            <div className="text-center pb-1">
              <h2 className="text-xl font-black text-slate-900">New Doctor Registration</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Enter your medical credentials to register your physician account
              </p>
            </div>

            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={regForm.fullName}
                onChange={(e) => handleRegFieldChange('fullName', e.target.value)}
                placeholder="Enter full name"
                className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                  fieldErrors.fullName 
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* 2. Mobile Number & 3. Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={regForm.mobile}
                    onChange={(e) => handleRegFieldChange('mobile', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile"
                    disabled={regOtpSent}
                    className={`w-full pl-12 pr-4 py-2.5 border rounded-xl font-mono text-sm transition-all disabled:bg-slate-100 ${
                      fieldErrors.mobile 
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                    }`}
                  />
                </div>
                {fieldErrors.mobile && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.mobile}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => handleRegFieldChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                    fieldErrors.email 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* 4. Medical Registration Number & 5. Specialization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Medical Registration Number *
                </label>
                <input
                  type="text"
                  value={regForm.registrationNo}
                  onChange={(e) => handleRegFieldChange('registrationNo', e.target.value)}
                  placeholder="Enter medical registration number"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm font-mono transition-all ${
                    fieldErrors.registrationNo 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.registrationNo && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.registrationNo}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Specialization *
                </label>
                <select
                  value={regForm.specialization}
                  onChange={(e) => handleRegFieldChange('specialization', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all bg-white ${
                    fieldErrors.specialization 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
                {fieldErrors.specialization && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.specialization}</p>
                )}
              </div>
            </div>

            {/* 6. Qualification & 7. Years of Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Qualification *
                </label>
                <input
                  type="text"
                  value={regForm.qualification}
                  onChange={(e) => handleRegFieldChange('qualification', e.target.value)}
                  placeholder="Enter qualification"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                    fieldErrors.qualification 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.qualification && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.qualification}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Years of Experience *
                </label>
                <input
                  type="number"
                  min="0"
                  value={regForm.experience}
                  onChange={(e) => handleRegFieldChange('experience', e.target.value)}
                  placeholder="Enter years of experience"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                    fieldErrors.experience 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.experience && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.experience}</p>
                )}
              </div>
            </div>

            {/* 8. Hospital / Clinic & 9. Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hospital / Clinic *
                </label>
                <input
                  type="text"
                  value={regForm.hospitalClinic}
                  onChange={(e) => handleRegFieldChange('hospitalClinic', e.target.value)}
                  placeholder="Enter hospital or clinic name"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                    fieldErrors.hospitalClinic 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.hospitalClinic && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.hospitalClinic}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={regForm.department}
                  onChange={(e) => handleRegFieldChange('department', e.target.value)}
                  placeholder="Enter department"
                  className={`w-full px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${
                    fieldErrors.department 
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-600' 
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
                {fieldErrors.department && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.department}</p>
                )}
              </div>
            </div>

            {/* OTP VERIFICATION CONTAINER (Revealed after OTP is sent) */}
            {regOtpSent ? (
              <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 space-y-4 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </label>
                    <p className="text-xs text-slate-500 font-medium">Sent to +91 {regForm.mobile}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setRegOtpSent(false); setRegOtp(''); setRegDemoOtp(null); }}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Change Phone
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleDoctorRegisterSubmit(e)}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none shadow-sm transition-all"
                  autoFocus
                />

                {regDemoOtp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center my-2">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      DEVELOPMENT DEMO OTP
                    </p>
                    <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                      {regDemoOtp}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Demo Mode Active — No SMS gateway required
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDoctorRegisterSubmit}
                  disabled={regLoading || regOtp.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {regLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Verifying & Registering...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Complete Registration</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown Timer */}
                <div className="text-center pt-1">
                  {regCooldown > 0 ? (
                    <p className="text-xs font-bold text-slate-500">
                      Resend OTP in 00:{regCooldown < 10 ? `0${regCooldown}` : regCooldown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendRegOTP}
                      disabled={regLoading}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* PRIMARY REGISTER DOCTOR BUTTON */
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendRegOTP}
                  disabled={regLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {regLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Validating & Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Doctor</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Switch to Login Tab */}
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="font-bold text-blue-700 hover:text-blue-900 underline ml-1 cursor-pointer"
                >
                  Registered Doctor Login
                </button>
              </p>
            </div>

          </form>
        )}

      </div>

      {/* Footer info */}
      <div className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 pt-6 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Strict DOCTOR Role-Based Access Control • Passwordless OTP Protected</span>
      </div>

    </div>
  );
};

export default DoctorLoginPage;
