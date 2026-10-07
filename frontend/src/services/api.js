import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic JWT Authorization Bearer Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medikiosk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ----------------- OTP AUTHENTICATION APIS -----------------

export const patientSendOTP = async (phone, purpose = 'LOGIN') => {
  const response = await api.post('/auth/patient/send-otp', { phone, purpose });
  return response.data;
};

export const patientVerifyRegister = async (registrationData) => {
  const response = await api.post('/auth/patient/verify-register', registrationData);
  return response.data;
};

export const patientVerifyLogin = async (phone, otp) => {
  const response = await api.post('/auth/patient/verify-login', { phone, otp });
  return response.data;
};

export const doctorSendOTP = async (phone, purpose = 'LOGIN') => {
  const response = await api.post('/auth/doctor/send-otp', { phone, purpose, role: 'DOCTOR' });
  return response.data;
};

export const doctorVerifyRegister = async (registrationData) => {
  const response = await api.post('/auth/doctor/verify-register', registrationData);
  return response.data;
};

export const doctorVerifyLogin = async (phone, otp) => {
  const response = await api.post('/auth/doctor/verify-login', { phone, otp, role: 'DOCTOR' });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// ----------------- DOCTOR PORTAL & DASHBOARD APIS -----------------

export const getDoctorDashboardStats = async () => {
  const response = await api.get('/doctor/dashboard-stats');
  return response.data;
};

export const getDoctorViewedPatients = async () => {
  const response = await api.get('/doctor/viewed-patients');
  return response.data;
};

export const doctorCheckPatientByMobile = async (phone) => {
  const response = await api.post('/doctor/patients/check', { phone });
  return response.data;
};

export const doctorSendPatientAssociationOTP = async (phone) => {
  const response = await api.post('/doctor/patients/send-otp', { phone, purpose: 'DOCTOR_ADD' });
  return response.data;
};

export const doctorVerifyPatientAssociationOTP = async (phone, otp) => {
  const response = await api.post('/doctor/patients/verify-otp', { phone, otp });
  return response.data;
};

export const doctorCheckPatientPhone = async (phone) => {
  const response = await api.post('/doctor/check-patient-phone', { phone });
  return response.data;
};

export const doctorSendPatientOTP = async (phone) => {
  const response = await api.post('/doctor/patients/send-otp', { phone, purpose: 'REGISTER', role: 'PATIENT' });
  return response.data;
};

export const doctorCreatePatientWithOTP = async (patientData) => {
  const response = await api.post('/doctor/patients/create-with-otp', patientData);
  return response.data;
};

export const getAvailablePatients = async (query = '') => {
  const response = await api.get('/doctor/patients/available', { params: { q: query } });
  return response.data;
};

export const requestPatientAccess = async (patientId) => {
  const response = await api.post(`/doctor/patients/${patientId}/request-access`);
  return response.data;
};

export const verifyPatientAccess = async (patientId, otp) => {
  const response = await api.post(`/doctor/patients/${patientId}/verify-access`, { otp });
  return response.data;
};

// ----------------- PRESCRIPTION MANAGEMENT APIS -----------------

export const getPatientPrescriptions = async (patientId) => {
  const response = await api.get(`/prescriptions/patient/${patientId}`);
  return response.data;
};

export const createPatientPrescription = async (patientId, prescriptionData) => {
  const response = await api.post(`/prescriptions/patient/${patientId}`, prescriptionData);
  return response.data;
};

export const updatePrescription = async (prescriptionId, updateData) => {
  const response = await api.put(`/prescriptions/${prescriptionId}`, updateData);
  return response.data;
};

export const finalizePrescription = async (prescriptionId) => {
  const response = await api.put(`/prescriptions/${prescriptionId}/finalize`);
  return response.data;
};

// ----------------- PATIENT SEARCH & RECORDS APIS -----------------

export const searchPatients = async (query = '') => {
  const response = await api.get('/patients/search', { params: { q: query } });
  return response.data;
};

export const getPatientMedicalRecord = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/record`);
  return response.data;
};

export const updatePatientProfile = async (patientId, profileData) => {
  const response = await api.put(`/patients/${patientId}/profile`, profileData);
  return response.data;
};

// ----------------- PATIENT MEDICAL REPORT APIS -----------------

export const uploadPatientReport = async (patientId, formData, onUploadProgress) => {
  const token = localStorage.getItem('medikiosk_token');
  const response = await api.post(`/patients/${patientId}/reports`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    onUploadProgress
  });
  return response.data;
};

export const getPatientReports = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/reports`);
  return response.data;
};

export const deletePatientReport = async (patientId, reportId) => {
  const response = await api.delete(`/patients/${patientId}/reports/${reportId}`);
  return response.data;
};

export const getPatientReportViewUrl = (patientId, reportId) => {
  const token = localStorage.getItem('medikiosk_token');
  return `${API_BASE_URL}/patients/${patientId}/reports/${reportId}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

export const getPatientReportDownloadUrl = (patientId, reportId) => {
  const token = localStorage.getItem('medikiosk_token');
  return `${API_BASE_URL}/patients/${patientId}/reports/${reportId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

// ----------------- LEGACY & KIOSK SUPPORT APIS -----------------

export const doctorLogin = async (registrationNo, pin) => {
  const response = await api.post('/auth/doctor-login', { registration_no: registrationNo, pin });
  return response.data;
};

export const patientLogin = async (phone, abhaId) => {
  const response = await api.post('/patients/login', { phone, abha_id: abhaId });
  return response.data;
};

export const listPatients = async () => {
  const response = await api.get('/patients/list');
  return response.data;
};

export const getPatientHistory = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/history`);
  return response.data;
};

export const registerPatient = async (patientData) => {
  const response = await api.post('/patients/register', patientData);
  return response.data;
};

export const lookupPatient = async (phone, abhaId) => {
  const params = {};
  if (phone) params.phone = phone;
  if (abhaId) params.abha_id = abhaId;
  const response = await api.get('/patients/lookup', { params });
  return response.data;
};

export const startKioskSession = async (patientId, language = 'en', ayushMode = false) => {
  const response = await api.post('/history/start-session', {
    patient_id: patientId,
    language,
    ayush_mode: ayushMode
  });
  return response.data;
};

export const updateSessionConsent = async (sessionId, consentGiven) => {
  const response = await api.put(`/history/session/${sessionId}/consent`, { consent_given: consentGiven });
  return response.data;
};

export const sendChatTurn = async (sessionId, userInput, section, inputType = 'text', ayushCategory = null) => {
  const response = await api.post('/history/chat', {
    session_id: sessionId,
    user_input: userInput,
    section,
    input_type: inputType,
    ayush_category: ayushCategory
  });
  return response.data;
};

export const getSessionHistory = async (sessionId) => {
  const response = await api.get(`/history/session/${sessionId}/entries`);
  return response.data;
};

export const uploadDocument = async (sessionId, docType, file) => {
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);
  const response = await api.post(`/documents/upload/${sessionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const verifyDocumentEntities = async (docId, extractedEntities) => {
  const response = await api.put(`/documents/document/${docId}/verify`, {
    extracted_entities: extractedEntities,
    patient_verified: true
  });
  return response.data;
};

export const generateSummary = async (sessionId) => {
  const response = await api.post(`/summary/generate/${sessionId}`);
  return response.data;
};

export const getSummary = async (sessionId) => {
  const response = await api.get(`/summary/session/${sessionId}`);
  return response.data;
};

export const doctorVerifySummary = async (summaryId, doctorId, summaryPayload) => {
  const response = await api.put(`/summary/verify/${summaryId}`, {
    doctor_id: doctorId,
    ...summaryPayload
  });
  return response.data;
};

export const getDoctorQueue = async () => {
  const response = await api.get('/doctor/queue');
  return response.data;
};

export const getEmergencyAlerts = async () => {
  const response = await api.get('/doctor/emergency-alerts');
  return response.data;
};

export const acknowledgeAlert = async (alertId) => {
  const response = await api.put(`/doctor/emergency-alerts/${alertId}/acknowledge`);
  return response.data;
};

export const exportFHIR = async (sessionId) => {
  const response = await api.get(`/fhir/export/${sessionId}`);
  return response.data;
};

export const pushToHIS = async (sessionId) => {
  const response = await api.post(`/fhir/push-his/${sessionId}`);
  return response.data;
};

// --- Database Administration APIs ---
export const getDatabaseStats = async () => {
  const response = await api.get('/admin/db/stats');
  return response.data;
};

export const seedDatabase = async () => {
  const response = await api.post('/admin/db/seed');
  return response.data;
};

export const resetDatabase = async () => {
  const response = await api.post('/admin/db/reset');
  return response.data;
};

export const exportDatabaseJSON = async () => {
  const response = await api.get('/admin/db/export');
  return response.data;
};

export default api;
