export type Role = 'SYSTEM_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type Department = 'SOFTWARE_ENGINEERING' | 'CYBER_SECURITY' | 'MULTIMEDIA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: Department; // Required for instructors & students
  isActive: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  department: Department;
  fileUrl: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'ZIP' | 'MP4' | 'CODE';
  uploadedBy: string;
  uploaderName: string;
  downloadCount: number;
  createdAt: string;
}
