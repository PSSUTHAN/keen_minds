import React from 'react';
import DoctorLoginPage from './DoctorLoginPage';

/**
 * DoctorRegisterPage renders DoctorLoginPage initialized to the 'register' tab.
 * This guarantees the exact same visual design, tabs, and validation behavior across all routes.
 */
const DoctorRegisterPage = () => {
  return <DoctorLoginPage initialTab="register" />;
};

export default DoctorRegisterPage;
