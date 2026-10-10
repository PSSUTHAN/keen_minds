import React, { useState, useEffect } from 'react';
import { 
  User, 
  Stethoscope, 
  Phone, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  RefreshCw, 
  KeyRound, 
  Clock, 
  AlertCircle,
  Calendar,
  Droplet,
  MapPin,
  Mail,
  ShieldAlert
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { 
  patientSendOTP, 
  patientVerifyRegister, 
  patientVerifyLogin, 
  doctorSendOTP, 
  doctorVerifyLogin 
} from '../services/api';

const LoginPage = () => {
  const { lang, loginAsPatient, loginAsDoctor, setCurrentPage, t, speakText } = useKiosk();

  // Active Role Portal: 'patient' or 'doctor'
  const [activePortal, setActivePortal] = useState('patient');
  // Under Patient: 'login' or 'register'
  const [patientTab, setPatientTab] = useState('login');

  // Phone and OTP states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Patient Registration Form
  const [regForm, setRegForm] = useState({
    fullName: '',
    dob: '1985-06-15',
    gender: 'Male',
    email: '',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: '',
    preferredLanguage: 'en',
    abhaId: ''
  });

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Voice guidance on portal/tab change
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    setOtpSent(false);
    setOtp('');
    setDemoOtp(null);

    if (activePortal === 'doctor') {
      speakText("Doctor Portal. Please enter your registered mobile number to receive OTP.");
    } else if (patientTab === 'register') {
      speakText("New Patient Registration. Please enter your details and verify with mobile OTP.");
    } else {
      speakText("Patient Login. Enter your registered mobile number to receive OTP.");
    }
  }, [activePortal, patientTab, lang]);

  // 1. Send OTP Handler
  const handleSendOTP = async (targetPhone = null) => {
    const phoneNumber = (targetPhone || phone).trim();
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let res;
      if (activePortal === 'doctor') {
        res = await doctorSendOTP(phoneNumber);
      } else {
        const purpose = patientTab === 'register' ? 'REGISTER' : 'LOGIN';
        res = await patientSendOTP(phoneNumber, purpose);
      }

      setPhone(phoneNumber);
      setOtpSent(true);
      setDemoOtp(res.demo_otp || null);
      setCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || (res.demo_otp ? "Demo OTP generated successfully!" : "OTP sent successfully!"));
      if (res.demo_otp) {
        speakText("Demo mode active. Your verification code is displayed on screen.");
      } else {
        speakText("OTP has been sent to your mobile number.");
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || "Failed to send OTP. Please try again.";
      setErrorMsg(detail);
      speakText(detail);
    } finally {
      setLoading(false);
    }
  };

  // 2. Patient Login Verification
  const handlePatientLoginVerify = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await patientVerifyLogin(phone, otp.trim());
      speakText(`Welcome, ${res.name}. Redirecting to your dashboard.`);
      loginAsPatient(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Invalid or expired OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Patient Registration Verification
  const handlePatientRegisterVerify = async (e) => {
    e.preventDefault();
    if (!regForm.fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit OTP to complete registration.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await patientVerifyRegister({
        full_name: regForm.fullName.trim(),
        dob: regForm.dob,
        gender: regForm.gender,
        phone: phone.trim(),
        email: regForm.email.trim() || null,
        blood_group: regForm.bloodGroup,
        address: regForm.address.trim() || null,
        emergency_contact: regForm.emergencyContact.trim() || null,
        preferred_language: lang,
        abha_id: regForm.abhaId.trim() || null,
        otp: otp.trim()
      });

      speakText(`Registration successful. Welcome, ${res.name}!`);
      loginAsPatient(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Registration failed. Please verify the OTP code.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Doctor Login Verification
  const handleDoctorLoginVerify = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit OTP sent to your doctor mobile number.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await doctorVerifyLogin(phone, otp.trim());
      speakText(`Authentication verified. Welcome Dr. ${res.name}. Accessing OPD dashboard.`);
      loginAsDoctor(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Doctor verification failed. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  // Demo 1-Click Fast Triggers
  const triggerDemoPatient = (demoPhone) => {
    setPhone(demoPhone);
    handleSendOTP(demoPhone);
  };

  const triggerDemoDoctor = (docPhone) => {
    setActivePortal('doctor');
    setPhone(docPhone);
    handleSendOTP(docPhone);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8 flex flex-col justify-between">
      
      {/* Top Banner */}
      <div className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm mb-3 border border-blue-200 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Secure Passwordless OTP Authentication • Role-Based Access Control</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
          MediKiosk <span className="text-blue-600">Digital Health Portal</span>
        </h1>
        <p className="text-slate-600 font-medium text-sm sm:text-base max-w-xl mx-auto">
          Instant, secure mobile verification for Patients and Hospital Physicians.
        </p>

        {/* Audio Guide Helper */}
        <div className="flex justify-center mt-3">
          <AudioGuideButton 
            textToRead="Welcome to MediKiosk. Please authenticate securely using your mobile number and one time password." 
            label="Listen Guidance" 
          />
        </div>
      </div>

      {/* Main Login / Registration Card */}
      <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        
        {/* PRIMARY ROLE PORTAL TOGGLE: PATIENT vs DOCTOR */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setActivePortal('patient')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePortal === 'patient'
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-5 h-5" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('doctor-login')}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all text-slate-600 hover:text-blue-700 hover:bg-slate-200/80 cursor-pointer"
          >
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <span>Doctor Portal →</span>
          </button>
        </div>

        {/* SUB-TABS FOR PATIENT: LOGIN vs REGISTER */}
        {activePortal === 'patient' && (
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setPatientTab('login')}
              className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                patientTab === 'login'
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Registered Patient Login</span>
            </button>

            <button
              type="button"
              onClick={() => setPatientTab('register')}
              className={`pb-3 px-4 font-bold text-sm sm:text-base border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                patientTab === 'register'
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>New Patient Registration</span>
            </button>
          </div>
        )}

        {/* FEEDBACK MESSAGES */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
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
        {/* CASE 1: PATIENT LOGIN FLOW                                    */}
        {/* ============================================================== */}
        {activePortal === 'patient' && patientTab === 'login' && (
          <div className="space-y-6">
            
            {/* Step 1: Mobile Input & Send OTP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Registered Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-4 text-slate-400 font-bold text-base">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && !otpSent && handleSendOTP()}
                    placeholder="Enter 10-digit mobile"
                    disabled={otpSent}
                    className="w-full pl-14 pr-4 py-3.5 border border-slate-300 rounded-2xl text-lg font-mono font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 disabled:bg-slate-100 transition-all"
                  />
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={() => handleSendOTP()}
                    disabled={loading || phone.length < 10}
                    className="kiosk-btn bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-2xl text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>Send OTP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs text-blue-700 font-bold px-3 py-2 hover:underline cursor-pointer"
                  >
                    Change Phone
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Enter OTP & Verify */}
            {otpSent && (
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Enter 6-Digit OTP
                  </label>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Valid for 5 mins
                  </span>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handlePatientLoginVerify()}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none transition-all"
                  autoFocus
                />

                {demoOtp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      DEVELOPMENT DEMO OTP
                    </p>
                    <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                      {demoOtp}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Demo Mode Active — No SMS gateway required
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePatientLoginVerify}
                  disabled={loading || otp.length < 6}
                  className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-lg shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Access Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown Timer */}
                <div className="text-center pt-2">
                  {cooldown > 0 ? (
                    <p className="text-xs font-bold text-slate-500">
                      Resend OTP in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOTP()}
                      disabled={loading}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick 1-Click Demo Patients */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Instant Demo Patients (1-Click Test)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerDemoPatient('9876543210')}
                  className="p-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Ramesh Kumar (58 M)</p>
                  <p className="text-[11px] text-blue-700 font-medium">+91 9876543210 • English Mode</p>
                </button>

                <button
                  type="button"
                  onClick={() => triggerDemoPatient('9876543220')}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Sunita Devi (46 F)</p>
                  <p className="text-[11px] text-slate-600 font-medium">+91 9876543220 • AYUSH Mode</p>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 2: NEW PATIENT REGISTRATION FLOW                          */}
        {/* ============================================================== */}
        {activePortal === 'patient' && patientTab === 'register' && (
          <form onSubmit={handlePatientRegisterVerify} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={regForm.dob}
                  onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gender *
                </label>
                <select
                  value={regForm.gender}
                  onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Blood Group
                </label>
                <select
                  value={regForm.bloodGroup}
                  onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
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

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={regForm.emergencyContact}
                  onChange={(e) => setRegForm({ ...regForm, emergencyContact: e.target.value })}
                  placeholder="Contact person"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ABHA ID (Optional)
                </label>
                <input
                  type="text"
                  value={regForm.abhaId}
                  onChange={(e) => setRegForm({ ...regForm, abhaId: e.target.value })}
                  placeholder="e.g. 91-4582-9901-1234"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                placeholder="Street address, city, state"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 text-sm transition-all"
              />
            </div>

            {/* Mobile Number & OTP Verification */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Mobile Number for OTP Verification *
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile"
                    disabled={otpSent}
                    className="w-full pl-14 pr-4 py-2.5 border border-slate-300 rounded-xl font-mono text-base focus:ring-2 focus:ring-blue-100 focus:border-blue-600 disabled:bg-slate-100 transition-all"
                  />
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={() => handleSendOTP()}
                    disabled={loading || phone.length < 10}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Send OTP
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs text-blue-700 font-bold px-2 py-1 cursor-pointer hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {otpSent && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-900 uppercase">
                      Enter 6-Digit OTP
                    </label>
                    {cooldown > 0 ? (
                      <span className="text-xs text-slate-500">Resend in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}</span>
                    ) : (
                      <button type="button" onClick={() => handleSendOTP()} className="text-xs text-blue-700 font-bold underline cursor-pointer">Resend</button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.8em] font-mono text-xl py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 transition-all"
                  />

                  {demoOtp && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        DEVELOPMENT DEMO OTP
                      </p>
                      <p className="text-xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                        {demoOtp}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Demo Mode Active — No SMS gateway required
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !otpSent || otp.length < 6}
              className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying & Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Complete Registration</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* CASE 3: DOCTOR LOGIN FLOW (OTP-BASED)                          */}
        {/* ============================================================== */}
        {activePortal === 'doctor' && (
          <div className="space-y-6">
            
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-900 font-medium">
                Hospital OPD Doctor Login. Authenticate using your registered physician mobile number. Passwordless OTP authentication enforced.
              </p>
            </div>

            {/* Doctor Mobile Input & Send OTP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Registered Physician Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-4 text-slate-400 font-bold text-base">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && !otpSent && handleSendOTP()}
                    placeholder="Enter doctor mobile"
                    disabled={otpSent}
                    className="w-full pl-14 pr-4 py-3.5 border border-slate-300 rounded-2xl text-lg font-mono font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 disabled:bg-slate-100 transition-all"
                  />
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={() => handleSendOTP()}
                    disabled={loading || phone.length < 10}
                    className="kiosk-btn bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-2xl text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>Send OTP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs text-blue-700 font-bold px-3 py-2 hover:underline cursor-pointer"
                  >
                    Change Phone
                  </button>
                )}
              </div>
            </div>

            {/* Doctor OTP Input */}
            {otpSent && (
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Enter Doctor 6-Digit OTP
                  </label>
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Valid for 5 mins
                  </span>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleDoctorLoginVerify()}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none transition-all"
                  autoFocus
                />

                {demoOtp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      DEVELOPMENT DEMO OTP
                    </p>
                    <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                      {demoOtp}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      Demo Mode Active — No SMS gateway required
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDoctorLoginVerify}
                  disabled={loading || otp.length < 6}
                  className="kiosk-btn w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-lg shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Verifying Physician Role...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Open Doctor Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown Timer */}
                <div className="text-center pt-2">
                  {cooldown > 0 ? (
                    <p className="text-xs font-bold text-slate-500">
                      Resend OTP in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOTP()}
                      disabled={loading}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1-Click Demo Doctors */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>Quick Demo Physicians (1-Click Test)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerDemoDoctor('9876500001')}
                  className="p-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Dr. Rajesh Sharma</p>
                  <p className="text-[11px] text-blue-700 font-medium">9876500001 • General Medicine</p>
                </button>

                <button
                  type="button"
                  onClick={() => triggerDemoDoctor('9876500002')}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <p className="font-extrabold text-slate-900 text-xs">Dr. Ananya Sundaram</p>
                  <p className="text-[11px] text-slate-600 font-medium">9876500002 • AYUSH Medicine</p>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict Role-Based Access Control (PATIENT / DOCTOR)</span>
        </div>
        <div>
          <span>ABDM & FHIR R4 Compliant Medical Architecture</span>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;

