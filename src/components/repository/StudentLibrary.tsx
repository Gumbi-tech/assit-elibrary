'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { Department } from '@/types/elibrary';
import type { RepositoryDocument } from '@/types/repository';
import {
  LayoutGrid,
  List,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import DocumentsTable from './DocumentsTable';
import DocumentsGallery from './DocumentsGallery';
import DocumentPreviewModal from './DocumentPreviewModal';
import DocumentFilters from './DocumentFilters';
import UserSettings from './UserSettings';

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

const COURSE_METADATA: Record<Department, { code: string; title: string; label: string }> = {
  SOFTWARE_ENGINEERING: {
    code: 'CSC-301',
    title: 'Software Engineering & Architecture',
    label: 'Software Engineering',
  },
  CYBER_SECURITY: {
    code: 'SEC-304',
    title: 'Network & Cyber Security',
    label: 'Cyber Security',
  },
  MULTIMEDIA: {
    code: 'MMD-202',
    title: 'Interactive Multimedia Systems',
    label: 'Multimedia',
  },
};

// Map between DocumentFilters labels and backend Department enum values
const FILTER_TO_DEPT: Record<string, string> = {
  'All Departments': 'ALL',
  'Software Engineering': 'SOFTWARE_ENGINEERING',
  'Cyber Security': 'CYBER_SECURITY',
  'Multi Media': 'MULTIMEDIA',
};

const DEPT_TO_FILTER: Record<string, string> = {
  ALL: 'All Departments',
  SOFTWARE_ENGINEERING: 'Software Engineering',
  CYBER_SECURITY: 'Cyber Security',
  MULTIMEDIA: 'Multi Media',
};

export const StudentLibrary: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();
  const { documents, incrementDownload } = useLibrary();

  // View toggle between Library and User Settings
  const [showSettings, setShowSettings] = useState(false);

  // Filter states aligned with DocumentFilters props
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    currentUser?.department ? DEPT_TO_FILTER[currentUser.department] || 'All Departments' : 'All Departments'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');

  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery');
  const [successMsg, setSuccessMsg] = useState('');

  // Selection & Preview state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);

  // Enforce RBAC lock when a student tries to change department
  const handleDepartmentChange = (selectedLabel: string) => {
    if (currentUser?.role === 'STUDENT' && currentUser.department) {
      setDepartmentFilter(DEPT_TO_FILTER[currentUser.department] || selectedLabel);
      return;
    }
    setDepartmentFilter(selectedLabel);
  };

  // Filter documents based on RBAC, department, category, and search query
  const filteredDocuments = useMemo(() => {
    const mappedDeptEnum = FILTER_TO_DEPT[departmentFilter] || 'ALL';

    return documents.filter((doc) => {
      // 1. Strict RBAC enforcement for students
      if (currentUser?.role === 'STUDENT' && doc.department !== currentUser.department) {
        return false;
      }

      // 2. Department filter
      if (mappedDeptEnum !== 'ALL' && doc.department !== mappedDeptEnum) {
        return false;
      }

      // 3. Category filter
      const docCategory = (doc as any).category || 'Course PDF';
      if (
        categoryFilter !== 'All Categories' &&
        docCategory.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      // 4. Keyword / course code / ID search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const meta = COURSE_METADATA[doc.department as Department];
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesDesc = doc.description.toLowerCase().includes(q);
        const matchesId = doc.id.toLowerCase().includes(q);
        const matchesCode = meta?.code.toLowerCase().includes(q);

        if (!matchesTitle && !matchesDesc && !matchesId && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [documents, currentUser, departmentFilter, categoryFilter, searchQuery]);

  // Map to RepositoryDocument shape required by shared views
  const mappedDocuments: RepositoryDocument[] = useMemo(() => {
    return filteredDocuments.map((doc) => {
      const meta = COURSE_METADATA[doc.department as Department] || {
        code: 'LIB-101',
        title: doc.title,
        label: doc.department.replace('_', ' '),
      };
      return {
        docId: doc.id,
        courseCode: meta.code,
        courseTitle: meta.title,
        department: meta.label,
        title: doc.title,
        summary: doc.description,
        category: (doc as any).category || 'Course PDF',
        author: doc.uploaderName || 'Instructor',
        size: doc.fileSize || '2.4 MB',
        pages: (doc as any).pages || 14,
        uploadDate: doc.createdAt || new Date().toISOString().split('T')[0],
        topics: (doc as any).topics || `${meta.title} Curriculum`,
      };
    });
  }, [filteredDocuments]);

  const handleDownload = (doc: RepositoryDocument) => {
    incrementDownload(doc.docId);
    const source = documents.find((d) => d.id === doc.docId);
    const link = document.createElement('a');
    link.href = source?.fileUrl && source.fileUrl !== '#' ? source.fileUrl : '#';
    link.setAttribute('download', `${doc.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMsg(`Successfully downloaded: "${doc.title}"`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadSelected = (docs: RepositoryDocument[]) => {
    docs.forEach((doc) => handleDownload(doc));
    setSelectedIds(new Set());
  };

  const formatDeptName = (dept?: string) => {
    if (!dept || dept === 'ALL') return 'All Accessible Departments';
    return dept
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Render UserSettings screen when toggled
  if (showSettings) {
    return (
      <UserSettings
        onBack={() => setShowSettings(false)}
        onLogout={onLogout || logout}
      />
    );
  }

  return (
    <div className="repo-page">
      {/* Shared PortalHeader Component */}
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Student Portal · ${formatDeptName(currentUser?.department)}`}
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          setSearchQuery(q);
          onSearch?.(q);
        }}
        onLogout={onLogout || logout}
        onSettings={() => setShowSettings(true)}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content">
          {/* Page Header aligned with Admin & Instructor Dashboards */}
          <div className="repo-heading">
            <div>
              <small>STUDENT RESOURCE E-LIBRARY · RBAC SECURED</small>
              <h2>Learning Materials &amp; Course PDFs</h2>
              <p>
                Browse, preview, and download verified educational documents assigned to your department group.
              </p>
            </div>
            <div className="repo-heading-right">
              <div
                role="group"
                aria-label="Layout view"
                style={{ display: 'inline-flex', border: '1px solid #AAB7C6', borderRadius: '2px' }}
              >
                <button
                  type="button"
                  className={viewMode === 'table' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('table')}
                  style={{ border: 'none', minHeight: '32px', padding: '0 10px', fontSize: '11px' }}
                  title="Table View"
                >
                  <List size={14} /> Table View
                </button>
                <button
                  type="button"
                  className={viewMode === 'gallery' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('gallery')}
                  style={{ border: 'none', minHeight: '32px', padding: '0 10px', fontSize: '11px' }}
                  title="Gallery View"
                >
                  <LayoutGrid size={14} /> Gallery View
                </button>
              </div>
              <div className="repo-count">
                <strong>{filteredDocuments.length}</strong>
                <span>AVAILABLE PDFs</span>
              </div>
            </div>
          </div>

          {successMsg && (
            <div
              role="status"
              className="px-3 py-2 bg-[#EDF4FC] border border-[#D0DFF0] text-[#003060] text-[11px] flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Reusable DocumentFilters Component */}
          <DocumentFilters
            department={departmentFilter}
            category={categoryFilter}
            query={searchQuery}
            setDepartment={handleDepartmentChange}
            setCategory={setCategoryFilter}
            setQuery={setSearchQuery}
          />

          {/* Documents Table or Gallery View */}
          {filteredDocuments.length === 0 ? (
            <section className="repo-panel">
              <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Lock size={32} style={{ margin: '0 auto 12px', color: '#64748B' }} />
                <h3 style={{ margin: '0 0 6px', color: '#0F294A', fontSize: '16px', fontWeight: 'bold' }}>
                  No Accessible Documents Found
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '11px', maxWidth: '420px', marginInline: 'auto' }}>
                  No documents match your active filters within your department group ({formatDeptName(currentUser?.department)}). Try resetting filters or contact your instructor.
                </p>
              </div>
            </section>
          ) : viewMode === 'gallery' ? (
            <DocumentsGallery
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownload}
              onDownloadSelected={handleDownloadSelected}
            />
          ) : (
            <DocumentsTable
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownload}
              onDownloadSelected={handleDownloadSelected}
            />
          )}
        </div>
      </main>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};