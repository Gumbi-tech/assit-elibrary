'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Department } from '@/types/elibrary';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthReady: boolean;
  login: (identifier: string) => boolean;
  logout: () => void;
  createUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  updateUserStatus: (id: string, isActive: boolean) => void;
  switchRoleDemo: (role: Role, department?: Department) => void;
}

const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Admin Superintendent',
    email: 'admin@college.ac.sz',
    role: 'SYSTEM_ADMIN',
    isActive: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'usr-2',
    name: 'Prof. M. Dlamini (SE Instructor)',
    email: 'se.instructor@college.ac.sz',
    role: 'INSTRUCTOR',
    department: 'SOFTWARE_ENGINEERING',
    isActive: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'usr-4',
    name: 'Sipho Nxumalo (SE Student)',
    email: 'student.se@college.ac.sz',
    role: 'STUDENT',
    department: 'SOFTWARE_ENGINEERING',
    isActive: true,
    createdAt: '2026-03-01'
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('elibrary_current_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    setIsAuthReady(true);
  }, []);

  const login = (identifier: string) => {
    const query = identifier.trim().toLowerCase();
    const found = users.find(u => 
      u.isActive && (
        u.email.toLowerCase() === query ||
        u.id.toLowerCase() === query ||
        u.name.toLowerCase().includes(query)
      )
    );
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('elibrary_current_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('elibrary_current_user');
  };

  const createUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
  };

  const updateUserStatus = (id: string, isActive: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive } : u));
  };

  const switchRoleDemo = (role: Role, department?: Department) => {
    const demo = users.find(u => u.role === role && (department ? u.department === department : true)) || users[0];
    setCurrentUser(demo);
    localStorage.setItem('elibrary_current_user', JSON.stringify(demo));
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, isAuthReady, login, logout, createUser, updateUserStatus, switchRoleDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};