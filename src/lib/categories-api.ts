export interface CategoryRecord {
  id: string;
  name: string;
  slug?: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchCategoriesRequest(): Promise<{
  ok: boolean;
  categories?: CategoryRecord[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Failed to load categories.' };
    }
    const list = Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data)
      ? data
      : [];
    return { ok: true, categories: list };
  } catch {
    return { ok: false, error: 'Network error while fetching categories.' };
  }
}

export async function createCategoryRequest(payload: {
  name: string;
  description?: string;
}): Promise<{ ok: boolean; category?: CategoryRecord; error?: string }> {
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Failed to create category.' };
    }
    return { ok: true, category: data.category };
  } catch {
    return { ok: false, error: 'Network error while creating category.' };
  }
}

export async function updateCategoryRequest(
  id: string,
  payload: { name: string; description?: string }
): Promise<{ ok: boolean; category?: CategoryRecord; error?: string }> {
  try {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Failed to update category.' };
    }
    return { ok: true, category: data.category };
  } catch {
    return { ok: false, error: 'Network error while updating category.' };
  }
}

export async function deleteCategoryRequest(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Failed to delete category.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error while deleting category.' };
  }
}

export async function bulkDeleteCategoriesRequest(
  ids: string[]
): Promise<{ ok: boolean; deletedCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/categories/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Failed to bulk delete categories.' };
    }
    return { ok: true, deletedCount: data.deletedCount };
  } catch {
    return { ok: false, error: 'Network error while bulk deleting categories.' };
  }
}