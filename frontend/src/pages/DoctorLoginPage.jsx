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
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import AudioGuideButton from '../components/AudioGuideButton';
import { doctorSendOTP, doctorVerifyLogin } from '../services/api';

const DoctorLoginPage = () => {
  const { loginAsDoctor, setCurrentPage, speakText } = useKiosk();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [doctorNotFound, setDoctorNotFound] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

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

  // Handle Continue (Step 1: Validate, Check DB & Send OTP)
  const handleContinue = async (customPhone = null) => {
    const phoneNumber = (customPhone || phone).trim();
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      setDoctorNotFound(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setDoctorNotFound(false);
    setSuccessMsg('');

    try {
      // Calls /auth/doctor/send-otp with purpose="LOGIN"
      // Backend validates doctor exists with DOCTOR role in DB. If not, raises 404 "Doctor account not found."
      const res = await doctorSendOTP(phoneNumber, 'LOGIN');
      setPhone(phoneNumber);
      setOtpSent(true);
      setCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || "OTP sent successfully to registered physician number.");
      if (res.dev_mock_otp) {
        setDevOtpHint(res.dev_mock_otp);
      }
      speakText("OTP sent to your registered mobile number.");
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "Doctor verification failed. Please try again.";

      if (status === 404 || detail.toLowerCase().includes("not found")) {
        setDoctorNotFound(true);
        setErrorMsg("Doctor account not found.");
        speakText("Doctor account not found. Please register your profile.");
      } else {
        setErrorMsg(detail);
        speakText(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification (Step 2)
  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await doctorVerifyLogin(phone, otp.trim());
      speakText(`Welcome, Dr. ${res.name}. Redirecting to Doctor Dashboard.`);
      loginAsDoctor(res.access_token, res.user_data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Invalid or expired OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Triggers for testing
  const triggerDemoDoctor = (demoPhone) => {
    setPhone(demoPhone);
    setOtp('');
    setOtpSent(false);
    handleContinue(demoPhone);
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
          MediKiosk <span className="text-blue-700">Doctor Login</span>
        </h1>
        <p className="text-slate-600 font-medium text-sm mt-1">
          Passwordless OTP verification for authorized medical staff.
        </p>

        <div className="flex justify-center mt-3">
          <AudioGuideButton 
            textToRead="Doctor Login. Please enter your registered physician mobile number to receive a one-time password." 
            label="Audio Guidance" 
          />
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
            <Stethoscope className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900">Doctor Login</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Enter your mobile number to sign in securely
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {doctorNotFound && (
                <div className="mt-3 pt-2 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-xs font-normal text-rose-700">Are you a new doctor?</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('doctor-register')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Register Here →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            {devOtpHint && (
              <span className="bg-emerald-200 text-emerald-900 font-mono px-2 py-0.5 rounded text-xs">
                OTP: <strong>{devOtpHint}</strong>
              </span>
            )}
          </div>
        )}

        {/* STEP 1: MOBILE NUMBER INPUT */}
        {!otpSent ? (
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
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setDoctorNotFound(false);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                  placeholder="Enter 10-digit mobile"
                  autoFocus
                  className="w-full pl-14 pr-4 py-3.5 border border-slate-300 rounded-2xl text-lg font-mono font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleContinue()}
              disabled={loading || phone.length < 10}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
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

            {/* New Doctor? Register Link */}
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                New Doctor?{' '}
                <button
                  type="button"
                  onClick={() => setCurrentPage('doctor-register')}
                  className="font-bold text-blue-700 hover:text-blue-900 underline ml-1 cursor-pointer"
                >
                  Register Here
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* STEP 2: ENTER OTP */
          <div className="space-y-5 bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Enter Doctor OTP
                </label>
                <p className="text-xs text-slate-500 font-medium">Sent to +91 {phone}</p>
              </div>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); }}
                className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Change Phone
              </button>
            </div>

            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
              placeholder="• • • • • •"
              className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none shadow-sm transition-all"
              autoFocus
            />

            {devOtpHint && (
              <div className="bg-blue-100/80 border border-blue-200 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-950">
                  Dev OTP: <strong className="font-mono text-sm font-black bg-blue-200 px-2 py-0.5 rounded">{devOtpHint}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtpHint)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-xl text-xs cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-6 rounded-2xl text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
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
              {cooldown > 0 ? (
                <p className="text-xs font-bold text-slate-500">
                  Resend OTP in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleContinue()}
                  disabled={loading}
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

        {/* Switch to Patient Portal link */}
        <div className="text-center pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentPage('login')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center justify-center gap-1.5 mx-auto hover:underline cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Are you a Patient? Switch to Patient Portal →</span>
          </button>
        </div>

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

