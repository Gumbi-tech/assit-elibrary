'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Department } from '@/types/elibrary';

// Extend User locally in case @/types/elibrary doesn't define optional profile/password fields yet
export type ExtendedUser = User & {
  password?: string;
  phone?: string;
  studentId?: string;
  staffId?: string;
  bio?: string;
  mustChangePassword?: boolean;
  profileData?: Record<string, unknown>;
};

interface AuthContextType {
  currentUser: ExtendedUser | null;
  users: ExtendedUser[];
  isAuthReady: boolean;
  login: (identifier: string) => boolean;
  logout: () => void;
  createUser: (userData: Omit<ExtendedUser, 'id' | 'createdAt'>) => void;
  updateUserStatus: (id: string, isActive: boolean) => void;
  switchRoleDemo: (role: Role, department?: Department) => void;
  updateProfile: (updates: {
    name?: string;
    phone?: string;
    studentId?: string;
    bio?: string;
  }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const INITIAL_USERS: ExtendedUser[] = [
  {
    id: 'usr-1',
    name: 'Admin Superintendent',
    email: 'admin@college.ac.sz',
    role: 'SYSTEM_ADMIN',
    isActive: true,
    createdAt: '2026-01-10',
    password: 'password123',
  },
  {
    id: 'usr-2',
    name: 'Prof. M. Dlamini (SE Instructor)',
    email: 'se.instructor@college.ac.sz',
    role: 'INSTRUCTOR',
    department: 'SOFTWARE_ENGINEERING',
    isActive: true,
    createdAt: '2026-02-01',
    password: 'password123',
  },
  {
    id: 'usr-4',
    name: 'Sipho Nxumalo (SE Student)',
    email: 'student.se@college.ac.sz',
    role: 'STUDENT',
    department: 'SOFTWARE_ENGINEERING',
    isActive: true,
    createdAt: '2026-03-01',
    password: 'password123',
  },
];

const USERS_STORAGE_KEY = 'elibrary_users';
const CURRENT_USER_STORAGE_KEY = 'elibrary_current_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<ExtendedUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {
        console.error('Failed to parse saved users:', e);
      }
    }

    const savedCurrent = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (savedCurrent) {
      try {
        setCurrentUser(JSON.parse(savedCurrent));
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }
    }

    setIsAuthReady(true);
  }, []);

  const persistUsers = (updatedUsers: ExtendedUser[]) => {
    setUsers(updatedUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  };

  const persistCurrentUser = (user: ExtendedUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  };

  const login = (identifier: string) => {
    const query = identifier.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.isActive &&
        (u.email.toLowerCase() === query ||
          u.id.toLowerCase() === query ||
          u.name.toLowerCase().includes(query))
    );
    if (found) {
      persistCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    persistCurrentUser(null);
  };

  const createUser = (userData: Omit<ExtendedUser, 'id' | 'createdAt'>) => {
    const newUser: ExtendedUser = {
      ...userData,
      password: userData.password || 'password123',
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    persistUsers([newUser, ...users]);
  };

  const updateUserStatus = (id: string, isActive: boolean) => {
    const updatedUsers = users.map((u) => (u.id === id ? { ...u, isActive } : u));
    persistUsers(updatedUsers);

    if (currentUser?.id === id) {
      persistCurrentUser({ ...currentUser, isActive });
    }
  };

  const switchRoleDemo = (role: Role, department?: Department) => {
    const demo =
      users.find((u) => u.role === role && (department ? u.department === department : true)) ||
      users[0];
    persistCurrentUser(demo);
  };

  const updateProfile = async (updates: {
    name?: string;
    phone?: string;
    studentId?: string;
    bio?: string;
  }) => {
    if (!currentUser) {
      throw new Error('No authenticated user found.');
    }

    const updatedUser: ExtendedUser = {
      ...currentUser,
      ...updates,
    };

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    persistUsers(updatedUsers);
    persistCurrentUser(updatedUser);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser) {
      throw new Error('No authenticated user found.');
    }

    // Verify existing password if set on the account
    if (currentUser.password && currentUser.password !== currentPassword) {
      throw new Error('The current password you entered is incorrect.');
    }

    const updatedUser: ExtendedUser = {
      ...currentUser,
      password: newPassword,
    };

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    persistUsers(updatedUsers);
    persistCurrentUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthReady,
        login,
        logout,
        createUser,
        updateUserStatus,
        switchRoleDemo,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};