/**
 * US-05 课程规划 · 低保真线框(两阶段版 V4 · 网页端)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 选课·新学 ② 选课·复习 ③ 统一分配 ④ 一键错开 ⑤ 时间微调 ⑥ 完成课程规划。
 * 四阶段单向推进 pick → alloc(统一分配) → fine(时间微调) → done;进入微调后统一层锁定。
 */
import {Fragment, useEffect, useRef, useState} from 'react';
import styles from './us05CoursePlanning.module.css';

/* ================= 常量与数据(与原原型一致) ================= */
const TODAY = '2026-11-05';
const HORIZON = 180;
const DAY_MIN = 18 * 60; // 轴起点 18:00
const DAY_MAX = 24 * 60; // 轴终点 24:00
const STEP = 15; // 吸附步长(分钟)
const MIN_SPAN = 15; // 单门课最短范围
const PPM = 1.25; // 日视图 像素/分钟
const NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

type Kind = 'new' | 'rev';
interface Course {
  id: string;
  kind: Kind;
  name: string;
  dir: string;
  rec: number;
  diff: string;
  pre: string;
}

const CATALOG: Course[] = [
  {id: 'n1', kind: 'new', name: '线性代数', dir: '数学', rec: 30, diff: '中', pre: '无'},
  {id: 'n2', kind: 'new', name: '概率论与数理统计', dir: '数学', rec: 30, diff: '较难', pre: '无'},
  {id: 'n3', kind: 'new', name: '数据结构与算法', dir: '计算机', rec: 45, diff: '难', pre: 'C 语言程序设计'},
  {id: 'n4', kind: 'new', name: '计算机组成原理', dir: '计算机', rec: 45, diff: '难', pre: '数字逻辑'},
  {id: 'n5', kind: 'new', name: '微观经济学', dir: '经管', rec: 30, diff: '中', pre: '无'},
  {id: 'n6', kind: 'new', name: '学术英语写作', dir: '语言', rec: 20, diff: '易', pre: '无'},
  {id: 'r1', kind: 'rev', name: '高等数学（上）', dir: '数学', rec: 20, diff: '中', pre: '无'},
  {id: 'r2', kind: 'rev', name: '线性代数', dir: '数学', rec: 20, diff: '中', pre: '无'},
  {id: 'r3', kind: 'rev', name: 'C 语言程序设计', dir: '计算机', rec: 20, diff: '易', pre: '无'},
];

interface Ov {
  s: number;
  e: number;
}
interface Assign {
  cid: string;
  from: string;
  to: string;
  start: number;
  end: number;
  ov?: Record<string, Ov>;
}

const DEFAULT_ASSIGN: Assign[] = [
  {
    cid: 'n1',
    from: '2026-11-05',
    to: '2026-11-14',
    start: 19 * 60,
    end: 19 * 60 + 45,
    ov: {'2026-11-10': {s: 18 * 60, e: 20 * 60}}, // 11/10 单独微调:18:00–20:00
  },
  {cid: 'n2', from: '2026-11-05', to: '2026-11-08', start: 19 * 60 + 30, end: 20 * 60 + 30},
  {cid: 'n5', from: '2026-11-08', to: '2026-11-18', start: 20 * 60 + 30, end: 21 * 60 + 15},
];

const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

type Step = 'pick' | 'alloc' | 'fine' | 'done';
type Tab = 'new' | 'rev';
type View = 'month' | 'day';

const STAGES: {key: string; label: string}[] = [
  {key: 'pickNew', label: '① 选课 · 新学'},
  {key: 'pickRev', label: '② 选课 · 复习'},
  {key: 'alloc', label: '③ 统一分配'},
  {key: 'stagger', label: '④ 一键错开（统一层消解）'},
  {key: 'fine', label: '⑤ 时间微调'},
  {key: 'done', label: '⑥ 完成课程规划'},
];

/* ================= 纯工具(原样搬运 + TS 类型) ================= */
function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}
function copyAssign(x: Assign): Assign {
  const y: Assign = {...x};
  if (x.ov) y.ov = {...x.ov};
  return y;
}
function d2s(d: Date) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function s2d(s: string) {
  const p = String(s).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
function addD(s: string, n: number) {
  const d = s2d(s);
  d.setDate(d.getDate() + n);
  return d2s(d);
}
function diffD(a: string, b: string) {
  return Math.round((s2d(b).getTime() - s2d(a).getTime()) / 86400000);
}
function clampD(s: string, lo: string, hi: string) {
  return s < lo ? lo : s > hi ? hi : s;
}
function m2s(m: number) {
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
}
function shortT(m: number) {
  return m % 60 ? Math.floor(m / 60) + ':' + pad(m % 60) : String(Math.floor(m / 60));
}
function s2m(s: string) {
  const p = String(s).split(':');
  return +p[0] * 60 + (+p[1] || 0);
}
function snap(m: number) {
  return Math.round(m / STEP) * STEP;
}
function dur(min: number) {
  if (min < 60) return min + ' 分钟';
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
}
function byId(id: string) {
  for (let i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
  return null;
}
function maxD() {
  return addD(TODAY, HORIZON);
}

/* 某门课在某天的实际时间范围(含单日例外) */
function rangeOn(a: Assign, ds: string): {s: number; e: number; own: boolean} {
  const o = a.ov && a.ov[ds];
  return o ? {s: o.s, e: o.e, own: true} : {s: a.start, e: a.end, own: false};
}
function ovCount(a: Assign) {
  return a.ov ? Object.keys(a.ov).length : 0;
}
function ovDates(a: Assign) {
  if (!a.ov) return [];
  return Object.keys(a.ov).sort();
}

/* ================= 冲突计算(纯函数,入参 assigns) ================= */
interface DayInst {
  cid: string;
  start: number;
  end: number;
  own: boolean;
}

/** 返回当天所有课的"实例":{cid, start, end, own},按开始时间排序 */
function dayListOn(assigns: Assign[], ds: string): DayInst[] {
  const out: DayInst[] = [];
  for (let i = 0; i < assigns.length; i++) {
    const a = assigns[i];
    if (ds >= a.from && ds <= a.to) {
      const r = rangeOn(a, ds);
      out.push({cid: a.cid, start: r.s, end: r.e, own: r.own});
    }
  }
  out.sort((x, y) => x.start - y.start || x.end - y.end);
  return out;
}
function timeOverlap(a: Assign, b: Assign) {
  return a.start < b.end && b.start < a.end;
}
function dateOverlap(a: Assign, b: Assign) {
  return a.from <= b.to && b.from <= a.to;
}

/** 某天所有重叠区间(合并后) */
function bandsOn(assigns: Assign[], ds: string) {
  const list = dayListOn(assigns, ds);
  const raw: {s: number; e: number}[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const s = Math.max(list[i].start, list[j].start);
      const e = Math.min(list[i].end, list[j].end);
      if (s < e) raw.push({s, e});
    }
  }
  raw.sort((x, y) => x.s - y.s);
  const out: {s: number; e: number}[] = [];
  for (let i = 0; i < raw.length; i++) {
    const last = out[out.length - 1];
    if (last && raw[i].s <= last.e) last.e = Math.max(last.e, raw[i].e);
    else out.push({s: raw[i].s, e: raw[i].e});
  }
  return out;
}
function hasClashOn(assigns: Assign[], ds: string) {
  return bandsOn(assigns, ds).length > 0;
}

/** 某门课参与的所有冲突,按「对手 + 重叠区间」聚合,并记录涉及哪些天 */
function clashDetailOf(assigns: Assign[], a: Assign) {
  const map: Record<string, {otherCid: string; s: number; e: number; days: string[]}> = {};
  let d = a.from;
  while (d <= a.to) {
    const list = dayListOn(assigns, d);
    let me: DayInst | null = null;
    for (const it of list) if (it.cid === a.cid) me = it;
    if (me) {
      for (const o of list) {
        if (o.cid === a.cid) continue;
        const s = Math.max(me.start, o.start);
        const e = Math.min(me.end, o.end);
        if (s >= e) continue;
        const key = o.cid + '|' + s + '|' + e;
        if (!map[key]) map[key] = {otherCid: o.cid, s, e, days: []};
        map[key].days.push(d);
      }
    }
    d = addD(d, 1);
  }
  const out = Object.keys(map).map(k => map[k]);
  out.sort((x, y) => x.s - y.s);
  return out;
}
function clashDaysFor(assigns: Assign[], a: Assign) {
  const set: Record<string, 1> = {};
  const detail = clashDetailOf(assigns, a);
  for (let i = 0; i < detail.length; i++) {
    for (let j = 0; j < detail[i].days.length; j++) set[detail[i].days[j]] = 1;
  }
  return Object.keys(set).length;
}

/** 所有课程里存在冲突的日期(去重,未排序) */
function allClashDaysIn(assigns: Assign[]) {
  const set: Record<string, 1> = {};
  for (let i = 0; i < assigns.length; i++) {
    let d = assigns[i].from;
    while (d <= assigns[i].to) {
      if (hasClashOn(assigns, d)) set[d] = 1;
      d = addD(d, 1);
    }
  }
  return Object.keys(set);
}

/* ================= 日视图泳道布局(纯函数) ================= */
interface LanedInst extends DayInst {
  lane: number;
  lanes: number;
}
function layoutLanes(list: DayInst[]): LanedInst[] {
  const lanes: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    let k = 0;
    while (k < lanes.length && lanes[k] > a.start) k++;
    (a as LanedInst).lane = k;
    lanes[k] = a.end;
  }
  const n = Math.max(1, lanes.length);
  const out = list as LanedInst[];
  for (let i = 0; i < out.length; i++) out[i].lanes = n;
  return out;
}

/* ================= 一键错开(纯函数:返回新的 assigns) ================= */
function autoStaggerPure(assigns: Assign[]): Assign[] {
  // 按开始时间排序后依次后移,直到彼此不重叠;单日例外跟着一起平移
  const arr = assigns.map(copyAssign);
  const list = arr.slice().sort((x, y) => x.start - y.start || x.end - y.end);
  const placed: Assign[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const span = a.end - a.start;
    const orig = a.start;
    let guard = 0;
    while (guard++ < 40) {
      let hit: Assign | null = null;
      for (let j = 0; j < placed.length; j++) {
        const p = placed[j];
        if (dateOverlap(a, p) && timeOverlap(a, p)) {
          if (!hit || p.end > hit.end) hit = p;
        }
      }
      if (!hit) break;
      a.start = snap(hit.end);
      a.end = a.start + span;
      if (a.end > DAY_MAX) {
        a.start = DAY_MIN;
        a.end = a.start + span;
        break;
      }
    }
    const delta = a.start - orig;
    if (delta && a.ov) {
      for (const k of Object.keys(a.ov)) {
        const dSpan = a.ov[k].e - a.ov[k].s;
        const ns = Math.max(DAY_MIN, Math.min(DAY_MAX - dSpan, a.ov[k].s + delta));
        a.ov[k] = {s: ns, e: ns + dSpan};
      }
    }
    placed.push(a);
  }
  return arr;
}

/* ================= 拖拽态(ref 记录,派生渲染靠 state 镜像) ================= */
type Drag =
  | {kind: 'pick'; a: string; b: string; moved: boolean} // 月视图拖选日期区间
  | {kind: 'new'; s: number; e: number; moved: boolean} // 日视图拖空白新建区间(预览虚框)
  | {kind: 'ev'; cid: string; ds: string; y0: number; s0: number; e0: number; curS: number; moved: boolean}; // 日视图拖块平移

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us05CoursePlanningWireframe() {
  /* ================= 状态(对应原 state 对象) ================= */
  const [step, setStep] = useState<Step>('alloc'); // pick → alloc → fine → done 单向推进
  const [tab, setTab] = useState<Tab>('new');
  const [view, setView] = useState<View>('month');
  const [month, setMonth] = useState('2026-11');
  const [day, setDay] = useState(TODAY);
  const [act, setAct] = useState<string | null>('n1');
  const [assigns, setAssigns] = useState<Assign[]>(() => clone(DEFAULT_ASSIGN));

  /* 拖拽高频坐标的渲染镜像(逻辑真值在 dragRef) */
  const [pickPaint, setPickPaint] = useState<{a: string; b: string} | null>(null); // 月视图拖选高亮
  const [prevPaint, setPrevPaint] = useState<{s: number; e: number} | null>(null); // 日视图预览虚框
  const [evDrag, setEvDrag] = useState<{cid: string; curS: number; span: number} | null>(null); // 日视图拖块平移

  /* 窄屏紧凑月历(原 window.innerWidth < 640,改由 effect 内 matchMedia 监听) */
  const [compact, setCompact] = useState(false);

  /* toast */
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dragRef = useRef<Drag | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  /* 空选课时不得停留在分配/微调/完成阶段(原 renderAll 顶部守卫的等价提交在 go('done') 内) */
  const effStep: Step = !assigns.length && step !== 'pick' ? 'pick' : step;
  const fine = effStep === 'fine';
  const isFineStage = effStep === 'fine' || effStep === 'done'; // 微调后统一层锁定

  /* 派生:当前课程、课程名/序号、冲突日 */
  const cur = assigns.find(a => a.cid === act) || assigns[0];
  function nmOf(cid: string) {
    const c = byId(cid);
    return c ? c.name : '未命名';
  }
  function numOf(cid: string) {
    const i = assigns.findIndex(x => x.cid === cid);
    return i >= 0 ? NUM[i] : '•';
  }
  const cdAll = allClashDaysIn(assigns);
  const cdSorted = cdAll.slice().sort();

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* 窄屏监听:原 resize 里重算 compact,改为断点订阅 */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* ================= 阶段跃迁(集中跳转) ================= */
  function enterFine() {
    if (!assigns.length) {
      toast('还没有选择课程');
      return;
    }
    const cd = allClashDaysIn(assigns).sort();
    let nextDay = TODAY;
    let nextAct: string | null = act;
    if (cd.length) {
      nextDay = cd[0];
      const list = dayListOn(assigns, cd[0]);
      if (list.length) nextAct = list[0].cid;
    }
    setStep('fine');
    setView('day');
    setDay(nextDay);
    if (cd.length) setAct(nextAct);
    toast(
      cd.length
        ? '统一分配已提交，还有 ' + cd.length + ' 天时间重叠，逐日调开后再完成'
        : '统一分配已提交，时间无重叠，可以直接完成',
    );
  }

  function gotoNextClash() {
    const cd = allClashDaysIn(assigns).sort();
    if (!cd.length) {
      toast('已经没有时间重叠了');
      return;
    }
    let target: string | null = null;
    for (let i = 0; i < cd.length; i++) {
      if (cd[i] > day) {
        target = cd[i];
        break;
      }
    }
    if (!target) target = cd[0];
    setDay(target);
    setView('day');
    const list = dayListOn(assigns, target);
    if (list.length) setAct(list[0].cid);
    toast(
      '跳到 ' + (s2d(target).getMonth() + 1) + '/' + s2d(target).getDate() +
        (cd.length > 1 ? '，这天还有重叠' : '，这是最后一处重叠'),
    );
  }

  /** 工具条 ⑥ 段状态机跳转:守卫与 toast 与原 go() 一致 */
  function go(key: string) {
    if (key === 'pickNew' || key === 'pickRev') {
      setStep('pick');
      setTab(key === 'pickNew' ? 'new' : 'rev');
    } else if (key === 'alloc') {
      if (!assigns.length) {
        setStep('pick');
        return;
      }
      setStep('alloc');
      setView('month');
    } else if (key === 'stagger') {
      if (isFineStage) {
        toast('「一键错开」属于统一分配阶段的操作，进入微调后请逐日调整具体某一天');
        return;
      }
      setStep('alloc');
      const next = autoStaggerPure(assigns);
      setAssigns(next);
      const left0 = allClashDaysIn(next).length;
      toast(
        left0
          ? '已错开可自动调整的时段，仍有 ' + left0 + ' 天重叠（多为你单独调整过的日子），可在微调里逐日处理'
          : '已把 ' + next.length + ' 门课的首尾时间依次错开，重叠高亮已消失',
      );
    } else if (key === 'fine') {
      enterFine();
    } else if (key === 'done') {
      const cd1 = allClashDaysIn(assigns);
      if (cd1.length) {
        toast('还有 ' + cd1.length + ' 天时间重叠，先把微调做完才能完成规划');
        enterFine();
        return;
      }
      if (!assigns.length) {
        // 原 renderAll 守卫:空选课时弹回选课
        setView('month');
        setStep('pick');
        return;
      }
      setStep('done');
      setView('month');
    }
  }

  /* ================= 统一层写入守卫(收在一处) =================
     微调/完成阶段禁止再改日期区间与默认时间;原 setDateRange/applyTime 内的
     「拦截 + toast」在此统一,行为与文案逐字保留。返回 false 表示已拦截。 */
  function guardUnifiedLayer(msg?: string): boolean {
    if (!isFineStage) return true;
    if (msg) toast(msg);
    return false;
  }

  /* ================= 写入模型 ================= */
  /** 月视图拖选 → 改当前课的日期区间(统一层) */
  function setDateRange(d1: string, d2: string) {
    const a = cur;
    if (!a) return;
    if (!guardUnifiedLayer('统一分配已锁定，微调阶段不能改日期区间')) return;
    let lo = d1 < d2 ? d1 : d2;
    let hi = d1 < d2 ? d2 : d1;
    lo = clampD(lo, TODAY, maxD());
    hi = clampD(hi, TODAY, maxD());
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === a.cid)!;
    t.from = lo;
    t.to = hi;
    // 区间外的单日例外一并清掉,避免留下看不见的脏数据
    if (t.ov) {
      for (const k of Object.keys(t.ov)) {
        if (k < lo || k > hi) delete t.ov[k];
      }
      if (!Object.keys(t.ov).length) delete t.ov;
    }
    setAssigns(next);
    const cd = clashDaysFor(next, t);
    toast(
      '「' + nmOf(t.cid) + '」日期改为 ' + lo + ' → ' + hi + '（' + (diffD(lo, hi) + 1) + ' 天）' +
        (cd ? '，其中 ' + cd + ' 天出现时间重叠' : ''),
    );
  }

  /** 改「默认时间范围」:作用于区间内所有没有例外的日期(统一层) */
  function applyTime(cid: string, sIn: number, eIn: number, silent?: boolean) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    if (!guardUnifiedLayer('统一分配已锁定，这里只能调「具体某一天」')) return;
    const s = Math.max(DAY_MIN, Math.min(DAY_MAX - MIN_SPAN, snap(sIn)));
    const e = Math.max(s + MIN_SPAN, Math.min(DAY_MAX, snap(eIn)));
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === cid)!;
    t.start = s;
    t.end = e;
    // 和默认一致的单日例外已经没有意义,顺手清掉
    if (t.ov) {
      for (const k of Object.keys(t.ov)) {
        if (t.ov[k].s === s && t.ov[k].e === e) delete t.ov[k];
      }
      if (!Object.keys(t.ov).length) delete t.ov;
    }
    setAssigns(next);
    if (silent) return;
    const cl = clashDetailOf(next, t);
    let msg = '「' + nmOf(t.cid) + '」默认时间改为 ' + m2s(s) + '–' + m2s(e) +
      (ovCount(t) ? '（' + ovCount(t) + ' 天保留单独调整）' : '');
    if (cl.length) {
      msg += '，与「' + nmOf(cl[0].otherCid) + '」重叠 ' + (cl[0].e - cl[0].s) + ' 分钟';
    }
    toast(msg);
  }

  /** 改「某一天的例外」:只影响这一天(微调阶段唯一的时间编辑入口) */
  function setDayRange(cid: string | null, ds: string, sIn: number, eIn: number) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    if (!isFineStage) {
      toast('请先把统一分配提交，再逐日微调');
      return;
    }
    if (ds < a.from || ds > a.to) return;
    const s = Math.max(DAY_MIN, Math.min(DAY_MAX - MIN_SPAN, snap(sIn)));
    const e = Math.max(s + MIN_SPAN, Math.min(DAY_MAX, snap(eIn)));
    const same = s === a.start && e === a.end;
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === cid)!;
    if (same) {
      if (t.ov) {
        delete t.ov[ds];
        if (!Object.keys(t.ov).length) delete t.ov;
      }
    } else {
      t.ov = t.ov || {};
      t.ov[ds] = {s, e};
    }
    setAssigns(next);
    const dayTxt = (s2d(ds).getMonth() + 1) + '/' + s2d(ds).getDate();
    let msg = same
      ? dayTxt + ' 已恢复默认 ' + m2s(t.start) + '–' + m2s(t.end)
      : dayTxt + ' 单独设为 ' + m2s(s) + '–' + m2s(e) + '，其余日子仍是 ' + m2s(t.start) + '–' + m2s(t.end);
    const list = dayListOn(next, ds);
    let cl: {other: string; s: number; e: number} | null = null;
    for (const it of list) {
      if (it.cid !== cid) continue;
      for (const o of list) {
        if (o.cid === cid) continue;
        if (o.start < it.end && it.start < o.end) {
          cl = {other: o.cid, s: Math.max(it.start, o.start), e: Math.min(it.end, o.end)};
        }
      }
    }
    if (cl) msg += '；与「' + nmOf(cl.other) + '」重叠 ' + (cl.e - cl.s) + ' 分钟';
    toast(msg);
  }

  function clearOv(cid: string | null, ds: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a || !a.ov || !a.ov[ds]) return;
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === cid)!;
    if (!t.ov) return;
    delete t.ov[ds];
    if (!Object.keys(t.ov).length) delete t.ov;
    setAssigns(next);
    toast((s2d(ds).getMonth() + 1) + '/' + s2d(ds).getDate() + ' 已恢复默认 ' + m2s(t.start) + '–' + m2s(t.end));
  }
  function clearOvAll(cid: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a || !a.ov) return;
    const next = assigns.map(x => (x.cid === cid ? copyAssign(x) : x));
    delete next.find(x => x.cid === cid)!.ov;
    setAssigns(next);
    toast('「' + nmOf(cid) + '」所有单独调整已恢复默认');
  }

  /* ================= 选课 ================= */
  function togglePick(cid: string) {
    const c = byId(cid);
    if (!c) return;
    if (c.kind === 'new' && c.pre !== '无') return;
    const a = assigns.find(x => x.cid === cid);
    let next: Assign[];
    let nextAct = act;
    if (a) {
      next = assigns.filter(x => x.cid !== cid);
      if (act === cid && next.length) nextAct = next[0].cid;
    } else {
      // 新加入:日期区间默认接在最后一门课之后,时间范围按推荐用时从 19:00 起排
      let from = TODAY;
      let to = addD(TODAY, 6);
      let st = 19 * 60;
      if (assigns.length) {
        const last = assigns[assigns.length - 1];
        from = last.from;
        to = last.to;
        st = snap(last.end);
        if (st + c.rec > DAY_MAX) st = DAY_MIN;
      }
      next = assigns.concat([{cid, from, to, start: st, end: Math.min(st + c.rec, DAY_MAX)}]);
      nextAct = cid;
    }
    setAssigns(next);
    setAct(nextAct);
  }

  /* ================= 卡片输入(日期 / 时间 / 双柄轨) ================= */
  function onDateChange(cid: string, role: 'from' | 'to', value: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    let v = value || (role === 'from' ? a.from : a.to);
    v = clampD(v, TODAY, maxD());
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === cid)!;
    if (role === 'from') {
      t.from = v;
      if (t.to < t.from) t.to = t.from;
    } else {
      t.to = v;
      if (t.from > t.to) t.from = t.to;
    }
    if (t.ov) {
      for (const k of Object.keys(t.ov)) {
        if (k < t.from || k > t.to) delete t.ov[k];
      }
      if (!Object.keys(t.ov).length) delete t.ov;
    }
    setAssigns(next);
    const cd = clashDaysFor(next, t);
    toast('「' + nmOf(cid) + '」日期改为 ' + (diffD(t.from, t.to) + 1) + ' 天' + (cd ? '，其中 ' + cd + ' 天时间重叠' : ''));
  }

  function onTimeChange(cid: string, role: 'start' | 'end', value: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    const m = s2m(value);
    if (Number.isNaN(m)) return; // 受控输入:非法值不落地,重渲染即回弹(原 renderAll)
    let s0 = a.start;
    let e0 = a.end;
    if (role === 'start') {
      s0 = Math.max(DAY_MIN, Math.min(DAY_MAX - MIN_SPAN, snap(m)));
      if (e0 <= s0) e0 = Math.min(DAY_MAX, s0 + MIN_SPAN);
    } else {
      e0 = Math.max(DAY_MIN + MIN_SPAN, Math.min(DAY_MAX, snap(m)));
      if (e0 <= s0) s0 = Math.max(DAY_MIN, e0 - MIN_SPAN);
    }
    applyTime(cid, s0, e0);
  }

  /** 双柄轨拖动:只做实时跟手(原 input 事件的局部刷新),松手/抬键再走 applyTime 提交 */
  function onRailInput(cid: string, role: 'rstart' | 'rend', v: number) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    const next = assigns.map(copyAssign);
    const t = next.find(x => x.cid === cid)!;
    if (role === 'rstart') {
      t.start = Math.max(DAY_MIN, Math.min(v, t.end - MIN_SPAN));
    } else {
      t.end = Math.min(DAY_MAX, Math.max(v, t.start + MIN_SPAN));
    }
    setAssigns(next);
  }
  function onRailCommit(cid: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    applyTime(cid, a.start, a.end); // 原 change 事件:提交并 toast
  }

  /* ================= 底部按钮 ================= */
  function onNext() {
    if (step === 'alloc') {
      enterFine();
      return;
    }
    if (step !== 'fine') return;
    const cd = allClashDaysIn(assigns);
    if (cd.length) {
      toast('还有 ' + cd.length + ' 天时间重叠，先处理完才能完成课程规划');
      gotoNextClash();
      return;
    }
    setStep('done');
    setView('month');
    toast('课程规划已完成，每日任务已写入日历本');
  }

  function onStaggerBtn() {
    if (isFineStage) return; // 微调阶段按钮已隐藏,此处兜底
    const next = autoStaggerPure(assigns);
    setAssigns(next);
    const left = allClashDaysIn(next).length;
    toast(
      left
        ? '已错开可自动调整的时段，仍有 ' + left + ' 天重叠（多为单独调整过的日子）'
        : '已把 ' + next.length + ' 门课首尾相接错开',
    );
  }

  function onResetBtn() {
    if (isFineStage) return;
    const next = clone(DEFAULT_ASSIGN);
    setAssigns(next);
    setAct(next[0].cid);
    setDay(TODAY);
    toast('已恢复默认分配');
  }

  function onRestartBtn() {
    setAssigns([]);
    setAct(null);
    setStep('pick');
    setTab('new');
    setView('month');
    setDay(TODAY);
    toast('已开始新一轮规划，请重新选课');
  }

  function shiftMonth(n: number) {
    const d = s2d(month + '-01');
    d.setMonth(d.getMonth() + n);
    const lo = TODAY.slice(0, 7);
    const hi = maxD().slice(0, 7);
    setMonth(clampD(d.getFullYear() + '-' + pad(d.getMonth() + 1), lo, hi));
  }

  function onViewBtn(v: View) {
    if (v === 'day' && !isFineStage) {
      toast('统一分配阶段只能按月查看；点「完成分配，进入微调」后可逐日微调');
      return;
    }
    setView(v);
  }

  /* ================= 拖拽(mousedown 在元素上,document 级 mousemove/mouseup) ================= */
  /* 最新闭包的桥:document 监听只挂一次,通过 ref 取当次渲染的写入函数与状态 */
  const fn = useRef({setDateRange, setDayRange, assigns, act, day});
  fn.current = {setDateRange, setDayRange, assigns, act, day};

  /** 月视图格子按下:微调阶段直接进当天日视图;分配阶段开始拖选日期区间 */
  function onCellMouseDown(e: React.MouseEvent, ds: string) {
    if (e.button !== 0) return;
    if (isFineStage) {
      const list = dayListOn(assigns, ds);
      setDay(ds);
      setView('day');
      if (list.length) setAct(list[0].cid);
      return;
    }
    dragRef.current = {kind: 'pick', a: ds, b: ds, moved: false};
    setPickPaint({a: ds, b: ds});
    e.preventDefault();
  }

  /** 日视图事件块按下:开始平移拖拽(不限按键,与原 bindTrack 一致) */
  function onEvMouseDown(e: React.MouseEvent, cid: string, s0: number, e0: number) {
    dragRef.current = {kind: 'ev', cid, ds: day, y0: e.clientY, s0, e0, curS: s0, moved: false};
    e.preventDefault();
    e.stopPropagation(); // 不落到轨道的"拖空白新建"分支
  }

  /** 日视图轨道按下空白:新建当天区间(预览虚框) */
  function onTrackMouseDown(e: React.MouseEvent) {
    if (effStep !== 'fine') return; // 微调阶段才允许在日视图上改时间
    if (e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let m = snap(DAY_MIN + (e.clientY - rect.top) / PPM);
    m = Math.max(DAY_MIN, Math.min(DAY_MAX - MIN_SPAN, m));
    dragRef.current = {kind: 'new', s: m, e: m + MIN_SPAN, moved: false};
    setPrevPaint({s: m, e: m + MIN_SPAN});
    e.preventDefault();
  }

  /** 日视图事件块键盘:↑ / ↓ 平移 15 分钟(只改当天),回车/空格激活 */
  function onEvKeyDown(e: React.KeyboardEvent, cid: string) {
    const a = assigns.find(x => x.cid === cid);
    if (!a) return;
    if (e.key === 'Enter' || e.key === ' ') {
      setAct(cid);
      e.preventDefault();
      return;
    }
    if (!isFineStage) return;
    const r0 = rangeOn(a, day);
    const span = r0.e - r0.s;
    let ns = r0.s;
    if (e.key === 'ArrowUp') ns = r0.s - STEP;
    else if (e.key === 'ArrowDown') ns = r0.s + STEP;
    else return;
    e.preventDefault();
    ns = Math.max(DAY_MIN, Math.min(DAY_MAX - span, ns));
    setAct(cid);
    setDayRange(cid, day, ns, ns + span);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === 'pick') {
        // 月视图拖选:命中哪个格子就扩展到哪(派生渲染由 pickPaint 驱动)
        const el = e.target as Element | null;
        const cell = el && el.closest ? el.closest('.' + styles.mcell) : null;
        if (cell) {
          const ds = cell.getAttribute('data-d');
          if (ds && ds !== d.b) {
            d.b = ds;
            d.moved = true;
            setPickPaint({a: d.a, b: d.b});
          }
        }
        return;
      }
      if (d.kind === 'new') {
        // 日视图拖空白:实时更新预览虚框
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        let m = snap(DAY_MIN + (e.clientY - rect.top) / PPM);
        m = Math.max(DAY_MIN, Math.min(DAY_MAX, m));
        d.e = m;
        if (Math.abs(m - d.s) >= STEP) d.moved = true;
        setPrevPaint({s: d.s, e: d.e});
        return;
      }
      // 日视图拖块平移:15 分钟吸附 + 边界约束,位置由 evDrag 派生渲染
      const dy = e.clientY - d.y0;
      if (Math.abs(dy) > 3) d.moved = true;
      const span = d.e0 - d.s0;
      let ns = d.s0 + snap(dy / PPM);
      ns = Math.max(DAY_MIN, Math.min(DAY_MAX - span, ns));
      d.curS = ns;
      setEvDrag({cid: d.cid, curS: ns, span});
    }
    function onUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (d.kind === 'pick') {
        setPickPaint(null);
        if (d.moved) {
          fn.current.setDateRange(d.a, d.b);
        } else {
          // 单击某天:激活该天第一门课(统一分配阶段不切日视图)
          const dlist = dayListOn(fn.current.assigns, d.a);
          setDay(d.a);
          if (dlist.length) setAct(dlist[0].cid);
        }
        return;
      }
      if (d.kind === 'new') {
        setPrevPaint(null);
        if (!d.moved) return; // 原地点一下:撤掉预览,不写入
        let s = Math.min(d.s, d.e);
        let e = Math.max(d.s, d.e);
        if (e - s < MIN_SPAN) e = s + MIN_SPAN;
        fn.current.setDayRange(fn.current.act, fn.current.day, s, e);
        return;
      }
      setEvDrag(null);
      if (d.moved) {
        fn.current.setDayRange(d.cid, d.ds, d.curS, d.curS + (d.e0 - d.s0));
      } else {
        setAct(d.cid); // 原地点击块 = 激活该课
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  /* ================= 渲染:派生量 ================= */
  const toolbarOn =
    effStep === 'pick' ? (tab === 'new' ? 'pickNew' : 'pickRev') : effStep === 'done' ? 'done' : effStep === 'fine' ? 'fine' : 'alloc';
  const totalSpan = assigns.reduce((s, x) => s + (x.end - x.start), 0);
  const cntNew = assigns.filter(x => byId(x.cid)?.kind === 'new').length;
  const cntRev = assigns.length - cntNew;

  const STEP_ITEMS = ['选课', '统一分配', '时间微调', '完成'];
  function renderSteps(curN: number) {
    return STEP_ITEMS.map((it, i) => {
      const n = i + 1;
      return (
        <Fragment key={it}>
          {i > 0 && <span className={styles.sp}>—</span>}
          <span className={cx(styles.st, n < curN && styles.ok, n === curN && styles.on)}>
            <i>{n < curN ? '✓' : n}</i>
            {it}
          </span>
        </Fragment>
      );
    });
  }

  /* 选课页行(按方向分组,组头是内联样式的分隔条,与原一致) */
  const pickRows: React.ReactNode[] = [];
  let lastDir = '';
  CATALOG.forEach(c => {
    if (c.kind !== tab) return;
    const isOn = assigns.some(x => x.cid === c.id);
    const blocked = c.kind === 'new' && c.pre !== '无';
    if (c.dir !== lastDir) {
      lastDir = c.dir;
      pickRows.push(
        <div
          key={'dir-' + c.dir}
          style={{padding: '5px 12px', background: 'var(--soft)', borderBottom: '1px solid var(--dash)', fontSize: '10.5px', color: 'var(--ink-3)'}}
        >
          {c.dir}
        </div>,
      );
    }
    pickRows.push(
      <label
        key={c.id}
        className={cx(styles.crow, isOn && styles.on, blocked && styles.off)}
        onClick={e => {
          if (blocked) return;
          e.preventDefault(); // 与原一致:阻止 label 转发的原生勾选,只走 togglePick
          togglePick(c.id);
        }}
      >
        <input type="checkbox" checked={isOn} disabled={blocked} aria-label={c.name} onChange={() => {}} />
        <div style={{flex: 1, minWidth: 0}}>
          <div className={styles.nm}>{c.name}</div>
          <div className={styles.meta}>
            <span className={styles.tag}>{c.dir}</span>
            <span className={styles.tag}>难度 {c.diff}</span>
            <span className={styles.mtxt}>推荐每日 {c.rec} 分钟</span>
            {blocked && <span className={styles.mtxt}>· 先修「{c.pre}」未完成</span>}
          </div>
        </div>
        <div className={styles.side}>{blocked ? '暂不可选' : isOn ? '已选' : '可选'}</div>
      </label>,
    );
  });

  /* 左栏课程卡 */
  function renderCard(a: Assign, idx: number): React.ReactNode {
    const c = byId(a.cid);
    const isAct = act === a.cid;
    const days = diffD(a.from, a.to) + 1;
    const span = a.end - a.start;
    const rec = c ? c.rec : 30;
    const clash = clashDetailOf(assigns, a);
    const ovs = ovDates(a);
    const fm = s2d(a.from);
    const tm = s2d(a.to);

    /* 双柄轨影:其它课程占用的时间区间 → 斜纹影,提示"这段是别人的" */
    const ghosts: {left: number; width: number}[] = [];
    for (const b of assigns) {
      if (b.cid === a.cid) continue;
      if (!dateOverlap(a, b)) continue;
      const gs = Math.max(DAY_MIN, b.start);
      const ge = Math.min(DAY_MAX, b.end);
      if (ge <= gs) continue;
      ghosts.push({left: ((gs - DAY_MIN) / (DAY_MAX - DAY_MIN)) * 100, width: ((ge - gs) / (DAY_MAX - DAY_MIN)) * 100});
    }

    const diff = span - rec;
    const dTxt = diff === 0 ? '与推荐一致' : diff > 0 ? '比推荐多 ' + diff + ' 分钟' : '比推荐少 ' + -diff + ' 分钟';

    return (
      <div key={a.cid} className={cx(styles.cc, clash.length > 0 && styles.clash)} data-act={isAct ? '1' : '0'}>
        <button
          className={styles.ccH}
          type="button"
          aria-expanded={isAct ? 'true' : 'false'}
          onClick={() => {
            if (act !== a.cid) setAct(a.cid);
          }}
        >
          <span className={styles.num}>{idx + 1}</span>
          <span className={styles.nm}>
            <span className={styles.nmT}>
              <em>{c ? c.name : '未命名'}</em>
              {clash.length > 0 && <span className={cx(styles.chip, styles.clash)}>时间重叠</span>}
            </span>
            <span className={styles.meta}>
              {fm.getMonth() + 1}/{fm.getDate()}–{tm.getMonth() + 1}/{tm.getDate()} · {days} 天 · {m2s(a.start)}–{m2s(a.end)}
              {ovs.length > 0 && <span style={{color: 'var(--ink-2)'}}> · {ovs.length} 天单独调整</span>}
            </span>
          </span>
          <span className={styles.car}>▾</span>
        </button>

        <div className={styles.ccB} hidden={!isAct}>
          {isFineStage ? (
            /* 微调阶段:统一分配已锁定,这里只陈列不可编辑的事实 */
            <div className={styles.seg}>
              <div className={styles.segH}>
                <span className={styles.k}>统一分配 · 已锁定</span>
                <span className={styles.grow} />
                <span className={styles.v}>不可再改</span>
              </div>
              <div className={styles.lockrows}>
                <div className={styles.lr}>
                  <span className={styles.lk2}>日期</span>
                  <span className={styles.lv}>
                    {fm.getMonth() + 1}/{fm.getDate()}–{tm.getMonth() + 1}/{tm.getDate()} · {days} 天
                  </span>
                </div>
                <div className={styles.lr}>
                  <span className={styles.lk2}>每日</span>
                  <span className={styles.lv}>
                    {m2s(a.start)}–{m2s(a.end)} · {dur(span)}
                  </span>
                </div>
              </div>
              <div className={styles.segHint}>要改日期区间或默认时间需重新开始规划；这里只能改「具体某一天」。</div>
            </div>
          ) : (
            <Fragment>
              {/* 1 日期区间 */}
              <div className={styles.seg}>
                <div className={styles.segH}>
                  <span className={styles.k}>日期区间</span>
                  <span className={styles.grow} />
                  <span className={styles.v}>共 {days} 天</span>
                </div>
                <div className={styles.segIn}>
                  <input
                    className={styles.di}
                    type="date"
                    value={a.from}
                    min={TODAY}
                    max={maxD()}
                    aria-label={(c ? c.name : '未命名') + ' 开始日期'}
                    onChange={e => onDateChange(a.cid, 'from', e.target.value)}
                  />
                  <span className={styles.tilde}>→</span>
                  <input
                    className={styles.di}
                    type="date"
                    value={a.to}
                    min={TODAY}
                    max={maxD()}
                    aria-label={(c ? c.name : '未命名') + ' 结束日期'}
                    onChange={e => onDateChange(a.cid, 'to', e.target.value)}
                  />
                </div>
                <div className={styles.segHint}>也可以直接在右侧月历上按住拖动，圈出连续日期。</div>
              </div>

              {/* 2 默认时间范围(双柄轨 = 两层 input[type=range] 叠加) */}
              <div className={styles.seg}>
                <div className={styles.segH}>
                  <span className={styles.k}>默认时间范围</span>
                  <span className={styles.grow} />
                  <span className={styles.v}>{dur(span)}</span>
                </div>
                <div className={styles.segIn}>
                  <input
                    className={styles.ti}
                    type="time"
                    value={m2s(a.start)}
                    min={m2s(DAY_MIN)}
                    max={m2s(DAY_MAX)}
                    step={900}
                    aria-label={(c ? c.name : '未命名') + ' 每日开始时间'}
                    onChange={e => onTimeChange(a.cid, 'start', e.target.value)}
                  />
                  <span className={styles.tilde}>→</span>
                  <input
                    className={styles.ti}
                    type="time"
                    value={m2s(a.end)}
                    min={m2s(DAY_MIN)}
                    max={m2s(DAY_MAX)}
                    step={900}
                    aria-label={(c ? c.name : '未命名') + ' 每日结束时间'}
                    onChange={e => onTimeChange(a.cid, 'end', e.target.value)}
                  />
                </div>
                <div className={styles.rail}>
                  <div className={styles.railIn}>
                    {ghosts.map((g, gi) => (
                      <span key={gi} className={styles.ghost} style={{left: g.left + '%', width: g.width + '%'}} />
                    ))}
                    <span
                      className={styles.fill}
                      style={{
                        left: ((a.start - DAY_MIN) / (DAY_MAX - DAY_MIN)) * 100 + '%',
                        width: ((a.end - a.start) / (DAY_MAX - DAY_MIN)) * 100 + '%',
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={DAY_MIN}
                    max={DAY_MAX}
                    step={STEP}
                    value={a.start}
                    aria-label={(c ? c.name : '未命名') + ' 开始时间滑块'}
                    onChange={e => onRailInput(a.cid, 'rstart', +e.target.value)}
                    onMouseUp={() => onRailCommit(a.cid)}
                    onKeyUp={() => onRailCommit(a.cid)}
                  />
                  <input
                    type="range"
                    min={DAY_MIN}
                    max={DAY_MAX}
                    step={STEP}
                    value={a.end}
                    aria-label={(c ? c.name : '未命名') + ' 结束时间滑块'}
                    onChange={e => onRailInput(a.cid, 'rend', +e.target.value)}
                    onMouseUp={() => onRailCommit(a.cid)}
                    onKeyUp={() => onRailCommit(a.cid)}
                  />
                </div>
                <div className={styles.railAxis}>
                  <span>18:00</span>
                  <span>20:00</span>
                  <span>22:00</span>
                  <span>24:00</span>
                </div>
                <div className={styles.segHint}>
                  作用于区间内<b>所有日期</b>。完成分配后才可逐日微调。
                </div>
              </div>
            </Fragment>
          )}

          {/* 3 推荐用时(informational only) */}
          <div className={styles.rec}>
            <span className={styles.rk}>推荐用时</span>
            <span className={styles.rv}>{rec} 分钟 / 天</span>
            <span className={styles.rd}>{dTxt}</span>
          </div>

          {/* 4 冲突说明 */}
          {clash.length > 0 && (
            <div className={styles.clashNote}>
              {clash.map((it, k) => (
                <Fragment key={k}>
                  {k > 0 && <br />}
                  与「{numOf(it.otherCid)} {nmOf(it.otherCid)}」<b>{m2s(it.s)}–{m2s(it.e)}</b> 重叠 <b>{it.e - it.s}</b> 分钟（
                  {it.days.length > 1 ? '涉及 ' + it.days.length + ' 天' : '仅 ' + (s2d(it.days[0]).getMonth() + 1) + '/' + s2d(it.days[0]).getDate()}）
                </Fragment>
              ))}
            </div>
          )}

          {/* 5 单日例外 */}
          {ovs.length > 0 && (
            <div className={styles.ovBox}>
              <div className={styles.ovH}>
                <span className={styles.k}>
                  单独调整的日子
                  {!isFineStage && <em className={styles.ovSrc}>微调阶段产生</em>}
                </span>
                <span className={styles.grow} />
                <button type="button" className={styles.lnk} onClick={() => clearOvAll(a.cid)}>
                  全部恢复
                </button>
              </div>
              {ovs.map(ds => {
                const o = a.ov![ds];
                const dd = s2d(ds);
                return (
                  <div key={ds} className={styles.ovRow}>
                    <span className={styles.ovD}>
                      {dd.getMonth() + 1}/{dd.getDate()} {WD[dd.getDay()]}
                    </span>
                    <span className={styles.ovT}>
                      {m2s(o.s)}–{m2s(o.e)}
                    </span>
                    <span className={styles.ovL}>{dur(o.e - o.s)}</span>
                    <button type="button" className={styles.lnk} onClick={() => clearOv(a.cid, ds)}>
                      恢复默认
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= 月视图(42 格按钮) ================= */
  function renderMonth(): React.ReactNode {
    const first = s2d(month + '-01');
    const dow = (first.getDay() + 6) % 7; // 周一为 0
    const start = addD(month + '-01', -dow);
    const a = cur;
    const lo = pickPaint ? (pickPaint.a < pickPaint.b ? pickPaint.a : pickPaint.b) : '';
    const hi = pickPaint ? (pickPaint.a < pickPaint.b ? pickPaint.b : pickPaint.a) : '';
    const maxBars = compact ? 2 : 3; // 原按 window.innerWidth < 640 收紧为 2 行
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < 42; i++) {
      const ds = addD(start, i);
      const inM = ds.slice(0, 7) === month;
      const list = dayListOn(assigns, ds);
      const bands = bandsOn(assigns, ds);
      const inSel = !!a && ds >= a.from && ds <= a.to;
      const selNow = pickPaint ? ds >= lo && ds <= hi : inSel; // 拖选期间由 pickPaint 驱动高亮
      const dd = s2d(ds);
      const label =
        dd.getMonth() + 1 + '月' + dd.getDate() + '日 ' + WD[dd.getDay()] +
        (list.length
          ? '，' + list.length + ' 门课：' +
            list.map(x => nmOf(x.cid) + m2s(x.start) + '到' + m2s(x.end) + (x.own ? '（单独调整）' : '')).join('，')
          : '，无安排') +
        (bands.length ? '，时间重叠' : '');
      cells.push(
        <button
          key={ds}
          type="button"
          className={cx(
            styles.mcell,
            !inM && styles.out,
            selNow && styles.sel,
            bands.length > 0 && styles.clash,
            ds === TODAY && styles.today,
            ds === day && styles.cur,
          )}
          data-d={ds}
          role="gridcell"
          aria-label={label}
          onMouseDown={e => onCellMouseDown(e, ds)}
        >
          <span className={styles.mrow}>
            <span className={styles.dn}>{dd.getDate()}</span>
            {bands.length > 0 && <span className={styles.flag}>重叠</span>}
          </span>
          <span className={styles.bars}>
            {list.slice(0, maxBars).map((it, j) => (
              <span key={j} className={cx(styles.bar, it.own && styles.own)}>
                <i>{numOf(it.cid)}</i>
                <span className={styles.bn}>{nmOf(it.cid)}</span>
                <span className={styles.bt}>
                  {compact ? shortT(it.start) + '-' + shortT(it.end) : m2s(it.start) + '–' + m2s(it.end)}
                </span>
              </span>
            ))}
            {list.length > maxBars && (
              <span className={cx(styles.bar, styles.more)}>+{list.length - maxBars} 门</span>
            )}
          </span>
        </button>,
      );
    }
    return (
      <Fragment>
        <div className={styles.dow} aria-hidden="true">
          <span>一</span>
          <span>二</span>
          <span>三</span>
          <span>四</span>
          <span>五</span>
          <span>六</span>
          <span>日</span>
        </div>
        <div className={styles.mgrid} role="grid" aria-label="课程日期月历">
          {cells}
        </div>
      </Fragment>
    );
  }

  /* ================= 日视图(泳道 + 冲突带 + 拖拽) ================= */
  function renderDay(): React.ReactNode {
    const dd = s2d(day);
    const a = cur;
    const list = layoutLanes(dayListOn(assigns, day));
    const bands = bandsOn(assigns, day);
    const actNm = a ? numOf(a.cid) + ' ' + nmOf(a.cid) : '—';
    const actInst = list.find(x => x.cid === act) || null;
    const actOwn = !!(actInst && actInst.own);
    const total = list.reduce((s, x) => s + (x.end - x.start), 0);
    const clashSum = bands.reduce((s, b) => s + (b.e - b.s), 0);

    /* 预览虚框:不足最短范围时按 MIN_SPAN 展示(原 paintPrev 的展示逻辑) */
    let pvS = 0;
    let pvE = 0;
    if (prevPaint) {
      pvS = Math.min(prevPaint.s, prevPaint.e);
      pvE = Math.max(prevPaint.s, prevPaint.e);
      if (pvE - pvS < MIN_SPAN) pvE = pvS + MIN_SPAN;
    }

    return (
      <div className={styles.dayv}>
        <div className={styles.dvHead}>
          <span className={styles.d}>
            {dd.getMonth() + 1} 月 {dd.getDate()} 日
          </span>
          <span className={styles.w}>{WD[dd.getDay()]}</span>
          {actOwn && <span className={styles.ownChip}>这天已单独微调</span>}
          <span className={styles.grow} />
          {actOwn && (
            <button type="button" className={styles.hbtn} onClick={() => clearOv(act, day)}>
              恢复默认
            </button>
          )}
          <span className={styles.hint}>拖动空白处或挪动块 = 只改「{actNm}」这一天</span>
        </div>

        {bands.length > 0 ? (
          <div className={styles.dvAlert} role="status">
            <span>时间重叠</span>
            <b>{bands.map(b => m2s(b.s) + '–' + m2s(b.e)).join('、')}</b>
            <span>共 {clashSum} 分钟被两门课同时占用，调开后即可完成规划</span>
            <span className={styles.sum}>
              {list.length} 门课 · 当日合计 {dur(total)}
            </span>
          </div>
        ) : list.length > 0 ? (
          <div
            className={styles.dvAlert}
            style={{borderColor: 'var(--line)', background: 'var(--soft)', color: 'var(--ink-2)'}}
            role="status"
          >
            当日 {list.length} 门课，时间不重叠 · 合计 {dur(total)}
          </div>
        ) : null}

        <div className={styles.dvBody}>
          <div className={styles.dvAxis}>
            {[18, 19, 20, 21, 22, 23, 24].map(h => (
              <span key={h} style={{top: (h * 60 - DAY_MIN) * PPM + 'px'}}>
                {pad(h)}:00
              </span>
            ))}
          </div>

          <div className={styles.dvTrack} ref={trackRef} onMouseDown={onTrackMouseDown}>
            {/* 重叠区高亮(说明文字统一放顶部提示条,避免压住事件块标题) */}
            {bands.map((bd, bi) => (
              <div
                key={bi}
                className={styles.dvBand}
                style={{top: (bd.s - DAY_MIN) * PPM + 'px', height: (bd.e - bd.s) * PPM + 'px'}}
                aria-hidden="true"
              />
            ))}

            {/* 事件块(拖拽中的块由 evDrag 派生位置与文案) */}
            {list.map(ev => {
              const dragging = evDrag && evDrag.cid === ev.cid ? evDrag : null;
              const s0 = dragging ? dragging.curS : ev.start;
              const e0 = dragging ? dragging.curS + dragging.span : ev.end;
              const hh = Math.max(22, (e0 - s0) * PPM);
              const w = 100 / ev.lanes;
              const left = ev.lane * w;
              const isActBlock = ev.cid === act;
              let isClash = false;
              for (const o of list) {
                if (o !== ev && o.start < ev.end && ev.start < o.end) {
                  isClash = true;
                  break;
                }
              }
              return (
                <div
                  key={ev.cid}
                  className={cx(styles.dvEv, isClash && styles.clash, dragging ? styles.drag : false)}
                  data-cid={ev.cid}
                  data-s={ev.start}
                  data-e={ev.end}
                  data-act={isActBlock ? '1' : undefined}
                  style={{
                    top: (s0 - DAY_MIN) * PPM + 'px',
                    height: hh + 'px',
                    left: 'calc(' + left + '% + 2px)',
                    width: 'calc(' + w + '% - 4px)',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    nmOf(ev.cid) + ' ' + m2s(ev.start) + '到' + m2s(ev.end) +
                    (ev.own ? '，这一天已单独调整' : '') + (isClash ? '，与其它课程时间重叠' : '')
                  }
                  onMouseDown={e => onEvMouseDown(e, ev.cid, ev.start, ev.end)}
                  onKeyDown={e => onEvKeyDown(e, ev.cid)}
                >
                  <span className={styles.t}>
                    {numOf(ev.cid)} {nmOf(ev.cid)}
                    {ev.own && <em className={styles.ownT}>单日</em>}
                  </span>
                  <span className={styles.h}>
                    {m2s(s0)}–{m2s(e0)} · {dur(e0 - s0)}
                  </span>
                </div>
              );
            })}

            {!list.length && (
              <div className={styles.dvEmpty}>
                这一天还没有安排课程
                <br />
                先在左侧课程卡里设好日期区间
              </div>
            )}

            {prevPaint && (
              <div
                className={styles.dvPrev}
                style={{top: (pvS - DAY_MIN) * PPM + 'px', height: (pvE - pvS) * PPM + 'px'}}
              >
                {m2s(pvS)} – {m2s(pvE)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================= 完成页统计 ================= */
  const doneDays: Record<string, 1> = {};
  let totalMin = 0;
  let ovTotal = 0;
  for (const a of assigns) {
    let d = a.from;
    while (d <= a.to) {
      doneDays[d] = 1;
      d = addD(d, 1);
    }
    totalMin += a.end - a.start;
    ovTotal += ovCount(a);
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>

        <div className={styles.toolbar} role="group" aria-label="走查状态切换">
          {STAGES.map(s => (
            <button
              key={s.key}
              type="button"
              className={cx(styles.tbtn, toolbarOn === s.key && styles.on)}
              onClick={() => go(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.browser}>
          <div className={styles.chrome}>
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <span className={styles.urlbar}>studybuddy.app / 规划 / 课程规划</span>
          </div>
          <div className={styles.page}>
            <div className={styles.nav}>
              <span className={styles.logo}>
                StudyBuddy<span>学习搭子</span>
              </span>
              <div className={styles.tabs}>
                <button type="button">学习</button>
                <button type="button" aria-current="page">
                  课程池
                </button>
                <button type="button">日历本</button>
                <button type="button">我的</button>
              </div>
              <span className={styles.spacer} />
              <span className={styles.me}>我</span>
            </div>

            <div className={styles.main}>
              {/* ============ 选课页 ============ */}
              {effStep === 'pick' && (
                <div className={styles.wrap}>
                  <div className={styles.head}>
                    <h2>选择要学的课程</h2>
                    <span className={styles.sub}>新学与复习分开选，可只选一边</span>
                    <div className={styles.steps}>
                      <span className={cx(styles.st, styles.on)}>
                        <i>1</i>选课
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={styles.st}>
                        <i>2</i>统一分配
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={styles.st}>
                        <i>3</i>时间微调
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={styles.st}>
                        <i>4</i>完成
                      </span>
                    </div>
                  </div>
                  <div className={styles.pickTabs} role="tablist" aria-label="课程类型">
                    <button role="tab" type="button" aria-selected={tab === 'new'} onClick={() => setTab('new')}>
                      新学<span className={styles.cnt}>{cntNew}</span>
                    </button>
                    <button role="tab" type="button" aria-selected={tab === 'rev'} onClick={() => setTab('rev')}>
                      复习<span className={styles.cnt}>{cntRev}</span>
                    </button>
                  </div>
                  <p className={styles.pickHint}>
                    {tab === 'new' ? (
                      <Fragment>
                        从课程池里勾选这轮要<b>新学</b>的课程。灰掉的是先修未完成的课程，本期不可选。
                      </Fragment>
                    ) : (
                      <Fragment>
                        从已修过的课程里勾选要<b>复习</b>的课程，复习任务时长按章节推进，不占用新学的时间范围。
                      </Fragment>
                    )}
                  </p>
                  <div className={styles.clist}>{pickRows}</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px'}}>
                    <span className={styles.pickHint} style={{padding: 0}}>
                      {assigns.length ? (
                        <Fragment>
                          已选 <b>{assigns.length}</b> 门课程
                        </Fragment>
                      ) : (
                        '还没有选择课程'
                      )}
                    </span>
                    <span style={{flex: 1}} />
                    <button
                      className={cx(styles.btn, styles.primary)}
                      type="button"
                      disabled={!assigns.length}
                      style={{opacity: assigns.length ? 1 : 0.45}}
                      onClick={() => {
                        setStep('alloc');
                        setView('month');
                      }}
                    >
                      下一步：分配时间
                    </button>
                  </div>
                </div>
              )}

              {/* ============ 分配页(统一分配 / 时间微调 两阶段共用外壳) ============ */}
              {(effStep === 'alloc' || effStep === 'fine') && (
                <div className={styles.wrap}>
                  <div className={styles.head}>
                    <h2>{fine ? '第二步 · 时间微调' : '第一步 · 统一分配'}</h2>
                    <span className={styles.sub}>
                      {fine
                        ? '统一分配已锁定；这一步只调「具体某一天」的起止时间，全部无重叠后才能完成'
                        : '给每门课设一个日期区间和一个每日时间范围，作用于区间内每一天'}
                    </span>
                    <div className={styles.steps}>{renderSteps(fine ? 3 : 2)}</div>
                  </div>

                  <div className={styles.lockbar} hidden={!fine}>
                    <span className={styles.lk}>已锁定</span>
                    <span className={styles.lt}>
                      统一分配已提交，这一步只调整<b>具体某一天</b>；要改日期区间或默认时间需重新开始规划。
                    </span>
                  </div>

                  <div className={styles.alloc}>
                    <div className={styles.left}>
                      <div className={styles.lbar}>
                        <span className={styles.t}>
                          <b>{assigns.length}</b> 门 · 每日 <b>{dur(totalSpan)}</b>
                          {fine ? (
                            ' · 统一分配已锁定'
                          ) : cdAll.length ? (
                            <Fragment>
                              {' · '}
                              <span className={styles.clash}>{cdAll.length} 天重叠</span>
                            </Fragment>
                          ) : (
                            ' · 无重叠'
                          )}
                        </span>
                        <span className={styles.grow} />
                        <button
                          className={cx(styles.btn, styles.mini)}
                          type="button"
                          hidden={fine}
                          disabled={!cdAll.length}
                          style={{opacity: cdAll.length ? 1 : 0.45}}
                          onClick={onStaggerBtn}
                        >
                          一键错开
                        </button>
                        <button className={cx(styles.btn, styles.mini)} type="button" hidden={fine} onClick={onResetBtn}>
                          恢复默认
                        </button>
                      </div>
                      <div>{assigns.map((a, i) => renderCard(a, i))}</div>
                    </div>

                    <div className={styles.right}>
                      <div className={styles.calbar}>
                        <div className={styles.vsw} role="group" aria-label="日历视图">
                          <button type="button" aria-pressed={view === 'month'} onClick={() => onViewBtn('month')}>
                            月
                          </button>
                          <button
                            type="button"
                            aria-pressed={view === 'day'}
                            aria-disabled={!fine}
                            data-off={fine ? undefined : '1'}
                            title={fine ? '' : '统一分配阶段只能按月查看，完成分配后可逐日微调'}
                            onClick={() => onViewBtn('day')}
                          >
                            日
                          </button>
                        </div>
                        <div className={styles.mnav}>
                          <button className={styles.mbtn} type="button" aria-label="上个月" onClick={() => shiftMonth(-1)}>
                            ◀
                          </button>
                          <span className={styles.mlab}>
                            {s2d(month + '-01').getFullYear()} 年 {s2d(month + '-01').getMonth() + 1} 月
                          </span>
                          <button className={styles.mbtn} type="button" aria-label="下个月" onClick={() => shiftMonth(1)}>
                            ▶
                          </button>
                        </div>
                        <button
                          className={styles.curBtn}
                          type="button"
                          onClick={() => {
                            setMonth(TODAY.slice(0, 7));
                            setDay(TODAY);
                          }}
                        >
                          今天
                        </button>
                        <span className={styles.grow} />
                        <div className={styles.legend}>
                          <span className={styles.lgClash}>
                            <i />时间重叠
                          </span>
                          <span className={styles.lgSel}>
                            <i />当前课程日期
                          </span>
                        </div>
                      </div>

                      {/* 微调阶段:冲突导航条 */}
                      <div className={cx(styles.fixbar, cdSorted.length === 0 && styles.ok)} hidden={!fine}>
                        <span className={styles.fi}>
                          {cdSorted.length ? (
                            <Fragment>
                              还有 <b>{cdSorted.length}</b> 天时间重叠
                            </Fragment>
                          ) : (
                            <span className={styles.ft}>时间无重叠，可以完成课程规划</span>
                          )}
                        </span>
                        <span className={styles.fx}>{cdSorted.length ? '逐日把重叠时段错开，全部消解后才能完成规划' : ''}</span>
                        <span className={styles.grow} />
                        {cdSorted.length ? (
                          <button className={cx(styles.btn, styles.mini)} type="button" onClick={gotoNextClash}>
                            {cdSorted.length > 1 ? '跳到下一处' : '跳到这一处'}
                          </button>
                        ) : null}
                      </div>

                      <div>{view === 'month' ? renderMonth() : renderDay()}</div>

                      <div className={styles.actBar}>
                        <span className={styles.sum}>
                          {assigns.length} 门课程 · 每日 {dur(totalSpan)}
                          {cdAll.length ? (
                            <Fragment>
                              {' · '}
                              <span className={styles.clash}>
                                {fine ? cdAll.length + ' 天待消解' : cdAll.length + ' 天存在时间重叠'}
                              </span>
                            </Fragment>
                          ) : (
                            ' · 时间无重叠'
                          )}
                        </span>
                        <span className={styles.grow} />
                        <button
                          className={styles.btn}
                          type="button"
                          hidden={fine}
                          onClick={() => {
                            if (isFineStage) return; // 微调阶段按钮已隐藏,此处兜底
                            setStep('pick');
                          }}
                        >
                          上一步
                        </button>
                        <button
                          className={cx(styles.btn, styles.primary)}
                          type="button"
                          disabled={fine && cdSorted.length > 0}
                          style={{opacity: fine && cdSorted.length ? 0.45 : 1}}
                          title={fine ? (cdSorted.length ? '先把时间重叠处理完' : '时间无重叠，可以完成') : ''}
                          onClick={onNext}
                        >
                          {fine
                            ? cdSorted.length
                              ? '完成课程规划（还有 ' + cdSorted.length + ' 天重叠）'
                              : '完成课程规划'
                            : '完成分配，进入微调 →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ 完成页 ============ */}
              {effStep === 'done' && (
                <div className={styles.wrap}>
                  <div className={styles.head}>
                    <h2>课程规划已完成</h2>
                    <span className={styles.sub}>时间无重叠，任务已经写进日历本</span>
                    <div className={styles.steps}>
                      <span className={cx(styles.st, styles.ok)}>
                        <i>✓</i>选课
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={cx(styles.st, styles.ok)}>
                        <i>✓</i>统一分配
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={cx(styles.st, styles.ok)}>
                        <i>✓</i>时间微调
                      </span>
                      <span className={styles.sp}>—</span>
                      <span className={cx(styles.st, styles.on)}>
                        <i>✓</i>完成
                      </span>
                    </div>
                  </div>
                  <div className={styles.doneCard}>
                    <div className={styles.dk}>已完成课程规划</div>
                    <div className={styles.dnums}>
                      <div>
                        <span className={styles.n}>{assigns.length}</span>
                        <span className={styles.l}>门课程</span>
                      </div>
                      <div>
                        <span className={styles.n}>{dur(totalMin)}</span>
                        <span className={styles.l}>每日总用时</span>
                      </div>
                      <div>
                        <span className={styles.n}>{Object.keys(doneDays).length}</span>
                        <span className={styles.l}>覆盖天数</span>
                      </div>
                      <div>
                        <span className={styles.n}>{ovTotal || 0}</span>
                        <span className={styles.l}>天单独微调</span>
                      </div>
                    </div>
                    <div className={styles.dlist}>
                      {assigns.map((a, i) => {
                        const c = byId(a.cid);
                        const fm = s2d(a.from);
                        const tm = s2d(a.to);
                        return (
                          <div key={a.cid} className={styles.drow2}>
                            <span className={styles.i}>{i + 1}</span>
                            <span className={styles.nm2}>{c ? c.name : '未命名'}</span>
                            {ovCount(a) ? <span className={styles.tagx}>{ovCount(a)} 天单独微调</span> : null}
                            <span className={styles.rt}>
                              {fm.getMonth() + 1}/{fm.getDate()}–{tm.getMonth() + 1}/{tm.getDate()} · {m2s(a.start)}–{m2s(a.end)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.dfoot}>
                      <button
                        className={styles.btn}
                        type="button"
                        onClick={() => toast('任务已写入日历本，展示与改期归 US-08')}
                      >
                        查看日历本
                      </button>
                      <button className={styles.btn} type="button" onClick={onRestartBtn}>
                        重新规划
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={cx(styles.toast, toastMsg && styles.on)} role="status" aria-live="polite">
              {toastMsg}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




