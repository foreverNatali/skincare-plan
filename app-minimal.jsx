// Modern Minimal — Swiss style skincare planner
const { useState, useEffect, useMemo } = React;
const DATA = window.SKINCARE_DATA;
const KIND = window.SKINCARE_KIND_LABELS;

const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const dateKey = (o=0) => { const d = new Date(); d.setDate(d.getDate()+o); return d.toISOString().slice(0,10); };
const loadJSON = (k,f) => { try { const v = localStorage.getItem(k); return v?JSON.parse(v):f; } catch { return f; } };
const saveJSON = (k,v) => localStorage.setItem(k, JSON.stringify(v));

function StepRow({ step, idx, total, checked, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      display: 'grid', gridTemplateColumns: '60px 1fr 100px 24px', gap: 24, alignItems: 'baseline',
      padding: '16px 0', borderTop: '1px solid #b8b6b2', cursor: 'pointer',
      transition: 'opacity 0.3s ease', opacity: checked ? 0.4 : 1,
    }}
    onMouseEnter={e=>e.currentTarget.style.background='#d8d6d2'}
    onMouseLeave={e=>e.currentTarget.style.background=''}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.05em' }}>
        {String(idx+1).padStart(2,'0')} / {String(total).padStart(2,'0')}
      </div>
      <div>
        <div style={{ fontSize: 15, color: '#0a0a0a', lineHeight: 1.4, fontWeight: 500,
          textDecoration: checked ? 'line-through' : 'none' }}>{step.n}</div>
        {step.note && <div style={{ fontSize: 13, color: '#888', marginTop: 4, lineHeight: 1.5 }}>{step.note}</div>}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#999',
        letterSpacing: '0.15em', textTransform: 'uppercase' }}>{KIND[step.kind]}</div>
      <div style={{
        width: 18, height: 18, border: `1px solid ${checked ? '#0a0a0a' : '#ccc'}`,
        background: checked ? '#0a0a0a' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}>
        {checked && <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
          <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="square"/>
        </svg>}
      </div>
    </div>
  );
}

function Section({ num, label, steps, dayIdx, sec, checks, toggle }) {
  const done = steps.filter((_, i) => checks[`${dayIdx}_${sec}_${i}`]).length;
  return (
    <section style={{ marginBottom: 64 }}>
      <header style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 24, alignItems: 'baseline', marginBottom: 8, paddingBottom: 8 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.1em' }}>{num}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#666' }}>
          {done}/{steps.length} <span style={{ color: '#ccc' }}>·</span> {Math.round(done/steps.length*100)||0}%
        </div>
      </header>
      <div>
        {steps.map((s, i) => (
          <StepRow key={i} step={s} idx={i} total={steps.length}
            checked={!!checks[`${dayIdx}_${sec}_${i}`]} onToggle={() => toggle(dayIdx, sec, i)} />
        ))}
        <div style={{ borderTop: '1px solid #b8b6b2' }}/>
      </div>
    </section>
  );
}

function App() {
  const [cur, setCur] = useState(todayIdx());
  const [checks, setChecks] = useState(() => loadJSON('skp_minimal_checks', {}));
  const [history, setHistory] = useState(() => loadJSON('skp_minimal_history', {}));
  const today = todayIdx();

  useEffect(() => {
    saveJSON('skp_minimal_checks', checks);
    const k = dateKey(0);
    const any = Object.keys(checks).some(key => key.startsWith(today + '_') && checks[key]);
    if (any && !history[k]) {
      const next = { ...history, [k]: true };
      setHistory(next); saveJSON('skp_minimal_history', next);
    }
  }, [checks]);

  const toggle = (di, sec, i) => setChecks(c => ({ ...c, [`${di}_${sec}_${i}`]: !c[`${di}_${sec}_${i}`] }));

  const dayProgress = (i) => {
    const d = DATA[i];
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
    DATA.forEach((d, di) => {
      ['morning','evening'].forEach(sec => {
        const sk = sec === 'morning' ? 'm' : 'e';
        d[sec].forEach((s, i) => { total++; if (checks[`${di}_${sk}_${i}`]) { done++; counts[s.n] = (counts[s.n]||0)+1; }});
      });
    });
    return { total, done, pct: total?done/total:0, fav: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [checks]);

  const day = DATA[cur];
  const dp = dayProgress(cur);
  const isToday = cur === today;
  const now = new Date();

  return (
    <>
      <style>{`
        body { background: #d8d6d2; color: #0a0a0a; font-family: 'Inter Tight', -apple-system, sans-serif; }
        ::selection { background: #0a0a0a; color: #d8d6d2; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px clamp(20px, 4vw, 48px)' }}>

        {/* Top grid */}
        <header style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center',
          paddingBottom: 24, borderBottom: '1px solid #0a0a0a', marginBottom: 64,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#666' }}>
            SKINCARE / 2026 / VOL.{Math.ceil((Object.keys(history).length||1)/7)}
          </div>
          <div style={{ width: 8, height: 8, background: '#0a0a0a' }}/>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#666', textAlign: 'right' }}>
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
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#999', letterSpacing: '0.15em', marginBottom: 8 }}>{n} / {l}</div>
                <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 500, letterSpacing: '-0.02em' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Days grid */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
            ВЫБРАТЬ ДЕНЬ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #0a0a0a', borderBottom: '1px solid #0a0a0a' }}>
            {DATA.map((d, i) => {
              const p = dayProgress(i);
              const active = i === cur;
              const isT = i === today;
              return (
                <button key={i} onClick={() => setCur(i)} style={{
                  background: active ? '#0a0a0a' : 'transparent',
                  color: active ? '#d8d6d2' : '#0a0a0a',
                  border: 'none', borderRight: i < 6 ? '1px solid #0a0a0a' : 'none',
                  padding: '20px 12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s ease', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 12, minHeight: 140,
                }}
                onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='#cac8c4'; }}
                onMouseLeave={e=>{ if(!active) e.currentTarget.style.background=''; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em' }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    {isT && <span style={{ width: 6, height: 6, background: active ? '#c9986a' : '#c9986a', borderRadius: '50%' }}/>}
                  </div>
                  <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {d.short}
                  </div>
                  <div style={{ marginTop: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: active ? 0.7 : 0.5 }}>
                    {Math.round(p.pct*100)}%
                  </div>
                  {/* progress bar */}
                  <div style={{ height: 2, background: active ? 'rgba(255,255,255,0.2)' : '#b8b6b2', position: 'relative' }}>
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
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
              № 0{cur+1} / {isToday ? 'СЕГОДНЯ' : day.name.toUpperCase()} / {day.mood.toUpperCase()}
            </div>
            <h2 style={{
              fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 500, lineHeight: 0.95,
              letterSpacing: '-0.04em', color: '#0a0a0a', margin: 0,
            }}>{day.theme}</h2>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
              ПРОГРЕСС / {dp.done} ИЗ {dp.total}
            </div>
            <div style={{ height: 4, background: '#b8b6b2', position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'absolute', inset: 0, width: `${dp.pct*100}%`, background: '#0a0a0a', transition: 'width 0.6s ease' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#666' }}>
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em' }}>NOTE</div>
          <p style={{ fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.5, color: '#0a0a0a', margin: 0, maxWidth: 700 }}>
            {day.tip}
          </p>
        </div>

        {/* Sections */}
        <Section num="I" label="Утро" steps={day.morning} dayIdx={cur} sec="m" checks={checks} toggle={toggle} />
        <Section num="II" label="Вечер" steps={day.evening} dayIdx={cur} sec="e" checks={checks} toggle={toggle} />

        {/* Week summary */}
        <section style={{ marginTop: 96, paddingTop: 32, borderTop: '1px solid #0a0a0a' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
            СВОДКА НЕДЕЛИ
          </div>
          <h3 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 500, lineHeight: 0.95, letterSpacing: '-0.04em', marginBottom: 48 }}>
            {Math.round(stats.pct*100)}<span style={{ color: '#999' }}>%</span> <span style={{ color: '#c9986a' }}>выполнено</span>
          </h3>

          {/* Week bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 48 }}>
            {DATA.map((d, i) => {
              const p = dayProgress(i);
              return (
                <div key={i}>
                  <div style={{ height: 100, background: '#cac8c4', position: 'relative', marginBottom: 8 }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: `${p.pct*100}%`, background: i===today?'#c9986a':'#0a0a0a', transition: 'height 0.5s ease' }}/>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#999', letterSpacing: '0.1em' }}>
                    {d.short} <span style={{ color: '#0a0a0a' }}>{Math.round(p.pct*100)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Favorites */}
          {stats.fav.length > 0 && stats.fav[0][1] > 0 && (
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999', letterSpacing: '0.15em', marginBottom: 16 }}>
                ЛЮБИМЫЕ ШАГИ / TOP {stats.fav.length}
              </div>
              <div style={{ borderTop: '1px solid #0a0a0a' }}>
                {stats.fav.map(([name, count], i) => (
                  <div key={name} style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr 80px 60px', gap: 24, alignItems: 'baseline',
                    padding: '20px 0', borderBottom: '1px solid #b8b6b2',
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#999' }}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{ fontSize: 18, fontWeight: 500 }}>{name}</span>
                    <div style={{ height: 4, background: '#b8b6b2', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${(count/stats.fav[0][1])*100}%`, background: '#0a0a0a' }}/>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#0a0a0a', textAlign: 'right' }}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer style={{ marginTop: 80, paddingTop: 24, borderTop: '1px solid #0a0a0a',
          display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: '#999', letterSpacing: '0.15em' }}>
          <span>SKINCARE PROTOCOL / 2026</span>
          <span>END</span>
        </footer>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
