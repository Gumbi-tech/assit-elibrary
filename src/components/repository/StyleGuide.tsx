'use client';

import { Check, ChevronRight, Copy, FolderTree, Layers, Palette } from "lucide-react";
import { useState } from "react";

type GuideSection = "overview" | "theme" | "architecture";

export default function StyleGuide() {
  const [guide, setGuide] = useState<GuideSection>("overview");
  const [copied, setCopied] = useState("");

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(path);
      window.setTimeout(() => setCopied(""), 1800);
    } catch { setCopied(""); }
  };

  return (
    <section className="repo-style-layout">
      <aside className="repo-panel repo-style-nav">
        <div className="repo-panel-head"><strong>DESIGN SPECIFICATIONS</strong></div>
        <button className={guide === "overview" ? "selected" : ""} onClick={() => setGuide("overview")}><Layers size={15} /><span>Overview &amp; Principles</span><ChevronRight size={14} /></button>
        <button className={guide === "theme" ? "selected" : ""} onClick={() => setGuide("theme")}><Palette size={15} /><span>Color Tokens</span><ChevronRight size={14} /></button>
        <button className={guide === "architecture" ? "selected" : ""} onClick={() => setGuide("architecture")}><FolderTree size={15} /><span>File Structure</span><ChevronRight size={14} /></button>
      </aside>
      <section className="repo-panel repo-style-content">
        {guide === "overview" && <>
          <div className="section-title"><small>DESIGN SYSTEM</small><h2>Classic Desktop Design Architecture</h2></div>
          <p>The institutional repository interface uses classical desktop application ergonomics: compact data tables, explicit borders, distinct header treatments and high-contrast typography designed for focused academic workflows.</p>
          <div className="info-grid">
            <article><b>Deterministic styling</b><p>Consistent design tokens and reusable component patterns maintain a predictable interface.</p></article>
            <article><b>Accessibility first</b><p>Readable contrast, clear control labels and keyboard-accessible actions support everyday use.</p></article>
          </div>
        </>}
        {guide === "theme" && <>
          <div className="section-title"><small>DESIGN TOKENS</small><h2>Institutional Color Palette</h2></div>
          <div className="color-grid">
            {([["Navy Primary", "#003060"], ["Academic Blue", "#1E5F9A"], ["Portal Background", "#E9EEF4"], ["Success State", "#15803D"], ["Panel Border", "#CBD5E1"], ["Main Text", "#0F172A"]] as const).map(([name, color]) => (
              <article key={name}><div style={{ background: color }} /><b>{name}</b><code>{color}</code></article>
            ))}
          </div>
        </>}
        {guide === "architecture" && <>
          <div className="section-title"><small>PROJECT ORGANISATION</small><h2>Core Component Paths</h2></div>
          <div className="path-list">
            {([
              ["src/app/page.tsx", "Main page, state and repository layout"],
              ["src/components/repository/PortalHeader.tsx", "Institutional portal masthead"],
              ["src/components/repository/RepositoryContent.tsx", "Repository content composition"],
              ["src/components/repository/DocumentsTable.tsx", "Document listing and row actions"],
              ["src/components/repository/StyleGuide.tsx", "Embedded UI style guide"],
              ["src/app/globals.css", "Global design tokens and component styles"],
            ] as const).map(([path, description]) => (
              <div key={path}><section><code>{path}</code><p>{description}</p></section>
                <button className="secondary" onClick={() => copyPath(path)}>{copied === path ? <Check size={13} /> : <Copy size={13} />} {copied === path ? "Copied" : "Copy path"}</button>
              </div>
            ))}
          </div>
        </>}
      </section>
    </section>
  );
}
