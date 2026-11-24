'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, BookMarked, FileUp, Loader2, Tag, X } from 'lucide-react';

export interface UploadPdfMetadata {
  file: File;
  name?: string;
  author?: string;
  category: string;
  programs: string[];
  tags: string[];
  description?: string;
}

type Props = {
  isOpen: boolean;
  categories: string[];
  availablePrograms?: string[];
  defaultCategory?: string;
  onClose: () => void;
  onSubmitUpload: (
    payload: UploadPdfMetadata
  ) => Promise<{ ok: boolean; error?: string }>;
};

const DEFAULT_PROGRAM_BADGES = [
  'Software Engineering',
  'Cyber Security',
  'Multimedia',
  'Networking',
  'Communication',
  'Foundation Studies',
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UploadPdfModal: React.FC<Props> = ({
  isOpen,
  categories,
  availablePrograms,
  defaultCategory = '',
  onClose,
  onSubmitUpload,
}) => {
  const programChoices = useMemoOrDefault(availablePrograms, DEFAULT_PROGRAM_BADGES);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [customProgramInput, setCustomProgramInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(
        categories.includes(defaultCategory)
          ? defaultCategory
          : categories[0] || ''
      );
      setErrorMsg('');
    }
  }, [isOpen, categories, defaultCategory]);

  if (!isOpen) return null;

  const toggleProgramBadge = (prog: string) => {
    setSelectedPrograms((prev) => {
      const exists = prev.some((p) => p.toLowerCase() === prog.toLowerCase());
      if (exists) {
        return prev.filter((p) => p.toLowerCase() !== prog.toLowerCase());
      }
      return [...prev, prog];
    });
  };

  const addCustomPrograms = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setSelectedPrograms((prev) => {
      const seen = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      parts.forEach((p) => {
        if (!seen.has(p.toLowerCase())) {
          seen.add(p.toLowerCase());
          next.push(p);
        }
      });
      return next;
    });
  };

  const commitTagsFromText = (raw: string) => {
    const pieces = raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (pieces.length === 0) return;

    setTags((prev) => {
      const next = new Set(prev);
      pieces.forEach((p) => next.add(p));
      return Array.from(next);
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagsFromText(tagInput);
      setTagInput('');
    }
  };

  const removeTag = (target: string) => {
    setTags((prev) => prev.filter((t) => t !== target));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!file) {
      setErrorMsg('Please select a PDF file before uploading.');
      return;
    }

    const finalTags = Array.from(
      new Set([
        ...tags,
        ...tagInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ])
    );

    const extraPrograms = customProgramInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const seenProg = new Set<string>();
    const finalPrograms: string[] = [];
    for (const p of [...selectedPrograms, ...extraPrograms]) {
      const key = p.toLowerCase();
      if (!seenProg.has(key)) {
        seenProg.add(key);
        finalPrograms.push(p);
      }
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitUpload({
        file,
        name: title.trim() || undefined,
        author: author.trim() || undefined,
        category,
        programs: finalPrograms,
        tags: finalTags,
        description: description.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Failed to upload PDF document.');
        return;
      }

      setTitle('');
      setAuthor('');
      setSelectedPrograms([]);
      setCustomProgramInput('');
      setTagInput('');
      setTags([]);
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch {
      setErrorMsg('A network error occurred while uploading the PDF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        className="repo-modal"
        style={{ width: 'min(640px, 100%)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-pdf-modal-title"
      >
        <header>
          <strong id="upload-pdf-modal-title">
            <FileUp size={15} aria-hidden="true" />
            OPEN LIBRARY · UPLOAD PDF &amp; DISCOVERY METADATA
          </strong>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close upload modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <small>DOCUMENT PUBLISHING</small>
          <h2>Upload PDF Resource</h2>
          <p>
            Attach category, informational program badges, and topic tags to power related-book recommendations.
          </p>

          {errorMsg && (
            <div role="alert" className="repo-alert-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form id="upload-pdf-metadata-form" onSubmit={handleSubmit} className="repo-form">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
              }}
            >
              <label className="repo-field">
                <span>Book / Document Title (Optional)</span>
                <input
                  type="text"
                  placeholder="Defaults to PDF filename if blank"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>

              <label className="repo-field">
                <span>Author (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. W. Stallings"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <label className="repo-field">
              <span>Primary Category (From Database)</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <div className="repo-field">
              <span>
                <BookMarked size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Program Badges (Informational only · does not restrict access)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {programChoices.map((prog) => {
                  const active = selectedPrograms.some(
                    (p) => p.toLowerCase() === prog.toLowerCase()
                  );
                  return (
                    <button
                      key={prog}
                      type="button"
                      className={active ? 'primary' : 'secondary'}
                      disabled={isSubmitting}
                      onClick={() => toggleProgramBadge(prog)}
                      style={{ minHeight: '26px', fontSize: '11px', padding: '0 8px' }}
                    >
                      {prog}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Additional program badge(s), comma-separated"
                value={customProgramInput}
                onChange={(e) => setCustomProgramInput(e.target.value)}
                onBlur={() => {
                  addCustomPrograms(customProgramInput);
                  setCustomProgramInput('');
                }}
                disabled={isSubmitting}
                style={{ marginTop: '8px' }}
              />
            </div>

            <label className="repo-field">
              <span>Recommendation Tags (Press Enter or comma to add)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={14} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="e.g. tcp-ip, firewalls, packet-analysis, exam-prep"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    commitTagsFromText(tagInput);
                    setTagInput('');
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="category"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        disabled={isSubmitting}
                        aria-label={`Remove tag ${tag}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'inherit',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>

            <label className="repo-field">
              <span>Summary / Notes (Optional)</span>
              <input
                type="text"
                placeholder="Brief summary for cross-program discovery"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="repo-field">
              <span>PDF File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                required
                disabled={isSubmitting}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {file && (
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Selected file: <strong>{file.name}</strong> ({formatBytes(file.size)})
              </div>
            )}
          </form>
        </div>

        <footer>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="upload-pdf-metadata-form"
            className="primary"
            disabled={isSubmitting || !file}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                <span>Uploading PDF...</span>
              </>
            ) : (
              <>
                <FileUp size={13} aria-hidden="true" />
                <span>Upload PDF</span>
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
};

function useMemoOrDefault(customList: string[] | undefined, fallback: string[]): string[] {
  if (Array.isArray(customList) && customList.length > 0) {
    return customList;
  }
  return fallback;
}