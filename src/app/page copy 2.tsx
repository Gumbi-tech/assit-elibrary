
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
  Laptop,
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
/*                              LOCAL PAGE STYLES                             */
/* -------------------------------------------------------------------------- */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');

.asit-front-door,
.asit-front-door *,
.asit-login-back,
.asit-login-back * {
  box-sizing: border-box;
}

.asit-front-door {
  --asit-ink: #101b31;
  --asit-muted: #68758b;
  --asit-blue: #1685ff;
  --asit-blue-deep: #0863d9;
  --asit-line: #e8edf4;
  --asit-surface: #ffffff;
  --asit-page: #f7f9fc;

  min-height: 100vh;
  overflow: hidden;
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

.asit-container {
  width: min(1160px, calc(100% - 48px));
  margin: 0 auto;
}

/* Header */

.asit-header {
  position: relative;
  z-index: 10;
  height: 82px;
  background: rgba(255,255,255,.88);
  border-bottom: 1px solid rgba(226,232,240,.8);
  backdrop-filter: blur(18px);
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
  gap: 12px;
}

.asit-brand-logo {
  width: 43px;
  height: 43px;
  object-fit: contain;
  border-radius: 12px;
}

.asit-brand-fallback {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: white;
  background: linear-gradient(145deg, #258fff, #0759c9);
  box-shadow:
    0 5px 12px rgba(16,112,231,.22),
    inset 0 1px 1px rgba(255,255,255,.55);
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
  letter-spacing: -.55px;
  color: #14213a;
}

.asit-brand-subtitle {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.45px;
  color: #8792a5;
  text-transform: uppercase;
}

.asit-nav {
  display: flex;
  align-items: center;
  gap: 34px;
}

.asit-nav a {
  font-size: 13px;
  font-weight: 600;
  color: #647188;
  transition: color .2s ease;
}

.asit-nav a:hover {
  color: var(--asit-blue-deep);
}

.asit-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asit-login-link {
  padding: 11px 16px;
  border: 0;
  background: transparent;
  color: #43516a;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.asit-primary-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 20px;
  border: 1px solid rgba(255,255,255,.42);
  border-radius: 12px;
  color: #fff;
  background:
    linear-gradient(180deg, #55b0ff 0%, #1685ff 43%, #0870ed 100%);
  box-shadow:
    0 7px 17px rgba(15,115,230,.22),
    0 2px 3px rgba(4,65,145,.15),
    inset 0 1px 1px rgba(255,255,255,.65),
    inset 0 -2px 3px rgba(0,55,140,.2);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease;
}

.asit-primary-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 11px 24px rgba(15,115,230,.28),
    0 2px 3px rgba(4,65,145,.15),
    inset 0 1px 1px rgba(255,255,255,.7);
}

.asit-primary-button:active {
  transform: translateY(0);
}

.asit-button-small {
  min-height: 40px;
  padding: 0 17px;
}

/* Hero */

.asit-hero {
  position: relative;
  padding: 76px 0 86px;
  background:
    radial-gradient(ellipse at 76% 34%, rgba(222,238,255,.72), transparent 34%),
    linear-gradient(180deg, #fff 0%, #f8faff 100%);
}

.asit-hero::before {
  content: '';
  position: absolute;
  top: 65px;
  right: -160px;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(38,139,255,.08), transparent 68%);
  pointer-events: none;
}

.asit-hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: .92fr 1.08fr;
  align-items: center;
  gap: 60px;
}

.asit-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 510px;
}

.asit-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 24px;
  color: #3479c7;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.55px;
  text-transform: uppercase;
}

.asit-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1685ff;
  box-shadow: 0 0 0 4px rgba(22,133,255,.1);
}

.asit-hero h1 {
  margin: 0;
  max-width: 550px;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(39px, 5vw, 61px);
  line-height: 1.08;
  letter-spacing: -3.1px;
  font-weight: 800;
  color: #101d35;
}

.asit-hero h1 span {
  color: #1685ff;
  text-shadow: 0 3px 13px rgba(22,133,255,.12);
}

.asit-hero-description {
  max-width: 450px;
  margin: 24px 0 28px;
  color: #69768c;
  font-size: 15px;
  line-height: 1.85;
}

.asit-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.asit-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid #dce4ef;
  border-radius: 12px;
  color: #35445d;
  background: rgba(255,255,255,.8);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease;
}

.asit-secondary-button:hover {
  border-color: #b8d5f5;
  background: #fff;
}

.asit-trust-line {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 30px;
  color: #8792a4;
  font-size: 11px;
  font-weight: 600;
}

.asit-trust-line svg {
  color: #1685ff;
}

/* Hero preview */

.asit-hero-visual {
  position: relative;
  min-width: 0;
  padding: 12px 0 24px 20px;
}

.asit-visual-glow {
  position: absolute;
  top: 12%;
  right: 4%;
  width: 72%;
  height: 72%;
  border-radius: 50%;
  background: rgba(28,132,255,.13);
  filter: blur(65px);
  pointer-events: none;
}

.asit-preview-window {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(208,220,236,.9);
  border-radius: 19px;
  background: #fff;
  box-shadow:
    0 30px 75px rgba(32,65,112,.13),
    0 8px 20px rgba(32,65,112,.06),
    inset 0 1px 0 rgba(255,255,255,.9);
  transform: perspective(1300px) rotateY(-4deg) rotateX(1deg);
  transition: transform .35s ease;
}

.asit-preview-window:hover {
  transform: perspective(1300px) rotateY(0) rotateX(0);
}

.asit-preview-topbar {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border-bottom: 1px solid #edf1f6;
  background: #fff;
}

.asit-preview-dots {
  display: flex;
  gap: 5px;
}

.asit-preview-dots i {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dce3ed;
}

.asit-preview-label {
  color: #9aa5b5;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.asit-preview-image-wrap {
  position: relative;
  overflow: hidden;
  background: #eef3fa;
}

.asit-preview-image {
  display: block;
  width: 100%;
  height: auto;
  min-height: 270px;
  object-fit: cover;
  object-position: top center;
}

.asit-preview-caption {
  position: absolute;
  right: 15px;
  bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid rgba(255,255,255,.65);
  border-radius: 10px;
  color: #1b3557;
  background: rgba(255,255,255,.91);
  box-shadow: 0 5px 16px rgba(20,45,80,.1);
  backdrop-filter: blur(12px);
  font-size: 10px;
  font-weight: 800;
}

.asit-preview-caption svg {
  color: #1685ff;
}

.asit-floating-note {
  position: absolute;
  z-index: 3;
  left: -5px;
  bottom: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 17px;
  border: 1px solid rgba(224,232,242,.9);
  border-radius: 13px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 13px 30px rgba(29,57,95,.12);
}

.asit-floating-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(145deg, #5bb5ff, #0870e9);
  box-shadow:
    0 4px 10px rgba(18,118,224,.24),
    inset 0 1px 1px rgba(255,255,255,.6);
}

.asit-floating-note strong {
  display: block;
  color: #1d2c45;
  font-size: 11px;
  font-weight: 800;
}

.asit-floating-note span {
  display: block;
  margin-top: 3px;
  color: #8a96a8;
  font-size: 10px;
}

/* Small stats */

.asit-stats {
  padding: 23px 0;
  border-top: 1px solid #e9eef5;
  border-bottom: 1px solid #e9eef5;
  background: #fff;
}

.asit-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
}

.asit-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
}

.asit-stat-icon {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #397ec4;
  background: #f0f6fd;
}

.asit-stat strong {
  display: block;
  color: #1b2a43;
  font-size: 13px;
  font-weight: 800;
}

.asit-stat span {
  display: block;
  margin-top: 3px;
  color: #8994a5;
  font-size: 10px;
}

/* Section headings */

.asit-section {
  padding: 88px 0;
}

.asit-section-white {
  background: #fff;
}

.asit-section-heading {
  max-width: 620px;
  margin: 0 auto 44px;
  text-align: center;
}

.asit-section-kicker {
  display: block;
  margin-bottom: 13px;
  color: #3983cf;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}

.asit-section-heading h2 {
  margin: 0;
  color: #14213a;
  font-family: 'Manrope', sans-serif;
  font-size: clamp(27px, 3vw, 37px);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.2;
}

.asit-section-heading p {
  margin: 15px auto 0;
  max-width: 520px;
  color: #78859a;
  font-size: 13px;
  line-height: 1.8;
}

/* Feature cards */

.asit-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 19px;
}

.asit-feature-card {
  min-height: 220px;
  padding: 27px;
  border: 1px solid #e9eef5;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 5px 17px rgba(25,50,85,.025);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}

.asit-feature-card:hover {
  transform: translateY(-5px);
  border-color: #dce6f2;
  box-shadow: 0 18px 38px rgba(25,50,85,.075);
}

.asit-feature-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  margin-bottom: 23px;
  border: 1px solid #e4edf8;
  border-radius: 14px;
  color: #247ed8;
  background: linear-gradient(145deg, #f8fbff, #edf5ff);
  box-shadow: inset 0 1px 0 #fff;
}

.asit-feature-card h3 {
  margin: 0 0 10px;
  color: #1c2b43;
  font-size: 15px;
  font-weight: 800;
}

.asit-feature-card p {
  margin: 0;
  color: #7b8799;
  font-size: 12px;
  line-height: 1.8;
}

/* Access roles */

.asit-role-section {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(221,237,255,.42), transparent 48%),
    #f7f9fc;
}

.asit-role-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.asit-role-card {
  padding: 27px;
  border: 1px solid #e8edf4;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 5px 20px rgba(25,50,85,.025);
  transition: transform .25s ease, box-shadow .25s ease;
}

.asit-role-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 35px rgba(25,50,85,.07);
}

.asit-role-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.asit-role-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #277dd2;
  background: #f0f6fd;
}

.asit-role-number {
  color: #c1cad7;
  font-family: 'Manrope', sans-serif;
  font-size: 22px;
  font-weight: 800;
}

.asit-role-card h3 {
  margin: 0 0 9px;
  color: #1b2a43;
  font-size: 16px;
  font-weight: 800;
}

.asit-role-card p {
  min-height: 61px;
  margin: 0 0 19px;
  color: #7d899b;
  font-size: 12px;
  line-height: 1.8;
}

.asit-role-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #2678ca;
  font-size: 11px;
  font-weight: 800;
}

/* Device section */

.asit-device-section {
  padding: 78px 0;
  background: #fff;
}

.asit-device-layout {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  align-items: center;
  gap: 70px;
}

.asit-device-copy h2 {
  margin: 0;
  color: #17253d;
  font-family: 'Manrope', sans-serif;
  font-size: 34px;
  line-height: 1.2;
  letter-spacing: -1.4px;
}

.asit-device-copy p {
  margin: 17px 0 23px;
  color: #778499;
  font-size: 13px;
  line-height: 1.9;
}

.asit-device-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.asit-device-item {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #536178;
  font-size: 12px;
  font-weight: 600;
}

.asit-device-item svg {
  color: #1685ff;
}

.asit-device-visual {
  position: relative;
  min-height: 255px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 19px;
  padding: 28px;
  border: 1px solid #e9eef5;
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 50%, rgba(220,237,255,.7), transparent 65%),
    #f8faff;
}

.asit-device {
  display: grid;
  place-items: center;
  color: #4c78a9;
  filter: drop-shadow(0 10px 9px rgba(29,63,106,.1));
}

.asit-device-desktop {
  transform: translateY(5px);
}

.asit-device-tablet {
  transform: translateY(-8px);
}

.asit-device-phone {
  transform: translateY(12px);
}

/* Help section */

.asit-help-section {
  padding: 76px 0;
  background: #f7f9fc;
}

.asit-help-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 37px 43px;
  border: 1px solid #e4ebf4;
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 25px rgba(24,52,90,.035);
}

.asit-help-panel::after {
  content: '';
  position: absolute;
  top: -100px;
  right: 12%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(22,133,255,.055);
  filter: blur(30px);
  pointer-events: none;
}

.asit-help-copy {
  position: relative;
  z-index: 1;
}

.asit-help-copy span {
  display: block;
  margin-bottom: 9px;
  color: #3983cf;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.asit-help-copy h2 {
  margin: 0;
  color: #182740;
  font-family: 'Manrope', sans-serif;
  font-size: 25px;
  letter-spacing: -.8px;
}

.asit-help-copy p {
  margin: 9px 0 0;
  color: #8290a3;
  font-size: 12px;
}

/* Footer */

.asit-footer {
  padding: 28px 0;
  border-top: 1px solid #e9eef5;
  background: #fff;
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
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.asit-footer-brand strong {
  color: #34435b;
  font-size: 11px;
  font-weight: 800;
}

.asit-footer-note {
  color: #9aa5b4;
  font-size: 10px;
}

/* Login page wrapper */

.asit-login-back {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(ellipse at 80% 15%, rgba(22,133,255,.09), transparent 38%),
    #f5f8fc;
  font-family: 'DM Sans', sans-serif;
}

.asit-login-back-header {
  width: min(1100px, 100%);
  margin: 0 auto 24px;
}

.asit-back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid #e3eaf3;
  border-radius: 10px;
  color: #53647d;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.asit-login-content {
  width: min(1100px, 100%);
  min-height: 560px;
  margin: 0 auto;
  padding: 22px;
  border: 1px solid #e5ebf3;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 20px 65px rgba(24,52,90,.08);
}

/* Responsive */

@media (max-width: 900px) {
  .asit-nav {
    gap: 18px;
  }

  .asit-hero-grid {
    grid-template-columns: 1fr;
    gap: 45px;
  }

  .asit-hero-copy {
    max-width: 650px;
  }

  .asit-hero-visual {
    width: min(720px, 100%);
    margin: 0 auto;
    padding-left: 0;
  }

  .asit-device-layout {
    grid-template-columns: 1fr;
    gap: 35px;
  }

  .asit-feature-grid,
  .asit-role-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .asit-container {
    width: min(100% - 32px, 1160px);
  }

  .asit-header {
    height: 70px;
  }

  .asit-nav {
    display: none;
  }

  .asit-brand-name {
    font-size: 14px;
  }

  .asit-brand-subtitle {
    font-size: 8px;
  }

  .asit-header-actions {
    gap: 4px;
  }

  .asit-login-link {
    padding: 9px;
    font-size: 11px;
  }

  .asit-button-small {
    min-height: 37px;
    padding: 0 12px;
    font-size: 11px;
  }

  .asit-hero {
    padding: 55px 0 65px;
  }

  .asit-hero h1 {
    font-size: 43px;
    letter-spacing: -2.2px;
  }

  .asit-hero-description {
    font-size: 13px;
  }

  .asit-preview-image {
    min-height: 190px;
  }

  .asit-floating-note {
    left: 8px;
    bottom: -7px;
    padding: 10px 12px;
  }

  .asit-stats-grid {
    grid-template-columns: 1fr;
    gap: 17px;
  }

  .asit-stat {
    justify-content: flex-start;
  }

  .asit-section {
    padding: 65px 0;
  }

  .asit-feature-grid,
  .asit-role-grid {
    grid-template-columns: 1fr;
  }

  .asit-feature-card {
    min-height: auto;
  }

  .asit-role-card p {
    min-height: auto;
  }

  .asit-device-copy h2 {
    font-size: 29px;
  }

  .asit-device-visual {
    min-height: 190px;
    gap: 10px;
    padding: 15px;
  }

  .asit-device-desktop svg {
    width: 75px;
  }

  .asit-device-tablet svg {
    width: 58px;
  }

  .asit-device-phone svg {
    width: 35px;
  }

  .asit-help-panel {
    align-items: flex-start;
    flex-direction: column;
    padding: 27px 23px;
  }

  .asit-help-copy h2 {
    font-size: 22px;
  }

  .asit-footer-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .asit-login-back {
    padding: 14px;
  }

  .asit-login-content {
    min-height: 0;
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .asit-front-door *,
  .asit-login-back * {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*                              PUBLIC LANDING PAGE                            */
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
              alt="ASIT logo"
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
            <button className="asit-login-link" onClick={onLogin}>
              Sign in
            </button>
            <button className="asit-primary-button asit-button-small" onClick={onLogin}>
              Access Library <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <section className="asit-hero" id="home">
        <div className="asit-container asit-hero-grid">
          <div className="asit-hero-copy">
            <div className="asit-eyebrow">
              <span className="asit-eyebrow-dot" />
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
              <button className="asit-primary-button" onClick={onLogin}>
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

          <div className="asit-hero-visual">
            <div className="asit-visual-glow" />

            <div className="asit-preview-window">
              <div className="asit-preview-topbar">
                <div className="asit-preview-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span className="asit-preview-label">ASIT Digital Library</span>
                <span style={{ width: 30 }} />
              </div>

              <div className="asit-preview-image-wrap">
                <img
                  className="asit-preview-image"
                  src="/asit-elibrary-content-display.png"
                  alt="Preview of the ASIT eLibrary interface"
                />

                <div className="asit-preview-caption">
                  <BookOpen size={14} />
                  Digital learning resources
                </div>
              </div>
            </div>

            <div className="asit-floating-note">
              <div className="asit-floating-icon">
                <CloudDownload size={19} />
              </div>
              <div>
                <strong>Resources in one place</strong>
                <span>Find and access learning materials</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="asit-stats" aria-label="Platform highlights">
        <div className="asit-container asit-stats-grid">
          <div className="asit-stat">
            <div className="asit-stat-icon"><Library size={19} /></div>
            <div>
              <strong>Centralised library</strong>
              <span>Learning resources in one location</span>
            </div>
          </div>

          <div className="asit-stat">
            <div className="asit-stat-icon"><Users size={19} /></div>
            <div>
              <strong>Role-based access</strong>
              <span>Access designed around your role</span>
            </div>
          </div>

          <div className="asit-stat">
            <div className="asit-stat-icon"><ShieldCheck size={19} /></div>
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
              <div className="asit-feature-icon"><Search size={21} /></div>
              <h3>Find resources easily</h3>
              <p>
                Browse learning materials in an organised library and locate
                relevant documents without searching through scattered files.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><FileText size={21} /></div>
              <h3>Access learning documents</h3>
              <p>
                View available course materials and supporting documents from
                a central digital repository.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><CloudDownload size={21} /></div>
              <h3>Download materials</h3>
              <p>
                Access permitted learning resources and keep the documents
                you need available for your studies.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><GraduationCap size={21} /></div>
              <h3>Course-focused content</h3>
              <p>
                Resources are arranged to make relevant academic materials
                easier to identify and access.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><LockKeyhole size={21} /></div>
              <h3>Controlled access</h3>
              <p>
                User access is managed according to assigned roles and
                permissions within the institution.
              </p>
            </article>

            <article className="asit-feature-card">
              <div className="asit-feature-icon"><CheckCircle2 size={21} /></div>
              <h3>Managed repository</h3>
              <p>
                A more consistent way for authorised staff to manage and
                maintain the institution's learning resources.
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
                <div className="asit-role-icon"><GraduationCap size={23} /></div>
                <span className="asit-role-number">01</span>
              </div>
              <h3>Students</h3>
              <p>
                Discover course-related learning materials, preview documents
                and access resources made available for your studies.
              </p>
              <button className="asit-role-link" onClick={onLogin}>
                Student access <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="asit-role-card">
              <div className="asit-role-top">
                <div className="asit-role-icon"><Users size={23} /></div>
                <span className="asit-role-number">02</span>
              </div>
              <h3>Instructors</h3>
              <p>
                Access instructor tools and manage learning resources
                associated with your assigned academic responsibilities.
              </p>
              <button className="asit-role-link" onClick={onLogin}>
                Instructor access <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="asit-role-card">
              <div className="asit-role-top">
                <div className="asit-role-icon"><ShieldCheck size={23} /></div>
                <span className="asit-role-number">03</span>
              </div>
              <h3>Administrators</h3>
              <p>
                Manage the repository, oversee resources and maintain the
                platform through administrative tools.
              </p>
              <button className="asit-role-link" onClick={onLogin}>
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
            <div className="asit-device asit-device-desktop">
              <Monitor size={112} strokeWidth={1.15} />
            </div>
            <div className="asit-device asit-device-tablet">
              <Tablet size={78} strokeWidth={1.25} />
            </div>
            <div className="asit-device asit-device-phone">
              <Smartphone size={47} strokeWidth={1.35} />
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

            <button className="asit-primary-button" onClick={onLogin}>
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
