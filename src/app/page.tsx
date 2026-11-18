'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { LoginScreen } from '@/components/repository/LoginScreen';
import { AdminDashboard } from '@/components/repository/AdminDashboard';
import { InstructorDashboard } from '@/components/repository/InstructorDashboard';
import { StudentLibrary } from '@/components/repository/StudentLibrary';
import RepositoryFooter from "@/components/repository/RepositoryFooter";
import PortalHeader from '@/components/repository//PortalHeader';
import { LogOut } from 'lucide-react';

function MainPortal() {
  const { currentUser, isAuthReady, logout } = useAuth();

  // Wait for client-side session check
  if (!isAuthReady) {
    return <div className="repo-page bg-[#E9EEF4]" />;
  }

  // Show login screen first if no active session
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="repo-page">
      
      <main className="repo-main py-8">
        {currentUser.role === 'SYSTEM_ADMIN' && <AdminDashboard />}
        {currentUser.role === 'INSTRUCTOR' && <InstructorDashboard />}
        {currentUser.role === 'STUDENT' && <StudentLibrary />}
      </main>

      <RepositoryFooter />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <MainPortal />
      </LibraryProvider>
    </AuthProvider>
  );
}