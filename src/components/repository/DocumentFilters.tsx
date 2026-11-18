import { Filter, Search } from "lucide-react";

type Props = {
  department: string;
  category: string;
  query: string;
  setDepartment: (value: string) => void;
  setCategory: (value: string) => void;
  setQuery: (value: string) => void;
};

export default function DocumentFilters(props: Props) {
  const { department, category, query, setDepartment, setCategory, setQuery } = props;
  return (
    <section className="repo-panel">
      <div className="repo-panel-head">
        <strong><Filter size={15} /> REFINE DOCUMENTS</strong>
        <span>FILTER BY DEPARTMENT, CATEGORY OR KEYWORD</span>
      </div>
      <div className="repo-filters">
        <label>
          <span>Academic department</span>
          <select value={department} onChange={e => setDepartment(e.target.value)}>
            <option>All Departments</option><option>Software Engineering</option><option>Cyber Security</option><option>Multi Media</option>
          </select>
        </label>
        <label>
          <span>Document category</span>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option>All Categories</option><option>Lecture Notes</option><option>Past Exam Papers</option><option>Lab Manuals</option><option>Syllabus</option>
          </select>
        </label>
        <label className="repo-search">
          <span>Search repository</span>
          <div><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Title, course code or document ID..." /></div>
        </label>
        <button className="repo-reset" onClick={() => { setDepartment("All Departments"); setCategory("All Categories"); setQuery(""); }}>
          Reset filters
        </button>
      </div>
    </section>
  );
}
