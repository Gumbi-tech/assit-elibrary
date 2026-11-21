'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Department } from '@/types/elibrary';
import {
  loginRequest,
  changePasswordRequest,
  logoutRequest,
  type BulkImportUserResult,
} from '@/app/api/auth';
import {
  fetchAccountsRequest,
  createAccountRequest,
  bulkImportAccountsRequest,
  updateAccountStatusRequest,
} from '@/lib/accounts-api';

export type ExtendedUser = User & {
  password?: string;
  phone?: string;
  studentId?: string;
  staffId?: string;
  bio?: string;
  departmentId?: string | null;
  mustChangePassword?: boolean;
  profileData?: Record<string, unknown>;
};

export interface AuthResult {
  ok: boolean;
  error?: string;
  mustChangePassword?: boolean;
}

export interface DepartmentFeedback {
  hasDepartment: boolean;
  isAdmin: boolean;
  canSelectOtherDepartments: boolean;
  userDepartment: string | null;
  userDepartmentId: string | null;
  requestedDepartment: string | null;
  isCrossDepartmentRequest: boolean;
  bannerMessage: string;
  emptyMessage: string;
}

interface AuthContextType {
  currentUser: ExtendedUser | null;
  users: ExtendedUser[];
  initialUsers: ExtendedUser[];
  isAuthReady: boolean;
  lockedDepartment: string | null;
  lockedDepartmentId: string | null;
  canSelectOtherDepartments: boolean;
  getDepartmentFeedback: (
    requestedDepartment?: string | null,
    matchingCount?: number,
    totalDbCount?: number
  ) => DepartmentFeedback;
  refreshUsers: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  createUser: (userData: Omit<ExtendedUser, 'id' | 'createdAt'>) => Promise<ExtendedUser>;
  bulkImportUsers: (
    rawRows: Array<Record<string, unknown>>,
    options?: { onDuplicate?: 'skip' | 'update'; defaultTempPassword?: string }
  ) => Promise<BulkImportUserResult>;
  updateUserStatus: (id: string, isActive: boolean) => Promise<void>;
  switchRoleDemo: (role: Role, department?: Department) => void;
  updateProfile: (updates: {
    name?: string;
    phone?: string;
    studentId?: string;
    bio?: string;
  }) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string
  ) => Promise<void>;
}

export const INITIAL_USERS: ExtendedUser[] = [
  {
    id: 'usr-1',
    studentId: 'ADM-001',
    name: 'Admin Superintendent',
    email: 'admin@college.ac.sz',
    role: 'SYSTEM_ADMIN',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-10',
    password: 'password123',
  }
];

const USERS_STORAGE_KEY = 'elibrary_users';
const CURRENT_USER_STORAGE_KEY = 'elibrary_current_user';

function normalizeDeptKey(dept?: string | null): string | null {
  if (!dept || !String(dept).trim()) return null;
  return String(dept).trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function formatDeptName(dept?: string | null): string {
  const norm = normalizeDeptKey(dept);
  if (!norm) return 'Unassigned';
  return norm
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function mergeWithInitialUsers(apiUsers: ExtendedUser[]): ExtendedUser[] {
  const map = new Map<string, ExtendedUser>();
  for (const initUser of INITIAL_USERS) {
    map.set(initUser.email.toLowerCase(), initUser);
  }
  for (const u of apiUsers) {
    const existing = map.get(u.email.toLowerCase());
    map.set(u.email.toLowerCase(), {
      ...existing,
      ...u,
      password: u.password || existing?.password || 'password123',
      isActive: u.isActive !== false,
    });
  }
  return Array.from(map.values());
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<ExtendedUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const persistUsers = useCallback((updatedUsers: ExtendedUser[]) => {
    const merged = mergeWithInitialUsers(updatedUsers);
    setUsers(merged);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to persist users to localStorage:', e);
    }
  }, []);

  const persistCurrentUser = useCallback((user: ExtendedUser | null) => {
    setCurrentUser(user);
    try {
      if (user) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist current user to localStorage:', e);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetchAccountsRequest();
      if (res.ok && Array.isArray(res.users) && res.users.length > 0) {
        persistUsers(res.users);
      }
    } catch {
      // Keep cached/sandbox users if offline or API is unreachable
    }
  }, [persistUsers]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (savedUsers && active) {
          setUsers(mergeWithInitialUsers(JSON.parse(savedUsers)));
        }
      } catch (e) {
        console.error('Failed to parse saved users:', e);
      }

      try {
        const savedCurrent = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (savedCurrent && active) {
          setCurrentUser(JSON.parse(savedCurrent));
        }
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }

      try {
        const res = await fetchAccountsRequest();
        if (active && res.ok && Array.isArray(res.users) && res.users.length > 0) {
          persistUsers(res.users);
        }
      } catch {
        // Keep localStorage/sandbox users when API is unavailable
      } finally {
        if (active) {
          setIsAuthReady(true);
        }
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [persistUsers]);

  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';
  const lockedDepartment = isAdmin ? null : normalizeDeptKey(currentUser?.department);
  const lockedDepartmentId = isAdmin ? null : (currentUser?.departmentId ?? null);
  const canSelectOtherDepartments = Boolean(isAdmin);

  const getDepartmentFeedback = useCallback(
    (
      requestedDepartment?: string | null,
      matchingCount = 0,
      totalDbCount = 0
    ): DepartmentFeedback => {
      const userDept = normalizeDeptKey(currentUser?.department);
      const userDeptId = currentUser?.departmentId ?? null;
      const reqDept = normalizeDeptKey(requestedDepartment);

      if (!currentUser) {
        return {
          hasDepartment: false,
          isAdmin: false,
          canSelectOtherDepartments: false,
          userDepartment: null,
          userDepartmentId: null,
          requestedDepartment: reqDept,
          isCrossDepartmentRequest: false,
          bannerMessage: 'Sign in to view department-scoped repository content.',
          emptyMessage: 'No user signed in.',
        };
      }

      if (isAdmin) {
        const label = reqDept ? formatDeptName(reqDept) : 'All Departments';
        return {
          hasDepartment: Boolean(userDept),
          isAdmin: true,
          canSelectOtherDepartments: true,
          userDepartment: userDept,
          userDepartmentId: userDeptId,
          requestedDepartment: reqDept,
          isCrossDepartmentRequest: false,
          bannerMessage: `System Admin view (${label}): ${matchingCount} matching record(s) shown out of ${totalDbCount} in database.`,
          emptyMessage: reqDept
            ? `No records exist in the database for ${label}.`
            : 'No records found in the database.',
        };
      }

      if (!userDept && !userDeptId) {
        return {
          hasDepartment: false,
          isAdmin: false,
          canSelectOtherDepartments: false,
          userDepartment: null,
          userDepartmentId: null,
          requestedDepartment: reqDept,
          isCrossDepartmentRequest: false,
          bannerMessage:
            'Your account has no department assigned in the database. No other department content is loaded.',
          emptyMessage:
            'No department is assigned to your account, so no records can be displayed.',
        };
      }

      const deptLabel = formatDeptName(userDept);
      const isCrossDepartmentRequest = Boolean(reqDept && userDept && reqDept !== userDept);

      if (isCrossDepartmentRequest) {
        const targetLabel = formatDeptName(reqDept);
        return {
          hasDepartment: true,
          isAdmin: false,
          canSelectOtherDepartments: false,
          userDepartment: userDept,
          userDepartmentId: userDeptId,
          requestedDepartment: reqDept,
          isCrossDepartmentRequest: true,
          bannerMessage: `Restricted to ${deptLabel}. You cannot view ${targetLabel} content; showing ${deptLabel} only.`,
          emptyMessage: `Access denied for ${targetLabel}. Your account is assigned to ${deptLabel}.`,
        };
      }

      if (matchingCount === 0) {
        return {
          hasDepartment: true,
          isAdmin: false,
          canSelectOtherDepartments: false,
          userDepartment: userDept,
          userDepartmentId: userDeptId,
          requestedDepartment: reqDept,
          isCrossDepartmentRequest: false,
          bannerMessage: `Department: ${deptLabel} — no content exists for your department in the database. Other departments are not shown.`,
          emptyMessage: `Your department (${deptLabel}) currently has no documents in the database.`,
        };
      }

      return {
        hasDepartment: true,
        isAdmin: false,
        canSelectOtherDepartments: false,
        userDepartment: userDept,
        userDepartmentId: userDeptId,
        requestedDepartment: reqDept,
        isCrossDepartmentRequest: false,
        bannerMessage: `Department: ${deptLabel} — showing ${matchingCount} record(s) belonging to your department only.`,
        emptyMessage: `Your department (${deptLabel}) currently has no documents in the database.`,
      };
    },
    [currentUser, isAdmin]
  );

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      return { ok: false, error: 'Enter your Student ID/Email and password.' };
    }

    let serverError: string | undefined;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.user) {
        const serverUser: ExtendedUser = {
          ...data.user,
          password,
          isActive: data.user.isActive !== false,
          mustChangePassword: Boolean(data.mustChangePassword ?? data.user.mustChangePassword),
        };
        persistCurrentUser(serverUser);
        return {
          ok: true,
          mustChangePassword: Boolean(serverUser.mustChangePassword),
        };
      }
      serverError = data?.error;
    } catch {
      // Fall back to local/initial sandbox users
    }

    const candidatePool = mergeWithInitialUsers(users);
    const fallbackRes = await loginRequest(trimmedId, password, candidatePool);
    if (fallbackRes.ok && fallbackRes.data) {
      persistCurrentUser(fallbackRes.data);
      return {
        ok: true,
        mustChangePassword: Boolean(fallbackRes.data.mustChangePassword),
      };
    }

    return {
      ok: false,
      error: fallbackRes.error || serverError || 'Invalid Student ID/Email or password.',
    };
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    await logoutRequest();
    persistCurrentUser(null);
  };

  const createUser = async (
    userData: Omit<ExtendedUser, 'id' | 'createdAt'>
  ): Promise<ExtendedUser> => {
    const tempPassword = userData.password || 'password123';
    const mustChange = userData.mustChangePassword ?? true;

    const apiRes = await createAccountRequest({
      studentId: userData.studentId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      password: tempPassword,
      mustChangePassword: mustChange,
      isActive: userData.isActive ?? true,
      profileData: userData.profileData,
    });

    if (!apiRes.ok || !apiRes.user) {
      throw new Error(apiRes.error || 'Failed to create account in database.');
    }

    const createdUser: ExtendedUser = {
      ...apiRes.user,
      password: tempPassword,
      mustChangePassword: Boolean(apiRes.user.mustChangePassword ?? mustChange),
    };

    persistUsers([createdUser, ...users]);
    return createdUser;
  };

  const bulkImportUsers = async (
    rawRows: Array<Record<string, unknown>>,
    options?: { onDuplicate?: 'skip' | 'update'; defaultTempPassword?: string }
  ): Promise<BulkImportUserResult> => {
    const apiRes = await bulkImportAccountsRequest(rawRows, options);
    if (!apiRes.ok || !apiRes.data) {
      throw new Error(apiRes.error || 'Bulk user import failed on server.');
    }

    const updatedMap = new Map(apiRes.data.updated.map((u) => [u.id, u]));
    const existingIds = new Set(users.map((u) => u.id));
    const freshCreated = apiRes.data.created.filter((u) => !existingIds.has(u.id));

    const mergedUsers: ExtendedUser[] = [
      ...freshCreated,
      ...users.map((u) => updatedMap.get(u.id) ?? u),
    ];

    persistUsers(mergedUsers);
    return apiRes.data;
  };

  const updateUserStatus = async (id: string, isActive: boolean) => {
    const apiRes = await updateAccountStatusRequest(id, isActive);
    if (!apiRes.ok) {
      throw new Error(apiRes.error || 'Failed to update account status.');
    }

    const updatedUsers = users.map((u) => (u.id === id ? { ...u, isActive } : u));
    persistUsers(updatedUsers);

    if (currentUser?.id === id) {
      persistCurrentUser({ ...currentUser, isActive });
    }
  };

  const switchRoleDemo = (role: Role, department?: Department) => {
    const pool = mergeWithInitialUsers(users);
    const demo =
      pool.find(
        (u) =>
          u.role === role &&
          (department ? normalizeDeptKey(u.department) === normalizeDeptKey(department) : true)
      ) ||
      INITIAL_USERS.find((u) => u.role === role) ||
      INITIAL_USERS[0];
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

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword = newPassword
  ) => {
    if (!currentUser) {
      throw new Error('No authenticated user found.');
    }

    let updatedUser: ExtendedUser | null = null;

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentUser.email || currentUser.studentId,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.user) {
        throw new Error(data?.error || 'Failed to update password on server.');
      }

      updatedUser = {
        ...currentUser,
        ...data.user,
        password: newPassword,
        mustChangePassword: false,
      };
    } catch (serverErr) {
      if (currentUser.id.startsWith('usr-')) {
        const localRes = await changePasswordRequest(
          currentUser,
          currentPassword,
          newPassword,
          confirmPassword
        );
        if (!localRes.ok || !localRes.data) {
          throw new Error(localRes.error || 'Failed to update password.');
        }
        updatedUser = localRes.data;
      } else {
        throw serverErr;
      }
    }

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? (updatedUser as ExtendedUser) : u
    );
    persistUsers(updatedUsers);
    persistCurrentUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        initialUsers: INITIAL_USERS,
        isAuthReady,
        lockedDepartment,
        lockedDepartmentId,
        canSelectOtherDepartments,
        getDepartmentFeedback,
        refreshUsers,
        login,
        logout,
        createUser,
        bulkImportUsers,
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