'use client';
import { useEffect, useState } from 'react';

// 行政後台替工作室老師設定長假：月曆點開始、結束日 → 選代理老師 → 系統列出這段期間的課並配好代課老師 → 確認轉出。

type Teacher = { id: string; name: string };
type Leave = { id: string; start: string; end: string; proxy: Teacher | null };
type Option = { id: string; name: string; status: 'available' | 'unknown' };
type PreviewLesson = { id: string; studentId: string; studentName: string; date: string; start: number; options: Option[]; suggestion: string | null };

const WD = '日一二三四五六';
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const wd = (d: string) => WD[new Date(`${d}T12:00:00+08:00`).getUTCDay()];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const todayStr = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const addMonths = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;

// 月曆選日期區間：第一下是開始、第二下是結束；再點一次就重新選。
function RangeCalendar({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  const today = todayStr();
  const [ym, setYm] = useState((start || today).slice(0, 7));
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
  function pick(d: string) {
    if (!start || end) onChange(d, '');
    else if (d < start) onChange(d, '');
    else onChange(start, d);
  }
  return <div className="range-cal">
    <div className="range-cal-bar">
      <button type="button" aria-label="上個月" disabled={ym <= today.slice(0, 7)} onClick={() => setYm(addMonths(ym, -1))}>‹</button>
      <b>{y} 年 {m} 月</b>
      <button type="button" aria-label="下個月" onClick={() => setYm(addMonths(ym, 1))}>›</button>
    </div>
    <div className="range-cal-grid">
      {Array.from(WD).map(w => <span className="range-cal-wd" key={w}>{w}</span>)}
      {cells.map((d, i) => {
        if (!d) return <span key={`e${i}`} />;
        const past = d < today;
        const edge = d === start || d === end;
        const inside = !!start && !!end && d > start && d < end;
        return <button type="button" key={d} disabled={past} aria-pressed={edge || inside}
          className={`range-cal-day${edge ? ' edge' : ''}${inside ? ' inside' : ''}${d === start && end ? ' from' : ''}${d === end ? ' to' : ''}${d === today ? ' today' : ''}`}
          onClick={() => pick(d)}>{Number(d.slice(8))}</button>;
      })}
    </div>
  </div>;
}

export default function LeavePanel({ teacherId, notify }: { teacherId: string; notify: (text: string) => void }) {
  const base = `/api/studio-admin/teachers/${encodeURIComponent(teacherId)}/leaves`;
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [needSql, setNeedSql] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [proxyId, setProxyId] = useState('');
  const [preview, setPreview] = useState<PreviewLesson[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const studio = true;

  async function load() {
    const res = await fetch(base, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) { notify('無法載入請長假資料，請稍後再試。'); return; }
    const data = await res.json();
    setLeaves(data.leaves ?? []); setTeachers(data.teachers ?? []); setNeedSql(!!data.needSql);
  }
  useEffect(() => { void load(); }, [teacherId]);

  async function next() {
    setError(''); setBusy(true);
    const res = await fetch(`${base}/preview?start=${start}&end=${end}`, { cache: 'no-store' }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(data?.error || '讀取課程失敗，請稍後再試。'); return; }
    const list: PreviewLesson[] = data.lessons ?? [];
    setPreview(list);
    setChoices(Object.fromEntries(list.map(l => [l.id, l.suggestion ?? ''])));
    setStep(2);
  }

  async function confirm() {
    setError(''); setBusy(true);
    const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start, end, proxyTeacherId: proxyId || null }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setBusy(false); setError(data?.error || '儲存失敗，請稍後再試。'); return; }
    let done = 0; const failed: string[] = [];
    for (const l of preview) {
      const c = choices[l.id];
      if (!c) continue;
      const json = (body: unknown) => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const r = c === 'defer' ? await fetch(`${base}/lessons/${l.id}/defer`, { method: 'POST' }).catch(() => null)
        : c === 'waitlist' ? await fetch(`${base}/lessons/${l.id}/waitlist`, { method: 'POST' }).catch(() => null)
        : c.startsWith('manual:') ? await fetch(`${base}/lessons/${l.id}`, json(studio ? { substituteTeacherId: null, manualTeacherName: c.slice(7) } : { teacherName: c.slice(7) })).catch(() => null)
        : await fetch(`${base}/lessons/${l.id}`, json({ substituteTeacherId: c, manualConfirmed: true })).catch(() => null);
      if (r?.ok) done++; else failed.push(`${md(l.date)} ${l.studentName}`);
    }
    setBusy(false); setStep(0); setStart(''); setEnd(''); setProxyId('');
    await load();
    notify(`已設定請長假，${done} 堂已處理。${failed.length ? `這幾堂沒成功，請到課表個別調整：${failed.join('、')}` : ''}`);
  }

  async function cancelLeave(l: Leave) {
    const res = await fetch(`${base}?id=${l.id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) { await load(); notify('已取消請長假；已經轉給代課老師的課不會自動改回來。'); } else { notify('取消請長假失敗，請稍後再試。'); }
  }

  const unchosen = preview.filter(l => !choices[l.id]).length;
  const label = (l: PreviewLesson) => `${md(l.date)}（${wd(l.date)}）${hhmm(l.start)}`;
  const choiceName = (l: PreviewLesson, c: string) => c === 'defer' ? '這週不上' : c === 'waitlist' ? '排入候補' : c.startsWith('manual:') ? c.slice(7) : l.options.find(o => o.id === c)?.name ?? '請選擇';

  return <section className="settings-field leave-settings">
    <div className="settings-section-heading"><b className="settings-card-title">請長假</b></div>
    {leaves.map(l => <div className="leave-row" key={l.id}>
      <span><b>{md(l.start)}（{wd(l.start)}）– {md(l.end)}（{wd(l.end)}）</b><small>{l.proxy ? `代理：${l.proxy.name}` : '沒有指定代理老師'}</small></span>
      <button type="button" className="btn slim" onClick={() => cancelLeave(l)}>取消</button>
    </div>)}
    {!leaves.length && <p className="hint" style={{ margin: '0 0 10px' }}>請假期間的課會交給其他老師代課。</p>}
    <button type="button" className="btn outline" style={{ width: '100%' }} disabled={needSql} onClick={() => { setStep(1); setError(''); }}>
      {needSql ? '需要先更新資料庫' : '＋ 請長假'}</button>

    {step === 1 && <>
      <div className="ov" onClick={() => !busy && setStep(0)} />
      <div className="sheet leave-sheet" role="dialog" aria-modal="true" aria-label="請長假">
        <b className="leave-sheet-title">請長假</b>
        <p className="leave-range-summary">{start ? end ? <>{md(start)}（{wd(start)}）– {md(end)}（{wd(end)}）<small>共 {daysBetween(start, end)} 天</small></> : <>{md(start)}（{wd(start)}）起，再點結束日</> : '點開始日，再點結束日'}</p>
        <RangeCalendar start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        {studio && teachers.length > 0 && <>
          <p className="leave-label">代理老師<small>請假期間可以幫你排課、通知學生</small></p>
          <div className="leave-chips" role="radiogroup" aria-label="代理老師">
            <button type="button" role="radio" aria-checked={!proxyId} onClick={() => setProxyId('')}>不指定</button>
            {teachers.map(t => <button type="button" role="radio" aria-checked={proxyId === t.id} key={t.id} onClick={() => setProxyId(t.id)}>{t.name}</button>)}
          </div>
        </>}
        {error && <p className="warn">{error}</p>}
        <div className="row lesson-sheet-footer"><button type="button" className="btn" disabled={busy} onClick={() => setStep(0)}>取消</button>
          <button type="button" className="btn pri" disabled={busy || !start || !end} onClick={next}>{busy ? '讀取中…' : '下一步'}</button></div>
      </div>
    </>}

    {step === 2 && <>
      <div className="ov" onClick={() => !busy && setStep(0)} />
      <div className="sheet leave-sheet" role="dialog" aria-modal="true" aria-label="請假期間的課">
        <b className="leave-sheet-title">{md(start)}–{md(end)} 的課</b>
        <p className="hint" style={{ margin: '2px 0 8px' }}>{preview.length ? unchosen ? `${unchosen} 堂沒有老師有空，請選擇處理方式` : '已配好代課老師，可以逐堂改' : '這段期間沒有你要上的課'}</p>
        <div className="leave-list">
          {preview.map(l => {
            const c = choices[l.id] ?? '';
            return <div className="leave-lesson" key={l.id}>
              <span><b>{l.studentName}</b><small>{label(l)}</small></span>
              <div className="leave-lesson-pick">
                <select aria-label={`${l.studentName} ${label(l)} 的處理方式`} className={c ? '' : 'unset'} value={c.startsWith('manual:') ? 'manual' : c}
                  onChange={e => { const v = e.target.value; if (v === 'manual') { setTyping({ id: l.id, name: '' }); return; } setChoices(m => ({ ...m, [l.id]: v })); }}>
                  {!c && <option value="">請選擇</option>}
                  {l.options.map(o => <option key={o.id} value={o.id}>{o.name}{o.status === 'unknown' ? '（未填時段）' : ''}</option>)}
                  <option value="manual">{c.startsWith('manual:') ? c.slice(7) : '其他老師…'}</option>
                  <option value="defer">這週不上</option>
                  <option value="waitlist">排入候補</option>
                </select>
                <span className={`leave-pick-face${c ? '' : ' unset'}`} aria-hidden="true">{choiceName(l, c)} ▾</span>
              </div>
            </div>;
          })}
        </div>
        {typing && <form className="leave-typing" onSubmit={e => { e.preventDefault(); if (typing.name.trim()) { setChoices(m => ({ ...m, [typing.id]: `manual:${typing.name.trim()}` })); setTyping(null); } }}>
          <input className="tin" autoFocus maxLength={100} placeholder="輸入老師姓名" value={typing.name} onChange={e => setTyping({ ...typing, name: e.target.value })} />
          <button type="submit" className="btn pri slim" disabled={!typing.name.trim()}>好</button>
          <button type="button" className="btn slim" onClick={() => setTyping(null)}>取消</button>
        </form>}
        {error && <p className="warn">{error}</p>}
        <div className="row lesson-sheet-footer"><button type="button" className="btn" disabled={busy} onClick={() => setStep(1)}>上一步</button>
          <button type="button" className="btn pri" disabled={busy || unchosen > 0} onClick={confirm}>{busy ? '處理中…' : '確認'}</button></div>
      </div>
    </>}
  </section>;
}
