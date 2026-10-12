import { proxyAdminRequest } from '@/lib/backend';

export async function POST(req: Request) {
  return proxyAdminRequest('/api/internal/studio-admin/invitations', 'POST', await req.json().catch(() => ({})));
}
export async function DELETE(req: Request) {
  return proxyAdminRequest('/api/internal/studio-admin/invitations', 'DELETE', await req.json().catch(() => ({})));
}
