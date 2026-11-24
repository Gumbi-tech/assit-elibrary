'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  BookOpen,
  FolderKanban,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import {
  AdminCategoriesSection,
  type LibraryCategoryItem,
} from './AdminCategoriesSection';
import { AdminLibrarySection } from './AdminLibrarySection';
import { AdminUsersSection } from './AdminUsersSection';

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

type AdminTab = 'users' | 'categories' | 'library';

export const AdminDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { users, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [headerSearch, setHeaderSearch] = useState('');
  const [docCount, setDocCount] = useState<number>(0);

  // Signals to trigger on-demand modals from PortalHeader
  const [openCategorySignal, setOpenCategorySignal] = useState(0);
  const [openUploadSignal, setOpenUploadSignal] = useState(0);
  const [openUserSignal, setOpenUserSignal] = useState(0);

  // Categories loaded from database API
  const [categories, setCategories] = useState<LibraryCategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (!res.ok) {
        notify('error', 'Failed to load categories from database.');
        return;
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.categories)
        ? data.categories
        : [];

      const normalized: LibraryCategoryItem[] = rawList.map(
        (item: { id?: string; name: string; slug?: string; description?: string | null }, idx: number) => ({
          id: item.id || `cat-${idx}`,
          name: item.name,
          slug: item.slug,
          description: item.description || `Open library resources in ${item.name}.`,
        })
      );
      setCategories(normalized);
    } catch {
      notify('error', 'Network error while loading categories from database.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = useCallback(
    async (name: string, description: string): Promise<{ ok: boolean; error?: string }> => {
      if (!name) return { ok: false, error: 'Category name is required.' };
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `Open library resources in ${name}.`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Failed to save category to database.' };
        }
        await loadCategories();
        notify('success', `Created category "${name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while creating category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleUpdateCategory = useCallback(
    async (
      id: string,
      name: string,
      description: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!name) return { ok: false, error: 'Category name is required.' };
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `Open library resources in ${name}.`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Failed to update category.' };
        }
        await loadCategories();
        notify('success', `Updated category to "${name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while updating category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleDeleteCategory = useCallback(
    async (item: LibraryCategoryItem): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Failed to delete category.' };
        }
        await loadCategories();
        notify('success', `Deleted category "${item.name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while deleting category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleBulkDeleteCategories = useCallback(
    async (items: LibraryCategoryItem[]): Promise<{ ok: boolean; error?: string }> => {
      if (items.length === 0) return { ok: false, error: 'No categories selected.' };
      try {
        // Supports either a bulk endpoint or individual DELETE calls
        const bulkRes = await fetch('/api/categories/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: items.map((i) => i.id) }),
        });

        if (!bulkRes.ok && bulkRes.status === 404) {
          for (const item of items) {
            const singleRes = await fetch(
              `/api/categories/${encodeURIComponent(item.id)}`,
              { method: 'DELETE' }
            );
            if (!singleRes.ok) {
              const errData = await singleRes.json().catch(() => ({}));
              return {
                ok: false,
                error: errData?.error || `Failed to delete "${item.name}".`,
              };
            }
          }
        } else if (!bulkRes.ok) {
          const errData = await bulkRes.json().catch(() => ({}));
          return { ok: false, error: errData?.error || 'Bulk delete failed.' };
        }

        await loadCategories();
        notify('success', `Deleted ${items.length} selected category(ies).`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while deleting selected categories.' };
      }
    },
    [loadCategories, notify]
  );

  const dbCategoryNames = useMemo(() => categories.map((c) => c.name), [categories]);
  const activeUsersCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName="Open Library Administration"
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          onSearch?.(q);
          setHeaderSearch(q);
        }}
        onLogout={onLogout || logout}
        onNewItem={() => {
          if (activeTab === 'categories') {
            setOpenCategorySignal((n) => n + 1);
          } else if (activeTab === 'library') {
            setOpenUploadSignal((n) => n + 1);
          } else {
            setOpenUserSignal((n) => n + 1);
          }
        }}
        onSettings={onNavigateHome}
      />

      <main className="repo-main" style={{ marginTop: '20px' }}>
        <div
          className="repo-content"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div className="repo-heading">
            <div>
              <small>OPEN ACCESS CONTROL CENTER</small>
              <h2>Library &amp; Directory Administration</h2>
              <p>
                Switch between users, database categories, and open-library PDF uploads.
              </p>
            </div>
            <div className="repo-heading-right">
              <div className="repo-count">
                <strong>{categories.length}</strong>
                <span>CATEGORIES</span>
              </div>
              <div className="repo-count">
                <strong>
                  {activeUsersCount}/{users.length}
                </strong>
                <span>ACTIVE USERS</span>
              </div>
            </div>
          </div>

          {/* Workspace Mode Switcher */}
          <div
            role="tablist"
            aria-label="Admin workspace views"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '2px',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'users'}
              className={activeTab === 'users' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('users')}
            >
              <Users size={14} aria-hidden="true" />
              <span>Users ({users.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'categories'}
              className={activeTab === 'categories' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('categories')}
            >
              <FolderKanban size={14} aria-hidden="true" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'library'}
              className={activeTab === 'library' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('library')}
            >
              <BookOpen size={14} aria-hidden="true" />
              <span>Library Content ({docCount})</span>
            </button>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '10px 12px',
                fontSize: '11px',
                borderRadius: '2px',
                border:
                  feedback.type === 'error'
                    ? '1px solid #FCA5A5'
                    : '1px solid #B7D8C4',
                background:
                  feedback.type === 'error' ? '#FEF2F2' : '#F0F8F3',
                color:
                  feedback.type === 'error' ? '#991B1B' : '#1E4620',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {feedback.type === 'error' ? (
                  <AlertCircle size={15} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={15} aria-hidden="true" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {activeTab === 'users' && (
            <AdminUsersSection
              externalSearch={headerSearch}
              onNotify={notify}
              openCreateSignal={openUserSignal}
            />
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesSection
              categories={categories}
              isLoading={isLoadingCategories}
              onRefreshCategories={loadCategories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onBulkDeleteCategories={handleBulkDeleteCategories}
              openCreateSignal={openCategorySignal}
            />
          )}

          {activeTab === 'library' && (
            <AdminLibrarySection
              dbCategories={dbCategoryNames}
              isLoadingCategories={isLoadingCategories}
              externalSearch={headerSearch}
              onNotify={notify}
              onDocumentsLoaded={(docs) => setDocCount(docs.length)}
              openUploadSignal={openUploadSignal}
            />
          )}
        </div>
      </main>
    </div>
  );
};