'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, BookOpen, LogOut, UserCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout, switchRoleDemo } = useAuth();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">College E-Library</span>
            <span className="text-xs text-indigo-400 block">RBAC Resource Portal</span>
          </div>
        </div>

        {currentUser ? (
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium">{currentUser.name}</span>
              <span className="text-xs text-slate-400">
                Role: <strong className="text-indigo-300">{currentUser.role}</strong>
                {currentUser.department && ` | Dept: ${currentUser.department.replace('_', ' ')}`}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 hidden lg:inline">Quick Demo Switch:</span>
              <select
                className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={`${currentUser.role}:${currentUser.department || 'NONE'}`}
                onChange={(e) => {
                  const [role, dept] = e.target.value.split(':');
                  switchRoleDemo(role as any, dept === 'NONE' ? undefined : (dept as any));
                }}
              >
                <option value="SYSTEM_ADMIN:NONE">Role: System Admin</option>
                <option value="INSTRUCTOR:SOFTWARE_ENGINEERING">Role: SE Instructor</option>
                <option value="INSTRUCTOR:CYBER_SECURITY">Role: Cyber Instructor</option>
                <option value="STUDENT:SOFTWARE_ENGINEERING">Role: SE Student</option>
                <option value="STUDENT:CYBER_SECURITY">Role: Cyber Student</option>
                <option value="STUDENT:MULTIMEDIA">Role: Multimedia Student</option>
              </select>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="text-sm text-indigo-300">Authentication Required</div>
        )}
      </div>
    </header>
  );
};
