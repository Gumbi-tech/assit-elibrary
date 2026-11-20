'use client';

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  code: string;
  description: string | null;
  credits: number;
  departmentId: string;
  department?: { id: string; name: string; code: string | null };
}

// export interface DocumentRecord {
//   id: string;
//   name: string;
//   filename: string;
//   path: string;
//   size: number;
//   mimeType: string;
//   category: string | null;
//   courseId: string | null;
//   departmentId: string | null;
//   createdAt: string;
//   course?: { id: string; title: string; code: string } | null;
//   department?: { id: string; name: string; code: string | null } | null;
// }


export interface DocumentRecord {
  id: string;
  name: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  category: string | null;
  courseId: string | null;
  departmentId: string | null;
  createdAt: string;
  course?: {
    id: string;
    title: string;
    code: string;
    departmentId?: string;
  } | null;
  department?: { id: string; name: string; code: string | null } | null;
}

export async function fetchDepartmentsRequest(): Promise<{
  ok: boolean;
  departments?: DepartmentRecord[];
  error?: string;
}> {
  const res = await fetch('/api/departments', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to load departments.' };
  }
  return { ok: true, departments: data.departments };
}

export async function createDepartmentRequest(payload: {
  name: string;
  code?: string;
  description?: string;
}): Promise<{
  ok: boolean;
  department?: DepartmentRecord;
  error?: string;
}> {
  const res = await fetch('/api/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to create department.' };
  }
  return { ok: true, department: data.department };
}

export async function updateDepartmentRequest(
  id: string,
  payload: {
    name?: string;
    code?: string | null;
    description?: string | null;
  }
): Promise<{
  ok: boolean;
  department?: DepartmentRecord;
  error?: string;
}> {
  const res = await fetch(`/api/departments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update department.' };
  }
  return { ok: true, department: data.department };
}

export async function deleteDepartmentRequest(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch(`/api/departments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to delete department.' };
  }
  return { ok: true };
}

export async function fetchCoursesRequest(departmentId?: string): Promise<{
  ok: boolean;
  courses?: CourseRecord[];
  error?: string;
}> {
  const query = departmentId
    ? `?departmentId=${encodeURIComponent(departmentId)}`
    : '';
  const res = await fetch(`/api/courses${query}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to load courses.' };
  }
  return { ok: true, courses: data.courses };
}

export async function createCourseRequest(payload: {
  title: string;
  code: string;
  departmentId: string;
  credits?: number;
  description?: string;
}): Promise<{
  ok: boolean;
  course?: CourseRecord;
  error?: string;
}> {
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to create course.' };
  }
  return { ok: true, course: data.course };
}

export async function updateCourseRequest(
  id: string,
  payload: {
    title?: string;
    code?: string;
    departmentId?: string;
    credits?: number;
    description?: string | null;
  }
): Promise<{
  ok: boolean;
  course?: CourseRecord;
  error?: string;
}> {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update course.' };
  }
  return { ok: true, course: data.course };
}

export async function deleteCourseRequest(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to delete course.' };
  }
  return { ok: true };
}




export async function updateDocumentRequest(
  id: string,
  payload: {
    name?: string;
    category?: string | null;
    courseId?: string | null;
    departmentId?: string | null;
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


//-------------------------------------------------
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
      let message = 'Unauthorized or failed to load document.';
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

export async function fetchDocumentsRequest(filters?: {
  courseId?: string;
  departmentId?: string;
}): Promise<{
  ok: boolean;
  documents?: DocumentRecord[];
  error?: string;
}> {
  const params = new URLSearchParams();
  if (filters?.courseId) params.set('courseId', filters.courseId);
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);
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
  category?: string;
  departmentId?: string;
  courseId?: string;
  uploadedById?: string;
}): Promise<{
  ok: boolean;
  document?: DocumentRecord;
  error?: string;
}> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.category) formData.append('category', payload.category);
  if (payload.departmentId) formData.append('departmentId', payload.departmentId);
  if (payload.courseId) formData.append('courseId', payload.courseId);
  if (payload.uploadedById) formData.append('uploadedById', payload.uploadedById);

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

//-----------------------------------

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