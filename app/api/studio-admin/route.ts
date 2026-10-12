import { proxyAdminRequest } from '@/lib/backend';

export const dynamic = 'force-dynamic';
export async function GET() { return proxyAdminRequest('/api/internal/studio-admin', 'GET'); }
export async function POST(req: Request) { return proxyAdminRequest('/api/internal/studio-admin', 'POST', await req.json().catch(() => ({}))); }
