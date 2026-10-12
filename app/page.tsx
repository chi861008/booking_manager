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
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [lineIds, setLineIds] = useState<Record<string, string>>({});
  const [memberNotice, setMemberNotice] = useState<Record<string, string>>({});
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
  if (authenticated === null) return <main className="teacher-manage-page"><section className="card">載入中…</section></main>;
  if (!authenticated) return <main className="teacher-manage-page" style={{ maxWidth: 560 }}>
    <header className="teacher-manage-heading"><h1>工作室行政管理</h1><p>請使用行政人員帳號登入。</p></header>
    {error && <p className="warn" role="alert">{error}</p>}
    <form className="card" onSubmit={login}><label className="hint" htmlFor="admin-user">行政帳號</label>
      <input id="admin-user" className="tin" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} />
      <label className="hint" htmlFor="admin-pass" style={{ display: 'block', marginTop: 14 }}>密碼</label>
      <input id="admin-pass" className="tin" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
      <button className="btn pri" style={{ width: '100%', marginTop: 16 }} disabled={busy || !username || !password}>登入</button>
    </form>
  </main>;
  return <main className="teacher-manage-page" style={{ paddingBottom: 90 }}>
    <header className="teacher-manage-heading"><h1>工作室行政管理</h1><p>由行政人員管理工作室、邀請與老師名單。</p>
      <button className="btn outline" onClick={() => void run(async () => { await request('/api/studio-admin/auth', 'DELETE'); setAuthenticated(false); })}>登出</button>
    </header>
    {error && <p className="warn" role="alert">{error}</p>}
    <section className="card"><h2>新增工作室</h2><div className="row" style={{ gap: 10 }}>
      <input className="tin" aria-label="工作室名稱" placeholder="工作室名稱" value={newName} onChange={event => setNewName(event.target.value)} />
      <button className="btn pri" disabled={busy || newName.trim().length < 2} onClick={() => void run(async () => { await request('/api/studio-admin', 'POST', { name: newName.trim() }); setNewName(''); })}>新增</button>
    </div></section>
    {studios.map(studio => <section className="card" key={studio.id}>
      <h2>{studio.name}</h2>
      <h3>邀請老師</h3><p className="hint">邀請連結限一人使用，有效期 30 天。</p>
      <button className="btn pri" disabled={busy} onClick={() => void run(async () => { const result = await request('/api/studio-admin/invitations', 'POST', { studioId: studio.id }); setInviteUrls(current => ({ ...current, [studio.id]: result.url })); })}>產生邀請連結</button>
      {inviteUrls[studio.id] && <div style={{ marginTop: 12 }}><input className="tin" readOnly aria-label="邀請連結" value={inviteUrls[studio.id]} onFocus={event => event.target.select()} />
        <button className="btn outline" style={{ marginTop: 8 }} onClick={() => void navigator.clipboard.writeText(inviteUrls[studio.id])}>複製連結</button></div>}
      {studio.invitations.filter(row => !row.acceptedAt && !row.revokedAt && Date.parse(row.expiresAt) > Date.now()).map(row => <div className="li" key={row.id}>
        <span>未使用邀請・{new Date(row.expiresAt).toLocaleDateString('zh-TW')} 到期</span>
        <button className="btn outline" disabled={busy} onClick={() => void run(async () => { await request('/api/studio-admin/invitations', 'DELETE', { id: row.id }); })}>撤銷</button>
      </div>)}
      <h3 style={{ marginTop: 22 }}>用 LINE ID 加入老師</h3>
      <p className="hint">老師不用加行政人員好友。請老師先在排課網站用 LINE 登入一次，將畫面顯示的 LINE ID 傳給行政人員；加入後即可登入。</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <input className="tin" aria-label="老師姓名" placeholder="老師姓名" value={memberNames[studio.id] ?? ''} onChange={event => setMemberNames(current => ({ ...current, [studio.id]: event.target.value }))} />
        <input className="tin" aria-label="LINE ID" placeholder="LINE ID（U 開頭的 33 碼代碼）" autoCapitalize="off" autoCorrect="off" value={lineIds[studio.id] ?? ''} onChange={event => setLineIds(current => ({ ...current, [studio.id]: event.target.value.trim() }))} />
        <button className="btn pri" disabled={busy || !lineIds[studio.id]?.trim()} onClick={() => void run(async () => {
          const result = await request('/api/studio-admin/members', 'POST', { studioId: studio.id, name: memberNames[studio.id] ?? '', lineUserId: lineIds[studio.id].trim() });
          setMemberNotice(current => ({ ...current, [studio.id]: result.alreadyMember ? `${result.name} 已在這個工作室。` : `已將 ${result.name} 加入工作室。` }));
          setLineIds(current => ({ ...current, [studio.id]: '' })); setMemberNames(current => ({ ...current, [studio.id]: '' }));
        })}>加入老師</button>
        {memberNotice[studio.id] && <p className="hint" role="status">{memberNotice[studio.id]}</p>}
      </div>
      <h3 style={{ marginTop: 22 }}>工作室老師（{studio.members.length}）</h3>
      {studio.members.length === 0 && <p className="hint">目前沒有已加入的老師。</p>}
      {studio.members.map(member => <div className="li" key={member.id}><div><b>{member.name}</b><div className="hint">加入日期：{new Date(member.joinedAt).toLocaleDateString('zh-TW')}</div></div>
        <button className="btn outline" disabled={busy} onClick={() => { if (window.confirm(`移除 ${member.name}？未來的代課會改為待重新安排。`)) void run(async () => { await request(`/api/studio-admin/members/${member.id}`, 'DELETE'); }); }}>移除</button>
      </div>)}
    </section>)}
    {studios.length === 0 && <section className="card"><p className="hint">尚未建立工作室。</p></section>}
  </main>;
}
