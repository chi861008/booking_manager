'use client';
import { useCallback, useEffect, useState } from 'react';

type Member = { id: string; name: string; joinedAt: string };
type Invitation = { id: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
type Studio = { id: string; name: string; members: Member[]; invitations: Invitation[] };

export default function StudioAdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [studios, setStudios] = useState<Studio[]>([]); const [newName, setNewName] = useState('');
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/studio-admin', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { setAuthenticated(false); return; }
    if (!response.ok) throw new Error(data.error || '載入管理資料失敗');
    setAuthenticated(true); setStudios(data.studios ?? []);
  }, []);
  useEffect(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : '載入失敗')); }, [load]);
  async function request(url: string, method: string, body?: object) {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || '操作失敗'); return result;
  }
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await request('/api/studio-admin/auth', 'POST', { username, password }); setPassword(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '登入失敗'); }
    finally { setBusy(false); }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失敗'); }
    finally { setBusy(false); }
  }
  if (authenticated === null) return <main className="teacher-manage-page admin-shell"><section className="card admin-card">載入中…</section></main>;
  if (!authenticated) return <main className="teacher-manage-page admin-shell admin-login">
    <header className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">✦</span><span>工作室管理</span></header>
    <section className="admin-login-card">
    <div className="admin-eyebrow">ADMINISTRATION</div>
    <header className="teacher-manage-heading"><h1>行政人員登入</h1><p>登入後管理工作室與老師邀請。</p></header>
    {error && <p className="warn" role="alert">{error}</p>}
    <form className="card admin-card" onSubmit={login}><label className="hint" htmlFor="admin-user">行政帳號</label>
      <input id="admin-user" className="tin" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} />
      <label className="hint" htmlFor="admin-pass" style={{ display: 'block', marginTop: 14 }}>密碼</label>
      <input id="admin-pass" className="tin" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
      <button className="btn pri" style={{ width: '100%', marginTop: 16 }} disabled={busy || !username || !password}>登入</button>
    </form>
    </section>
  </main>;
  return <main className="teacher-manage-page admin-shell">
    <header className="admin-topbar"><div className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">✦</span><span>工作室管理</span></div>
      <button className="btn outline admin-logout" onClick={() => void run(async () => { await request('/api/studio-admin/auth', 'DELETE'); setAuthenticated(false); })}>登出</button>
    </header>
    <div className="admin-page-intro"><div className="admin-eyebrow">ADMINISTRATION</div><h1>工作室總覽</h1><p>管理工作室、邀請老師加入，並維護工作室成員。</p></div>
    {error && <p className="warn" role="alert">{error}</p>}
    <section className="card admin-card admin-create-card"><div className="admin-card-heading"><span className="admin-step">01</span><div><h2>新增工作室</h2><p>建立工作室後，即可邀請老師加入。</p></div></div><div className="admin-create-row">
      <input className="tin" aria-label="工作室名稱" placeholder="工作室名稱" value={newName} onChange={event => setNewName(event.target.value)} />
      <button className="btn pri" disabled={busy || newName.trim().length < 2} onClick={() => void run(async () => { await request('/api/studio-admin', 'POST', { name: newName.trim() }); setNewName(''); })}>新增工作室</button>
    </div></section>
    {studios.map((studio, index) => <section className="card admin-card admin-studio-card" key={studio.id}>
      <div className="admin-studio-heading"><span className="admin-step">{String(index + 2).padStart(2, '0')}</span><div><div className="admin-eyebrow">STUDIO</div><h2>{studio.name}</h2></div><span className="admin-member-count">{studio.members.length} 位老師</span>
        <button type="button" className="btn outline admin-delete-studio" disabled={busy} onClick={() => {
          const confirmed = window.confirm(`確定移除「${studio.name}」？工作室成員關係與邀請會刪除；老師帳號和一般課程會保留。未來已安排的工作室代課會取消，並交回原老師重新安排。`);
          if (confirmed) void run(async () => { await request('/api/studio-admin', 'DELETE', { studioId: studio.id }); setInviteUrls(current => { const next = { ...current }; delete next[studio.id]; return next; }); });
        }}>移除工作室</button>
      </div>
      <div className="admin-invite-panel"><div className="admin-invite-copy"><h3>邀請老師加入</h3><p>邀請連結限一人使用，30 天內有效。複製後傳給老師，對方用 LINE 登入即可加入。</p></div>
      <button className="btn pri admin-invite-button" disabled={busy} onClick={() => void run(async () => { const result = await request('/api/studio-admin/invitations', 'POST', { studioId: studio.id }); setInviteUrls(current => ({ ...current, [studio.id]: result.url })); })}>產生邀請連結</button>
      {inviteUrls[studio.id] && <div className="admin-invite-result"><input className="tin" readOnly aria-label="邀請連結" value={inviteUrls[studio.id]} onFocus={event => event.target.select()} />
        <button className="btn outline" onClick={() => void navigator.clipboard.writeText(inviteUrls[studio.id])}>複製連結</button></div>}</div>
      {studio.invitations.filter(row => !row.acceptedAt && !row.revokedAt && Date.parse(row.expiresAt) > Date.now()).map(row => <div className="li admin-invite-row" key={row.id}>
        <span>未使用邀請・{new Date(row.expiresAt).toLocaleDateString('zh-TW')} 到期</span>
        <button className="btn outline" disabled={busy} onClick={() => void run(async () => { await request('/api/studio-admin/invitations', 'DELETE', { id: row.id }); })}>撤銷</button>
      </div>)}
      <div className="admin-members-heading"><h3>工作室老師</h3><span>{studio.members.length}</span></div>
      {studio.members.length === 0 && <p className="hint admin-empty">目前還沒有老師加入。</p>}
      {studio.members.map(member => <div className="li" key={member.id}><div><b>{member.name}</b><div className="hint">加入日期：{new Date(member.joinedAt).toLocaleDateString('zh-TW')}</div></div>
        <button className="btn outline" disabled={busy} onClick={() => { if (window.confirm(`移除 ${member.name}？未來的代課會改為待重新安排。`)) void run(async () => { await request(`/api/studio-admin/members/${member.id}`, 'DELETE'); }); }}>移除</button>
      </div>)}
    </section>)}
    {studios.length === 0 && <section className="card"><p className="hint">尚未建立工作室。</p></section>}
  </main>;
}
