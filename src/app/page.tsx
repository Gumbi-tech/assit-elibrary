'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CloudDownload,
  FileText,
  GraduationCap,
  Library,
  LockKeyhole,
  Monitor,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Users,
  X,
} from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LibraryProvider } from '@/context/LibraryContext';

import { LoginScreen } from '@/components/repository/LoginScreen';
import { AdminDashboard } from '@/components/repository/AdminDashboard';
import { InstructorDashboard } from '@/components/repository/InstructorDashboard';
import { StudentLibrary } from '@/components/repository/StudentLibrary';
import RepositoryFooter from '@/components/repository/RepositoryFooter';
import { ForceChangePasswordModal } from '@/components/repository/ForceChangePasswordModal';

/* -------------------------------------------------------------------------- */
/*                         ASIT LOGO BRAND PALETTE & STYLES                   */
/* -------------------------------------------------------------------------- */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap');

.asit-front-door,
.asit-front-door *,
.asit-login-back,
.asit-login-back * {
  box-sizing: border-box;
}

.asit-front-door {
  --asit-navy: #083358;
  --asit-navy-deep: #05223B;
  --asit-sky: #0095DA;
  --asit-sky-soft: #E8F6FD;
  --asit-gold: #F5C400;
  --asit-red: #D92B2B;
  --asit-ink: #122235;
  --asit-muted: #5A6B7F;
  --asit-line: #DCE4EE;
  --asit-surface: #FFFFFF;
  --asit-page: #F4F7FA;

  min-height: 100vh;
  color: var(--asit-ink);
  background: var(--asit-page);
  font-family: 'DM Sans', sans-serif;
}

.asit-front-door button,
.asit-login-back button {
  font: inherit;
}

.asit-front-door a {
  color: inherit;
  text-decoration: none;
}

.asit-front-door button:focus-visible,
.asit-front-door a:focus-visible,
.asit-login-back button:focus-visible {
  outline: 2px solid var(--asit-sky);
  outline-offset: 2px;
}

.asit-container {
  width: min(1160px, calc(100% - 48px));
  margin: 0 auto;
}

/* Header */

.asit-header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 78px;
  background: var(--asit-surface);
  border-bottom: 1px solid var(--asit-line);
}

.asit-header-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.asit-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asit-brand-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
  border-radius: 6px;
}

.asit-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asit-brand-name {
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: var(--asit-navy);
}

.asit-brand-subtitle {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
  color: var(--asit-muted);
  text-transform: uppercase;
}

.asit-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.asit-nav a {
  font-size: 13px;
  font-weight: 600;
  color: var(--asit-muted);
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.asit-nav a:hover {
  color: var(--asit-navy);
  border-bottom-color: var(--asit-sky);
}

.asit-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asit-login-link {
  padding: 9px 14px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--asit-navy);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.asit-login-link:hover {
  background: var(--asit-page);
}

.asit-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid var(--asit-navy);
  border-radius: 6px;
  color: #FFFFFF;
  background: var(--asit-navy);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.asit-primary-button:hover {
  background: var(--asit-navy-deep);
  border-color: var(--asit-navy-deep);
}

.asit-button-small {
  min-height: 38px;
  padding: 0 15px;
  font-size: 12px;
}

.asit-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--asit-line);
  border-radius: 6px;
  color: var(--asit-navy);
  background: var(--asit-surface);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.asit-secondary-button:hover {
  border-color: var(--asit-sky);
  background: var(--asit-sky-soft);
}

/* Hero (Single-column focused header block) */

.asit-hero {
  padding: 64px 0 52px;
  background: var(--asit-surface);
  border-bottom: 1px solid var(--asit-line);
}

.asit-hero-inner {
  max-width: 720px;
}

.asit-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  margin-bottom: 20px;
  border: 1px solid #C5E8FA;
  border-left: 3px solid var(--asit-red);
  border-radius: 4px;
  background: var(--asit-sky-soft);
  color: var(--asit-navy);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}

.asit-hero h1 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(38px, 4.8vw, 56px);
  line-height: 1.1;
  letter-spacing: -1.6px;
  font-weight: 800;
  color: var(--asit-navy);
}

.asit-hero h1 span {
  color: var(--asit-sky);
}

.asit-hero-description {
  max-width: 580px;
  margin: 20px 0 26px;
  color: var(--asit-muted);
  font-size: 15px;
  line-height: 1.75;
}

.asit-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.asit-trust-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  color: var(--asit-muted);
  font-size: 12px;
  font-weight: 600;
}

.asit-trust-line svg {
  color: var(--asit-sky);
  flex-shrink: 0;
}

/* Repositioned Display Showcase Band (below hero) */

.asit-showcase-band {
  padding: 44px 0;
  background: var(--asit-page);
  border-bottom: 1px solid var(--asit-line);
}

.asit-preview-window {
  overflow: hidden;
  border: 1px solid var(--asit-line);
  border-top: 3px solid var(--asit-gold);
  border-radius: 8px;
  background: var(--asit-surface);
}

.asit-preview-topbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--asit-line);
  background: var(--asit-surface);
}

.asit-preview-dots {
  display: flex;
  gap: 6px;
}

.asit-preview-dots i:nth-child(1) {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--asit-red);
}

.asit-preview-dots i:nth-child(2) {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--asit-gold);
}

.asit-preview-dots i:nth-child(3) {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--asit-sky);
}

.asit-preview-label {
  color: var(--asit-navy);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}

.asit-preview-image-wrap {
  background: #EDF2F7;
}

.asit-preview-image {
  display: block;
  width: 100%;
  max-height: 460px;
  object-fit: cover;
  object-position: top center;
}

.asit-preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-top: 1px solid var(--asit-line);
  background: var(--asit-surface);
}

.asit-preview-footer strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--asit-navy);
  font-size: 13px;
  font-weight: 700;
}

.asit-preview-footer strong svg {
  color: var(--asit-sky);
}

.asit-preview-footer span {
  color: var(--asit-muted);
  font-size: 12px;
}

/* Stats */

.asit-stats {
  padding: 28px 0;
  border-bottom: 1px solid var(--asit-line);
  background: var(--asit-surface);
}

.asit-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.asit-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--asit-line);
  border-radius: 6px;
  background: var(--asit-page);
}

.asit-stat-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 6px;
  color: var(--asit-navy);
  background: var(--asit-sky-soft);
}

.asit-stat strong {
  display: block;
  color: var(--asit-navy);
  font-size: 13px;
  font-weight: 700;
}

.asit-stat span {
  display: block;
  margin-top: 2px;
  color: var(--asit-muted);
  font-size: 11px;
}

/* Sections */

.asit-section {
  padding: 76px 0;
}

.asit-section-white {
  background: var(--asit-surface);
  border-bottom: 1px solid var(--asit-line);
}

.asit-section-heading {
  max-width: 620px;
  margin: 0 0 40px;
}

.asit-section-kicker {
  display: block;
  margin-bottom: 8px;
  color: var(--asit-sky);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.asit-section-heading h2 {
  margin: 0;
  color: var(--asit-navy);
  font-family: 'Manrope', sans-serif;
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.9px;
  line-height: 1.2;
}

.asit-section-heading p {
  margin: 12px 0 0;
  color: var(--asit-muted);
  font-size: 14px;
  line-height: 1.75;
}

/* Feature grid */

.asit-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.asit-feature-card {
  padding: 24px;
  border: 1px solid var(--asit-line);
  border-radius: 6px;
  background: var(--asit-surface);
  transition: border-color 0.15s ease;
}

.asit-feature-card:hover {
  border-color: var(--asit-sky);
}

.asit-feature-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border-radius: 6px;
  color: var(--asit-navy);
  background: var(--asit-sky-soft);
}

.asit-feature-card h3 {
  margin: 0 0 8px;
  color: var(--asit-navy);
  font-size: 15px;
  font-weight: 700;
}

.asit-feature-card p {
  margin: 0;
  color: var(--asit-muted);
  font-size: 13px;
  line-height: 1.65;
}

/* Role cards */

.asit-role-section {
  background: var(--asit-page);
  border-bottom: 1px solid var(--asit-line);
}

.asit-role-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.asit-role-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border: 1px solid var(--asit-line);
  border-top: 3px solid var(--asit-navy);
  border-radius: 6px;
  background: var(--asit-surface);
}

.asit-role-card:nth-child(2) {
  border-top-color: var(--asit-sky);
}

.asit-role-card:nth-child(3) {
  border-top-color: var(--asit-red);
}

.asit-role-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.asit-role-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--asit-navy);
  background: var(--asit-sky-soft);
}

.asit-role-number {
  color: #94A3B8;
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
}

.asit-role-card h3 {
  margin: 0 0 8px;
  color: var(--asit-navy);
  font-size: 16px;
  font-weight: 700;
}

.asit-role-card p {
  margin: 0 0 18px;
  color: var(--asit-muted);
  font-size: 13px;
  line-height: 1.65;
  flex: 1;
}

.asit-role-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--asit-navy);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.asit-role-link:hover {
  color: var(--asit-sky);
}

/* Device section */

.asit-device-section {
  padding: 72px 0;
  background: var(--asit-surface);
  border-bottom: 1px solid var(--asit-line);
}

.asit-device-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
}

.asit-device-copy h2 {
  margin: 0;
  color: var(--asit-navy);
  font-family: 'Manrope', sans-serif;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: -0.8px;
}

.asit-device-copy p {
  margin: 14px 0 20px;
  color: var(--asit-muted);
  font-size: 14px;
  line-height: 1.75;
}

.asit-device-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.asit-device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--asit-navy);
  font-size: 13px;
  font-weight: 600;
}

.asit-device-item svg {
  color: var(--asit-sky);
}

.asit-device-visual {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 28px;
  border: 1px solid var(--asit-line);
  border-radius: 8px;
  background: var(--asit-page);
}

.asit-device {
  display: grid;
  place-items: center;
  color: var(--asit-navy);
}

.asit-device:nth-child(2) {
  color: var(--asit-sky);
}

/* Help panel */

.asit-help-section {
  padding: 64px 0;
  background: var(--asit-page);
}

.asit-help-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px 36px;
  border: 1px solid var(--asit-line);
  border-left: 4px solid var(--asit-gold);
  border-radius: 6px;
  background: var(--asit-surface);
}

.asit-help-copy span {
  display: block;
  margin-bottom: 6px;
  color: var(--asit-sky);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.asit-help-copy h2 {
  margin: 0;
  color: var(--asit-navy);
  font-family: 'Manrope', sans-serif;
  font-size: 23px;
  letter-spacing: -0.5px;
}

.asit-help-copy p {
  margin: 6px 0 0;
  color: var(--asit-muted);
  font-size: 13px;
}

/* Footer */

.asit-footer {
  padding: 24px 0;
  border-top: 1px solid var(--asit-line);
  background: var(--asit-surface);
}

.asit-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.asit-footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asit-footer-brand img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.asit-footer-brand strong {
  color: var(--asit-navy);
  font-size: 12px;
  font-weight: 700;
}

.asit-footer-note {
  color: var(--asit-muted);
  font-size: 11px;
}

/* Login wrapper */

.asit-login-back {
  min-height: 100vh;
  padding: 24px;
  background: var(--asit-page);
  font-family: 'DM Sans', sans-serif;
}

.asit-login-back-header {
  width: min(1100px, 100%);
  margin: 0 auto 20px;
}

.asit-back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--asit-line);
  border-radius: 6px;
  color: var(--asit-navy);
  background: var(--asit-surface);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.asit-back-button:hover {
  background: var(--asit-page);
}

.asit-login-content {
  width: min(1100px, 100%);
  min-height: 540px;
  margin: 0 auto;
  padding: 24px;
  border: 1px solid var(--asit-line);
  border-radius: 8px;
  background: var(--asit-surface);
}

/* Responsive */

@media (max-width: 900px) {
  .asit-nav {
    gap: 18px;
  }

  .asit-device-layout {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .asit-feature-grid,
  .asit-role-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .asit-container {
    width: calc(100% - 32px);
  }

  .asit-header {
    height: 68px;
  }

  .asit-nav,
  .asit-login-link {
    display: none;
  }

  .asit-hero {
    padding: 44px 0 40px;
  }

  .asit-hero h1 {
    font-size: 36px;
    letter-spacing: -1px;
  }

  .asit-showcase-band {
    padding: 28px 0;
  }

  .asit-preview-image {
    max-height: 280px;
  }

  .asit-preview-footer,
  .asit-help-panel,
  .asit-footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .asit-stats-grid,
  .asit-feature-grid,
  .asit-role-grid {
    grid-template-columns: 1fr;
  }

  .asit-help-panel {
    padding: 24px;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*                              PUBLIC LANDING PAGE                           */
/* -------------------------------------------------------------------------- */

function FrontDoor({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="asit-front-door">
      <style>{styles}</style>

      <header className="asit-header">
        <div className="asit-container asit-header-inner">
          <a className="asit-brand" href="#home" aria-label="ASIT eLibrary home">
            <img
              className="asit-brand-logo"
              src="/asit-logo.png"
              alt="Advanced School of Information Technology logo"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <div className="asit-brand-copy">
              <span className="asit-brand-name">ASIT eLibrary</span>
              <span className="asit-brand-subtitle">Digital Learning Repository</span>
            </div>
          </a>

          <nav className="asit-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#access">Access</a>
            <a href="#support">Support</a>
          </nav>

          <div className="asit-header-actions">
            <button type="button" className="asit-login-link" onClick={onLogin}>
              Sign in
            </button>
            <button
              type="button"
              className="asit-primary-button asit-button-small"
              onClick={onLogin}
            >
              Access Library <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <section className="asit-hero" id="home">
        <div className="asit-container">
          <div className="asit-hero-inner">
            <div className="asit-eyebrow">
              <LockKeyhole size={12} />
              Academic resources, organised
            </div>

            <h1>
              Your learning resources.
              <br />
              <span>One library.</span>
            </h1>

            <p className="asit-hero-description">
              Access course materials, learning documents and academic resources
              through one organised digital library built to support teaching
              and learning at ASIT.
            </p>

            <div className="asit-hero-actions">
              <button type="button" className="asit-primary-button" onClick={onLogin}>
                Enter the Library <ArrowRight size={16} />
              </button>

              <a className="asit-secondary-button" href="#features">
                Explore the platform <ChevronRight size={15} />
              </a>
            </div>

            <div className="asit-trust-line">
              <ShieldCheck size={16} />
              <span>Organised academic resources for the ASIT community</span>
            </div>
          </div>
        </div>
      </section>

      <section className="asit-showcase-band" aria-label="Library display preview">
        <div className="asit-container">
          <div className="asit-preview-window">
            <div className="asit-preview-topbar">
              <div className="asit-preview-dots">
                <i />
                <i />
                <i />
              </div>
              <span className="asit-preview-label">ASIT Digital Library Preview</span>
              <span style={{ width: 32 }} />
            </div>

            <div className="asit-preview-image-wrap">
              <img
                className="asit-preview-image"
                src="/asit-elibrary-content-display.png"
                alt="Preview of the ASIT eLibrary interface"
              />
            </div>

            <div className="asit-preview-footer">
              <strong>
                <BookOpen size={15} />
                Digital learning resources in one place
              </strong>
              <span>Browse, preview and download course documents from a single workspace</span>
            </div>
          </div>
        </div>
      </section>

      <section className="asit-stats" aria-label="Platform highlights">
        <div className="asit-container asit-stats-grid">
          <div className="asit-stat">
            <div className="asit-stat-icon"><Library size={18} /></div>
            <div>
              <strong>Centralised library</strong>
              <span>Learning resources in one location</span>
            </div>
          </div>

          <div className="asit-stat">
            <div className="asit-stat-icon"><Users size={18} /></div>
            <div>
              <strong>Role-based access</strong>
              <span>Access designed around your role</span>
            </div>
          </div>

          <div className="asit-stat">
            <div className="asit-stat-icon"><ShieldCheck size={18} /></div>
            <div>
              <strong>Managed resources</strong>
              <span>Structured and controlled access</span>
            </div>
          </div>
        </div>
      </section>

      <section className="asit-section asit-section-white" id="features">
        <div className="asit-container">
          <div className="asit-section-heading">
            <span className="asit-section-kicker">A better way to access materials</span>
            <h2>Everything you need to support learning</h2>
            <p>
              A structured digital environment that makes academic resources
              easier to organise, discover and use.
            </p>
          </div>

          <div className="asit-feature-grid">
            <article className="asit-feature-card">
              <div className="asit-feature-icon"><Search size={20} /></div>
              <h3>Find resources easily</h3>
              <p>
                Browse learning materials in an organised library and locate
                relevant documents without searching through scattered files.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><FileText size={20} /></div>
              <h3>Access learning documents</h3>
              <p>
                View available course materials and supporting documents from
                a central digital repository.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><CloudDownload size={20} /></div>
              <h3>Download materials</h3>
              <p>
                Access permitted learning resources and keep the documents
                you need available for your studies.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><GraduationCap size={20} /></div>
              <h3>Course-focused content</h3>
              <p>
                Resources are arranged to make relevant academic materials
                easier to identify and access.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><LockKeyhole size={20} /></div>
              <h3>Controlled access</h3>
              <p>
                User access is managed according to assigned roles and
                permissions within the institution.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><CheckCircle2 size={20} /></div>
              <h3>Managed repository</h3>
              <p>
                A more consistent way for authorised staff to manage and
                maintain the institution&apos;s learning resources.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="asit-section asit-role-section" id="access">
        <div className="asit-container">
          <div className="asit-section-heading">
            <span className="asit-section-kicker">Designed around your role</span>
            <h2>The right tools for each user</h2>
            <p>
              Different users have different responsibilities. The platform
              provides access according to the role assigned to each account.
            </p>
          </div>

          <div className="asit-role-grid">
            <article className="asit-role-card">
              <div className="asit-role-top">
                <div className="asit-role-icon"><GraduationCap size={21} /></div>
                <span className="asit-role-number">01</span>
              </div>
              <h3>Students</h3>
              <p>
                Discover course-related learning materials, preview documents
                and access resources made available for your studies.
              </p>
              <button type="button" className="asit-role-link" onClick={onLogin}>
                Student access <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="asit-role-card">
              <div className="asit-role-top">
                <div className="asit-role-icon"><Users size={21} /></div>
                <span className="asit-role-number">02</span>
              </div>
              <h3>Instructors</h3>
              <p>
                Access instructor tools and manage learning resources
                associated with your assigned academic responsibilities.
              </p>
              <button type="button" className="asit-role-link" onClick={onLogin}>
                Instructor access <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="asit-role-card">
              <div className="asit-role-top">
                <div className="asit-role-icon"><ShieldCheck size={21} /></div>
                <span className="asit-role-number">03</span>
              </div>
              <h3>Administrators</h3>
              <p>
                Manage the repository, oversee resources and maintain the
                platform through administrative tools.
              </p>
              <button type="button" className="asit-role-link" onClick={onLogin}>
                Administrator access <ArrowUpRight size={14} />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="asit-device-section">
        <div className="asit-container asit-device-layout">
          <div className="asit-device-copy">
            <span className="asit-section-kicker">Access across devices</span>
            <h2>Your library, wherever you study.</h2>
            <p>
              Use the digital library from a desktop computer, laptop, tablet
              or smartphone. The interface adapts to different screen sizes
              so you can access resources in the way that works best for you.
            </p>

            <div className="asit-device-list">
              <div className="asit-device-item">
                <CheckCircle2 size={16} /> Desktop and laptop access
              </div>
              <div className="asit-device-item">
                <CheckCircle2 size={16} /> Tablet-friendly layout
              </div>
              <div className="asit-device-item">
                <CheckCircle2 size={16} /> Mobile-responsive experience
              </div>
            </div>
          </div>

          <div className="asit-device-visual" aria-label="Supported devices">
            <div className="asit-device">
              <Monitor size={96} strokeWidth={1.35} />
            </div>
            <div className="asit-device">
              <Tablet size={68} strokeWidth={1.35} />
            </div>
            <div className="asit-device">
              <Smartphone size={44} strokeWidth={1.4} />
            </div>
          </div>
        </div>
      </section>

      <section className="asit-help-section" id="support">
        <div className="asit-container">
          <div className="asit-help-panel">
            <div className="asit-help-copy">
              <span>Get started</span>
              <h2>Ready to access your learning resources?</h2>
              <p>Sign in using your institution-provided account to continue.</p>
            </div>

            <button type="button" className="asit-primary-button" onClick={onLogin}>
              Sign in to the Library <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="asit-footer">
        <div className="asit-container asit-footer-inner">
          <div className="asit-footer-brand">
            <img src="/asit-logo.png" alt="" />
            <strong>ASIT Digital Library</strong>
          </div>
          <span className="asit-footer-note">
            Academic resources. Organised for learning.
          </span>
        </div>
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PORTAL ROUTING                                 */
/* -------------------------------------------------------------------------- */

function MainPortal() {
  const { currentUser } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (currentUser) {
    return (
      <>
        {currentUser.role === 'SYSTEM_ADMIN' && <AdminDashboard />}
        {currentUser.role === 'INSTRUCTOR' && <InstructorDashboard />}
        {currentUser.role === 'STUDENT' && <StudentLibrary />}
        <ForceChangePasswordModal />
        <RepositoryFooter />
      </>
    );
  }

  if (showLogin) {
    return (
      <main className="asit-login-back">
        <style>{styles}</style>

        <div className="asit-login-back-header">
          <button
            type="button"
            className="asit-back-button"
            onClick={() => setShowLogin(false)}
          >
            <X size={14} />
            Back to home
          </button>
        </div>

        <div className="asit-login-content">
          <LoginScreen />
        </div>
      </main>
    );
  }

  return <FrontDoor onLogin={() => setShowLogin(true)} />;
}

/* -------------------------------------------------------------------------- */
/*                                  ROOT PAGE                                  */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <MainPortal />
      </LibraryProvider>
    </AuthProvider>
  );
}