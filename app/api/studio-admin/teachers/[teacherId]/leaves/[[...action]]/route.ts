import { proxyAdminRequest } from '@/lib/backend';

type Context = { params: Promise<{ teacherId: string; action?: string[] }> };
async function handle(req: Request, context: Context) {
  const { teacherId, action = [] } = await context.params;
  const path = `/api/internal/studio-admin/teachers/${encodeURIComponent(teacherId)}/leaves${action.length ? '/' + action.map(encodeURIComponent).join('/') : ''}${new URL(req.url).search}`;
  const body = ['POST', 'PATCH'].includes(req.method) ? await req.json().catch(() => ({})) : undefined;
  return proxyAdminRequest(path, req.method, body);
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const PATCH = handle;
