import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  Building,
  Award,
  Phone,
  Mail,
  FileCheck,
  User,
  ArrowLeft
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { doctorSendOTP, doctorVerifyRegister } from '../services/api';

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

const DoctorRegisterPage = () => {
  const { setCurrentPage, speakText } = useKiosk();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    registration_no: '',
    specialty: 'General Physician & Internal Medicine',
    qualification: '',
    experience_years: '',
    hospital_name: '',
    department: ''
  });

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredDoctor, setRegisteredDoctor] = useState(null);

  // Cooldown countdown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  // Step 1: Send OTP to Doctor Mobile
  const handleSendOTP = async () => {
    const cleanPhone = form.phone.replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number before requesting OTP.");
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg("Please enter Doctor Full Name.");
      return;
    }
    if (!form.registration_no.trim()) {
      setErrorMsg("Please enter Medical Registration Number.");
      return;
    }
    if (!form.qualification.trim()) {
      setErrorMsg("Please enter Qualification.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await doctorSendOTP(cleanPhone, 'REGISTER');
      setOtpSent(true);
      setCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || "Verification OTP sent to mobile number.");
      speakText("Verification code sent to your mobile number.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Failed to send OTP. Please check your mobile number.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Complete Doctor Registration
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg("Please enter Doctor Full Name.");
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!form.registration_no.trim()) {
      setErrorMsg("Please enter Medical Registration Number.");
      return;
    }
    if (!form.qualification.trim()) {
      setErrorMsg("Please enter Qualification.");
      return;
    }
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit verification OTP sent to your phone.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: form.name.trim(),
        phone: cleanPhone,
        email: form.email.trim() || null,
        registration_no: form.registration_no.trim(),
        specialty: form.specialty,
        qualification: form.qualification.trim(),
        experience_years: form.experience_years ? parseInt(form.experience_years, 10) : 0,
        hospital_name: form.hospital_name.trim() || "MediKiosk OPD",
        department: form.department.trim() || "OPD Clinical Services",
        otp: otp.trim()
      };

      const res = await doctorVerifyRegister(payload);
      setRegisteredDoctor(res.user_data || { name: form.name });
      setRegistrationSuccess(true);
      speakText("Registration successful! Your Doctor account is now active.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Registration failed. Please check the entered details and OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b bg-slate-50 p-4 sm:p-8 flex flex-col justify-between">
      
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm mb-3 border border-blue-200 shadow-sm">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>New Physician & Clinician Onboarding</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          MediKiosk <span className="text-blue-700">Doctor Registration</span>
        </h1>
        <p className="text-slate-600 font-medium text-sm mt-1 max-w-xl mx-auto">
          Create your verified doctor profile with Medical Registration and secure mobile OTP.
        </p>

        <div className="flex justify-center mt-3">
          <AudioGuideButton 
            textToRead="Doctor Registration. Please enter your credentials, qualification, and medical council registration number." 
            label="Audio Guidance" 
          />
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="max-w-3xl mx-auto w-full bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200">
        
        {/* Success Modal / Banner */}
        {registrationSuccess ? (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Registration Successful!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Welcome, <strong>{registeredDoctor?.name}</strong>. Your physician account has been created and verified under DOCTOR authorization.
              </p>
              <div className="inline-block bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-xl text-xs font-mono font-bold mt-2">
                Medical Reg No: {registeredDoctor?.registration_no || form.registration_no}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setCurrentPage('doctor-login')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl text-base shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Go to Doctor Login</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitRegistration} className="space-y-6">
            
            {/* Top link back to login */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentPage('doctor-login')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Doctor Login</span>
              </button>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                Physician Credential Verification
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success OTP Message */}
            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {/* SECTION 1: PERSONAL & CONTACT */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                1. Doctor Personal & Contact Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm font-mono">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      disabled={otpSent}
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. doctor@hospital.org"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: MEDICAL CREDENTIALS */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                2. Medical Council Credentials & Specialization
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Medical Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.registration_no}
                    onChange={(e) => handleChange('registration_no', e.target.value.toUpperCase())}
                    placeholder="e.g. TN-2026-881"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Specialization *
                  </label>
                  <select
                    value={form.specialty}
                    onChange={(e) => handleChange('specialty', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.qualification}
                    onChange={(e) => handleChange('qualification', e.target.value)}
                    placeholder="e.g. MBBS, MD, BAMS"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={form.experience_years}
                    onChange={(e) => handleChange('experience_years', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Hospital / Clinic Name
                  </label>
                  <input
                    type="text"
                    value={form.hospital_name}
                    onChange={(e) => handleChange('hospital_name', e.target.value)}
                    placeholder="e.g. MediKiosk City OPD"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="e.g. OPD Medicine / AYUSH"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: OTP VERIFICATION */}
            <div className="bg-blue-50/70 p-5 rounded-3xl border border-blue-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                    3. Mobile OTP Verification *
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Verify physician mobile number (+91 {form.phone || '__________'})
                  </p>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading || form.phone.length < 10}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
                  >
                    {loading ? "Sending..." : "Send Verification OTP"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Change Number
                  </button>
                )}
              </div>

              {otpSent && (
                <div className="space-y-3 pt-2 border-t border-blue-200/80">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-950 uppercase">
                      Enter 6-Digit OTP Received
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
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border-2 border-blue-400 bg-white rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    autoFocus
                  />

                  {cooldown > 0 ? (
                    <p className="text-xs font-bold text-slate-500 text-center">
                      Resend OTP in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                    </p>
                  ) : (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Resend OTP
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || !otpSent || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying Credentials & Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP & Complete Doctor Registration</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Bottom link to Login */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Already registered as a Doctor?{' '}
                <button
                  type="button"
                  onClick={() => setCurrentPage('doctor-login')}
                  className="font-bold text-blue-600 hover:text-blue-900 underline ml-1 cursor-pointer"
                >
                  Doctor Login
                </button>
              </p>
            </div>

          </form>
        )}

      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full text-center text-xs text-slate-500 pt-6 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Medical Practitioner Verification • NMC / State Council Standardized</span>
      </div>

    </div>
  );
};

export default DoctorRegisterPage;

