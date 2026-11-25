import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { canReadDocuments, getAccessContext } from '@/lib/document-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



