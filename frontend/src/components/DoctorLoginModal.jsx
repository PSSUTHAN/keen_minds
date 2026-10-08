import React, { useState, useEffect } from 'react';
import { X, Stethoscope, AlertCircle, Phone, Clock, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { doctorSendOTP, doctorVerifyLogin } from '../services/api';

const DoctorLoginModal = ({ isOpen, onClose }) => {
  const { loginAsDoctor, t, speakText } = useKiosk();
  const [phone, setPhone] = useState('9876500001');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOTP = async (targetPhone = null) => {
    const p = (targetPhone || phone).trim();
    if (!p || p.length < 10) {
      setError("Please enter a valid 10-digit registered doctor mobile.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await doctorSendOTP(p);
      setPhone(p);
      setOtpSent(true);
      setDemoOtp(res.demo_otp || null);
      setCooldown(res.cooldown_seconds || 60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Mobile not registered as DOCTOR.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError('Please enter the 6-digit OTP sent to your phone.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await doctorVerifyLogin(phone.trim(), otp.trim());
      loginAsDoctor(res.access_token, res.user_data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (demoPhone) => {
    setPhone(demoPhone);
    handleSendOTP(demoPhone);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl border border-blue-100">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t.doctorPortal || "Doctor Portal"}</h3>
              <p className="text-xs text-slate-500 font-medium">Passwordless Mobile OTP Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dev OTP indicator */}
        {devOtpHint && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl mb-4 text-xs font-mono font-bold flex items-center justify-between border border-emerald-200">
            <span>Development Mode OTP:</span>
            <span className="bg-emerald-200 px-2 py-0.5 rounded text-emerald-950 font-black">{devOtpHint}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          
          {/* Mobile input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Registered Doctor Mobile
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-slate-400 font-bold text-sm">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Doctor mobile number"
                  disabled={otpSent}
                  className="w-full pl-12 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-600 disabled:bg-slate-100"
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={() => handleSendOTP()}
                  disabled={loading || phone.length < 10}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Send OTP"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  className="text-xs text-blue-700 font-bold px-2 py-1 hover:underline cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* OTP Input */}
          {otpSent && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Enter 6-Digit OTP
                </label>
                {cooldown > 0 ? (
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Resend in 00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOTP()}
                    className="text-xs text-blue-700 font-bold underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.8em] font-mono text-2xl py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-blue-50/30 transition-all"
                autoFocus
              />

              {demoOtp && import.meta.env.VITE_APP_ENV !== 'production' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center my-2">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                    Development Demo OTP
                  </p>
                  <p className="text-2xl font-mono font-black text-blue-900 tracking-[0.25em] mt-0.5">
                    {demoOtp}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !otpSent || otp.length < 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl shadow-md text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Physician...</span>
              </>
            ) : (
              <>
                <span>Verify OTP & Enter Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Doctor Quick Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            1-Click Demo Doctor Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoSelect('9876500001')}
              className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-left border border-blue-200 cursor-pointer"
            >
              <p className="font-bold text-slate-900">Dr. Rajesh Sharma</p>
              <p className="text-[10px] text-blue-700">9876500001 (General)</p>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSelect('9876500002')}
              className="p-2 bg-slate-50 hover:bg-blue-50 rounded-lg text-left border border-slate-200 cursor-pointer"
            >
              <p className="font-bold text-slate-900">Dr. Ananya Sundaram</p>
              <p className="text-[10px] text-slate-600">9876500002 (AYUSH)</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorLoginModal;
