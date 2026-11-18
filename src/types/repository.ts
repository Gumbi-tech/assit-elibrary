export type RepositoryDocument = {
  docId: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  category: string;
  title: string;
  summary: string;
  author: string;
  size: string;
  pages: number;
  uploadDate: string;
  topics: string;
};

export type RepositoryTab = "portal" | "styleguide";
