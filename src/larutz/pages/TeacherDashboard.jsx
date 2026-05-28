import React, { useState, useEffect } from 'react';
// Firebase replaced by local-only mode in Wingate integration
const db = null;
const collection = () => null;
const getDocs = async () => ({ forEach: () => {}, docs: [] });
const orderBy = () => null;
const query = (...args) => args[0];
const limit = () => null;
import { useApp }  from '../LarutzBridge';
import { NOVEL_STATIONS, POEMS } from '../data/content.js';
import { ChevronDown, ChevronUp, Download, RefreshCw, Users, CheckCircle2, BookOpen, Clock, Activity } from 'lucide-react';

const TOTAL = 18; // 10 stations + 8 poems

// ── Student row ────────────────────────────────────────────────────────────────
function StudentRow({ student, onSelect, selected }) {
  const done  = student.done  || {};
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct   = Math.round((doneCount / TOTAL) * 100);
  const last  = student.lastSeen?.toDate?.();
  const lastStr = last ? last.toLocaleDateString('he-IL') : '—';

  return (
    <div className={`card overflow-hidden mb-2 transition-all ${selected ? 'ring-2 ring-terracotta' : ''}`}>
      <button onClick={onSelect} className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50">
        {/* Avatar */}
        <img src={student.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.displayName || '?')}&background=1a2744&color=fff`}
          alt="" className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-sand-200"/>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy text-sm truncate">{student.displayName || student.email}</p>
          <p className="text-xs text-gray-400 truncate">{student.email}</p>
        </div>
        {/* Progress */}
        <div className="text-left min-w-[80px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-terracotta">{pct}%</span>
            <span className="text-[10px] text-gray-400">{doneCount}/{TOTAL}</span>
          </div>
          <div className="h-1.5 w-20 bg-sand-100 rounded-full overflow-hidden">
            <div className="h-full progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* Last seen */}
        <div className="text-[10px] text-gray-400 min-w-[60px] text-center hidden sm:block">
          <p>נראה לאחרונה</p>
          <p className="font-semibold">{lastStr}</p>
        </div>
        {selected ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
      </button>

      {/* Expanded answers */}
      {selected && <StudentDetail uid={student.uid} done={done} displayName={student.displayName} />}
    </div>
  );
}

// ── Student detail panel ───────────────────────────────────────────────────────
function StudentDetail({ uid, done, displayName }) {
  const [answers, setAnswers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    getDocs(collection(db, 'students', uid, 'answers'))
      .then(snap => {
        const a = {};
        snap.forEach(d => { a[d.id] = d.data().value; });
        setAnswers(a);
      })
      .catch(() => setAnswers({}))
      .finally(() => setLoading(false));
  }, [uid]);

  const allItems = [
    ...NOVEL_STATIONS.map(s => ({ key: `station-${s.id}`, label: `תחנה ${s.id}: ${s.title}`, emoji: s.emoji })),
    ...POEMS.map(p => ({ key: `poem-${p.id}`, label: `שיר ${p.id}: ${p.title}`, emoji: p.emoji })),
  ];

  if (loading) return <div className="px-4 pb-4 text-center py-6"><div className="inline-block w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin"/></div>;

  const doneItems   = allItems.filter(i => done[i.key]);
  const undoneItems = allItems.filter(i => !done[i.key]);

  return (
    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
      {/* Progress chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {allItems.map(item => (
          <span key={item.key} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${done[item.key] ? 'bg-sage-100 text-sage-700' : 'bg-gray-100 text-gray-400'}`}>
            {item.emoji} {done[item.key] ? '✓' : '○'}
          </span>
        ))}
      </div>

      {/* Answers accordion */}
      {doneItems.length === 0 && <p className="text-xs text-gray-400 text-center py-2">אין תחנות שהושלמו עדיין</p>}
      <div className="space-y-1">
        {doneItems.map(item => {
          const ans = answers?.[item.key];
          return (
            <div key={item.key} className="rounded-xl bg-sand-50 overflow-hidden">
              <button onClick={() => setOpenKey(openKey === item.key ? null : item.key)}
                className="w-full flex items-center gap-2 p-2.5 text-right hover:bg-sand-100">
                <span>{item.emoji}</span>
                <span className="flex-1 text-xs font-bold text-navy">{item.label}</span>
                <CheckCircle2 size={12} className="text-sage"/>
                {openKey === item.key ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
              </button>
              {openKey === item.key && ans && (
                <div className="px-3 pb-3 space-y-2">
                  {typeof ans === 'object' ? (
                    Object.entries(ans).map(([k, v]) => v && typeof v === 'string' ? (
                      <div key={k}>
                        <p className="text-[10px] font-bold text-gray-400 mb-0.5">{k}</p>
                        <p className="text-xs text-gray-700 bg-white rounded-lg p-2 border border-sand-200">{v}</p>
                      </div>
                    ) : null)
                  ) : (
                    <p className="text-xs text-gray-700 bg-white rounded-lg p-2">{String(ans)}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Undone hint */}
      {undoneItems.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-2">לא הושלמו: {undoneItems.map(i => i.label).join(' · ')}</p>
      )}
    </div>
  );
}

// ── Export helper ──────────────────────────────────────────────────────────────
function exportCSV(students) {
  const rows = [['שם','מייל','תחנות שהושלמו','שירים שהושלמו','אחוז','נראה לאחרונה']];
  students.forEach(s => {
    const done = s.done || {};
    const st = [1,2,3,4,5,6,7,8,9,10].filter(n => done[`station-${n}`]).length;
    const po = [1,2,3,4,5,6,7,8].filter(n => done[`poem-${n}`]).length;
    const pct = Math.round(((st + po) / TOTAL) * 100);
    const last = s.lastSeen?.toDate?.()?.toLocaleDateString('he-IL') || '';
    rows.push([s.displayName || '', s.email || '', st, po, `${pct}%`, last]);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `larutz-im-milim-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Login history panel ────────────────────────────────────────────────────────
function LoginHistory({ uid }) {
  const [logins,  setLogins]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'students', uid, 'logins'))
      .then(snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => Number(b.id) - Number(a.id))
          .slice(0, 20);
        setLogins(list);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <p className="text-xs text-gray-400 py-2">טוען...</p>;
  if (!logins.length) return <p className="text-xs text-gray-400 py-2">אין רישום כניסות</p>;

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {logins.map((l, i) => {
        const d = l.at?.toDate?.() || new Date(Number(l.id));
        return (
          <div key={l.id} className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-green-400' : 'bg-gray-300'}`}/>
            <span className="text-gray-600">{d.toLocaleDateString('he-IL')}</span>
            <span className="text-gray-400">{d.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' })}</span>
            {i === 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full font-bold">אחרון</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Relative time helper ───────────────────────────────────────────────────────
function relativeTime(date) {
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'עכשיו';
  if (mins < 60)  return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { navigate, setStudentViewMode } = useApp();
  const [students,   setStudents]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [selected,   setSelected]  = useState(null);
  const [loginTab,   setLoginTab]  = useState(null); // uid with login history open
  const [filter,     setFilter]    = useState('all');
  const [tab,        setTab]       = useState('students'); // students | logins

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setStudents(list.sort((a, b) => (b.lastLogin?.seconds || b.lastSeen?.seconds || 0) - (a.lastLogin?.seconds || a.lastSeen?.seconds || 0)));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Students active in last hour
  const activeNow = students.filter(s => {
    const t = (s.lastLogin || s.lastSeen)?.toDate?.();
    return t && Date.now() - t.getTime() < 3600000;
  });

  // Stats
  const totalStudents = students.length;
  const avgPct = totalStudents
    ? Math.round(students.reduce((sum, s) => {
        const d = Object.values(s.done || {}).filter(Boolean).length;
        return sum + (d / TOTAL) * 100;
      }, 0) / totalStudents)
    : 0;
  const completedAll = students.filter(s => Object.values(s.done || {}).filter(Boolean).length === TOTAL).length;

  const filtered = students.filter(s => {
    const done = Object.values(s.done || {}).filter(Boolean).length;
    if (filter === 'done')       return done === TOTAL;
    if (filter === 'inprogress') return done > 0 && done < TOTAL;
    if (filter === 'notstarted') return done === 0;
    return true;
  });

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧑‍🏫</span>
          <div>
            <h1 className="text-xl font-black text-navy">דאשבורד מורה</h1>
            <p className="text-xs text-gray-500">לרוץ עם מילים — מעקב תלמידים</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setStudentViewMode(true); navigate('landing'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-400 text-amber-900 text-sm font-bold hover:bg-amber-300 transition-colors">
            👁️ תצוגת תלמיד
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            רענן
          </button>
          <button onClick={() => exportCSV(students)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy/90">
            <Download size={13}/>
            ייצוא CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { icon:<Users size={18}/>,       label:'תלמידים',        val: totalStudents,  color:'bg-blue-50 text-blue-700 border-blue-200'   },
          { icon:<Activity size={18}/>,    label:'פעילים עכשיו',   val: activeNow.length, color:'bg-green-50 text-green-700 border-green-200' },
          { icon:<CheckCircle2 size={18}/>,label:'השלימו הכל',     val: completedAll,   color:'bg-sage-50 text-sage-700 border-sage-200'   },
          { icon:<span>📊</span>,          label:'התקדמות ממוצעת', val: `${avgPct}%`,   color:'bg-amber-50 text-amber-700 border-amber-200' },
        ].map(({ icon, label, val, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs font-semibold">{label}</p></div>
            <p className="text-2xl font-black">{val}</p>
          </div>
        ))}
      </div>

      {/* Active now strip */}
      {activeNow.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"/>
          </span>
          <p className="text-xs font-bold text-green-700">פעילים בשעה האחרונה:</p>
          <div className="flex gap-2 flex-wrap">
            {activeNow.map(s => (
              <div key={s.uid} className="flex items-center gap-1.5 bg-white rounded-full px-2 py-0.5 border border-green-200">
                <img src={s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.displayName||'?')}&background=4A7C59&color=fff`}
                  alt="" className="w-4 h-4 rounded-full"/>
                <span className="text-[10px] font-semibold text-green-700">{s.displayName?.split(' ')[0]}</span>
                <span className="text-[9px] text-green-500">{relativeTime((s.lastLogin || s.lastSeen)?.toDate?.())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('students')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === 'students' ? 'bg-navy text-white' : 'bg-white text-navy border border-gray-200'}`}>
          👥 תלמידים
        </button>
        <button onClick={() => setTab('logins')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === 'logins' ? 'bg-navy text-white' : 'bg-white text-navy border border-gray-200'}`}>
          🕐 היסטוריית כניסות
        </button>
      </div>

      {/* Login history tab */}
      {tab === 'logins' && (
        <div className="space-y-2 mb-5">
          {students.length === 0 && !loading && (
            <p className="text-center text-gray-400 py-8 text-sm">אין תלמידים עדיין</p>
          )}
          {students.map(s => {
            const lastLogin = (s.lastLogin || s.lastSeen)?.toDate?.();
            return (
              <div key={s.uid} className="card overflow-hidden">
                <button onClick={() => setLoginTab(loginTab === s.uid ? null : s.uid)}
                  className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50">
                  <img src={s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.displayName||'?')}&background=1a2744&color=fff`}
                    alt="" className="w-9 h-9 rounded-full flex-shrink-0"/>
                  <div className="flex-1">
                    <p className="font-bold text-navy text-sm">{s.displayName || s.email}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-navy">{lastLogin ? relativeTime(lastLogin) : '—'}</p>
                    <p className="text-[10px] text-gray-400">כניסות: {s.loginCount || 1}</p>
                  </div>
                  <Clock size={14} className="text-gray-400 flex-shrink-0"/>
                  {loginTab === s.uid ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                {loginTab === s.uid && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <p className="text-xs font-bold text-navy mb-2">היסטוריית כניסות (20 אחרונות)</p>
                    <LoginHistory uid={s.uid} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <>
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['all','כולם'],['inprogress','בתהליך'],['done','השלימו'],['notstarted','לא התחילו']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === v ? 'bg-navy text-white' : 'bg-white text-navy border border-gray-200 hover:border-navy'}`}>
                {l} {v === 'all' ? `(${totalStudents})` : `(${students.filter(s => {
                  const d = Object.values(s.done || {}).filter(Boolean).length;
                  if (v === 'done') return d === TOTAL;
                  if (v === 'inprogress') return d > 0 && d < TOTAL;
                  if (v === 'notstarted') return d === 0;
                  return true;
                }).length})`}
              </button>
            ))}
          </div>

          {/* Students list */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-terracotta border-t-transparent rounded-full animate-spin mb-3"/>
              <p className="text-gray-500 text-sm">טוען תלמידים...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-4xl mb-2">👤</p>
              <p className="text-gray-500 text-sm">אין תלמידים עדיין. שלחו להם את הקישור!</p>
            </div>
          ) : (
            filtered.map(s => (
              <StudentRow key={s.uid} student={s}
                selected={selected === s.uid}
                onSelect={() => setSelected(selected === s.uid ? null : s.uid)} />
            ))
          )}

          {/* Station completion heatmap */}
          {students.length > 0 && (
            <div className="card p-4 mt-5">
              <h3 className="font-bold text-navy text-sm mb-3">🗺️ התקדמות לפי תחנה</h3>
              <div className="space-y-1.5">
                {[...NOVEL_STATIONS.map(s => ({ key: `station-${s.id}`, label: `${s.emoji} תחנה ${s.id}: ${s.title}` })),
                   ...POEMS.map(p => ({ key: `poem-${p.id}`, label: `${p.emoji} שיר ${p.id}: ${p.title}` }))
                ].map(item => {
                  const count = students.filter(s => s.done?.[item.key]).length;
                  const pct   = totalStudents ? Math.round((count / totalStudents) * 100) : 0;
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <p className="text-xs text-gray-600 w-52 truncate flex-shrink-0">{item.label}</p>
                      <div className="flex-1 h-2 bg-sand-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 70 ? '#4A7C59' : pct > 30 ? '#D4754E' : '#94a3b8' }}/>
                      </div>
                      <p className="text-[10px] text-gray-500 w-12 text-left">{count}/{totalStudents}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
