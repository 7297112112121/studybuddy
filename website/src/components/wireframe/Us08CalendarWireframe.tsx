/**
 * US-08 日历本 · 低保真线框(月视图 + 日视图 · 时刻制)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 月视图 ② 日视图(时刻时间轴) ③ 无任务的一天 ④ 无计划(日历照常) + 重置。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us08Calendar.module.css';

type View = 'month' | 'day';
type TaskType = 'learn' | 'review';

interface Task {
  id: string;
  seq: number;
  date: string; // ISO yyyy-mm-dd
  type: TaskType;
  course: string;
  chapter: string;
  min: number;
  start: number; // 距 0 点的分钟数
  done: boolean;
  resched: boolean;
}

const TODAY = '2026-11-05';
const MIN_MONTH = '2026-09'; /* 最早一份计划的开始月 */
const MINE: Record<TaskType, string> = {learn: '新学', review: '复习'};

const DEMOS: {key: string; label: string}[] = [
  {key: 'month', label: '① 月视图'},
  {key: 'day', label: '② 日视图（时刻时间轴）'},
  {key: 'dayEmpty', label: '③ 无任务的一天'},
  {key: 'noPlan', label: '④ 无计划（日历照常）'},
];

/* ---------- 日期工具(与原原型一致) ---------- */
function pad(n: number): string {
  return (n < 10 ? '0' : '') + n;
}
function s2d(s: string): Date {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
}
function d2s(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function shortDate(s: string): string {
  const d = s2d(s);
  return d.getMonth() + 1 + '/' + pad(d.getDate());
}
function longDate(s: string): string {
  const d = s2d(s);
  return d.getMonth() + 1 + ' 月 ' + d.getDate() + ' 日';
}
function wdName(s: string): string {
  return '周' + '日一二三四五六'.charAt(s2d(s).getDay());
}
function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return m + ' 分钟';
  return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
}
/* 时刻:分钟数 → HH:MM */
function clock(min: number): string {
  return pad(Math.floor(min / 60)) + ':' + pad(Math.round(min % 60));
}
/* 时刻区间:19:30 – 20:30(同日,不跨零点) */
function span(start: number, min: number): string {
  return clock(start) + ' – ' + clock(start + min);
}

/* ---------- 起止时刻:同日按「课程规划」串行排布(先新学后复习,间隔 10 分钟) ---------- */
const GAP = 10;
const BASE_WEEKDAY = 19 * 60 + 30; /* 工作日 19:30 起 */
const BASE_WEEKEND = 9 * 60 + 30; /* 周末 09:30 起 */
const TYPE_ORDER: Record<TaskType, number> = {learn: 0, review: 1};

function dayOrder(list: Task[]): Task[] {
  return list.slice().sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.seq - b.seq);
}
/** 重排某一天的时刻(等价于原型的 layoutDay 就地修改,这里返回新数组) */
function layoutDayPure(list: Task[], iso: string): Task[] {
  const wd = (s2d(iso).getDay() + 6) % 7; /* 0=周一 … 5=周六 6=周日 */
  let cur = wd >= 5 ? BASE_WEEKEND : BASE_WEEKDAY;
  const starts = new Map<string, number>();
  for (const t of dayOrder(list.filter(t => t.date === iso))) {
    starts.set(t.id, cur);
    cur += t.min + GAP;
  }
  if (!starts.size) return list;
  return list.map(t => {
    const s = starts.get(t.id);
    return s === undefined ? t : {...t, start: s};
  });
}

/* ---------- 初始数据(与原原型逐条一致) ---------- */
function buildTasks(): Task[] {
  const tasks: Task[] = [];
  let seq = 0;
  function mk(
    date: string,
    type: TaskType,
    course: string,
    chapter: string,
    min: number,
    status: 'done' | 'todo',
    resched?: boolean,
  ): Task {
    seq++;
    return {id: 't' + seq, seq, date, type, course, chapter, min, start: 0, done: status === 'done', resched: !!resched};
  }

  /* 11 月手写样例:覆盖「已完成不可改期」「手工改期保留」 */
  tasks.push(
    mk('2026-11-02', 'learn', '数据结构与算法基础', '第 2 章 树与递归', 60, 'done'),
    mk('2026-11-02', 'review', '计算机网络', '第 1 章 TCP/IP 分层', 30, 'done'),
    mk('2026-11-03', 'learn', '数据库原理与 SQL', '第 1 章 关系模型', 45, 'done'),
    mk('2026-11-03', 'review', '动态规划专题', '第 2 章 背包问题', 30, 'todo'),
    mk('2026-11-04', 'learn', '数据结构与算法基础', '第 3 章 图与遍历', 60, 'done'),
    mk('2026-11-05', 'learn', '计算机网络', '第 2 章 HTTP 与 HTTPS', 60, 'todo'),
    mk('2026-11-05', 'review', '程序设计基础（C 语言）', '第 3 章 指针与内存', 30, 'todo'),
    mk('2026-11-05', 'review', '动态规划专题', '第 3 章 区间 DP', 20, 'todo'),
    mk('2026-11-06', 'learn', '数据库原理与 SQL', '第 2 章 SQL 查询与联结', 45, 'todo', true),
    mk('2026-11-07', 'learn', '数据结构与算法基础', '第 4 章 排序与查找', 60, 'todo'),
    mk('2026-11-08', 'review', '计算机网络', '第 2 章 HTTP 与 HTTPS', 30, 'todo'),
    mk('2026-11-09', 'learn', '计算机网络', '第 3 章 传输层机制', 60, 'todo'),
    mk('2026-11-10', 'review', '数据结构与算法基础', '第 4 章 排序与查找', 30, 'todo'),
    mk('2026-11-11', 'learn', '数据库原理与 SQL', '第 3 章 索引与执行计划', 45, 'todo'),
    mk('2026-11-13', 'learn', '前端框架实战（Vue）', '第 2 章 组件与插槽', 60, 'todo'),
    mk('2026-11-14', 'review', '动态规划专题', '第 4 章 题单训练', 30, 'todo'),
  );
  /* 11/12 故意不放任务,用于「无任务的一天仍显示时间轴」走查 */

  /* 历史与未来:按周排布,撑起月视图密度并支持向前回溯 */
  const LEARN: [string, string][] = [
    ['程序设计基础（C 语言）', '第 1 章 变量与流程控制'],
    ['程序设计基础（C 语言）', '第 2 章 函数与数组'],
    ['计算机网络', '第 1 章 TCP/IP 分层'],
    ['数据结构与算法基础', '第 1 章 线性表与栈队列'],
    ['数据库原理与 SQL', '第 3 章 索引与执行计划'],
    ['JavaScript 与 DOM 编程', '第 1 章 语法与作用域'],
    ['前端框架实战（Vue）', '第 2 章 组件与插槽'],
  ];
  const REVIEW: [string, string][] = [
    ['动态规划专题', '第 1 章 状态与转移方程'],
    ['算法复杂度与基础题训', '第 2 章 数组与字符串'],
    ['计算机网络', '第 2 章 HTTP 与 HTTPS'],
    ['数据结构与算法基础', '第 3 章 图与遍历'],
    ['数据库原理与 SQL', '第 1 章 关系模型'],
    ['程序设计基础（C 语言）', '第 4 章 结构体与文件'],
  ];
  let d = s2d('2026-09-07');
  const end = s2d('2026-11-29');
  let li = 0;
  let ri = 0;
  let k = 0;
  while (d <= end) {
    const iso = d2s(d);
    const wd = (d.getDay() + 6) % 7; /* 0=周一 */
    const inHand = iso >= '2026-11-02' && iso <= '2026-11-14';
    if (!inHand) {
      const past = iso < TODAY;
      if (wd === 0 || wd === 2 || wd === 4) {
        const L = LEARN[li++ % LEARN.length];
        tasks.push(mk(iso, 'learn', L[0], L[1], k % 3 === 0 ? 45 : 60, past && k % 7 !== 3 ? 'done' : 'todo'));
      } else if (wd === 1 || wd === 5) {
        const R = REVIEW[ri++ % REVIEW.length];
        tasks.push(mk(iso, 'review', R[0], R[1], 30, past && k % 5 !== 2 ? 'done' : 'todo'));
      }
    }
    d = addDays(d, 1);
    k++;
  }

  /* 全量排时刻(等价于原型的 layoutAll) */
  let list = tasks;
  for (const iso of new Set(tasks.map(t => t.date))) list = layoutDayPure(list, iso);
  return list;
}

/* 时间轴口径:1 小时 = 120px(1 分钟 2px),最短块 40px(对应 20 分钟) */
const PPM = 2;
const NOWMIN = 21 * 60 + 5;

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us08CalendarWireframe() {
  /* ---------- 视图与演示态 ---------- */
  const [view, setView] = useState<View>('month');
  const [toolbarOn, setToolbarOn] = useState<string>('month');
  const [anchor, setAnchor] = useState<Date>(() => s2d(TODAY)); /* 月视图当前月 */
  const [day, setDay] = useState<string>(TODAY); /* 日视图当前日 */
  const [showLearn, setShowLearn] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [noPlan, setNoPlan] = useState(false); /* 原型走查用:模拟「一条计划都没有」 */
  const [cur, setCur] = useState<string | null>(null); /* 日视图高亮任务 */
  const [tasks, setTasks] = useState<Task[]>(buildTasks);

  /* ---------- 轻提示 ---------- */
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------- 拖拽(月视图内快捷改期) ---------- */
  const dragIdRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overIso, setOverIso] = useState<string | null>(null);
  const justDragged = useRef(false); /* 拖动后的 click 不进入日视图 */
  const dragEndTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* 卸载时清理所有计时器 */
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(dragEndTimer.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2000);
  }

  /* ---------- 筛选 ---------- */
  const visibleTasks = noPlan ? [] : tasks.filter(t => (t.type === 'learn' ? showLearn : showReview));
  function tasksOn(iso: string): Task[] {
    return visibleTasks.filter(t => t.date === iso);
  }

  /* ---------- 月视图 ---------- */
  function canPrev(): boolean {
    const y = anchor.getFullYear();
    const m = anchor.getMonth() + 1;
    return y + '-' + pad(m) > MIN_MONTH;
  }

  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const gridStart = mondayOf(new Date(y, m, 1, 12));
  const monthCells = Array.from({length: 42}, (_, i) => {
    const d = addDays(gridStart, i);
    const iso = d2s(d);
    const all = tasksOn(iso);
    const show = all.slice(0, 2);
    return {iso, dayNum: d.getDate(), out: d.getMonth() !== m, all, show, more: all.length - show.length};
  });

  /* 当月汇总 */
  const mFrom = d2s(new Date(y, m, 1, 12));
  const mTo = d2s(new Date(y, m + 1, 0, 12));
  let sumTotal = 0;
  let sumDone = 0;
  let sumMins = 0;
  visibleTasks.forEach(t => {
    if (t.date >= mFrom && t.date <= mTo) {
      sumTotal++;
      sumMins += t.min;
      if (t.done) sumDone++;
    }
  });

  /* ---------- 日视图(顺序与 layoutDay 一致,start 已算好) ---------- */
  const dayAll = dayOrder(tasksOn(day));
  let dayMins = 0;
  let dayDone = 0;
  dayAll.forEach(t => {
    dayMins += t.min;
    if (t.done) dayDone++;
  });
  let rStart: number;
  let rEnd: number;
  let dayMetaText: string;
  if (dayAll.length) {
    const last = dayAll[dayAll.length - 1];
    const lastEnd = last.start + last.min;
    rStart = Math.floor(dayAll[0].start / 60) * 60;
    rEnd = Math.ceil(lastEnd / 60) * 60;
    dayMetaText =
      dayAll.length +
      ' 项 · ' +
      clock(dayAll[0].start) +
      ' – ' +
      clock(lastEnd) +
      ' · 合计 ' +
      hm(dayMins) +
      ' · 已完成 ' +
      dayDone +
      ' 项' +
      (day === TODAY ? ' · 现在 ' + clock(NOWMIN) : '');
  } else {
    rStart = 19 * 60;
    rEnd = 22 * 60;
    dayMetaText = '0 项 · 时间轴照常展示' + (day === TODAY ? ' · 现在 ' + clock(NOWMIN) : '');
  }
  /* 可见窗口至少铺满 5 小时,日历不会被内容挤成一条;窗口内空档即「可安排时间」 */
  if (rEnd - rStart < 300) {
    rEnd = rStart + 300;
    if (rEnd > 24 * 60) {
      rEnd = 24 * 60;
      rStart = rEnd - 300;
    }
  }
  const tlHours: number[] = [];
  for (let mi = rStart; mi <= rEnd; mi += 60) tlHours.push(mi);
  const tlHeight = (rEnd - rStart) * PPM;
  const showNowLine = day === TODAY && NOWMIN >= rStart && NOWMIN <= rEnd;

  /* ---------- 导航 ---------- */
  function prevMonth() {
    if (!canPrev()) return;
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12));
  }
  function nextMonth() {
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1, 12));
  }
  function goToday() {
    setAnchor(s2d(TODAY));
    setView('month');
    setNoPlan(false);
  }
  function prevDay() {
    openDay(d2s(addDays(s2d(day), -1)), null);
  }
  function nextDay() {
    openDay(d2s(addDays(s2d(day), 1)), null);
  }

  /* ---------- 日视图入口 ---------- */
  function openDay(iso: string, hlId: string | null) {
    setDay(iso);
    setView('day');
    setCur(hlId);
  }
  function onCellClick(iso: string, chipId: string | null) {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    openDay(iso, chipId);
  }
  function onCellKey(e: React.KeyboardEvent, iso: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDay(iso, null);
    }
  }

  /* ---------- 类型筛选:至少保留一类任务 ---------- */
  function toggleLearn() {
    const next = !showLearn;
    if (!next && !showReview) {
      toast('至少保留一类任务');
      return;
    }
    setShowLearn(next);
  }
  function toggleReview() {
    const next = !showReview;
    if (!next && !showLearn) {
      toast('至少保留一类任务');
      return;
    }
    setShowReview(next);
  }

  /* ---------- 拖拽改期 ---------- */
  function onChipDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    }
    setDragging(id);
    justDragged.current = true;
    const t = tasks.find(x => x.id === id);
    if (t && t.done) toast('已完成任务不可改期');
  }
  function onChipDragEnd() {
    setDragging(null);
    dragIdRef.current = null;
    clearTimeout(dragEndTimer.current);
    dragEndTimer.current = setTimeout(() => {
      justDragged.current = false;
    }, 60);
  }
  function onCellDragOver(e: React.DragEvent, iso: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setOverIso(iso);
  }
  function onCellDragLeave(iso: string) {
    setOverIso(prev => (prev === iso ? null : prev));
  }
  function onCellDrop(e: React.DragEvent, iso: string) {
    e.preventDefault();
    setOverIso(prev => (prev === iso ? null : prev));
    const id = dragIdRef.current || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
    if (id) moveTask(id, iso);
  }
  function moveTask(id: string, iso: string) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (t.done) {
      toast('已完成任务不可改期，仍在 ' + shortDate(t.date));
      return;
    }
    if (t.date === iso) return;
    const from = t.date;
    let next = tasks.map(x => (x.id === id ? {...x, date: iso, resched: true} : x));
    next = layoutDayPure(next, from);
    next = layoutDayPure(next, iso);
    setTasks(next);
    const moved = next.find(x => x.id === id);
    if (moved) toast('已改期：' + shortDate(from) + ' → ' + shortDate(iso) + ' ' + span(moved.start, moved.min) + '，重新生成计划不会覆盖');
  }

  /* ---------- 其余绑定 ---------- */
  function goPlan() {
    toast('原型未实现跳转：在「课程规划」新建计划后，任务会自动铺进日历');
  }

  /* 返回月视图(与原 backlink 的 data-go="month" 一致:不回滚演示态高亮) */
  function backToMonth() {
    setNoPlan(false);
    setView('month');
  }

  function resetAll() {
    setAnchor(s2d(TODAY));
    setDay(TODAY);
    setShowLearn(true);
    setShowReview(true);
    setNoPlan(false);
    setView('month');
    setToolbarOn('month');
  }

  /* 工具条(仅原型走查用) */
  function onToolbar(k: string) {
    if (k !== 'noPlan') setNoPlan(false);
    if (k === 'month') setView('month');
    if (k === 'day') {
      setView('day');
      setDay(TODAY);
      setCur(null);
    }
    if (k === 'dayEmpty') {
      setView('day');
      setDay('2026-11-12');
      setCur(null);
    }
    if (k === 'noPlan') {
      setNoPlan(true);
      setView('month');
    }
    setToolbarOn(k);
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>

        <div className={styles.toolbar}>
          {DEMOS.map(d => (
            <button
              key={d.key}
              type="button"
              className={cx(styles.tbtn, toolbarOn === d.key && styles.on)}
              onClick={() => onToolbar(d.key)}
            >
              {d.label}
            </button>
          ))}
          <button type="button" className={styles.tbtn} onClick={resetAll}>
            重置
          </button>
        </div>

        <div className={styles.browser}>
          <div className={styles.chrome}>
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <div className={styles.urlbar}>{view === 'day' ? '日历本 · ' + longDate(day) : '日历本 · 月视图'}</div>
          </div>

          <div className={styles.page}>
            <header className={styles.nav}>
              <div className={styles.logo}>
                AI 学业陪伴<span>纯软件赛道</span>
              </div>
              <nav className={styles.tabs} aria-label="主导航">
                <button type="button">课程池</button>
                <button type="button">课程规划</button>
                <button type="button" aria-current="page">
                  日历本
                </button>
              </nav>
              <div className={styles.spacer} />
              <div className={styles.me}>我</div>
            </header>

            <main className={styles.main}>
              <div className={styles.wrap}>
                {/* 无计划提示:日历照常渲染,这里只做一行提示 */}
                <div className={styles.notice} hidden={!noPlan}>
                  <span className={styles.nt}>
                    当前<b>还没有任何计划</b>，日历照常展示；在「课程规划」建好计划后，任务会自动铺进来。
                  </span>
                  <button type="button" className={cx(styles.primary, styles.ghost)} onClick={goPlan}>
                    去「课程规划」新建
                  </button>
                </div>

                {/* ===== 月视图 ===== */}
                <section hidden={view === 'day'}>
                  <div className={styles.calBar}>
                    <h1>日历本</h1>
                    <div className={styles.navbtns}>
                      <button
                        type="button"
                        aria-label="上一个月"
                        title={canPrev() ? '上一个月' : '已到最早一份计划的开始月（2026 年 9 月）'}
                        disabled={!canPrev()}
                        onClick={prevMonth}
                      >
                        ‹
                      </button>
                      <button type="button" onClick={goToday}>
                        今天
                      </button>
                      <button type="button" aria-label="下一个月" onClick={nextMonth}>
                        ›
                      </button>
                    </div>
                    <span className={styles.period}>
                      {anchor.getFullYear()} 年 {anchor.getMonth() + 1} 月
                    </span>
                    <span className={styles.grow} />
                    <div className={styles.types} role="group" aria-label="按来源筛选">
                      <button type="button" className={styles.tchip} aria-pressed={showLearn} onClick={toggleLearn}>
                        新学
                      </button>
                      <button
                        type="button"
                        className={cx(styles.tchip, styles.rv)}
                        aria-pressed={showReview}
                        onClick={toggleReview}
                      >
                        复习
                      </button>
                    </div>
                    <span className={styles.sum}>
                      本月 <b>{sumTotal}</b> 项 · 合计 <b>{hm(sumMins)}</b> · 已完成 <b>{sumDone}</b> 项
                    </span>
                  </div>

                  <div className={styles.hintbar}>
                    <span className={styles.mk}>
                      <i />新学
                    </span>
                    <span className={styles.mk}>
                      <i className={styles.dash} />复习
                    </span>
                    <span className={styles.k}>点某一天查看当日安排</span>
                    <span className={styles.k}>拖动任务条到其他日期即改期（已完成不可改期）</span>
                  </div>

                  <div className={styles.mo}>
                    {'一二三四五六日'.split('').map(c => (
                      <div key={c} className={styles.moH}>
                        周{c}
                      </div>
                    ))}
                    {monthCells.map(cell => (
                      <div
                        key={cell.iso}
                        className={cx(
                          styles.mcell,
                          cell.out && styles.out,
                          cell.iso === TODAY && styles.today,
                          overIso === cell.iso && styles.over,
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          (cell.iso === TODAY ? '今天，' : '') +
                          longDate(cell.iso) +
                          ' ' +
                          wdName(cell.iso) +
                          '，' +
                          cell.all.length +
                          ' 项任务，进入查看当日安排'
                        }
                        onClick={() => onCellClick(cell.iso, null)}
                        onKeyDown={e => onCellKey(e, cell.iso)}
                        onDragOver={e => onCellDragOver(e, cell.iso)}
                        onDragLeave={() => onCellDragLeave(cell.iso)}
                        onDrop={e => onCellDrop(e, cell.iso)}
                      >
                        <span className={styles.top}>
                          <span className={styles.dn}>{cell.dayNum}</span>
                          {cell.iso === TODAY && <span className={styles.now}>今天</span>}
                          {cell.all.length > 0 && <span className={styles.cnt}>{cell.all.length} 项</span>}
                        </span>
                        {cell.show.map(t => (
                          <span
                            key={t.id}
                            className={cx(styles.mT, t.type === 'review' && styles.rv, t.done && styles.done)}
                            draggable
                            style={{opacity: dragging === t.id ? 0.4 : undefined}}
                            title={
                              MINE[t.type] + '｜' + t.course + ' ' + t.chapter + '｜' + span(t.start, t.min) + '（' + t.min + ' 分钟）'
                            }
                            onClick={e => {
                              e.stopPropagation();
                              onCellClick(cell.iso, t.id);
                            }}
                            onDragStart={e => onChipDragStart(e, t.id)}
                            onDragEnd={onChipDragEnd}
                          >
                            <span className={styles.ty}>{t.type === 'review' ? '复' : '新'}</span>
                            {t.resched && <span className={styles.ty}>↻</span>}
                            <span className={styles.tx}>{t.chapter.replace(/^第 \d+ 章 /, '')}</span>
                            <span className={styles.mn}>{clock(t.start)}</span>
                          </span>
                        ))}
                        {cell.more > 0 && <span className={styles.more}>还有 {cell.more} 项</span>}
                      </div>
                    ))}
                  </div>
                </section>

                {/* ===== 日视图 ===== */}
                <section hidden={view !== 'day'}>
                  <div className={styles.crumb}>
                    <button type="button" className={styles.backlink} onClick={backToMonth}>
                      ‹ 返回月视图
                    </button>
                  </div>

                  <div className={styles.dayHead}>
                    <h1>{longDate(day)}</h1>
                    <span className={styles.wd}>{wdName(day)}</span>
                    <span className={styles.now} hidden={day !== TODAY}>
                      今天
                    </span>
                    <span className={styles.grow} />
                    <div className={styles.navbtns}>
                      <button type="button" aria-label="前一天" onClick={prevDay}>
                        ‹ 前一天
                      </button>
                      <button type="button" aria-label="后一天" onClick={nextDay}>
                        后一天 ›
                      </button>
                    </div>
                  </div>
                  <p className={styles.dayMeta}>{dayMetaText}</p>

                  <div className={styles.tl}>
                    <div className={styles.tlAxis}>
                      {tlHours.map(mi => (
                        <span key={mi} className={styles.tlH} style={{top: (mi - rStart) * PPM}}>
                          {clock(mi)}
                        </span>
                      ))}
                    </div>
                    <div className={styles.tlBody} style={{height: tlHeight}}>
                      {tlHours.map(mi => (
                        <div
                          key={mi}
                          className={cx(styles.tlLine, (mi === rStart || mi === rEnd) && styles.edge)}
                          style={{top: (mi - rStart) * PPM}}
                        />
                      ))}
                      {showNowLine && (
                        <div className={styles.tlNow} style={{top: (NOWMIN - rStart) * PPM}} aria-hidden="true" />
                      )}
                      {dayAll.map(t => {
                        const bh = Math.max(t.min * PPM, 40);
                        return (
                          <div
                            key={t.id}
                            className={cx(
                              styles.tlBlock,
                              t.type === 'review' && styles.rv,
                              t.done && styles.done,
                              bh < 76 && styles.sm,
                              t.id === cur && styles.hl,
                            )}
                            style={{top: (t.start - rStart) * PPM, height: bh}}
                            aria-label={
                              MINE[t.type] +
                              '，' +
                              span(t.start, t.min) +
                              '，' +
                              t.course +
                              ' ' +
                              t.chapter +
                              '，' +
                              (t.done ? '已完成' : '未开始') +
                              (t.resched ? '，已手工改期' : '')
                            }
                          >
                            <div className={styles.bH}>
                              <span className={styles.bg}>{t.type === 'review' ? '复' : '新'}</span>
                              <span className={styles.tm}>{span(t.start, t.min)}</span>
                              <span className={styles.dur}>{t.min} 分钟</span>
                              <span className={styles.grow} />
                              <span className={cx(styles.st, t.done && styles.done)}>{t.done ? '已完成' : '未开始'}</span>
                            </div>
                            <div className={styles.bC}>{t.course}</div>
                            <div className={styles.bCh}>
                              {t.chapter}
                              {t.resched ? ' · ↻ 已手工改期' : ''}
                            </div>
                          </div>
                        );
                      })}
                      {dayAll.length === 0 && (
                        <div className={styles.tlNote}>
                          <b>这天没有安排</b> —— 计划没覆盖到这天，或任务已被改到别的日期。
                          <br />
                          时间轴照常展示，空档位置一眼可见。
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </main>
          </div>


          <div className={cx(styles.toast, toastMsg && styles.show)} role="status" aria-live="polite">
            {toastMsg}
          </div>
        </div>
      </div>
    </div>
  );
}
