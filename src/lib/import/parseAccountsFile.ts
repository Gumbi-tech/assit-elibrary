import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { BulkAccountRowSchema, ValidatedAccountRow } from '@/lib/validators/account';

export interface RowValidationError {
  rowNumber: number;
  email?: string;
  studentId?: string;
  errors: string[];
  raw: Record<string, unknown>;
}

export interface ParsedAccountsResult {
  validRows: ValidatedAccountRow[];
  invalidRows: RowValidationError[];
  totalRows: number;
}

const HEADER_ALIASES: Record<string, string> = {
  studentid: 'studentId',
  student_id: 'studentId',
  studentnumber: 'studentId',
  student_number: 'studentId',
  regno: 'studentId',
  reg_no: 'studentId',
  email: 'email',
  emailaddress: 'email',
  email_address: 'email',
  fullname: 'fullName',
  full_name: 'fullName',
  name: 'fullName',
  role: 'role',
  usertype: 'role',
  user_type: 'role',
  department: 'department',
  dept: 'department',
  program: 'program',
  programme: 'program',
  course: 'program',
  yearofstudy: 'yearOfStudy',
  year_of_study: 'yearOfStudy',
  year: 'yearOfStudy',
  level: 'yearOfStudy',
  phone: 'phone',
  phonenumber: 'phone',
  phone_number: 'phone',
  mobile: 'phone',
};

function normalizeHeader(header: string): string {
  const cleaned = header.trim().toLowerCase().replace(/\s+/g, '_');
  return HEADER_ALIASES[cleaned] ?? cleaned;
}

export function generateTempPassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

export function parseAccountsBuffer(buffer: Buffer): ParsedAccountsResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { validRows: [], invalidRows: [], totalRows: 0 };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  const validRows: ValidatedAccountRow[] = [];
  const invalidRows: RowValidationError[] = [];
  const seenEmails = new Set<string>();
  const seenStudentIds = new Set<string>();

  rawRecords.forEach((rawRecord, index) => {
    const rowNumber = index + 2; // +2 accounts for 1-based indexing and header row
    const mapped: Record<string, unknown> = {};
    const extraFields: Record<string, unknown> = {};

    for (const [rawKey, rawVal] of Object.entries(rawRecord)) {
      const normalizedKey = normalizeHeader(rawKey);
      const value = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

      if (
        [
          'studentId',
          'email',
          'fullName',
          'role',
          'department',
          'program',
          'yearOfStudy',
          'phone',
        ].includes(normalizedKey)
      ) {
        mapped[normalizedKey] =
          normalizedKey === 'role' && typeof value === 'string' && value !== ''
            ? value.toUpperCase()
            : value;
      } else if (value !== '' && value !== null && value !== undefined) {
        extraFields[rawKey.trim()] = value;
      }
    }

    if (Object.keys(extraFields).length > 0) {
      mapped.profileData = extraFields;
    }

    const parsed = BulkAccountRowSchema.safeParse(mapped);
    if (!parsed.success) {
      invalidRows.push({
        rowNumber,
        email: typeof mapped.email === 'string' ? mapped.email : undefined,
        studentId: typeof mapped.studentId === 'string' ? mapped.studentId : undefined,
        errors: parsed.error.issues.map((issue) => issue.message),
        raw: rawRecord,
      });
      return;
    }

    const rowErrors: string[] = [];
    if (seenEmails.has(parsed.data.email)) {
      rowErrors.push(`Duplicate email in file: ${parsed.data.email}`);
    }
    if (parsed.data.studentId && seenStudentIds.has(parsed.data.studentId)) {
      rowErrors.push(`Duplicate student ID in file: ${parsed.data.studentId}`);
    }

    if (rowErrors.length > 0) {
      invalidRows.push({
        rowNumber,
        email: parsed.data.email,
        studentId: parsed.data.studentId,
        errors: rowErrors,
        raw: rawRecord,
      });
      return;
    }

    seenEmails.add(parsed.data.email);
    if (parsed.data.studentId) {
      seenStudentIds.add(parsed.data.studentId);
    }

    validRows.push(parsed.data);
  });

  return {
    validRows,
    invalidRows,
    totalRows: rawRecords.length,
  };
}