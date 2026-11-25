'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Bookmark,
  Download,
  GraduationCap,
  HelpCircle,
  Laptop,
  Library,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LibraryProvider } from '@/context/LibraryContext';

import { AsitBookLoader } from '@/components/AsitBookLoader';
import { LoginScreen } from '@/components/repository/LoginScreen';
import { AdminDashboard } from '@/components/repository/AdminDashboard';
import { InstructorDashboard } from '@/components/repository/InstructorDashboard';
import { StudentLibrary } from '@/components/repository/StudentLibrary';
import RepositoryFooter from '@/components/repository/RepositoryFooter';
import { ForceChangePasswordModal } from '@/components/repository/ForceChangePasswordModal';

/* -------------------------------------------------------------------------- */
/*                         LOCAL DESIGN SYSTEM                                */
/* -------------------------------------------------------------------------- */

const styles = `
.asit-library-page,
.asit-library-page *,
.asit-login-page,
.asit-login-page * {
  box-sizing: border-box;
}

.asit-library-page {
  --college-navy: #0F294A;
  --college-navy-light: #18395f;
  --college-blue: #2678C8;
  --college-blue-soft: #EAF3FC;
  --college-text: #26364B;
  --college-muted: #718096;
  --college-line: #E5EAF0;
  --college-background: #F7F9FC;
  --college-white: #FFFFFF;

  min-height: 100vh;
  color: var(--college-text);
  background: var(--college-background);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.asit-library-page button,
.asit-login-page button {
  font-family: inherit;
}

.asit-library-page button:focus-visible,
.asit-library-page a:focus-visible,
.asit-login-page button:focus-visible {
  outline: 3px solid var(--college-blue);
  outline-offset: 3px;
}

.asit-container {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
}

/* Header */

.asit-header {
  height: 76px;
  background: var(--college-white);
  border-bottom: 1px solid var(--college-line);
}

.asit-header-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.asit-brand {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.asit-brand-logo {
  width: 43px;
  height: 43px;
  object-fit: contain;
  flex-shrink: 0;
}

.asit-brand-mark {
  width: 43px;
  height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  background: var(--college-navy);
  border-radius: 8px;
}

.asit-brand-copy {
  min-width: 0;
}

.asit-brand-name {
  display: block;
  color: var(--college-navy);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -.3px;
}

.asit-brand-description {
  display: block;
  margin-top: 4px;
  color: #8490A0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.asit-header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.asit-help-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 0;
  color: #637188;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.asit-help-link:hover {
  color: var(--college-navy);
}

/* Buttons */

.asit-signin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 43px;
  padding: 0 19px;
  color: #FFFFFF;
  background: var(--college-blue);
  border: 1px solid var(--college-blue);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;
}

.asit-signin-button:hover {
  background: #1B67AD;
  border-color: #1B67AD;
}

.asit-signin-button:active {
  background: #165994;
}

.asit-signin-button svg {
  flex-shrink: 0;
}

.asit-signin-button-large {
  min-height: 47px;
  padding: 0 22px;
}

/* Hero */

.asit-hero {
  padding: 66px 0 69px;
  background: var(--college-white);
}

.asit-hero-layout {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  align-items: center;
  gap: 58px;
}

.asit-hero-copy {
  max-width: 490px;
}

.asit-members-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 21px;
  color: var(--college-blue);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.15px;
  text-transform: uppercase;
}

.asit-members-label svg {
  color: var(--college-blue);
}

.asit-hero-title {
  margin: 0;
  color: var(--college-navy);
  font-size: clamp(35px, 4.3vw, 49px);
  font-weight: 700;
  letter-spacing: -1.8px;
  line-height: 1.16;
}

.asit-hero-title span {
  color: var(--college-blue);
}

.asit-hero-description {
  max-width: 430px;
  margin: 20px 0 26px;
  color: var(--college-muted);
  font-size: 14px;
  line-height: 1.85;
}

.asit-hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 17px;
}

.asit-access-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 0;
  color: var(--college-navy);
  background: transparent;
  border: 0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.asit-access-link:hover {
  color: var(--college-blue);
}

.asit-members-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 29px;
  color: #8793A3;
  font-size: 11px;
}

.asit-members-note svg {
  color: #6483A5;
  flex-shrink: 0;
}

/* Access help */

.asit-access-note {
  max-width: 390px;
  margin-top: 17px;
  padding: 15px 17px;
  border: 1px solid #DCE6F0;
  border-radius: 7px;
  background: #F8FAFD;
}

.asit-access-note strong {
  display: block;
  margin-bottom: 6px;
  color: var(--college-navy);
  font-size: 12px;
}

.asit-access-note p {
  margin: 0;
  color: var(--college-muted);
  font-size: 11px;
  line-height: 1.75;
}

/* Landing page banner image */

.asit-bookshelf-area {
  min-width: 0;
  width: 100%;
  padding: 12px 0;
}

.asit-shelf-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.asit-shelf-heading span:first-child {
  color: var(--college-navy);
  font-size: 12px;
  font-weight: 700;
}

.asit-shelf-heading span:last-child {
  color: #8B97A7;
  font-size: 10px;
  text-align: right;
}

.asit-banner-preview {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #DCE4ED;
  border-radius: 9px;
  background: #FFFFFF;
  box-shadow: 0 14px 35px rgba(15, 41, 74, 0.09);
}

.asit-banner-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.asit-banner-loader-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  z-index: 2;
}

.asit-banner-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 260px;
  padding: 30px;
  color: var(--college-navy);
  background: #F3F7FB;
  text-align: center;
  width: 100%;
}

.asit-banner-fallback svg {
  color: var(--college-blue);
}

.asit-banner-fallback strong {
  font-size: 15px;
}

.asit-banner-fallback span {
  color: var(--college-muted);
  font-size: 11px;
  line-height: 1.6;
}

.asit-shelf-caption {
  margin-top: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8793A3;
  font-size: 10px;
}

.asit-shelf-caption svg {
  color: var(--college-blue);
  flex-shrink: 0;
}

/* Value points */

.asit-benefits {
  padding: 25px 0;
  border-top: 1px solid var(--college-line);
  border-bottom: 1px solid var(--college-line);
  background: #FBFCFE;
}

.asit-benefits-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.asit-benefit {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.asit-benefit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #E2EAF3;
  border-radius: 7px;
  color: var(--college-blue);
  background: #FFFFFF;
}

.asit-benefit-text {
  color: #526176;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.55;
}

/* Audience */

.asit-audience {
  padding: 67px 0;
  background: var(--college-white);
}

.asit-section-heading {
  margin-bottom: 28px;
}

.asit-section-heading h2 {
  margin: 0;
  color: var(--college-navy);
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -.6px;
}

.asit-section-heading p {
  margin: 10px 0 0;
  color: var(--college-muted);
  font-size: 12px;
  line-height: 1.7;
}

.asit-audience-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.asit-audience-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 21px;
  border: 1px solid var(--college-line);
  border-radius: 7px;
  background: #FFFFFF;
  transition: border-color .18s ease, background .18s ease;
}

.asit-audience-card:hover {
  border-color: #C8D9EB;
  background: #FCFDFF;
}

.asit-audience-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 7px;
  color: var(--college-blue);
  background: var(--college-blue-soft);
}

.asit-audience-card h3 {
  margin: 1px 0 7px;
  color: var(--college-navy);
  font-size: 13px;
  font-weight: 700;
}

.asit-audience-card p {
  margin: 0;
  color: var(--college-muted);
  font-size: 11px;
  line-height: 1.7;
}

/* Help and policy */

.asit-help-section {
  padding: 53px 0;
  background: #F4F7FA;
  border-top: 1px solid #E8EDF3;
}

.asit-help-layout {
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 45px;
}

.asit-help-heading {
  margin: 0 0 9px;
  color: var(--college-navy);
  font-size: 19px;
  font-weight: 700;
}

.asit-help-description {
  max-width: 470px;
  margin: 0 0 22px;
  color: var(--college-muted);
  font-size: 12px;
  line-height: 1.8;
}

.asit-contact-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.asit-contact-item {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #58677C;
  font-size: 11px;
}

.asit-contact-item svg {
  color: var(--college-blue);
  flex-shrink: 0;
}

.asit-policy-box {
  padding: 22px;
  border: 1px solid #E1E8F0;
  border-radius: 7px;
  background: #FFFFFF;
}

.asit-policy-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 13px;
  color: var(--college-navy);
  font-size: 13px;
  font-weight: 700;
}

.asit-policy-heading svg {
  color: var(--college-blue);
  flex-shrink: 0;
}

.asit-policy-box p {
  margin: 0 0 12px;
  color: #748196;
  font-size: 11px;
  line-height: 1.8;
}

.asit-policy-box p:last-child {
  margin-bottom: 0;
}

/* Footer */

.asit-footer {
  padding: 22px 0;
  background: #FFFFFF;
  border-top: 1px solid var(--college-line);
}

.asit-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.asit-footer-college {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--college-navy);
  font-size: 11px;
  font-weight: 700;
}

.asit-footer-college img {
  width: 29px;
  height: 29px;
  object-fit: contain;
}

.asit-footer-links {
  display: flex;
  align-items: center;
  gap: 19px;
}

.asit-footer-links a {
  color: #7F8B9C;
  font-size: 10px;
  text-decoration: none;
}

.asit-footer-links a:hover {
  color: var(--college-blue);
}

.asit-footer-copy {
  color: #9AA5B3;
  font-size: 10px;
}

/* Login wrapper */

.asit-login-page {
  min-height: 100vh;
  padding: 24px;
  background: #F7F9FC;
  font-family: Arial, Helvetica, sans-serif;
}

.asit-login-header {
  width: min(1050px, 100%);
  margin: 0 auto 20px;
}

.asit-login-back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  color: var(--college-navy);
  background: #FFFFFF;
  border: 1px solid #E5EAF0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.asit-login-content {
  width: min(1050px, 100%);
  min-height: 520px;
  margin: 0 auto;
  padding: 22px;
  border: 1px solid #E5EAF0;
  border-radius: 8px;
  background: #FFFFFF;
}

/* Responsive */

@media (max-width: 850px) {
  .asit-hero-layout {
    grid-template-columns: 1fr;
    gap: 35px;
  }

  .asit-hero-copy {
    max-width: 620px;
  }

  .asit-bookshelf-area {
    width: min(650px, 100%);
    margin: 0 auto;
  }

  .asit-benefits-grid {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 19px;
  }

  .asit-help-layout {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

@media (max-width: 600px) {
  .asit-container {
    width: calc(100% - 32px);
  }

  .asit-header {
    height: 66px;
  }

  .asit-brand-logo,
  .asit-brand-mark {
    width: 37px;
    height: 37px;
  }

  .asit-brand-name {
    font-size: 13px;
  }

  .asit-brand-description {
    font-size: 8px;
    letter-spacing: .5px;
  }

  .asit-header-actions {
    gap: 0;
  }

  .asit-header-actions .asit-help-link {
    display: none;
  }

  .asit-signin-button {
    min-height: 39px;
    padding: 0 13px;
    font-size: 11px;
  }

  .asit-hero {
    padding: 44px 0 45px;
  }

  .asit-hero-layout {
    gap: 30px;
  }

  .asit-hero-title {
    font-size: 37px;
    letter-spacing: -1.4px;
  }

  .asit-hero-description {
    margin: 16px 0 22px;
    font-size: 13px;
  }

  .asit-hero-actions {
    gap: 10px;
  }

  .asit-members-note {
    align-items: flex-start;
    line-height: 1.6;
  }

  .asit-bookshelf-area {
    padding: 5px 0;
  }

  .asit-shelf-heading {
    margin-bottom: 11px;
  }

  .asit-banner-preview {
    border-radius: 7px;
  }

  .asit-shelf-caption {
    font-size: 9px;
    text-align: center;
  }

  .asit-benefits {
    padding: 22px 0;
  }

  .asit-benefits-grid {
    grid-template-columns: 1fr 1fr;
    gap: 18px 12px;
  }

  .asit-benefit {
    align-items: flex-start;
    gap: 8px;
  }

  .asit-benefit-icon {
    width: 33px;
    height: 33px;
  }

  .asit-benefit-text {
    font-size: 10px;
  }

  .asit-audience {
    padding: 48px 0;
  }

  .asit-section-heading h2 {
    font-size: 22px;
  }

  .asit-audience-grid {
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .asit-audience-card {
    padding: 17px;
  }

  .asit-help-section {
    padding: 40px 0;
  }

  .asit-footer-inner {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .asit-footer-links {
    gap: 14px;
    flex-wrap: wrap;
  }

  .asit-login-page {
    padding: 13px;
  }

  .asit-login-content {
    min-height: 0;
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .asit-library-page *,
  .asit-login-page * {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*                         HELPERS AND PAGE COMPONENTS                         */
/* -------------------------------------------------------------------------- */

function CollegeLogo() {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed) {
    return (
      <div className="asit-brand-mark" aria-hidden="true">
        <Library size={22} />
      </div>
    );
  }

  return (
    <img
      className="asit-brand-logo"
      src="/asit-logo.png"
      alt="College logo"
      onError={() => setLogoFailed(true)}
    />
  );
}

function FooterLogo() {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed) {
    return <Library size={20} aria-hidden="true" />;
  }

  return (
    <img
      src="/asit-logo.png"
      alt=""
      onError={() => setLogoFailed(true)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                         LANDING PAGE BANNER                                 */
/* -------------------------------------------------------------------------- */

function BookShelf() {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setImageLoading(false);
        setImageFailed(false);
      } else {
        setImageLoading(false);
        setImageFailed(true);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setImageLoading(false);
      setImageFailed(true);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="asit-bookshelf-area">
      <div className="asit-shelf-heading">
        <span>Explore your digital library</span>
        <span>ASIT Digital Resources</span>
      </div>

      <div className="asit-banner-preview">
        {imageFailed ? (
          <div className="asit-banner-fallback">
            <Library size={34} />
            <strong>ASIT Digital Resource Library</strong>
            <span>
              Your academic books, course materials and reference resources
              in one place.
            </span>
          </div>
        ) : (
          <>
            {imageLoading && (
              <div className="asit-banner-loader-overlay">
                <AsitBookLoader
                  size={72}
                  label="Loading library preview..."
                />
              </div>
            )}
            <img
              ref={imgRef}
              src="/asit-elibrary-content-display.png"
              alt="Preview of the ASIT Digital Resource Library"
              className="asit-banner-image"
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth > 0) {
                  setImageLoading(false);
                  setImageFailed(false);
                } else {
                  setImageLoading(false);
                  setImageFailed(true);
                }
              }}
              onError={() => {
                setImageLoading(false);
                setImageFailed(true);
              }}
            />
          </>
        )}
      </div>

      <div className="asit-shelf-caption">
        <BookMarked size={14} />
        <span>Your academic resources, organised in one place</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              LANDING PAGE                                   */
/* -------------------------------------------------------------------------- */

function FrontDoor({ onLogin }: { onLogin: () => void }) {
  const [showAccessHelp, setShowAccessHelp] = useState(false);

  return (
    <main className="asit-library-page">
      <style>{styles}</style>

      {/* Header */}

      <header className="asit-header">
        <div className="asit-container asit-header-inner">
          <div className="asit-brand">
            <CollegeLogo />

            <div className="asit-brand-copy">
              <span className="asit-brand-name">ASIT</span>
              <span className="asit-brand-description">
                Digital Resource Library
              </span>
            </div>
          </div>

          <div className="asit-header-actions">
            <a href="#help" className="asit-help-link">
              <HelpCircle size={15} />
              Need help?
            </a>

            <button
              type="button"
              className="asit-signin-button"
              onClick={onLogin}
            >
              Sign in <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}

      <section className="asit-hero">
        <div className="asit-container asit-hero-layout">
          <div className="asit-hero-copy">
            <div className="asit-members-label">
              <LockKeyhole size={13} />
              College members only
            </div>

            <h1 className="asit-hero-title">
              Your college library,
              <br />
              <span>anywhere you study.</span>
            </h1>

            <p className="asit-hero-description">
              Access textbooks, course readings and reference materials
              through your college&apos;s digital resource library. Sign in
              with your college account to get started.
            </p>

            <div className="asit-hero-actions">
              <button
                type="button"
                className="asit-signin-button asit-signin-button-large"
                onClick={onLogin}
              >
                Sign in to your library
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="asit-access-link"
                onClick={() => setShowAccessHelp((current) => !current)}
                aria-expanded={showAccessHelp}
              >
                How do I get access?
                <HelpCircle size={14} />
              </button>
            </div>

            {showAccessHelp && (
              <div className="asit-access-note">
                <strong>Access is provided by your college.</strong>
                <p>
                  Student, lecturer and staff accounts are created or managed
                  by authorised college administrators. If you do not have
                  login details, contact the library or IT helpdesk.
                </p>
              </div>
            )}

            <div className="asit-members-note">
              <ShieldCheck size={15} />
              <span>
                For students, lecturers and authorised staff of ASIT.
              </span>
            </div>
          </div>

          <BookShelf />
        </div>
      </section>

      {/* Value points */}

      <section className="asit-benefits">
        <div className="asit-container asit-benefits-grid">
          <div className="asit-benefit">
            <div className="asit-benefit-icon">
              <Download size={18} />
            </div>
            <span className="asit-benefit-text">
              Read online or download PDF materials
            </span>
          </div>

          <div className="asit-benefit">
            <div className="asit-benefit-icon">
              <Bookmark size={18} />
            </div>
            <span className="asit-benefit-text">
              Browse categories, programmes and A–Z shelves
            </span>
          </div>

          <div className="asit-benefit">
            <div className="asit-benefit-icon">
              <Laptop size={18} />
            </div>
            <span className="asit-benefit-text">
              Access from phone, tablet or computer
            </span>
          </div>

          <div className="asit-benefit">
            <div className="asit-benefit-icon">
              <BookMarked size={18} />
            </div>
            <span className="asit-benefit-text">
              New learning resources added regularly
            </span>
          </div>
        </div>
      </section>

      {/* Audience */}

      <section className="asit-audience">
        <div className="asit-container">
          <div className="asit-section-heading">
            <h2>A shared academic resource</h2>
            <p>
              The digital library supports the different people involved
              in teaching, learning and academic administration.
            </p>
          </div>

          <div className="asit-audience-grid">
            <article className="asit-audience-card">
              <div className="asit-audience-icon">
                <GraduationCap size={21} />
              </div>
              <div>
                <h3>Students</h3>
                <p>
                  Find course materials, read reference documents and
                  download resources made available for your studies.
                </p>
              </div>
            </article>

            <article className="asit-audience-card">
              <div className="asit-audience-icon">
                <Users size={21} />
              </div>
              <div>
                <h3>Lecturers</h3>
                <p>
                  Access academic resources and make relevant learning
                  materials available to students.
                </p>
              </div>
            </article>

            <article className="asit-audience-card">
              <div className="asit-audience-icon">
                <Library size={21} />
              </div>
              <div>
                <h3>College staff</h3>
                <p>
                  Use authorised library and administration tools to
                  support the management of learning resources.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Help and policy */}

      <section className="asit-help-section" id="help">
        <div className="asit-container asit-help-layout">
          <div>
            <h2 className="asit-help-heading">
              Need help accessing the library?
            </h2>

            <p className="asit-help-description">
              If your account is not working or you have not received
              login details, contact the college library or IT helpdesk
              for assistance.
            </p>

            <div className="asit-contact-list">
              <div className="asit-contact-item">
                <Library size={16} />
                <span>Contact the college library desk</span>
              </div>

              <div className="asit-contact-item">
                <Mail size={16} />
                <span>Contact your college IT helpdesk</span>
              </div>

              <div className="asit-contact-item">
                <Phone size={16} />
                <span>Use the official college support contact details</span>
              </div>
            </div>
          </div>

          <div className="asit-policy-box">
            <div className="asit-policy-heading">
              <ShieldCheck size={17} />
              Responsible use of library resources
            </div>

            <p>
              Library materials are provided for educational and
              institutional use. Access is intended for authorised
              students, lecturers and staff.
            </p>

            <p>
              Respect copyright and the usage conditions attached to
              each resource. Do not redistribute, reproduce or share
              protected materials without permission.
            </p>

            <p>
              Your account is for your own use. Keep your sign-in
              credentials private and sign out when using a shared device.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}

      <footer className="asit-footer">
        <div className="asit-container asit-footer-inner">
          <div className="asit-footer-college">
            <FooterLogo />
            <span>ASIT Digital Resource Library</span>
          </div>

          <div className="asit-footer-links">
            <a href="#help">Help and support</a>
            <a href="#help">Acceptable use</a>
            <a href="#help">Copyright</a>
          </div>

          <span className="asit-footer-copy">
            For authorised college members
          </span>
        </div>
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                              APPLICATION ROUTING                            */
/* -------------------------------------------------------------------------- */

function MainPortal() {
  const { currentUser } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  /*
- Authenticated users bypass the landing page.
- Their assigned role determines which dashboard is displayed.
   */

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
      <main className="asit-login-page">
        <style>{styles}</style>

        <div className="asit-login-header">
          <button
            type="button"
            className="asit-login-back-button"
            onClick={() => setShowLogin(false)}
          >
            <X size={14} />
            Back to library home
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