'use client';

import React from 'react';
import { Filter, LayoutGrid, List, Search } from 'lucide-react';
import type { CourseRecord } from '@/lib/library-api';

export type FilterViewMode = 'table' | 'gallery';

type DepartmentCourseFilterProps = {
  panelTitle?: string;
  panelBadge?: string;
  courses: CourseRecord[];
  categories: readonly string[];
  courseFilter: string;
  categoryFilter: string;
  searchQuery: string;
  viewMode?: FilterViewMode;
  disabled?: boolean;
  onCourseChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  onViewModeChange?: (mode: FilterViewMode) => void;
};

export const DepartmentCourseFilter: React.FC<DepartmentCourseFilterProps> = ({
  panelTitle = 'DEPARTMENT & COURSE FILTERS',
  panelBadge,
  courses,
  categories,
  courseFilter,
  categoryFilter,
  searchQuery,
  viewMode = 'table',
  disabled = false,
  onCourseChange,
  onCategoryChange,
  onSearchChange,
  onReset,
  onViewModeChange,
}) => {
  return (
    <section className="repo-panel">
      <div className="repo-panel-head">
        <strong>
          <Filter size={15} aria-hidden="true" /> {panelTitle}
        </strong>
        {panelBadge && <span>{panelBadge}</span>}
      </div>

      <div className="repo-filters">
        <label>
          <span>Course</span>
          <select
            value={courseFilter}
            disabled={disabled}
            onChange={(e) => onCourseChange(e.target.value)}
          >
            <option value="ALL">All Department Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {course.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Category</span>
          <select
            value={categoryFilter}
            disabled={disabled}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="repo-search">
          <span>Search PDFs</span>
          <div>
            <Search size={15} aria-hidden="true" />
            <input
              value={searchQuery}
              disabled={disabled}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Title, filename, or course code..."
            />
          </div>
        </label>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            className="repo-reset"
            disabled={disabled}
            onClick={onReset}
          >
            Reset
          </button>

          {onViewModeChange && (
            <div
              role="group"
              aria-label="Layout view"
              style={{
                display: 'inline-flex',
                border: '1px solid #AAB7C6',
                borderRadius: '2px',
              }}
            >
              <button
                type="button"
                className={viewMode === 'table' ? 'primary' : 'secondary'}
                onClick={() => onViewModeChange('table')}
                style={{ border: 'none', minHeight: '32px', padding: '0 8px' }}
                title="Table View"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                className={viewMode === 'gallery' ? 'primary' : 'secondary'}
                onClick={() => onViewModeChange('gallery')}
                style={{ border: 'none', minHeight: '32px', padding: '0 8px' }}
                title="Gallery View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DepartmentCourseFilter;