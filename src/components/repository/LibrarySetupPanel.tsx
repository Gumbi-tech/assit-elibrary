'use client';

import React, { useEffect, useState } from 'react';
import {
  createCourseRequest,
  createDepartmentRequest,
  fetchCoursesRequest,
  fetchDepartmentsRequest,
  fetchDocumentsRequest,
  uploadDocumentRequest,
  type CourseRecord,
  type DepartmentRecord,
  type DocumentRecord,
} from '@/lib/library-api';

export default function LibrarySetupPanel({
  currentUserId,
}: {
  currentUserId?: string;
}) {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Department form state
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseDeptId, setCourseDeptId] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Document upload form state
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Lecture Notes');
  const [docDeptId, setDocDeptId] = useState('');
  const [docCourseId, setDocCourseId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function refreshAll() {
    const [deptRes, courseRes, docRes] = await Promise.all([
      fetchDepartmentsRequest(),
      fetchCoursesRequest(),
      fetchDocumentsRequest(),
    ]);
    if (deptRes.ok && deptRes.departments) {
      setDepartments(deptRes.departments);
      if (!courseDeptId && deptRes.departments[0]) {
        setCourseDeptId(deptRes.departments[0].id);
      }
    }
    if (courseRes.ok && courseRes.courses) {
      setCourses(courseRes.courses);
    }
    if (docRes.ok && docRes.documents) {
      setDocuments(docRes.documents);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const res = await createDepartmentRequest({
      name: deptName,
      code: deptCode || undefined,
      description: deptDesc || undefined,
    });

    if (!res.ok || !res.department) {
      setErrorMessage(res.error || 'Could not create department.');
      return;
    }

    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setCourseDeptId(res.department.id);
    setStatusMessage(`Department "${res.department.name}" created.`);
    await refreshAll();
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const res = await createCourseRequest({
      title: courseTitle,
      code: courseCode,
      departmentId: courseDeptId,
      credits: courseCredits,
      description: courseDesc || undefined,
    });

    if (!res.ok || !res.course) {
      setErrorMessage(res.error || 'Could not create course.');
      return;
    }

    setCourseTitle('');
    setCourseCode('');
    setCourseDesc('');
    setStatusMessage(`Course "${res.course.code} - ${res.course.title}" created.`);
    await refreshAll();
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please choose a file before uploading.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadDocumentRequest({
        file: selectedFile,
        name: docName || undefined,
        category: docCategory || undefined,
        departmentId: docDeptId || undefined,
        courseId: docCourseId || undefined,
        uploadedById: currentUserId,
      });

      if (!res.ok || !res.document) {
        setErrorMessage(res.error || 'Document upload failed.');
        return;
      }

      setDocName('');
      setSelectedFile(null);
      setStatusMessage(`Uploaded "${res.document.name}".`);
      await refreshAll();
    } finally {
      setIsUploading(false);
    }
  }

  const filteredCourses = docDeptId
    ? courses.filter((c) => c.departmentId === docDeptId)
    : courses;

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {statusMessage && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Create Department */}
      <form onSubmit={handleCreateDepartment} className="space-y-3 rounded border p-4">
        <h2 className="text-lg font-semibold">Create Department</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Department Name (e.g. Computer Science)"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            required
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Code (e.g. CS)"
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={deptDesc}
          onChange={(e) => setDeptDesc(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm"
        >
          Save Department
        </button>
      </form>

      {/* Create Course */}
      <form onSubmit={handleCreateCourse} className="space-y-3 rounded border p-4">
        <h2 className="text-lg font-semibold">Create Course</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={courseDeptId}
            onChange={(e) => setCourseDeptId(e.target.value)}
            required
            className="border rounded px-3 py-2"
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.code ? `(${d.code})` : ''}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Course Code (e.g. CS101)"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            required
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={courseCredits}
            onChange={(e) => setCourseCredits(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>
        <input
          type="text"
          placeholder="Course Title (e.g. Introduction to Algorithms)"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={courseDesc}
          onChange={(e) => setCourseDesc(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm"
        >
          Save Course
        </button>
      </form>

      {/* Upload Document */}
      <form onSubmit={handleUploadDocument} className="space-y-3 rounded border p-4">
        <h2 className="text-lg font-semibold">Upload Document</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Document Title (defaults to filename)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Category (e.g. Syllabus, Past Paper)"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            value={docDeptId}
            onChange={(e) => {
              setDocDeptId(e.target.value);
              setDocCourseId('');
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">Department (optional)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={docCourseId}
            onChange={(e) => setDocCourseId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Course (optional)</option>
            {filteredCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xlsx"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          required
          className="block w-full text-sm"
        />
        <button
          type="submit"
          disabled={isUploading}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>

      {/* Quick Verification List */}
      <div className="rounded border p-4 space-y-2">
        <h3 className="font-semibold">
          Recent Documents ({documents.length}) — Courses ({courses.length}) — Departments ({departments.length})
        </h3>
        <ul className="divide-y text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="py-2 flex justify-between gap-4">
              <span>
                <strong>{doc.name}</strong> ({doc.mimeType}, {Math.round(doc.size / 1024)} KB)
              </span>
              <span className="text-slate-600">
                {doc.course?.code ? `${doc.course.code} • ` : ''}
                {doc.department?.name ?? 'General'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}