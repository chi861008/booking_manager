import { proxyAdminRequest } from '@/lib/backend';

export async function DELETE(_req: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  return proxyAdminRequest(`/api/internal/studio-admin/members/${encodeURIComponent(teacherId)}`, 'DELETE');
}
