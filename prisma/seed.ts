import 'dotenv/config';
import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedDepartment {
  name: string;
  code: string;
  description: string;
}

interface SeedAccount {
  studentId?: string;
  fullName: string;
  email: string;
  password: string;
  role: Role;
  status: AccountStatus;
  department?: string;
  mustChangePassword: boolean;
  createdAt: string;
}

const SEED_DEPARTMENTS: SeedDepartment[] = [
  {
    name: 'Software Engineering',
    code: 'SOFTWARE_ENGINEERING',
    description: 'Software Engineering department',
  },
  {
    name: 'Cyber Security',
    code: 'CYBER_SECURITY',
    description: 'Cyber Security department',
  },
  {
    name: 'Multimedia',
    code: 'MULTIMEDIA',
    description: 'Multimedia department',
  },
];

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    studentId: 'ADM-001',
    fullName: 'Admin Superintendent',
    email: 'admin@college.ac.sz',
    password: 'password123',
    role: Role.ADMIN,
    status: AccountStatus.ACTIVE,
    mustChangePassword: false,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    studentId: 'STF-102',
    fullName: 'Prof. M. Dlamini (SE Instructor)',
    email: 'se.instructor@college.ac.sz',
    password: 'password123',
    role: Role.INSTRUCTOR,
    status: AccountStatus.ACTIVE,
    department: 'SOFTWARE_ENGINEERING',
    mustChangePassword: false,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    studentId: 'STU-2026-004',
    fullName: 'Sipho Nxumalo (SE Student)',
    email: 'student.se@college.ac.sz',
    password: 'password123',
    role: Role.STUDENT,
    status: AccountStatus.ACTIVE,
    department: 'SOFTWARE_ENGINEERING',
    mustChangePassword: false,
    createdAt: '2026-03-01T00:00:00.000Z',
  },
];

function normalizeToken(value?: string): string {
  if (!value) return '';
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function resolveDepartmentId(rawDepartment?: string): Promise<string | null> {
  if (!rawDepartment || !rawDepartment.trim()) return null;

  const trimmed = rawDepartment.trim();
  const spaced = trimmed.replace(/[_-]+/g, ' ').trim();
  const norm = normalizeToken(trimmed);

  const dept = await prisma.department.findFirst({
    where: {
      OR: [
        { code: { equals: trimmed, mode: 'insensitive' } },
        { code: { equals: norm, mode: 'insensitive' } },
        { name: { equals: trimmed, mode: 'insensitive' } },
        { name: { equals: spaced, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  return dept?.id ?? null;
}

async function seedDepartments(): Promise<void> {
  for (const dept of SEED_DEPARTMENTS) {
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: dept.code },
          { name: dept.name },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.department.update({
        where: { id: existing.id },
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description,
        },
      });
    } else {
      await prisma.department.create({
        data: dept,
      });
    }

    console.log(`Seeded department: ${dept.name} (${dept.code})`);
  }
}

async function seedUsers(): Promise<void> {
  for (const account of SEED_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const departmentId = await resolveDepartmentId(account.department);

    if (account.department && !departmentId) {
      throw new Error(
        `Could not resolve departmentId for ${account.email} (${account.department})`
      );
    }

    const email = account.email.toLowerCase();

    await prisma.user.upsert({
      where: { email },
      update: {
        studentId: account.studentId ?? null,
        fullName: account.fullName,
        passwordHash,
        role: account.role,
        status: account.status,
        department: account.department ?? null,
        departmentId,
        mustChangePassword: account.mustChangePassword,
      },
      create: {
        studentId: account.studentId ?? null,
        email,
        fullName: account.fullName,
        passwordHash,
        role: account.role,
        status: account.status,
        department: account.department ?? null,
        departmentId,
        mustChangePassword: account.mustChangePassword,
        createdAt: new Date(account.createdAt),
      },
    });

    console.log(
      `Seeded user: ${account.email} (${account.role}) -> departmentId=${departmentId ?? 'none'}`
    );
  }
}

async function main(): Promise<void> {
  await seedDepartments();
  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });