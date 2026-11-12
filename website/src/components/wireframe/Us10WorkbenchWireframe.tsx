/**
 * US-10 执行工作台 · 低保真线框（今日任务 → 微课 → 刷题 → 打卡）
 * 由原独立 HTML 原型迁移：外观与交互 1:1 保留，原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条：① 今日工作台 ② 执行 · 微课文档 ③ 执行 · 刷题打卡 ④ 今日全完成 ⑤ 今天没安排 + 重置。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us10Workbench.module.css';

type View = 'today' | 'doc' | 'quiz' | 'alldone' | 'empty';
type Fb = 'ok' | 'no' | null;
type TaskState = 'todo' | 'doing' | 'done';

interface Task {
  id: string;
  type: 'learn' | 'review';
  course: string;
  chapter: string;
  brief: string;
  min: number;
  /** start 为当日起始分钟数，与日历本（US-08）写入值一致 */
  start: number;
  state: TaskState;
  docSec: [number, number];
  /** [已完成题数, 总题数] */
  q: [number, number];
}

const TODAY = '11 月 5 日 周三';
/** 「现在」时刻（当日起始分钟数） */
const NOW = 21 * 60 + 5;

const TITLES: Record<View, string> = {
  today: '今日',
  doc: '微课文档',
  quiz: '刷题打卡',
  alldone: '今日全完成',
  empty: '今天没安排',
};

const VIEWS: {key: View; label: string}[] = [
  {key: 'today', label: '① 今日工作台'},
  {key: 'doc', label: '② 执行 · 微课文档'},
  {key: 'quiz', label: '③ 执行 · 刷题打卡'},
  {key: 'alldone', label: '④ 今日全完成'},
  {key: 'empty', label: '⑤ 今天没安排'},
];

/* ---------- 数据（与原原型一致） ---------- */
function baseDay(): Task[] {
  return [
    {id: 'a', type: 'learn', course: '计算机网络', chapter: '第 2 章 HTTP 与 HTTPS',
      brief: '微课 4 节 + 8 题', min: 60, start: 19 * 60 + 30, state: 'todo', docSec: [0, 4], q: [0, 8]},
    {id: 'b', type: 'review', course: '数据结构与算法基础', chapter: '第 4 章 排序与查找',
      brief: '微课 3 节 + 8 题', min: 30, start: 20 * 60 + 40, state: 'doing', docSec: [2, 3], q: [7, 8]},
    {id: 'c', type: 'learn', course: '数据库原理与 SQL', chapter: '第 2 章 SQL 查询与联结',
      brief: '微课 4 节 + 10 题', min: 45, start: 21 * 60 + 20, state: 'todo', docSec: [0, 4], q: [0, 10]},
  ];
}

/* ---------- 数值/时刻格式化（原样搬运） ---------- */
function pad2(n: number) {
  return (n < 10 ? '0' : '') + n;
}
function clock(m: number) {
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}
function range(t: Task) {
  return clock(t.start) + '–' + clock(t.start + t.min);
}
function fmt(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? h + ' 小时' + (r ? ' ' + r + ' 分' : '') : r + ' 分钟';
}

/* ---------- 微课 / 刷题演示内容 ---------- */
const DEMO_DOC = {
  title: '2.2 TLS 握手：一次握手换了三样东西',
  meta: '微课第 2 / 4 节 · 约 4 分钟读完',
};

const QUIZ = {
  stem: 'HTTPS 相比 HTTP 多出的加密协商，发生在协议栈的哪一层？',
  opts: ['应用层，由浏览器自己完成', '传输层之上、应用层之下的 TLS 层', '网络层，由 IPsec 承担', '数据链路层，由网卡硬件完成'],
  right: 1,
  okMsg: '正确 · TLS 坐在 TCP 之上、HTTP 之下，握手谈好会话密钥后，HTTP 报文只是被包了一层。',
  noMsg: '再想一下 · 不是应用层自己在加密，中间插的那层叫 TLS，位置在 TCP 与应用层之间。',
};

/* ---------- 陪伴文案 ---------- */
const MOOD_LABELS = ['有点卡', '还行', '想放弃'];
const MOOD_LINES = [
  '卡住很正常。先把「握手到底换了哪三样东西」这三点说出来，说不清再回头看代码块。',
  '状态不错就趁热多做一题，收尾停在能接上的地方，明天更好开头。',
  '想放弃的时候，任务可以减半：今天只读微课，8 题留到明天，计划我陪你重排。',
];
const AI_DEFAULT = '今天第三项了，先把 HTTPS 握手这一章啃下来，剩下的明天再说也不迟。';
const AI_EMPTY = '今天空着。休息也是计划的一部分；想动一动，就挑一节最短的微课，不用改计划。';

/** 心态为空时按当日状态取一句陪伴文案（与原 render() 的换算一致） */
function aiLineOf(day: Task[]): string {
  if (!day.length) return AI_EMPTY;
  if (day.every(t => t.state === 'done')) return `今天 ${day.length} 项全打卡了，收工。明天 19:30 的第一项已经排好了。`;
  return AI_DEFAULT;
}

/* ---------- 本周节奏（固定演示数据） ---------- */
const WEEK_CELLS = [
  {name: '一', cls: styles.ok, txt: '✓'},
  {name: '二', cls: styles.ok, txt: '✓'},
  {name: '三', cls: styles.ok, txt: '✓'},
  {name: '四', cls: styles.today, txt: '今'},
  {name: '五', cls: styles.off, txt: '—'},
  {name: '六', cls: styles.off, txt: '—'},
  {name: '日', cls: styles.off, txt: '—'},
];

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us10WorkbenchWireframe() {
  /* ---------- 视图与演示态（工具条高亮独立于 view，与原原型一致） ---------- */
  const [view, setView] = useState<View>('today');
  const [toolbarOn, setToolbarOn] = useState<View>('today');

  /* ---------- 今日任务（可变：开始 / 撤销 / 答题 / 完成） ---------- */
  const [day, setDay] = useState<Task[]>(baseDay);

  /* ---------- 刷题面板答题态 ---------- */
  const [pick, setPick] = useState<number | null>(null);
  const [fb, setFb] = useState<Fb>(null);

  /* ---------- 陪伴：情绪反馈与文案 ---------- */
  const [mood, setMood] = useState<number | null>(null);
  const [aiSay, setAiSay] = useState(AI_DEFAULT);

  /* ---------- 轻提示 ---------- */
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* 卸载时清理计时器 */
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  }

  /* ---------- 任务动作 ---------- */
  function openTask(id: string) {
    const next = day.map(t => (t.id === id && t.state === 'todo' ? {...t, state: 'doing' as const} : t));
    setDay(next);
    setView('doc');
    setPick(null);
    setFb(null);
    if (mood === null) setAiSay(aiLineOf(next));
    toast('已进入学习：先读微课，读完再刷题');
  }

  function undoTask(id: string) {
    const next = day.map(t => (t.id === id ? {...t, state: 'todo' as const, q: [0, t.q[1]] as [number, number]} : t));
    setDay(next);
    setView('today');
    if (mood === null) setAiSay(aiLineOf(next));
    toast('已撤销打卡，进度同步回退');
  }

  /* ---------- 执行面板动作 ---------- */
  function backToday() {
    setView('today');
    setPick(null);
    setFb(null);
  }

  function foldPanel() {
    /* 原型：收起只回今日，不清答题态 */
    setView('today');
  }

  function gotoQuiz() {
    setView('quiz');
    setPick(null);
    setFb(null);
    toast('刷题解锁：8 题，答错可重来');
  }

  function switchTab(tab: 'doc' | 'quiz') {
    setView(tab);
    setPick(null);
    setFb(null);
  }

  function chooseOpt(i: number) {
    const ok = i === QUIZ.right;
    setPick(i);
    setFb(ok ? 'ok' : 'no');
    if (ok) {
      /* 答对：进行中的任务进度 +1 题（与原原型一致，遍历全部进行中任务） */
      const next = day.map(t =>
        t.state === 'doing' && t.q[0] < t.q[1]
          ? {...t, q: [Math.min(t.q[1], t.q[0] + 1), t.q[1]] as [number, number]}
          : t,
      );
      setDay(next);
      if (mood === null) setAiSay(aiLineOf(next));
      toast('答对了，进度 +1 题');
    }
  }

  function finishTask() {
    let allDone = true;
    const next = day.map(t =>
      t.state === 'doing' ? {...t, state: 'done' as const, q: [t.q[1], t.q[1]] as [number, number]} : t,
    );
    next.forEach(t => {
      if (t.state !== 'done') allDone = false;
    });
    setDay(next);
    setView(allDone ? 'alldone' : 'today');
    setPick(null);
    setFb(null);
    if (mood === null) setAiSay(aiLineOf(next));
    toast('已完成，进度自动记录 —— 不用回日历本改计划');
  }

  /* ---------- 情绪反馈（再点一次取消，文案随之切换） ---------- */
  function toggleMood(i: number) {
    const m = mood === i ? null : i;
    setMood(m);
    setAiSay(m === null ? AI_DEFAULT : MOOD_LINES[m]);
  }

  /* ---------- 工具条：演示态切换（每次重置当日数据，与原原型一致） ---------- */
  function applyView(v: View) {
    let next: Task[];
    if (v === 'alldone') {
      next = baseDay().map(t => ({...t, state: 'done' as const, q: [t.q[1], t.q[1]] as [number, number]}));
    } else if (v === 'empty') {
      next = [];
    } else {
      next = baseDay();
    }
    setDay(next);
    setView(v);
    setPick(null);
    setFb(null);
    if (mood === null) setAiSay(aiLineOf(next));
  }

  function onToolbar(v: View) {
    applyView(v);
    setToolbarOn(v);
  }

  function resetAll() {
    setMood(null);
    const next = baseDay();
    setDay(next);
    setView('today');
    setToolbarOn('today');
    setPick(null);
    setFb(null);
    setAiSay(aiLineOf(next));
  }

  /* ---------- 派生：抬头 / 进度 / 24 小时 ---------- */
  const doneCount = day.filter(t => t.state === 'done').length;
  const remainMin =
    day.reduce((s, t) => s + t.min, 0) - day.filter(t => t.state === 'done').reduce((s, t) => s + t.min, 0);
  const headEmpty = day.length === 0;
  const headAll = day.length > 0 && doneCount === day.length;
  const hTitle = headEmpty
    ? '今天没有安排'
    : headAll
      ? `今天清完了，${day.length} 项全打卡`
      : `今天 ${day.length} 项，从最紧的这一章开始`;
  const hMeta = headEmpty
    ? `${TODAY} · 计划没覆盖到这一天`
    : headAll
      ? `${TODAY} · 用时 2 小时 15 分 · 已完成 ${doneCount} / ${day.length}`
      : `${TODAY} · 还剩约 ${fmt(remainMin)} · 已完成 ${doneCount} / ${day.length}`;
  const progWidth = day.length ? `${(doneCount / day.length) * 100}%` : '0%';
  const used = day.reduce((s, t) => s + t.min, 0);
  const execTask =
    view === 'doc' || view === 'quiz' ? (day.find(t => t.state === 'doing') ?? day[0]) : undefined;

  /* ---------- 任务行（原 taskRow） ---------- */
  function renderTask(t: Task) {
    const tyTxt = t.type === 'review' ? '复' : '新';
    const stateTxt = t.state === 'done' ? '已完成' : t.state === 'doing' ? '进行中' : '未开始';
    return (
      <article
        key={t.id}
        className={cx(
          styles.task,
          t.type === 'review' && styles.rv,
          t.state === 'done' && styles.done,
          t.state === 'doing' && styles.doing,
        )}
        aria-label={`${t.type === 'review' ? '复习' : '新学'}，${t.course} ${t.chapter}，${t.min} 分钟，${stateTxt}`}
      >
        <span className={styles.ty} aria-hidden="true">{tyTxt}</span>
        <div className={styles.tMain}>
          <div className={styles.tC}>{t.course}</div>
          <div className={styles.tS}>
            <span style={{color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums'}}>{range(t)}</span>
            <span className={styles.dot}>·</span>
            {t.chapter}
            <span className={styles.dot}>·</span>
            {t.brief}
          </div>
        </div>
        <div className={styles.tAct}>
          <span className={styles.dur}>{t.min} 分钟</span>
          {t.state === 'done' ? (
            <>
              <span className={cx(styles.state, styles.ok)}>✓ 已完成</span>
              <button type="button" className={cx(styles.btn, styles.link, styles.sm)} onClick={() => undoTask(t.id)}>
                撤销
              </button>
            </>
          ) : t.state === 'doing' ? (
            <>
              <span className={styles.state}>进行中 {t.q[0]}/{t.q[1]} 题</span>
              <button type="button" className={cx(styles.btn, styles.sm, styles.primary)} onClick={() => openTask(t.id)}>
                继续
              </button>
            </>
          ) : (
            <>
              <span className={styles.state}>未开始</span>
              <button type="button" className={cx(styles.btn, styles.sm, styles.primary)} onClick={() => openTask(t.id)}>
                开始学习
              </button>
            </>
          )}
        </div>
      </article>
    );
  }

  /* ---------- 执行面板（原 execPanel：微课文档 / 刷题打卡两个页签） ---------- */
  function renderExec(t: Task) {
    const isDoc = view === 'doc';
    return (
      <section className={styles.exec} aria-label={`正在学：${t.course}`}>
        <div className={styles.execH}>
          <span className={styles.ty} aria-hidden="true">{t.type === 'review' ? '复' : '新'}</span>
          <div>
            <b>{t.course} · {t.chapter}</b>
            <div className={styles.sub}>{range(t)} · {t.min} 分钟 · 已用 12 分钟</div>
          </div>
          <span className={styles.grow} />
          <button type="button" className={cx(styles.btn, styles.sm, styles.ghost)} onClick={backToday}>
            ‹ 回到今日
          </button>
        </div>
        <div className={styles.execTabs} role="tablist" aria-label="学习动作">
          <button type="button" role="tab" aria-selected={isDoc} onClick={() => switchTab('doc')}>
            ① 微课文档 <span className={styles.ph} />
          </button>
          <button type="button" role="tab" aria-selected={!isDoc} onClick={() => switchTab('quiz')}>
            ② 刷题打卡 <span className={styles.n}>{t.q[0]}/{t.q[1]}</span> <span className={styles.ph} />
          </button>
        </div>
        {isDoc ? (
          <>
            <div className={styles.execBody}>
              <h3 className={styles.docH}>{DEMO_DOC.title}</h3>
              <p className={styles.docMeta}>{DEMO_DOC.meta}</p>
              <div className={styles.docBody}>
                <p>
                  HTTP 明文跑在 TCP 之上，报文经任何一跳都能被看清。HTTPS
                  在两者之间插了一层 TLS，握手的目的一句话：<b>在没有信任的网络上，先谈好一把只有双方知道的钥匙。</b>
                </p>
                <ul>
                  <li>
                    <b>验身份</b>　服务器出示证书，客户端校验证书链与域名，确认对端不是中间人。
                  </li>
                  <li>
                    <b>换密钥</b>　用非对称加密协商出会话密钥，之后的业务数据全部走对称加密。
                  </li>
                  <li>
                    <b>保完整</b>　每条记录带 MAC，被改动一个字节就会被发现。
                  </li>
                </ul>
                <div className={styles.code}>
                  {
                    'ClientHello  →  支持的版本 / 套件 / 随机数\nServerHello  →  选定套件 / 证书 / 随机数\nFinished     →  双方用会话密钥收尾，开始传业务数据'
                  }
                </div>
                <p>所以「HTTPS 比 HTTP 慢」只在首次握手时成立：多一次往返，多一次证书校验。真正常态的开销是对称加密，几乎可以忽略。</p>
              </div>
              <p className={styles.docSec}>读完这一节，第 3 节「证书链怎么验」自动解锁</p>
            </div>
            <div className={styles.execFoot}>
              <span className={styles.hint}>微课读完才解锁刷题，避免跳步</span>
              <button type="button" className={cx(styles.btn, styles.sm, styles.ghost)} onClick={foldPanel}>
                收起
              </button>
              <button type="button" className={cx(styles.btn, styles.sm, styles.primary)} onClick={gotoQuiz}>
                去刷题（8 题）
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.execBody}>
              <div className={styles.qHead}>
                <span className={styles.qn}>第 8 / 8 题</span>
                <span>单选 · 答错可重来</span>
              </div>
              <p className={styles.qStem}>{QUIZ.stem}</p>
              <div className={styles.opts} role="group" aria-label="选项">
                {QUIZ.opts.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    className={cx(
                      styles.opt,
                      pick === i && styles.pick,
                      fb != null && i === QUIZ.right && styles.ok,
                      fb != null && pick === i && i !== QUIZ.right && styles.no,
                    )}
                    aria-pressed={pick === i}
                    onClick={() => chooseOpt(i)}
                  >
                    <span className={styles.k}>{'ABCD'.charAt(i)}</span>
                    <span>{o}</span>
                  </button>
                ))}
              </div>
              <div className={styles.fb} role="status" hidden={fb == null}>
                <b>{fb === 'ok' ? '答对了' : '答错了'}</b>　{fb === 'ok' ? QUIZ.okMsg : QUIZ.noMsg}
              </div>
            </div>
            <div className={styles.execFoot}>
              <span className={styles.hint}>已完成 {t.q[0]} / {t.q[1]} 题 · 全部答完才可打卡</span>
              <button type="button" className={cx(styles.btn, styles.sm, styles.ghost)} onClick={foldPanel}>
                收起
              </button>
              <button
                type="button"
                className={cx(styles.btn, styles.sm, styles.primary)}
                disabled={!(t.q[0] >= t.q[1])}
                onClick={finishTask}
              >
                完成本任务
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>

        <div className={styles.toolbar}>
          {VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              className={cx(styles.tbtn, toolbarOn === v.key && styles.on)}
              onClick={() => onToolbar(v.key)}
            >
              {v.label}
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
            <div className={styles.urlbar}>工作台 · {TITLES[view]}</div>
          </div>

          <div className={styles.page}>
            <header className={styles.nav}>
              <div className={styles.logo}>AI 学业陪伴<span>纯软件赛道</span></div>
              <nav className={styles.tabs} aria-label="主导航">
                <button type="button" aria-current="page">工作台</button>
                <button type="button">课程池</button>
                <button type="button">课程规划</button>
                <button type="button">日历本</button>
              </nav>
              <div className={styles.spacer} />
              <button type="button" className={styles.bell} aria-label="今日提醒，1 条未读">铃<i /></button>
              <div className={styles.me}>我</div>
            </header>

            <main className={styles.main}>
              <div className={styles.wrap}>
                <div className={styles.dash}>
                  {/* ===== 主列 ===== */}
                  <section aria-label="今日任务">
                    <div className={styles.hello}>
                      <div>
                        <h1>{hTitle}</h1>
                        <p className={styles.meta}>{hMeta}</p>
                      </div>
                      <div className={styles.grow} />
                      <button
                        type="button"
                        className={cx(styles.btn, styles.sm, styles.ghost)}
                        onClick={() => toast('原型未实现跳转：改期与调整在「日历本」US-08')}
                      >
                        去日历本调整
                      </button>
                    </div>

                    <div className={styles.prog} style={{visibility: headEmpty ? 'hidden' : 'visible'}}>
                      <i style={{width: progWidth}} />
                    </div>

                    <div className={styles.tasks}>{day.map(renderTask)}</div>
                    {execTask ? renderExec(execTask) : null}

                    <div className={styles.empty} hidden={day.length > 0}>
                      <b>这一天空着</b>
                      <p>
                        计划可能没覆盖到这一天，或任务已被改期。<br />
                        可以回日历本看看前后几天，也可以直接顺手多做一章。
                      </p>
                      <div className={styles.row}>
                        <button
                          type="button"
                          className={cx(styles.btn, styles.sm)}
                          onClick={() => toast('原型未实现跳转：日历本 US-08')}
                        >
                          打开日历本
                        </button>
                        <button
                          type="button"
                          className={cx(styles.btn, styles.sm, styles.primary)}
                          onClick={() => toast('原型未实现：额外一章会写入计划，属 US-05')}
                        >
                          额外学一章
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* ===== 侧栏 ===== */}
                  <aside className={styles.colSide} aria-label="进度与陪伴">
                    <section className={styles.card}>
                      <h2>本周节奏</h2>
                      <div className={styles.week}>
                        {WEEK_CELLS.map(c => (
                          <div key={c.name} className={styles.d}>
                            <span>{c.name}</span>
                            <i className={c.cls}>{c.txt}</i>
                          </div>
                        ))}
                      </div>
                      <p className={styles.kpi}>
                        本周 <b>3 / 5</b> 天有打卡 · 连续 <b>6</b> 天
                      </p>
                    </section>

                    <section className={styles.card}>
                      <h2>今日 24 小时 <span className={styles.dsum}>{`已安排 ${fmt(used)}`}</span></h2>
                      <div
                        className={styles.d24}
                        role="img"
                        aria-label={
                          headEmpty
                            ? '今日 24 小时：没有任何安排'
                            : `今日 24 小时已安排 ${fmt(used)}：${day
                                .map((t, i) => `${i + 1} 号，${range(t)} ${t.course}`)
                                .join('；')}`
                        }
                      >
                        {day.map((t, i) => (
                          <span
                            key={t.id}
                            className={cx(styles.blk, t.type === 'review' && styles.rv)}
                            style={{
                              left: `${((t.start / 1440) * 100).toFixed(3)}%`,
                              width: `${((t.min / 1440) * 100).toFixed(3)}%`,
                            }}
                            title={`${range(t)}　${t.course}`}
                          >
                            {i + 1}
                          </span>
                        ))}
                        <span
                          className={styles.now}
                          style={{left: `${((NOW / 1440) * 100).toFixed(3)}%`}}
                          aria-hidden="true"
                        />
                      </div>
                      <div className={styles.d24Scale} aria-hidden="true">
                        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                      </div>
                      <ul className={styles.dlist}>
                        {headEmpty ? (
                          <li className={styles.emptyLine}>今天没有安排，24 小时都空着。</li>
                        ) : (
                          day.map((t, i) => (
                            <li key={t.id}>
                              <span className={styles.no}>{i + 1}</span>
                              <span className={styles.tm}>{range(t)}</span>
                              <span className={styles.nm}>{t.course}</span>
                            </li>
                          ))
                        )}
                      </ul>
                      <p className={styles.kpi} style={{margin: '9px 0 0'}}>
                        {headEmpty ? null : (
                          <>
                            空闲 <b>{fmt(1440 - used)}</b> · 占全天 <b>{Math.round((used / 1440) * 100)}%</b>
                          </>
                        )}
                      </p>
                    </section>

                    <section className={styles.card}>
                      <h2>距目标 <span className={styles.ph} /></h2>
                      <p className={styles.goalC}>后端开发工程师</p>
                      <p className={styles.goalS}>本学期 12 / 19 章 · 已完成 63%</p>
                      <div className={styles.bar}><i style={{width: '63%'}} /></div>
                      <p className={styles.goalN}>还差 7 章，按现在的节奏约 4 周走完。</p>
                    </section>

                    <section className={cx(styles.card, styles.ai)}>
                      <h2>陪你学 <span className={styles.ph} /></h2>
                      <p className={styles.say}>{aiSay}</p>
                      <div className={styles.moods} role="group" aria-label="现在状态如何">
                        {MOOD_LABELS.map((label, i) => (
                          <button key={i} type="button" aria-pressed={mood === i} onClick={() => toggleMood(i)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </aside>
                </div>
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
