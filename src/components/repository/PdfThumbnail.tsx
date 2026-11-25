'use client';

import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

export interface PdfThumbnailProps {
  fileUrl?: string | null;
  coverUrl?: string | null;
  title: string;
  department?: string;
  className?: string;
}

export default function PdfThumbnail({
  coverUrl,
  title,
  department = 'Course Material',
  className = '',
}: PdfThumbnailProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [coverUrl]);

  if (!coverUrl || imgFailed) {
    return (
      <div
        className={`flex h-full w-full flex-col justify-between bg-slate-900 p-3 text-white select-none ${className}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-[11px] font-medium text-slate-300">
            {department || 'Course Material'}
          </span>
          <FileText
            size={16}
            className="shrink-0 text-slate-300"
            aria-hidden="true"
          />
        </div>

        <div className="line-clamp-4 text-xs font-semibold leading-snug">
          {title}
        </div>

        <span className="text-[10px] text-slate-400">PDF Document</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        padding: '0px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      className={`select-none ${className}`}
    >
      <img
        src={coverUrl}
        alt={`${title} - Cover`}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top center',
          display: 'block',
        }}
      />
    </div>
  );
}