'use client';

import React, { createContext, useContext, useState } from 'react';
import { DocumentItem, Department } from '@/types/elibrary';

interface LibraryContextType {
  documents: DocumentItem[];
  addDocument: (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'downloadCount'>) => void;
  updateDocument: (id: string, updates: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => void;
  incrementDownload: (id: string) => void;
}

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Full-Stack Web Architecture with Next.js App Router',
    description: 'Comprehensive guide covering Server Components, API routes, Turbopack, and PostgreSQL database integration.',
    department: 'SOFTWARE_ENGINEERING',
    fileUrl: '#',
    fileSize: '4.8 MB',
    fileType: 'PDF',
    uploadedBy: 'usr-2',
    uploaderName: 'Prof. M. Dlamini',
    downloadCount: 42,
    createdAt: '2026-03-10'
  },
  {
    id: 'doc-2',
    title: 'Advanced Penetration Testing & Network Defense',
    description: 'Practical lab manuals for ethical hacking, vulnerability scanning, and secure packet inspection.',
    department: 'CYBER_SECURITY',
    fileUrl: '#',
    fileSize: '12.1 MB',
    fileType: 'PDF',
    uploadedBy: 'usr-3',
    uploaderName: 'Dr. T. Khumalo',
    downloadCount: 28,
    createdAt: '2026-03-12'
  },
  {
    id: 'doc-3',
    title: 'UI/UX Design Systems and Adobe Workflow Standards',
    description: 'Vector asset creation, typography scales, accessibility compliance (WCAG 2.2), and interactive prototyping.',
    department: 'MULTIMEDIA',
    fileUrl: '#',
    fileSize: '24.5 MB',
    fileType: 'PDF',
    uploadedBy: 'usr-2',
    uploaderName: 'Prof. M. Dlamini',
    downloadCount: 19,
    createdAt: '2026-03-14'
  }
];

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCS);

  const addDocument = (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'downloadCount'>) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc-${Date.now()}`,
      downloadCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setDocuments(prev => [newDoc, ...prev]);
  };

  const updateDocument = (id: string, updates: Partial<DocumentItem>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const incrementDownload = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, downloadCount: d.downloadCount + 1 } : d));
  };

  return (
    <LibraryContext.Provider value={{ documents, addDocument, updateDocument, deleteDocument, incrementDownload }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within a LibraryProvider');
  return context;
};
