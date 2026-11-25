// components/AsitBookLoader.tsx
'use client';

import React from 'react';

interface AsitBookLoaderProps {
  label?: string;
  size?: number;
  fullScreen?: boolean;
}

export function AsitBookLoader({
  label = 'Loading learning resources...',
  size = 112,
  fullScreen = false,
}: AsitBookLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 text-slate-900 backdrop-blur-sm'
          : 'flex flex-col items-center justify-center gap-3 py-8'
      }
    >
      <div className="asit-loader-stage" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 220 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="asit-loader-svg"
        >
          <ellipse cx="112" cy="196" rx="48" ry="7" className="asit-loader-shadow" />
          <path
            d="M174 52C176.5 84 173 123 155 154C140 179 118 190 109 192C96 187 72 171 57 144C41 115 41 78 46 53C48 44 55 39 64 38L84 35"
            stroke="#083358"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M126 112L168 88L168 144L126 164Z" fill="#083358" />
          <path d="M126 112C142 92 158 79 175 72C168 85 154 99 126 112Z" fill="#F5C400" />
          <path
            d="M126 112L126 164L83 148C74 123 64 100 54 81C79 87 104 97 126 112Z"
            fill="#0095DA"
            className="asit-page-blue"
          />
          <path
            d="M126 112C102 91 81 74 62 59C88 67 109 83 126 112Z"
            fill="#F5C400"
            className="asit-page-yellow"
          />
          <path
            d="M126 112C105 84 89 58 75 32C100 48 117 75 126 112Z"
            fill="#D92B2B"
            className="asit-page-red"
          />
        </svg>
      </div>
      {label && <p className="text-sm font-medium tracking-tight">{label}</p>}

      <style jsx>{`
        .asit-loader-svg {
          animation: asit-float 2.10s ease-in-out infinite;
        }
        .asit-page-red {
          transform-origin: 126px 112px;
          animation: asit-page-top 2.10s ease-in-out infinite;
        }
        .asit-page-yellow {
          transform-origin: 126px 112px;
          animation: asit-page-mid 2.10s ease-in-out infinite;
        }
        .asit-page-blue {
          transform-origin: 126px 112px;
          animation: asit-page-base 2.10s ease-in-out infinite;
        }
        .asit-loader-shadow {
          fill: rgba(8, 51, 88, 0.16);
          transform-origin: 112px 196px;
          animation: asit-shadow-pulse 2.10s ease-in-out infinite;
        }
        @keyframes asit-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes asit-page-top {
          0%, 100% { transform: rotate(0deg); }
          45% { transform: rotate(-9deg); }
        }
        @keyframes asit-page-mid {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg); }
        }
        @keyframes asit-page-base {
          0%, 100% { transform: rotate(0deg); }
          55% { transform: rotate(-3.5deg); }
        }
        @keyframes asit-shadow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(0.84); opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .asit-loader-svg,
          .asit-page-red,
          .asit-page-yellow,
          .asit-page-blue,
          .asit-loader-shadow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}