'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAuthorizedDocumentBlobUrl,
  fetchDocumentsRequest,
  type DocumentRecord,
} from '@/lib/library-api';
import type { RepositoryDocument } from '@/types/repository';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Download,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import DocumentPreviewModal from './DocumentPreviewModal';
import PdfThumbnail from './PdfThumbnail';
import UserSettings from './UserSettings';

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

type TagLike = string | { name: string };
type ProgramLike = string | { name: string };

type OpenLibraryDocumentRecord = DocumentRecord & {
  author?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  tags?: TagLike[];
  programs?: ProgramLike[];
  signedUrl?: string;
  uploadedBy?: { id: string; fullName: string; email: string } | null;
};

type PreviewableRepositoryDocument = RepositoryDocument & {
  previewUrl?: string;
};

interface RelatedBookMatch {
  doc: OpenLibraryDocumentRecord;
  score: number;
  sharedPrograms: string[];
  sharedTags: string[];
  isAdjacentCategoryMatch: boolean;
  reason: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function extractNames(items?: Array<string | { name: string }>): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map((val) => val.trim())
    .filter(Boolean);
}

function getGroupLetter(title: string): string {
  const first = (title || '').trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelatedOpenLibraryBooks(
  target: OpenLibraryDocumentRecord,
  catalog: OpenLibraryDocumentRecord[]
): RelatedBookMatch[] {
  const targetCat = (target.category || '').trim().toLowerCase();
  const targetPrograms = extractNames(target.programs).map((p) => p.toLowerCase());
  const targetTags = extractNames(target.tags).map((t) => t.toLowerCase());

  const matches: RelatedBookMatch[] = [];

  for (const candidate of catalog) {
    if (candidate.id === target.id) continue;

    const candCat = (candidate.category || '').trim().toLowerCase();
    const candPrograms = extractNames(candidate.programs);
    const candTags = extractNames(candidate.tags);

    const sharedPrograms = candPrograms.filter((p) =>
      targetPrograms.includes(p.toLowerCase())
    );
    const sharedTags = candTags.filter((t) =>
      targetTags.includes(t.toLowerCase())
    );
    const sameCategory = Boolean(targetCat && candCat && targetCat === candCat);
    const isAdjacentCategoryMatch =
      sharedPrograms.length > 0 &&
      Boolean(targetCat && candCat && targetCat !== candCat);

    let score = 0;
    if (sharedPrograms.length > 0) {
      score += sharedPrograms.length * (isAdjacentCategoryMatch ? 6 : 4);
    }
    if (sharedTags.length > 0) {
      score += sharedTags.length * 3;
    }
    if (sameCategory) {
      score += 2;
    }

    if (score > 0) {
      const reasons: string[] = [];
      if (sharedPrograms.length > 0) {
        reasons.push(
          isAdjacentCategoryMatch
            ? `Program badge (${sharedPrograms.join(', ')}) in ${candidate.category || 'adjacent category'}`
            : `Program badge (${sharedPrograms.join(', ')})`
        );
      }
      if (sharedTags.length > 0) {
        reasons.push(`Tags: ${sharedTags.map((t) => `#${t}`).join(', ')}`);
      }
      if (sameCategory && sharedPrograms.length === 0) {
        reasons.push(`Category: ${candidate.category}`);
      }

      matches.push({
        doc: candidate,
        score,
        sharedPrograms,
        sharedTags,
        isAdjacentCategoryMatch,
        reason: reasons.join(' · '),
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.doc.name.localeCompare(b.doc.name))
    .slice(0, 4);
}

export const StudentLibrary: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome: _onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();

  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [documents, setDocuments] = useState<OpenLibraryDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [programBadgeFilter, setProgramBadgeFilter] = useState<string>('ALL');
  const [activeLetter, setActiveLetter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'title' | 'recent'>('title');

  const [successMsg, setSuccessMsg] = useState('');
  const [pageError, setPageError] = useState('');

  const [relatedTargetDoc, setRelatedTargetDoc] =
    useState<OpenLibraryDocumentRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewableRepositoryDocument | null>(
    null
  );
  const [previewLoadingDocId, setPreviewLoadingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const closePreviewModal = useCallback(() => {
    setPreviewLoadingDocId(null);
    setPreviewDoc((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const loadOpenLibraryData = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner ?? !hasLoadedOnce;
      if (showSpinner) setIsLoading(true);
      setPageError('');

      try {
        const [docRes, catRes] = await Promise.all([
          fetchDocumentsRequest(),
          fetch('/api/categories', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (docRes.ok && docRes.documents) {
          setDocuments(docRes.documents as OpenLibraryDocumentRecord[]);
        } else if (docRes.error) {
          setPageError(docRes.error);
        }

        if (catRes) {
          const rawCats = Array.isArray(catRes)
            ? catRes
            : Array.isArray(catRes?.categories)
            ? catRes.categories
            : [];
          const names = Array.from(
            new Map(
              rawCats
                .map((c: { name?: string } | string) =>
                  typeof c === 'string' ? c.trim() : (c?.name || '').trim()
                )
                .filter(Boolean)
                .map((n: string) => [n.toLowerCase(), n])
            ).values()
          ) as string[];
          setDbCategories(names);
        }
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : 'Failed to load open library catalog.'
        );
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [hasLoadedOnce]
  );

  useEffect(() => {
    void loadOpenLibraryData({ showSpinner: !hasLoadedOnce });
  }, [currentUser?.id, loadOpenLibraryData, hasLoadedOnce]);

  const categoryOptions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const cat of dbCategories) {
      merged.set(cat.toLowerCase(), cat);
    }
    for (const doc of documents) {
      const docCat = (doc.category || '').trim();
      if (docCat && !merged.has(docCat.toLowerCase())) {
        merged.set(docCat.toLowerCase(), docCat);
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
  }, [dbCategories, documents]);

  const programBadgeOptions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const doc of documents) {
      for (const prog of extractNames(doc.programs)) {
        if (!merged.has(prog.toLowerCase())) {
          merged.set(prog.toLowerCase(), prog);
        }
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const handleResetFilters = useCallback(() => {
    setCategoryFilter('ALL');
    setProgramBadgeFilter('ALL');
    setActiveLetter('ALL');
    setSearchQuery('');
  }, []);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = documents.filter((doc) => {
      const isPdf =
        doc.mimeType === 'application/pdf' ||
        doc.filename.toLowerCase().endsWith('.pdf');
      if (!isPdf) return false;

      const docCategory = (doc.category || 'Uncategorized').trim();
      if (
        categoryFilter !== 'ALL' &&
        docCategory.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      const docPrograms = extractNames(doc.programs);
      if (
        programBadgeFilter !== 'ALL' &&
        !docPrograms.some(
          (p) => p.toLowerCase() === programBadgeFilter.toLowerCase()
        )
      ) {
        return false;
      }

      if (activeLetter !== 'ALL' && getGroupLetter(doc.name) !== activeLetter) {
        return false;
      }

      if (!q) return true;

      const docTags = extractNames(doc.tags);
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.author || '').toLowerCase().includes(q) ||
        docCategory.toLowerCase().includes(q) ||
        doc.filename.toLowerCase().includes(q) ||
        docPrograms.some((p) => p.toLowerCase().includes(q)) ||
        docTags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'recent') {
      return [...list].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [
    documents,
    categoryFilter,
    programBadgeFilter,
    activeLetter,
    searchQuery,
    sortBy,
  ]);

  const shelfSections = useMemo(() => {
    const bucketMap = new Map<string, OpenLibraryDocumentRecord[]>();
    for (const doc of filteredDocuments) {
      const key = getGroupLetter(doc.name);
      const list = bucketMap.get(key) || [];
      list.push(doc);
      bucketMap.set(key, list);
    }

    const sortedLetters = Array.from(bucketMap.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return sortedLetters.map((letter) => ({
      letter,
      books: bucketMap.get(letter) || [],
    }));
  }, [filteredDocuments]);

  const relatedMatches = useMemo(() => {
    if (!relatedTargetDoc) return [];
    return getRelatedOpenLibraryBooks(relatedTargetDoc, documents);
  }, [relatedTargetDoc, documents]);

  const mapToRepositoryDocument = (
    doc: OpenLibraryDocumentRecord
  ): RepositoryDocument => {
    const programs = extractNames(doc.programs);
    const tags = extractNames(doc.tags);
    return {
      docId: doc.id,
      courseCode: doc.category || 'OPEN',
      courseTitle: programs[0] || doc.category || 'Open Library',
      department: programs.join(', ') || 'Open Access',
      title: doc.name,
      summary: `${doc.category || 'General'} · ${doc.filename}`,
      category: doc.category || 'General',
      author: doc.author || doc.uploadedBy?.fullName || 'Library Contributor',
      size: formatFileSize(doc.size),
      pages: 1,
      uploadDate: doc.createdAt
        ? doc.createdAt.split('T')[0]
        : new Date().toISOString().split('T')[0],
      topics: tags.map((t) => `#${t}`).join(' '),
    };
  };

  const resolveStreamUrl = (
    doc: OpenLibraryDocumentRecord,
    download = false
  ): string => {
    const base =
      doc.signedUrl || `/api/documents/${encodeURIComponent(doc.id)}/file`;
    if (!download) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}download=1`;
  };

  const handlePreviewDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
      setPreviewLoadingDocId(doc.docId);
      setPreviewDoc({ ...doc, previewUrl: undefined });

      try {
        const match = documents.find((item) => item.id === doc.docId);
        if (!match) return;

        const streamUrl = resolveStreamUrl(match, false);
        if (streamUrl.startsWith('blob:')) {
          setPreviewDoc({ ...doc, previewUrl: streamUrl });
          return;
        }

        const fetched = await fetchAuthorizedDocumentBlobUrl(streamUrl);
        if (!fetched.ok || !fetched.blobUrl) {
          setPageError(fetched.error || 'Unable to load PDF preview.');
          return;
        }

        setPreviewDoc({
          ...doc,
          previewUrl: fetched.blobUrl,
        });
      } finally {
        setPreviewLoadingDocId(null);
      }
    },
    [documents]
  );

  const handleDownload = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
      setDownloadingDocId(doc.docId);

      try {
        const match = documents.find((item) => item.id === doc.docId);
        if (!match) {
          setPageError('Document record not found.');
          return;
        }

        const downloadUrl = resolveStreamUrl(match, true);
        const fetched = await fetchAuthorizedDocumentBlobUrl(downloadUrl);
        if (!fetched.ok || !fetched.blobUrl) {
          setPageError(fetched.error || 'Failed to download PDF.');
          return;
        }

        const link = document.createElement('a');
        link.href = fetched.blobUrl;
        link.download = match.filename || `${doc.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(fetched.blobUrl!), 2000);

        setSuccessMsg(`Downloaded "${doc.title}".`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } finally {
        setDownloadingDocId((prev) => (prev === doc.docId ? null : prev));
      }
    },
    [documents]
  );

  if (showSettings) {
    return (
      <UserSettings
        onBack={() => setShowSettings(false)}
        onLogout={onLogout || logout}
      />
    );
  }

  const hasActiveFilters =
    categoryFilter !== 'ALL' ||
    programBadgeFilter !== 'ALL' ||
    activeLetter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName="Open Library · Picture Shelf"
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
        <div
          className="repo-content"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Shelf Header & Filter Bar */}
          <section className="repo-panel">
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={18} aria-hidden="true" />
                <div>
                  <strong style={{ fontSize: '15px' }}>Open Library Books</strong>
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '11px',
                      padding: '2px 7px',
                      background: '#F1F5F9',
                      borderRadius: '2px',
                      color: '#334155',
                    }}
                  >
                    {filteredDocuments.length}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <select
                  aria-label="Sort books"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'title' | 'recent')
                  }
                  style={{
                    minHeight: '32px',
                    fontSize: '11px',
                    padding: '0 8px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '2px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="title">Title (A–Z)</option>
                  <option value="recent">Recently Added</option>
                </select>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '2px',
                    padding: '0 8px',
                    minHeight: '32px',
                    background: '#FFFFFF',
                  }}
                >
                  <Filter size={13} aria-hidden="true" />
                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '11px',
                    }}
                  >
                    <option value="ALL">All Categories</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  aria-label="Filter by program badge"
                  value={programBadgeFilter}
                  onChange={(e) => setProgramBadgeFilter(e.target.value)}
                  style={{
                    minHeight: '32px',
                    fontSize: '11px',
                    padding: '0 8px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '2px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="ALL">All Program Badges</option>
                  {programBadgeOptions.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search + Alphabetical Jump Strip */}
            <div
              style={{
                padding: '0 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '2px',
                  padding: '6px 10px',
                  background: '#FFFFFF',
                }}
              >
                <Search size={14} aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, author, category, program badge, or tag..."
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    background: 'transparent',
                  }}
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="secondary"
                    style={{
                      minHeight: '24px',
                      fontSize: '10px',
                      padding: '0 8px',
                    }}
                    onClick={handleResetFilters}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div
                role="navigation"
                aria-label="Alphabetical shelf index"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  flexWrap: 'wrap',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {ALPHABET.map((letter) => {
                    const selected = activeLetter === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() =>
                          setActiveLetter((prev) =>
                            prev === letter ? 'ALL' : letter
                          )
                        }
                        style={{
                          padding: '2px 5px',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: selected ? 'bold' : 'normal',
                          background: selected ? '#0F294A' : 'transparent',
                          color: selected ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLetter((prev) => (prev === '#' ? 'ALL' : '#'))
                    }
                    style={{
                      padding: '2px 6px',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: activeLetter === '#' ? 'bold' : 'normal',
                      background: activeLetter === '#' ? '#0F294A' : 'transparent',
                      color: activeLetter === '#' ? '#FFFFFF' : '#475569',
                    }}
                  >
                    #
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLetter('ALL')}
                  style={{
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: activeLetter === 'ALL' ? 'bold' : 'normal',
                    background: activeLetter === 'ALL' ? '#E2E8F0' : 'transparent',
                    color: '#0F294A',
                  }}
                >
                  ALL
                </button>
              </div>
            </div>
          </section>

          {pageError && (
            <div
              role="alert"
              className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[11px] flex items-center gap-2"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{pageError}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="px-3 py-2 bg-[#EDF4FC] border border-[#D0DFF0] text-[#003060] text-[11px] flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Picture-Based Book Rows Grouped by Letter */}
          {isLoading ? (
            <section className="repo-panel">
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                Loading open library shelf...
              </div>
            </section>
          ) : shelfSections.length === 0 ? (
            <section className="repo-panel">
              <div
                className="empty"
                style={{ padding: '48px 20px', textAlign: 'center' }}
              >
                <BookOpen
                  size={32}
                  style={{ margin: '0 auto 12px', color: '#64748B' }}
                />
                <h3
                  style={{
                    margin: '0 0 6px',
                    color: '#0F294A',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  {hasActiveFilters
                    ? 'No Matching Books Found'
                    : 'Open Library Is Empty'}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#64748B',
                    fontSize: '11px',
                    maxWidth: '420px',
                    marginInline: 'auto',
                  }}
                >
                  {hasActiveFilters
                    ? 'Try clearing your search, category, program badge, or letter filter.'
                    : 'No books have been published to the open library yet.'}
                </p>
              </div>
            </section>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {shelfSections.map(({ letter, books }) => (
                <section
                  key={letter}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: '#0F294A',
                      borderBottom: '1px solid #E2E8F0',
                      paddingBottom: '4px',
                    }}
                  >
                    {letter}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '20px',
                      alignItems: 'start',
                    }}
                  >
                    {books.map((book) => {
                      const isBusy =
                        previewLoadingDocId === book.id ||
                        downloadingDocId === book.id;

                      return (
                        <article
                          key={book.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setRelatedTargetDoc(book)}
                            style={{
                              position: 'relative',
                              aspectRatio: '2 / 3',
                              width: '100%',
                              padding: 0,
                              border: '1px solid #CBD5E1',
                              borderRadius: '3px',
                              background: '#FFFFFF',
                              cursor: 'pointer',
                              display: 'block',
                              textAlign: 'left',
                              overflow: 'hidden',
                            }}
                          >
                            <PdfThumbnail
                              coverUrl={book.coverUrl}
                              title={book.name}
                              department={book.category || 'Open Library'}
                            />
                          </button>

                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#0F294A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={book.name}
                            >
                              {book.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {book.author || book.category || 'Open Access'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={isBusy}
                              onClick={() =>
                                void handlePreviewDoc(mapToRepositoryDocument(book))
                              }
                              style={{
                                flex: 1,
                                minHeight: '26px',
                                fontSize: '10px',
                                padding: '0 6px',
                              }}
                            >
                              <Eye size={11} />
                              <span>Read</span>
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={isBusy}
                              onClick={() =>
                                void handleDownload(mapToRepositoryDocument(book))
                              }
                              style={{
                                minHeight: '26px',
                                fontSize: '10px',
                                padding: '0 6px',
                              }}
                              title="Download PDF"
                            >
                              <Download size={11} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Book Details & Related Books Modal */}
      {relatedTargetDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRelatedTargetDoc(null);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(580px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-related-book-title"
          >
            <header>
              <strong id="student-related-book-title">
                <BookMarked size={15} aria-hidden="true" />
                BOOK DETAILS &amp; RELATED BOOKS
              </strong>
              <button
                type="button"
                onClick={() => setRelatedTargetDoc(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>{relatedTargetDoc.category || 'OPEN LIBRARY'}</small>
              <h2>{relatedTargetDoc.name}</h2>
              <p>
                {relatedTargetDoc.author
                  ? `By ${relatedTargetDoc.author} · `
                  : ''}
                {formatFileSize(relatedTargetDoc.size)} · Open Access
              </p>

              {extractNames(relatedTargetDoc.programs).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '10px',
                  }}
                >
                  {extractNames(relatedTargetDoc.programs).map((prog) => (
                    <span key={prog} className="category">
                      {prog}
                    </span>
                  ))}
                </div>
              )}

              {extractNames(relatedTargetDoc.tags).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  {extractNames(relatedTargetDoc.tags).map((tag) => (
                    <span key={tag} className="category">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Related Books ({relatedMatches.length})</span>
                </div>

                {relatedMatches.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#64748B' }}>
                    No related books matched by program badges or topic tags yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {relatedMatches.map(
                      ({ doc: rel, reason, isAdjacentCategoryMatch }) => (
                        <div
                          key={rel.id}
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '2px',
                            background: '#F8FAFC',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>
                              {rel.name}{' '}
                              <span
                                className="category"
                                style={{ marginLeft: '6px' }}
                              >
                                {rel.category || 'General'}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#475569',
                                marginTop: '2px',
                              }}
                            >
                              {reason}
                              {isAdjacentCategoryMatch
                                ? ' · Cross-category badge link'
                                : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setRelatedTargetDoc(rel)}
                          >
                            Inspect
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  void handleDownload(mapToRepositoryDocument(relatedTargetDoc))
                }
              >
                <Download size={13} />
                <span>Download</span>
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const target = relatedTargetDoc;
                  setRelatedTargetDoc(null);
                  void handlePreviewDoc(mapToRepositoryDocument(target));
                }}
              >
                <Eye size={13} />
                <span>Open PDF</span>
              </button>
            </footer>
          </section>
        </div>
      )}

      <DocumentPreviewModal
        document={previewDoc}
        onClose={closePreviewModal}
        onDownload={handleDownload}
        isLoading={Boolean(
          previewLoadingDocId && previewDoc?.docId === previewLoadingDocId
        )}
        isDownloading={Boolean(
          downloadingDocId && previewDoc?.docId === downloadingDocId
        )}
      />
    </div>
  );
};