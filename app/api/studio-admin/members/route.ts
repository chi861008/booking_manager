import { proxyAdminRequest } from '@/lib/backend';

export async function POST(req: Request) {
  return proxyAdminRequest('/api/internal/studio-admin/members', 'POST', await req.json().catch(() => ({})));
}
