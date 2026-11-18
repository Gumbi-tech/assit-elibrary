'use client';

import React, { useMemo, useState } from 'react';
import { Search, Filter, Download, Eye, BookOpen, ChevronRight, Layers, Palette, FolderTree, Copy, Check, X, ShieldCheck, Database, FileText, Menu } from 'lucide-react';

type Doc = {
  docId: string; courseCode: string; courseTitle: string; department: string;
  category: string; title: string; summary: string; author: string;
  size: string; pages: number; uploadDate: string; topics: string;
};

const documents: Doc[] = [
  { docId:'DOC-101', courseCode:'SWE-301', courseTitle:'Advanced Software Architecture', department:'Software Engineering', category:'Lecture Notes', title:'Microservices & Event-Driven Patterns', summary:'Comprehensive analysis of decoupled architectures, message brokers, and eventual consistency.', author:'Dr. A. Mthethwa', size:'2.4 MB', pages:34, uploadDate:'2026-02-14', topics:'RabbitMQ, Kafka, Saga Pattern, Circuit Breakers' },
  { docId:'DOC-102', courseCode:'SEC-402', courseTitle:'Network Security & Cryptography', department:'Cyber Security', category:'Past Exam Papers', title:'Final Examination Paper — Semester I, 2025', summary:'Official end-of-term assessment covering public key cryptography, TLS handshakes, and firewall rules.', author:'Prof. J. Dlamini', size:'1.1 MB', pages:12, uploadDate:'2025-11-20', topics:'RSA, AES, Diffie-Hellman, Packet Filtering' },
  { docId:'DOC-103', courseCode:'MMD-201', courseTitle:'Interactive Media Design', department:'Multi Media', category:'Lab Manuals', title:'WebGL Shaders & Three.js Practical Guide', summary:'Step-by-step laboratory manual for building hardware-accelerated 3D environments in web browsers.', author:'Dr. S. Khumalo', size:'4.8 MB', pages:58, uploadDate:'2026-03-01', topics:'Vertex Shaders, Fragment Shaders, Lighting Models, MeshBuffers' },
];

export default function Page() {
  const [tab, setTab] = useState<'portal'|'styleguide'>('portal');
  const [department, setDepartment] = useState('All Departments');
  const [category, setCategory] = useState('All Categories');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<Doc|null>(null);
  const [guide, setGuide] = useState('overview');
  const [copied, setCopied] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => documents.filter(d => {
    const q = query.trim().toLowerCase();
    return (department === 'All Departments' || d.department === department)
      && (category === 'All Categories' || d.category === category)
      && (!q || [d.title,d.courseCode,d.docId,d.courseTitle,d.department].some(v => v.toLowerCase().includes(q)));
  }), [department, category, query]);

  const copyPath = async (path: string) => {
    try { await navigator.clipboard.writeText(path); setCopied(path); window.setTimeout(() => setCopied(''), 1800); }
    catch { setCopied(''); }
  };

  return (
    <div className="repo-page">
      <header className="repo-header">
        <div className="repo-brand">
          <div className="repo-crest"><ShieldCheck size={58}/><b>+</b></div>
          <div>
            <div className="repo-eyebrow">UNIVERSITY ACADEMIC RESOURCES DIVISION</div>
            <h1>Institutional Digital Repository<br/>&amp; E-Library</h1>
            <p>Courseware Distribution System — Verified Lecture Handouts, Lab Manuals &amp; PDFs</p>
          </div>
        </div>
        <div className="repo-status">
          <div><span>ACADEMIC TERM</span><strong>2026 — SEMESTER II</strong></div>
          <div><span>ACCESS LEVEL</span><strong>OPEN STUDENT REPOSITORY</strong></div>
          <div><span>SYSTEM STATUS</span><strong className="online"><i/> ONLINE</strong></div>
          <div><span>ARCHIVE VERSION</span><strong>PDF ARCHIVE v4.2</strong></div>
        </div>
      </header>

      <main className="repo-main">
        <div className="repo-toolbar">
          <div className="repo-breadcrumb"><span>Location:</span><b>Repository Home</b><ChevronRight size={13}/><span>{tab === 'portal' ? 'Academic Departments / All Courses / Handouts & PDFs' : 'System / UI Style Guide'}</span></div>
          <button className="repo-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={17}/></button>
          <nav className={menuOpen ? 'repo-tabs open' : 'repo-tabs'}>
            <button className={tab==='portal'?'active':''} onClick={()=>{setTab('portal');setMenuOpen(false)}}><BookOpen size={14}/> Desktop E-Library Portal</button>
            <button className={tab==='styleguide'?'active':''} onClick={()=>{setTab('styleguide');setMenuOpen(false)}}><Layers size={14}/> Agent UI Style Guide</button>
          </nav>
        </div>

        {tab === 'portal' ? <section className="repo-content">
          <div className="repo-heading">
            <div><small>ACADEMIC RESOURCE COLLECTION</small><h2>Course Materials Repository</h2><p>Browse and access verified academic learning materials.</p></div>
            <div className="repo-count"><strong>{filtered.length}</strong><span>DOCUMENTS FOUND</span></div>
          </div>

          <section className="repo-panel">
            <div className="repo-panel-head"><strong><Filter size={15}/> REFINE DOCUMENTS</strong><span>FILTER BY DEPARTMENT, CATEGORY OR KEYWORD</span></div>
            <div className="repo-filters">
              <label><span>Academic department</span><select value={department} onChange={e=>setDepartment(e.target.value)}><option>All Departments</option><option>Software Engineering</option><option>Cyber Security</option><option>Multi Media</option></select></label>
              <label><span>Document category</span><select value={category} onChange={e=>setCategory(e.target.value)}><option>All Categories</option><option>Lecture Notes</option><option>Past Exam Papers</option><option>Lab Manuals</option><option>Syllabus</option></select></label>
              <label className="repo-search"><span>Search repository</span><div><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title, course code or document ID..."/></div></label>
              <button className="repo-reset" onClick={()=>{setDepartment('All Departments');setCategory('All Categories');setQuery('')}}>Reset filters</button>
            </div>
          </section>

          <section className="repo-panel">
            <div className="repo-panel-head"><strong><Database size={15}/> AVAILABLE LEARNING MATERIALS</strong><span>{filtered.length} RECORD{filtered.length===1?'':'S'}</span></div>
            <div className="repo-table-wrap"><table className="repo-table">
              <thead><tr><th>Document ID</th><th>Course / Resource title</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map(d=><tr key={d.docId}>
                <td><b className="doc-id">{d.docId}</b><small>{d.courseCode}</small></td>
                <td><b className="resource-title">{d.title}</b><span className="course-title">{d.courseTitle}</span><small>{d.author} · {d.pages} pages</small></td>
                <td><span className="category">{d.category}</span></td><td className="nowrap">{d.size}</td><td className="nowrap">{d.uploadDate}</td>
                <td><div className="row-actions"><button className="secondary" onClick={()=>setPreview(d)}><Eye size={13}/> Preview</button><button className="primary" onClick={()=>setPreview(d)}><Download size={13}/> Download PDF</button></div></td>
              </tr>)}{filtered.length===0&&<tr><td colSpan={6} className="empty">No documents match your search. Try changing the filters.</td></tr>}</tbody>
            </table></div>
            <div className="repo-table-foot"><span>Showing {filtered.length} of {documents.length} indexed documents</span><span>Repository records are provided for demonstration</span></div>
          </section>
        </section> : <section className="repo-style-layout">
          <aside className="repo-panel repo-style-nav"><div className="repo-panel-head"><strong>DESIGN SPECIFICATIONS</strong></div>
            {[{id:'overview',label:'Overview & Principles',icon:<Layers size={15}/>},{id:'theme',label:'Color Tokens',icon:<Palette size={15}/>},{id:'architecture',label:'File Structure',icon:<FolderTree size={15}/>}].map(i=><button key={i.id} className={guide===i.id?'selected':''} onClick={()=>setGuide(i.id)}>{i.icon}<span>{i.label}</span><ChevronRight size={14}/></button>)}
          </aside>
          <section className="repo-panel repo-style-content">
            {guide==='overview'&&<><div className="section-title"><small>DESIGN SYSTEM</small><h2>Classic Desktop Design Architecture</h2></div><p>The institutional repository interface uses classical desktop application ergonomics: compact data tables, explicit borders, distinct header treatments and high-contrast typography designed for focused academic workflows.</p><div className="info-grid"><article><b>Deterministic styling</b><p>Consistent design tokens and reusable component patterns maintain a predictable interface.</p></article><article><b>Accessibility first</b><p>Readable contrast, clear control labels and keyboard-accessible actions support everyday use.</p></article></div></>}
            {guide==='theme'&&<><div className="section-title"><small>DESIGN TOKENS</small><h2>Institutional Color Palette</h2></div><div className="color-grid">{[['Navy Primary','#003060'],['Academic Blue','#1E5F9A'],['Portal Background','#E9EEF4'],['Success State','#15803D'],['Panel Border','#CBD5E1'],['Main Text','#0F172A']].map(([n,c])=><article key={n}><div style={{background:c}}/><b>{n}</b><code>{c}</code></article>)}</div></>}
            {guide==='architecture'&&<><div className="section-title"><small>PROJECT ORGANISATION</small><h2>Core Component Paths</h2></div><div className="path-list">{[['src/app/page.tsx','Main page, state and repository layout'],['src/components/PortalHeader.tsx','Original portal masthead component'],['src/components/DocumentList.tsx','Original document listing component'],['src/components/DocumentModal.tsx','Original document preview dialog'],['src/app/globals.css','Application-wide design tokens and styles']].map(([p,d])=><div key={p}><section><code>{p}</code><p>{d}</p></section><button className="secondary" onClick={()=>copyPath(p)}>{copied===p?<Check size={13}/>:<Copy size={13}/>} {copied===p?'Copied':'Copy path'}</button></div>)}</div></>}
          </section>
        </section>}
      </main>

      <footer className="repo-footer"><span>INSTITUTIONAL DIGITAL REPOSITORY</span><span>ACADEMIC RESOURCES DIVISION · ARCHIVE v4.2</span></footer>

      {preview&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null)}}><section className="repo-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header><strong><FileText size={16}/> DOCUMENT INFORMATION</strong><button onClick={()=>setPreview(null)} aria-label="Close"><X size={18}/></button></header>
        <div className="modal-body"><small>{preview.docId} · {preview.courseCode}</small><h2 id="modal-title">{preview.title}</h2><p>{preview.summary}</p>
          <dl>{[['Course',preview.courseTitle],['Department',preview.department],['Category',preview.category],['Author',preview.author],['File size',preview.size],['Pages',String(preview.pages)],['Uploaded',preview.uploadDate]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <div className="topics"><b>TOPICS COVERED</b><p>{preview.topics}</p></div>
        </div><footer><button className="secondary" onClick={()=>setPreview(null)}>Close</button><button className="primary" onClick={()=>setPreview(null)}><Download size={14}/> Download PDF</button></footer>
      </section></div>}

      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;min-height:100%;width:100%}body{background:#E9EEF4;color:#0F172A;font-family:Arial,Helvetica,sans-serif}
        .repo-page{width:100%;min-height:100vh;display:flex;flex-direction:column;background:#E9EEF4;color:#0F172A;font:13px Arial,Helvetica,sans-serif}
        .repo-header{width:100%;display:flex;align-items:center;justify-content:space-between;gap:28px;padding:25px 32px;color:white;background:linear-gradient(115deg,#0A192F,#1B365D);border-bottom:4px solid #004085}
        .repo-brand{display:flex;align-items:center;gap:20px;min-width:0}.repo-crest{width:100px;height:108px;flex:0 0 100px;position:relative;display:grid;place-items:center;color:white;background:rgba(255,255,255,.06);clip-path:polygon(50% 0,95% 17%,91% 72%,50% 100%,9% 72%,5% 17%)}.repo-crest b{position:absolute;font-size:46px}
        .repo-eyebrow{color:#B9CBE0;font-size:10px;font-weight:bold;letter-spacing:.15em;margin-bottom:10px}.repo-brand h1{font: bold clamp(23px,2.5vw,34px)/1.12 Georgia,serif;text-transform:uppercase;margin:0}.repo-brand p{color:#D5E1EF;margin:12px 0 0;font-size:12px}
        .repo-status{display:grid;grid-template-columns:repeat(2,minmax(135px,1fr));gap:10px 18px;min-width:310px}.repo-status div{border-left:2px solid #4F78A8;padding-left:10px;display:flex;flex-direction:column;gap:5px}.repo-status span{color:#AFC2D9;font-size:9px;letter-spacing:.1em;font-weight:bold}.repo-status strong{color:white;font-size:11px}.online{display:flex;align-items:center;gap:6px}.online i{width:7px;height:7px;border-radius:50%;background:#42D392}
        .repo-main{width:100%;max-width:1600px;margin:0 auto;padding:0 30px 34px;flex:1 0 auto}.repo-toolbar{min-height:58px;display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:1px solid #CBD5E1;margin-bottom:26px}
        .repo-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:7px;color:#64748B;font-size:11px}.repo-breadcrumb b{color:#003060;background:white;border:1px solid #CBD5E1;padding:5px 8px}
        .repo-tabs{display:flex;align-items:stretch;align-self:stretch;gap:5px}.repo-tabs button{display:flex;align-items:center;gap:8px;padding:0 15px;border:0;border-bottom:3px solid transparent;background:transparent;color:#475467;font-size:11px;font-weight:bold;text-transform:uppercase;cursor:pointer}.repo-tabs button.active{color:#003060;border-bottom-color:#004085;background:rgba(255,255,255,.45)}.repo-tabs button:hover{background:#DDE6F0}.repo-menu{display:none}
        .repo-content{display:flex;flex-direction:column;gap:20px;width:100%}.repo-heading{display:flex;align-items:end;justify-content:space-between;gap:20px}.repo-heading small,.section-title small{color:#1E5F9A;font-size:9px;font-weight:bold;letter-spacing:.14em}.repo-heading h2{color:#0F294A;font:25px Georgia,serif;margin:5px 0 4px}.repo-heading p{color:#64748B;margin:0;font-size:12px}.repo-count{display:flex;flex-direction:column;align-items:flex-end;gap:2px;color:#64748B;font-size:9px;letter-spacing:.1em}.repo-count strong{color:#003060;font-size:23px}
        .repo-panel{background:white;border:1px solid #CBD5E1;box-shadow:0 1px 2px rgba(15,41,74,.04);min-width:0}.repo-panel-head{min-height:39px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(#F8FAFC,#EDF2F7);border-bottom:1px solid #CBD5E1;color:#1B365D}.repo-panel-head strong{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.07em}.repo-panel-head>span{color:#8491A3;font-size:9px;letter-spacing:.06em}
        .repo-filters{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) minmax(230px,1.5fr) auto;align-items:end;gap:14px;padding:16px}.repo-filters label{min-width:0;display:flex;flex-direction:column;gap:6px}.repo-filters label>span{color:#475467;font-size:10px;font-weight:bold}.repo-filters select,.repo-search>div{height:36px;width:100%;border:1px solid #AAB7C6;border-radius:2px;background:white;color:#1E293B;font:11px Arial;padding:0 9px}.repo-search>div{display:flex;align-items:center;gap:8px;color:#64748B}.repo-search input{width:100%;min-width:0;border:0;outline:0;color:#0F172A;font:11px Arial}.repo-filters select:focus,.repo-search>div:focus-within{outline:2px solid #C8D8F0;border-color:#1E5F9A}.repo-reset{height:36px;padding:0 13px;border:1px solid #AAB7C6;background:#F8FAFC;color:#334155;font-size:10px;font-weight:bold;cursor:pointer}
        .repo-table-wrap{width:100%;overflow-x:auto}.repo-table{width:100%;border-collapse:collapse;text-align:left;font-size:11px}.repo-table th{padding:11px 12px;background:#F1F5F9;color:#334155;border-bottom:1px solid #CBD5E1;border-right:1px solid #E2E8F0;font-size:9px;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}.repo-table td{padding:13px 12px;border-bottom:1px solid #E2E8F0;border-right:1px solid #F1F5F9;color:#334155;vertical-align:middle}.repo-table tbody tr:nth-child(even){background:#FAFCFE}.repo-table tbody tr:hover{background:#EDF4FC}.repo-table td small{display:block;margin-top:4px;color:#7B8797;font-size:9px}.doc-id{display:block;color:#003060;font: bold 10px Consolas,monospace}.resource-title{display:block;color:#004085;font-size:11px}.course-title{display:block;margin-top:4px;color:#334155;font-size:10px}.category{display:inline-block;padding:4px 6px;color:#345477;background:#EDF4FC;border:1px solid #D0DFF0;font-size:9px}.nowrap{white-space:nowrap}
        .row-actions{display:flex;gap:6px;white-space:nowrap}.repo-page button,.repo-modal button{cursor:pointer}.repo-page button.primary,.repo-modal button.primary{min-height:29px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;border:1px solid #003D82;border-radius:2px;background:linear-gradient(#0062CC,#004B9E);color:white;font-size:10px;font-weight:bold}.repo-page button.secondary,.repo-modal button.secondary{min-height:29px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;border:1px solid #AAB7C6;border-radius:2px;background:linear-gradient(white,#F1F5F9);color:#1E293B;font-size:10px;font-weight:bold}.empty{text-align:center;padding:35px!important;color:#64748B!important}.repo-table-foot{display:flex;justify-content:space-between;gap:10px;padding:10px 13px;color:#7B8797;background:#FAFCFE;font-size:9px}
        .repo-style-layout{display:grid;grid-template-columns:245px minmax(0,1fr);align-items:start;gap:20px}.repo-style-nav{padding-bottom:8px}.repo-style-nav .repo-panel-head{margin-bottom:7px}.repo-style-nav>button{width:calc(100% - 14px);min-height:39px;margin:2px 7px;padding:0 10px;display:flex;align-items:center;gap:9px;border:0;background:transparent;color:#475467;text-align:left;font-size:11px}.repo-style-nav>button span{flex:1}.repo-style-nav>button.selected{background:#1B365D;color:white}.repo-style-content{min-height:330px;padding:24px}.section-title{padding-bottom:13px;border-bottom:1px solid #CBD5E1}.section-title h2{margin:5px 0 0;color:#1B365D;font:21px Georgia,serif}.repo-style-content>p{max-width:850px;color:#475467;font-size:12px;line-height:1.8}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:22px}.info-grid article,.color-grid article{padding:14px;border:1px solid #CBD5E1;background:#F8FAFC}.info-grid b{color:#1B365D;font-size:12px}.info-grid p{color:#64748B;font-size:11px;line-height:1.6}.color-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}.color-grid article{display:flex;flex-direction:column;gap:6px;background:white}.color-grid article>div{height:48px;border:1px solid rgba(15,23,42,.12)}.color-grid b{font-size:11px}.color-grid code,.path-list code{color:#004085;font:10px Consolas,monospace}.path-list{display:flex;flex-direction:column;gap:8px;margin-top:18px}.path-list>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 12px;border:1px solid #CBD5E1;background:#F8FAFC}.path-list p{margin:4px 0 0;color:#64748B;font-size:10px}
        .repo-footer{width:100%;min-height:44px;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:0 30px;border-top:1px solid #CBD5E1;background:#F8FAFC;color:#7B8797;font-size:9px;letter-spacing:.07em}
        .modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(5,15,30,.58)}.repo-modal{width:min(580px,100%);max-height:85vh;overflow:auto;background:white;border:1px solid #94A3B8;box-shadow:0 18px 60px rgba(0,0,0,.25)}.repo-modal>header{min-height:46px;display:flex;justify-content:space-between;align-items:center;padding:0 16px;background:#1B365D;color:white}.repo-modal>header strong{display:flex;align-items:center;gap:9px;font-size:10px;letter-spacing:.08em}.repo-modal>header button{display:grid;place-items:center;border:0;background:transparent;color:white}.modal-body{padding:22px}.modal-body>small{color:#1E5F9A;font: bold 10px Consolas,monospace}.modal-body h2{margin:8px 0;color:#0F294A;font:22px Georgia,serif}.modal-body>p{color:#64748B;font-size:12px;line-height:1.6}.modal-body dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;margin:20px 0}.modal-body dl div{padding:10px 0;border-bottom:1px solid #E2E8F0}.modal-body dt{color:#7B8797;font-size:9px;text-transform:uppercase}.modal-body dd{margin:4px 0 0;color:#1E293B;font-size:11px;font-weight:bold}.topics{padding:12px;background:#F1F5F9;border:1px solid #E2E8F0}.topics b{color:#1B365D;font-size:9px;letter-spacing:.08em}.topics p{margin:6px 0 0;color:#475467;font-size:11px}.repo-modal>footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid #E2E8F0;background:#F8FAFC}
        @media(max-width:900px){.repo-header{flex-direction:column;gap:20px}.repo-status{min-width:0;grid-template-columns:repeat(4,minmax(0,1fr))}.repo-main{padding:0 18px 26px}.repo-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:640px){.repo-header{padding:20px 16px}.repo-brand{align-items:flex-start;gap:12px}.repo-crest{width:64px;height:72px;flex-basis:64px}.repo-crest svg{width:42px}.repo-crest b{font-size:32px}.repo-brand h1{font-size:20px}.repo-brand p{font-size:10px;line-height:1.5}.repo-eyebrow{font-size:8px}.repo-status{grid-template-columns:repeat(2,minmax(0,1fr))}.repo-main{padding:0 12px 22px}.repo-toolbar{position:relative;min-height:52px;margin-bottom:20px}.repo-breadcrumb{max-width:calc(100% - 42px);font-size:9px}.repo-menu{display:grid;place-items:center;width:34px;height:32px;border:1px solid #CBD5E1;background:white;color:#1B365D}.repo-tabs{display:none;position:absolute;z-index:20;top:46px;right:0;width:min(280px,100%);flex-direction:column;padding:5px;background:white;border:1px solid #CBD5E1;box-shadow:0 8px 24px rgba(15,41,74,.15)}.repo-tabs.open{display:flex}.repo-tabs button{min-height:40px;padding:0 10px;border:0;text-align:left}.repo-heading h2{font-size:21px}.repo-heading p{max-width:230px;line-height:1.5}.repo-filters{grid-template-columns:1fr}.repo-table{min-width:850px}.repo-table-foot,.repo-footer{flex-direction:column;align-items:flex-start;justify-content:center;padding-top:10px;padding-bottom:10px}.repo-style-layout{grid-template-columns:1fr}.color-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.info-grid{grid-template-columns:1fr}.repo-style-content{padding:16px}.path-list>div{align-items:flex-start}.modal-body dl{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
