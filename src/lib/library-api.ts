'use client';

export interface TagRecord {
  id: string;
  name: string;
  slug: string;
}

export interface ProgramRecord {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface DocumentRecord {
  id: string;
  name: string;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  category: string | null;
  categoryId?: string | null;
  programs?: Array<string | ProgramRecord>;
  tags?: Array<string | TagRecord>;
  createdAt: string;
  signedUrl?: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

function getClientUserHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('elibrary_current_user');
    if (!raw) return {};
    return {
      'x-elibrary-user': encodeURIComponent(raw),
    };
  } catch {
    return {};
  }
}

export async function fetchAuthorizedDocumentBlobUrl(
  url: string
): Promise<{ ok: boolean; blobUrl?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        ...getClientUserHeaders(),
      },
    });

    if (!res.ok) {
      let message = 'Please sign in to view or download this PDF.';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore non-JSON error body
      }
      return { ok: false, error: message };
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return { ok: true, blobUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to fetch document stream.',
    };
  }
}

export async function triggerAuthenticatedPdfDownload(
  signedUrl: string,
  downloadFilename = 'document.pdf'
): Promise<{ ok: boolean; error?: string }> {
  const separator = signedUrl.includes('?') ? '&' : '?';
  const downloadUrl = `${signedUrl}${separator}download=1`;

  const result = await fetchAuthorizedDocumentBlobUrl(downloadUrl);
  if (!result.ok || !result.blobUrl) {
    return { ok: false, error: result.error || 'Failed to download PDF.' };
  }

  const link = document.createElement('a');
  link.href = result.blobUrl;
  link.download = downloadFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(result.blobUrl!);
  }, 60_000);

  return { ok: true };
}


export async function fetchMyDocumentsRequest(filters?: {
  category?: string;
  program?: string;
  q?: string;
}): Promise<{
  ok: boolean;
  documents?: DocumentRecord[];
  error?: string;
}> {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== 'ALL') {
    params.set('category', filters.category);
  }
  if (filters?.program && filters.program !== 'ALL') {
    params.set('program', filters.program);
  }
  if (filters?.q?.trim()) {
    params.set('q', filters.q.trim());
  }
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`/api/documents/mine${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: {
      ...getClientUserHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to load your posted books.' };
  }

  return { ok: true, documents: data.documents };
}

export async function fetchDocumentsRequest(filters?: {
  category?: string;
  program?: string;
  q?: string;
}): Promise<{
  ok: boolean;
  documents?: DocumentRecord[];
  error?: string;
}> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.program) params.set('program', filters.program);
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`/api/documents${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: {
      ...getClientUserHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to load documents.' };
  }
  return { ok: true, documents: data.documents };
}

export async function uploadDocumentRequest(payload: {
  file: File;
  name?: string;
  author?: string;
  description?: string;
  category?: string;
  programs?: string[];
  tags?: string[];
}): Promise<{
  ok: boolean;
  document?: DocumentRecord;
  error?: string;
}> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.author) formData.append('author', payload.author);
  if (payload.description) formData.append('description', payload.description);
  if (payload.category) formData.append('category', payload.category);
  if (payload.programs && payload.programs.length > 0) {
    formData.append('programs', JSON.stringify(payload.programs));
  }
  if (payload.tags && payload.tags.length > 0) {
    formData.append('tags', JSON.stringify(payload.tags));
  }

  const res = await fetch('/api/documents', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...getClientUserHeaders(),
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to upload document.' };
  }
  return { ok: true, document: data.document };
}

export async function updateDocumentRequest(
  id: string,
  payload: {
    name?: string;
    author?: string | null;
    description?: string | null;
    category?: string | null;
    programs?: string[];
    tags?: string[];
  }
): Promise<{
  ok: boolean;
  document?: DocumentRecord;
  error?: string;
}> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getClientUserHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update document.' };
  }
  return { ok: true, document: data.document };
}

export async function deleteDocumentRequest(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      ...getClientUserHeaders(),
    },
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to delete document.' };
  }
  return { ok: true };
}