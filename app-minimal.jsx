// Modern Minimal — Swiss style skincare planner with Firebase sync + edit mode
const { useState, useEffect, useMemo, useRef } = React;
const DEFAULT_DATA = window.SKINCARE_DATA;
const KIND = window.SKINCARE_KIND_LABELS;
const KIND_KEYS = Object.keys(KIND);

const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const dateKey = (o=0) => { const d = new Date(); d.setDate(d.getDate()+o); return d.toISOString().slice(0,10); };
const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_DATA));

// ---------- Sub-components ----------

function StepRow({ step, idx, total, checked, onToggle, editing, onEdit, onDelete, onKind }) {
  const [open, setOpen] = useState(false);
  const noteRef = useRef(null);

  if (editing) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 110px 32px', gap: 16, alignItems: 'flex-start',
        padding: '12px 0', borderTop: '1px solid #6f6c64',
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', paddingTop: 8 }}>
          {String(idx+1).padStart(2,'0')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={step.n} onChange={e => onEdit({ ...step, n: e.target.value })}
            placeholder="Название"
            style={editInputStyle(true)} />
          <input value={step.note || ''} onChange={e => onEdit({ ...step, note: e.target.value })}
            placeholder="Заметка"
            style={editInputStyle(false)} />
        </div>
        <select value={step.kind} onChange={e => onKind(e.target.value)} style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '8px 6px',
          background: '#c4c0b8', border: '1px solid #0a0a0a', color: '#0a0a0a',
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        }}>
          {KIND_KEYS.map(k => <option key={k} value={k}>{KIND[k]}</option>)}
        </select>
        <button onClick={onDelete} title="Удалить" style={iconBtn}>✕</button>
      </div>
    );
  }

  return (
    <div onClick={onToggle} style={{
      display: 'grid', gridTemplateColumns: '60px 1fr 100px 24px', gap: 24, alignItems: 'baseline',
      padding: '16px 0', borderTop: '1px solid #6f6c64', cursor: 'pointer',
      transition: 'opacity 0.3s ease', opacity: checked ? 0.4 : 1,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.05em' }}>
        {String(idx+1).padStart(2,'0')} / {String(total).padStart(2,'0')}
      </div>
      <div>
        <div style={{ fontSize: 15, color: '#0a0a0a', lineHeight: 1.4, fontWeight: 500,
          textDecoration: checked ? 'line-through' : 'none' }}>{step.n}</div>
        {step.note && <div style={{ fontSize: 13, color: '#3d3a34', marginTop: 4, lineHeight: 1.5 }}>{step.note}</div>}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4a4740',
        letterSpacing: '0.15em', textTransform: 'uppercase' }}>{KIND[step.kind] || ''}</div>
      <div style={{
        width: 24, height: 24, border: `2px solid #0a0a0a`,
        background: checked ? '#0a0a0a' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        {checked && <svg width="12" height="10" viewBox="0 0 12 9" fill="none">
          <path d="M1 4.5L4.5 8L11 1" stroke="#c4c0b8" strokeWidth="2" strokeLinecap="square"/>
        </svg>}
      </div>
    </div>
  );
}

const editInputStyle = (big) => ({
  fontFamily: 'inherit', fontSize: big ? 15 : 13, fontWeight: big ? 500 : 400,
  color: '#0a0a0a', background: 'transparent',
  border: 'none', borderBottom: '1px solid #6f6c64', padding: '4px 0', outline: 'none',
});

const iconBtn = {
  width: 32, height: 32, border: '1px solid #0a0a0a', background: 'transparent',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, cursor: 'pointer', color: '#0a0a0a',
};

function Section({ num, label, steps, dayIdx, sec, checks, toggle, editing, mutate }) {
  const done = steps.filter((_, i) => checks[`${dayIdx}_${sec}_${i}`]).length;

  const updateStep = (i, next) => mutate(d => { d[dayIdx][sec === 'm' ? 'morning' : 'evening'][i] = next; });
  const deleteStep = (i) => mutate(d => { d[dayIdx][sec === 'm' ? 'morning' : 'evening'].splice(i, 1); });
  const addStep = () => mutate(d => { d[dayIdx][sec === 'm' ? 'morning' : 'evening'].push({ n: 'Новый шаг', note: '', kind: 'cream' }); });

  return (
    <section style={{ marginBottom: 64 }}>
      <header style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 24, alignItems: 'baseline', marginBottom: 8, paddingBottom: 8 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.1em' }}>{num}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#2a2823' }}>
          {done}/{steps.length} <span style={{ color: '#7a7770' }}>·</span> {Math.round(done/steps.length*100)||0}%
        </div>
      </header>
      <div>
        {steps.map((s, i) => (
          <StepRow key={i} step={s} idx={i} total={steps.length}
            checked={!!checks[`${dayIdx}_${sec}_${i}`]} onToggle={() => toggle(dayIdx, sec, i)}
            editing={editing}
            onEdit={(next) => updateStep(i, next)}
            onKind={(kind) => updateStep(i, { ...s, kind })}
            onDelete={() => deleteStep(i)} />
        ))}
        <div style={{ borderTop: '1px solid #6f6c64' }}/>
        {editing && (
          <button onClick={addStep} style={{
            marginTop: 16, padding: '12px 20px', background: '#0a0a0a', color: '#c4c0b8',
            border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
          }}>+ Добавить шаг</button>
        )}
      </div>
    </section>
  );
}

// ---------- Main App ----------

function App({ initial }) {
  const [cur, setCur] = useState(todayIdx());
  const [routine, setRoutine] = useState(() => (initial?.routine && Array.isArray(initial.routine) && initial.routine.length === 7) ? initial.routine : cloneDefault());
  const [checks, setChecks] = useState(initial?.checks || {});
  const [history, setHistory] = useState(initial?.history || {});
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(initial?.user || null);
  const today = todayIdx();
  const skipNextSync = useRef(true); // skip first push (we just received it)

  // subscribe to remote state changes (other devices)
  useEffect(() => {
    const off = window.SkinSync.onState((s) => {
      if (!s.signedIn) return;
      setUser(s.user);
      skipNextSync.current = true;
      setChecks(s.checks || {});
      setHistory(s.history || {});
      if (s.routine && Array.isArray(s.routine) && s.routine.length === 7) setRoutine(s.routine);
    });
    return () => off && off();
  }, []);

  // Push checks/history
  useEffect(() => {
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    const nextHistory = { ...history };
    const k = dateKey(0);
    const any = Object.keys(checks).some(key => key.startsWith(today + '_') && checks[key]);
    if (any && !nextHistory[k]) { nextHistory[k] = true; setHistory(nextHistory); }
    window.SkinSync.updateChecks(checks, nextHistory);
  }, [checks]);

  const toggle = (di, sec, i) => setChecks(c => ({ ...c, [`${di}_${sec}_${i}`]: !c[`${di}_${sec}_${i}`] }));

  const mutateRoutine = (fn) => {
    const next = JSON.parse(JSON.stringify(routine));
    fn(next);
    setRoutine(next);
    window.SkinSync.updateRoutine(next);
  };

  const resetRoutine = () => {
    if (!confirm('Сбросить шаги к стандартным?')) return;
    const def = cloneDefault();
    setRoutine(def);
    window.SkinSync.updateRoutine(def);
  };

  const dayProgress = (i) => {
    const d = routine[i] || DEFAULT_DATA[i];
    const t = d.morning.length + d.evening.length;
    let dn = 0;
    d.morning.forEach((_,j)=>{ if(checks[`${i}_m_${j}`]) dn++; });
    d.evening.forEach((_,j)=>{ if(checks[`${i}_e_${j}`]) dn++; });
    return { done: dn, total: t, pct: t ? dn/t : 0 };
  };

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 60; i++) { const k = dateKey(-i); if (history[k]) s++; else if (i === 0) continue; else break; }
    return s;
  }, [history]);

  const stats = useMemo(() => {
    let total = 0, done = 0;
    const counts = {};
    routine.forEach((d, di) => {
      ['morning','evening'].forEach(sec => {
        const sk = sec === 'morning' ? 'm' : 'e';
        d[sec].forEach((s, i) => { total++; if (checks[`${di}_${sk}_${i}`]) { done++; counts[s.n] = (counts[s.n]||0)+1; }});
      });
    });
    return { total, done, pct: total?done/total:0, fav: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [checks, routine]);

  const day = routine[cur] || DEFAULT_DATA[cur];
  const dp = dayProgress(cur);
  const isToday = cur === today;
  const now = new Date();

  const updateDayField = (field, value) => mutateRoutine(d => { d[cur][field] = value; });

  return (
    <>
      <style>{`
        body { background: #c4c0b8; color: #0a0a0a; font-family: 'Inter Tight', -apple-system, sans-serif; }
        ::selection { background: #0a0a0a; color: #c4c0b8; }
        input, textarea, select { font-family: inherit; }
      `}</style>

      {/* Floating action toolbar */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', gap: 8,
      }}>
        <button onClick={() => setEditing(e => !e)} style={floatBtn(editing)}>
          {editing ? '✓ DONE' : '✎ EDIT'}
        </button>
        {user && (
          <button onClick={() => { if (confirm('Выйти?')) window.SkinSync.signOut(); }}
            title={user.email || 'Выйти'}
            style={{ ...floatBtn(false), padding: 4, width: 36, height: 36, overflow: 'hidden' }}>
            {user.photo
              ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/>
              : (user.name || user.email || '?').slice(0,1).toUpperCase()}
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px clamp(20px, 4vw, 48px)' }}>

        {/* Top grid */}
        <header style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center',
          paddingBottom: 24, borderBottom: '1px solid #0a0a0a', marginBottom: 64,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#2a2823' }}>
            SKINCARE / 2026 / VOL.{Math.ceil((Object.keys(history).length||1)/7)}
          </div>
          <div style={{ width: 8, height: 8, background: '#0a0a0a' }}/>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#2a2823', textAlign: 'right' }}>
            {now.toLocaleDateString('en-GB').replace(/\//g,'.')} / STREAK {String(streak).padStart(2,'0')}
          </div>
        </header>

        {/* Big title */}
        <div style={{ marginBottom: 80 }}>
          <h1 style={{
            fontSize: 'clamp(64px, 14vw, 200px)', fontWeight: 500, lineHeight: 0.85,
            letterSpacing: '-0.05em', color: '#0a0a0a', margin: 0,
          }}>
            Skincare<br/>
            <span style={{ color: '#c9986a' }}>Protocol</span>
          </h1>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
            marginTop: 48, paddingTop: 24, borderTop: '1px solid #0a0a0a',
          }}>
            {[
              ['01', 'Дней в цикле', '07'],
              ['02', 'Шагов всего', String(stats.total).padStart(2,'0')],
              ['03', 'Выполнено', `${Math.round(stats.pct*100)}%`],
              ['04', 'Стрик', String(streak).padStart(2,'0')],
            ].map(([n, l, v]) => (
              <div key={n}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4a4740', letterSpacing: '0.15em', marginBottom: 8 }}>{n} / {l}</div>
                <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 500, letterSpacing: '-0.02em' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Days grid */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.15em', marginBottom: 16 }}>
            ВЫБРАТЬ ДЕНЬ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #0a0a0a', borderBottom: '1px solid #0a0a0a' }}>
            {routine.map((d, i) => {
              const p = dayProgress(i);
              const active = i === cur;
              const isT = i === today;
              return (
                <button key={i} onClick={() => setCur(i)} style={{
                  background: active ? '#0a0a0a' : 'transparent',
                  color: active ? '#c4c0b8' : '#0a0a0a',
                  border: 'none', borderRight: i < 6 ? '1px solid #0a0a0a' : 'none',
                  padding: '20px 12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s ease', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 12, minHeight: 140,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em' }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    {isT && <span style={{ width: 6, height: 6, background: '#c9986a', borderRadius: '50%' }}/>}
                  </div>
                  <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {d.short}
                  </div>
                  <div style={{ marginTop: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: active ? 0.7 : 0.5 }}>
                    {Math.round(p.pct*100)}%
                  </div>
                  <div style={{ height: 2, background: active ? 'rgba(196,192,184,0.3)' : '#6f6c64', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${p.pct*100}%`, background: active ? '#c9986a' : '#0a0a0a', transition: 'width 0.5s ease' }}/>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 80, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.15em', marginBottom: 16 }}>
              № 0{cur+1} / {isToday ? 'СЕГОДНЯ' : day.name.toUpperCase()} / {editing ?
                <input value={day.mood} onChange={e=>updateDayField('mood', e.target.value)} style={{...editInputStyle(false), display:'inline-block', width: 120}}/>
                : day.mood.toUpperCase()}
            </div>
            {editing ? (
              <input value={day.theme} onChange={e=>updateDayField('theme', e.target.value)}
                style={{ width: '100%', fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 500, lineHeight: 0.95,
                  letterSpacing: '-0.04em', color: '#0a0a0a', background: 'transparent',
                  border: 'none', borderBottom: '1px solid #6f6c64', padding: '4px 0', outline: 'none', fontFamily: 'inherit' }}/>
            ) : (
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 500, lineHeight: 0.95,
                letterSpacing: '-0.04em', color: '#0a0a0a', margin: 0 }}>{day.theme}</h2>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.15em', marginBottom: 16 }}>
              ПРОГРЕСС / {dp.done} ИЗ {dp.total}
            </div>
            <div style={{ height: 4, background: '#6f6c64', position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'absolute', inset: 0, width: `${dp.pct*100}%`, background: '#0a0a0a', transition: 'width 0.6s ease' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#2a2823' }}>
              <span>0%</span>
              <span style={{ color: '#0a0a0a', fontWeight: 600 }}>{Math.round(dp.pct*100)}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr', gap: 24, marginBottom: 80,
          paddingTop: 24, paddingBottom: 24, borderTop: '1px solid #0a0a0a', borderBottom: '1px solid #0a0a0a',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.15em' }}>NOTE</div>
          {editing ? (
            <textarea value={day.tip} onChange={e=>updateDayField('tip', e.target.value)}
              rows={3}
              style={{ width: '100%', fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.5, color: '#0a0a0a',
                background: 'transparent', border: '1px solid #6f6c64', padding: 12, outline: 'none',
                fontFamily: 'inherit', resize: 'vertical' }}/>
          ) : (
            <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.5, color: '#0a0a0a', margin: 0, maxWidth: 700 }}>
              {day.tip}
            </p>
          )}
        </div>

        {/* Sections */}
        <Section num="I" label="Утро" steps={day.morning} dayIdx={cur} sec="m" checks={checks} toggle={toggle}
          editing={editing} mutate={mutateRoutine} />
        <Section num="II" label="Вечер" steps={day.evening} dayIdx={cur} sec="e" checks={checks} toggle={toggle}
          editing={editing} mutate={mutateRoutine} />

        {editing && (
          <div style={{ paddingTop: 24, borderTop: '1px solid #6f6c64', marginBottom: 64 }}>
            <button onClick={resetRoutine} style={{
              padding: '8px 16px', background: 'transparent', color: '#0a0a0a',
              border: '1px solid #6f6c64', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              letterSpacing: '0.15em', cursor: 'pointer', textTransform: 'uppercase',
            }}>↺ Сбросить к стандартному</button>
          </div>
        )}

        {/* Week summary */}
        <section style={{ marginTop: 96, paddingTop: 32, borderTop: '1px solid #0a0a0a' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a4740', letterSpacing: '0.15em', marginBottom: 16 }}>
            СВОДКА НЕДЕЛИ
          </div>
          <h3 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 500, lineHeight: 0.95, letterSpacing: '-0.04em', marginBottom: 48 }}>
            {Math.round(stats.pct*100)}<span style={{ color: '#4a4740' }}>%</span> <span style={{ color: '#c9986a' }}>выполнено</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 48 }}>
            {routine.map((d, i) => {
              const p = dayProgress(i);
              return (
                <div key={i}>
                  <div style={{ height: 100, background: '#aeaaa2', position: 'relative', marginBottom: 8 }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: `${p.pct*100}%`, background: i===today?'#c9986a':'#0a0a0a', transition: 'height 0.5s ease' }}/>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4a4740', letterSpacing: '0.1em' }}>
                    {d.short} <span style={{ color: '#0a0a0a' }}>{Math.round(p.pct*100)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer style={{ marginTop: 80, paddingTop: 24, borderTop: '1px solid #0a0a0a',
          display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: '#4a4740', letterSpacing: '0.15em' }}>
          <span>SKINCARE PROTOCOL / 2026</span>
          <span>{syncStatus.ready ? '● LOCAL' : '...'}</span>
        </footer>
      </div>
    </>
  );
}

const floatBtn = (active) => ({
  padding: '8px 14px',
  background: active ? '#0a0a0a' : '#c4c0b8',
  color: active ? '#c4c0b8' : '#0a0a0a',
  border: '1px solid #0a0a0a',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  letterSpacing: '0.15em',
  cursor: 'pointer',
  textTransform: 'uppercase',
});

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);

function Root() {
  const [s, setS] = useState({ ready: false });
  useEffect(() => {
    let off;
    (async () => {
      await window.SkinSync.init();
      off = window.SkinSync.onState(setS);
    })();
    return () => { if (off) off(); };
  }, []);
  if (!s.ready) return <LoadingScreen msg="Загрузка..." />;
  if (!s.signedIn) return <LoginScreen err={s.error} />;
  return <App initial={s} />;
}

function LoadingScreen({ msg }) {
  return <div style={{ minHeight: '100vh', background: '#c4c0b8', color: '#0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.2em' }}>{msg}</div>;
}

function LoginScreen({ err }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const click = async () => {
    setBusy(true); setMsg('');
    const r = await window.SkinSync.signInGoogle();
    if (!r.ok) { setBusy(false); setMsg('✗ ' + (r.error || 'Не удалось')); }
    else if (r.redirect) setMsg('Перенаправление...');
  };
  return (
    <div style={{ minHeight: '100vh', background: '#c4c0b8', color: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'Inter Tight, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.25em', color: '#4a4740', marginBottom: 24 }}>
          SKINCARE / 2026 / VOL.1
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 0.95, marginBottom: 16 }}>
          Skincare<br/>Protocol
        </h1>
        <p style={{ fontSize: 15, color: '#2a2823', lineHeight: 1.6, marginBottom: 40 }}>
          Войди через Google, чтобы прогресс синхронизировался между телефоном и компьютером.
        </p>
        <button onClick={click} disabled={busy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          width: '100%', padding: '16px 20px', background: '#0a0a0a', color: '#c4c0b8',
          border: 'none', fontSize: 16, fontWeight: 500, cursor: busy ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#c4c0b8" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#c4c0b8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".75"/>
            <path fill="#c4c0b8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".5"/>
            <path fill="#c4c0b8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
          </svg>
          {busy ? 'Подождите...' : 'Войти через Google'}
        </button>
        {msg && <div style={{ marginTop: 16, fontSize: 13 }}>{msg}</div>}
        {err && <div style={{ marginTop: 32, fontSize: 12, color: '#7a3a3a', lineHeight: 1.5 }}>
          Ошибка инициализации: {err}<br/>
          Проверь: <b>Firebase Console → Authentication → Sign-in method → Google → Enable</b>.
        </div>}
      </div>
    </div>
  );
}
