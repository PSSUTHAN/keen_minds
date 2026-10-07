import React from 'react';
import { KioskProvider, useKiosk } from './context/KioskContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import LandingPage from './pages/LandingPage';
import RegistrationPage from './pages/RegistrationPage';
import ConsentPage from './pages/ConsentPage';
import ConversationalHistoryPage from './pages/ConversationalHistoryPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import SummaryPage from './pages/SummaryPage';
import CompletionPage from './pages/CompletionPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import DoctorLoginPage from './pages/DoctorLoginPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';

const MainContent = () => {
  const { currentPage, patient, doctorUser, userRole } = useKiosk();

  switch (currentPage) {
    case 'login':
      return <LoginPage />;
    case 'dashboard':
      return <PatientDashboardPage />;
    case 'chatbot':
    case 'history':
      return <ConversationalHistoryPage />;
    case 'document':
      return <DocumentUploadPage />;
    case 'summary':
      return <SummaryPage />;
    case 'completion':
      return <CompletionPage />;
    case 'doctor-login':
      return <DoctorLoginPage />;
    case 'doctor-register':
      return <DoctorRegisterPage />;
    case 'doctor':
      return doctorUser && userRole === 'DOCTOR' ? <DoctorDashboardPage /> : <DoctorLoginPage />;
    case 'register':
      return <RegistrationPage />;
    case 'consent':
      return <ConsentPage />;
    case 'landing':
      return <LandingPage />;
    default:
      if (doctorUser && userRole === 'DOCTOR') return <DoctorDashboardPage />;
      if (patient) return <PatientDashboardPage />;
      return <LoginPage />;
  }
};

function App() {
  return (
    <KioskProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <MainContent />
        </main>
      </div>
    </KioskProvider>
  );
}

export default App;
