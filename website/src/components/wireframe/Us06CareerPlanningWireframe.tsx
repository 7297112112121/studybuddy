/**
 * US-06 职业规划 · 低保真线框(Web)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 未选 ② 已选待确认 ③ 已确认 ④ 课程池标记态 ⑤ 课程详情标记态 ⑥ 课程规划标记透传 ⑦ 换岗二次确认。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us06CareerPlanning.module.css';

type View = 'plan' | 'pool' | 'detail' | 'pick';
type ToolbarKey = 'empty' | 'picked' | 'confirmed' | 'pool' | 'detail' | 'pick' | 'change';
type ModalState = {type: 'change'; target: string} | {type: 'cancel'; target: null} | null;

interface Job {
  id: string;
  n: string;
  track: string;
  d: string;
  cs: string[];
}

interface Course {
  id: string;
  n: string;
  d: string;
  l: string;
  h: number;
  p: string[];
  s: string;
  ch: string[];
}

/* ================= 内置岗位库 ================= */
const JOBS: Job[] = [
  {id: 'j1', n: '后端开发', track: '软件研发', d: '写服务端接口、数据存储与系统稳定性，撑住业务的后台逻辑', cs: ['c01', 'c02', 'c03', 'c04', 'c05']},
  {id: 'j2', n: '前端开发', track: '软件研发', d: '把设计稿变成能用的页面，管交互、性能与浏览器兼容', cs: ['c06', 'c07', 'c08', 'c09']},
  {id: 'j3', n: '全栈开发', track: '软件研发', d: '一个人从前端到数据库把功能做完，小团队里的通用选手', cs: ['c01', 'c06', 'c07', 'c08', 'c04']},
  {id: 'j4', n: '算法工程师', track: '数据与算法', d: '用数据结构与算法把问题建模，做模型与策略的工程落地', cs: ['c01', 'c02', 'c10', 'c11', 'c12']},
  {id: 'j5', n: '数据分析师', track: '数据与算法', d: '从数据库取数、清洗、可视化，把数据变成能决策的结论', cs: ['c04', 'c13', 'c14']},
  {id: 'j6', n: '测试工程师', track: '测试与质量', d: '设计用例、做接口自动化，把控上线前的质量底线', cs: ['c01', 'c03', 'c15', 'c16']},
];

/* ================= 课程池样例(对齐 US-04 数据集) ================= */
const CT: Course[] = [
  {id: 'c01', n: '程序设计基础（C 语言）', d: '后端', l: '入门', h: 32, p: [], s: '已完成', ch: ['变量与流程控制', '函数与数组', '指针与内存', '结构体与文件']},
  {id: 'c02', n: '数据结构与算法基础', d: '后端', l: '进阶', h: 40, p: ['c01'], s: '学习中', ch: ['线性表与栈队列', '树与递归', '图与遍历', '排序与查找']},
  {id: 'c03', n: '计算机网络', d: '后端', l: '进阶', h: 36, p: [], s: '未开始', ch: ['TCP/IP 分层', 'HTTP 与 HTTPS', '传输层机制', '网络编程入门']},
  {id: 'c04', n: '数据库原理与 SQL', d: '后端', l: '进阶', h: 32, p: ['c02'], s: '未开始', ch: ['关系模型', 'SQL 查询与联结', '索引与执行计划', '事务与隔离级别']},
  {id: 'c05', n: '分布式系统设计', d: '后端', l: '高阶', h: 48, p: ['c03', 'c04'], s: '未开始', ch: ['一致性与 CAP', '分布式事务', '服务拆分与治理', '容错与限流']},

  {id: 'c06', n: 'HTML / CSS 基础', d: '前端', l: '入门', h: 24, p: [], s: '已完成', ch: ['语义化标签', '盒模型与布局', 'Flex 与 Grid', '响应式基础']},
  {id: 'c07', n: 'JavaScript 与 DOM 编程', d: '前端', l: '入门', h: 32, p: ['c06'], s: '学习中', ch: ['语法与作用域', 'DOM 操作与事件', '异步与 Promise', '模块化']},
  {id: 'c08', n: '前端框架实战（Vue）', d: '前端', l: '进阶', h: 40, p: ['c07'], s: '未开始', ch: ['响应式原理', '组件与插槽', '路由与状态管理', '接口联调']},
  {id: 'c09', n: '前端工程化与构建', d: '前端', l: '高阶', h: 28, p: ['c08'], s: '未开始', ch: ['构建工程链', '按需加载与拆包', '性能预算', 'CI 与发布']},

  {id: 'c10', n: '算法复杂度与基础题训', d: '算法', l: '入门', h: 24, p: [], s: '待复习', ch: ['时间与空间复杂度', '数组与字符串', '双指针与滑动窗口', '二分查找']},
  {id: 'c11', n: '动态规划专题', d: '算法', l: '进阶', h: 20, p: ['c10'], s: '未开始', ch: ['状态与转移方程', '背包问题', '区间 DP', '题单训练']},
  {id: 'c12', n: '图论与最短路', d: '算法', l: '高阶', h: 24, p: ['c11'], s: '未开始', ch: ['图的存储', '最短路算法', '最小生成树', '综合赛题']},

  {id: 'c13', n: 'Python 数据分析入门', d: '数据', l: '入门', h: 24, p: [], s: '未开始', ch: ['NumPy 基础', 'Pandas 表格处理', '数据清洗', '统计描述']},
  {id: 'c14', n: '数据可视化与 BI 报表', d: '数据', l: '进阶', h: 20, p: ['c13'], s: '未开始', ch: ['图表选型', '可视化库实战', '看板搭建', '指标口径']},

  {id: 'c15', n: '软件测试基础与用例设计', d: '测试', l: '入门', h: 20, p: [], s: '未开始', ch: ['测试流程', '用例设计方法', '缺陷管理', '测试报告']},
  {id: 'c16', n: '接口自动化测试实战', d: '测试', l: '进阶', h: 24, p: ['c15'], s: '未开始', ch: ['接口协议与断言', '测试框架', '数据驱动', '持续集成']},
];

const DIRS = ['后端', '前端', '算法', '数据', '测试'];
const LEVELS = ['入门', '进阶', '高阶'];

const URL_TITLES: Record<View, string> = {plan: '职业规划', pool: '课程池', detail: '课程池 / 课程详情', pick: '课程规划'};

const DEMOS: {key: ToolbarKey; label: string}[] = [
  {key: 'empty', label: '① 选岗位 · 未选'},
  {key: 'picked', label: '② 已选 · 待确认'},
  {key: 'confirmed', label: '③ 已确认 · 我的规划'},
  {key: 'pool', label: '④ 课程池 · 标记态'},
  {key: 'detail', label: '⑤ 课程详情 · 标记态'},
  {key: 'pick', label: '⑥ 课程规划 · 标记透传'},
  {key: 'change', label: '⑦ 换岗二次确认'},
];

/* 岗位按赛道分组(渲染分组标题用) */
const JOB_GROUPS: {track: string; jobs: Job[]}[] = JOBS.reduce<{track: string; jobs: Job[]}[]>((acc, j) => {
  const last = acc[acc.length - 1];
  if (last && last.track === j.track) last.jobs.push(j);
  else acc.push({track: j.track, jobs: [j]});
  return acc;
}, []);

/* ================= 纯逻辑(与原原型一致) ================= */
const byId = (id: string): Course | undefined => CT.find(c => c.id === id);
const jobById = (id: string): Job | undefined => JOBS.find(j => j.id === id);
const sumH = (j: Job): number => j.cs.reduce((t, cid) => t + (byId(cid)?.h ?? 0), 0);
const doneN = (j: Job): number => j.cs.filter(cid => byId(cid)?.s === '已完成').length;

const ST_MAP: Record<string, string> = {'已完成': styles.sDo, '学习中': styles.sIng, '待复习': styles.sRev};
const stCls = (s: string): string => ST_MAP[s] ?? '';

/** 先修里「未满足」的课(不是已完成 / 待复习) */
const preMissing = (c: Course): Course[] =>
  c.p
    .map(pid => byId(pid))
    .filter((q): q is Course => !!q)
    .filter(q => !(q.s === '已完成' || q.s === '待复习'));

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

/* ---------- 岗位标记 chip ---------- */
function Mk({job}: {job: Job}) {
  return (
    <span className={styles.mk} title={`${job.n} 岗位需要学习的课程`}>
      <i aria-hidden="true" />
      <b>{job.n}</b>
    </span>
  );
}

export default function Us06CareerPlanningWireframe() {
  /* ---------- 状态(对应原 state 对象) ---------- */
  const [view, setView] = useState<View>('plan');
  const [picked, setPicked] = useState<string | null>('j1'); // 预览面板当前展示的岗位
  const [confirmed, setConfirmed] = useState<string | null>(null); // 已写入标记的目标岗位
  const [modal, setModal] = useState<ModalState>(null);
  const [detail, setDetail] = useState('c02');
  const [dir, setDir] = useState('全部');
  const [lv, setLv] = useState('全部');
  const [toolbarOn, setToolbarOn] = useState<ToolbarKey>('picked');

  /* ---------- 轻提示 ---------- */
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------- 弹层焦点管理 ---------- */
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const mCancelRef = useRef<HTMLButtonElement | null>(null);
  const jobRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const confirmedJob = confirmed ? jobById(confirmed) : undefined;
  const pickedJob = picked ? jobById(picked) : undefined;

  /* 当前已确认岗位给某门课打的标记 */
  function markOf(cid: string): Job | undefined {
    return confirmedJob && confirmedJob.cs.includes(cid) ? confirmedJob : undefined;
  }

  /* 课程池过滤结果 */
  const poolList = CT.filter(c => (dir === '全部' || c.d === dir) && (lv === '全部' || c.l === lv));
  const detailCourse = byId(detail) ?? CT[0];

  /* 课程规划选课:新学页签只出现「未开始」的课;带标记的课排前面,取前 6 门 */
  const pickRows = (() => {
    const hot: Course[] = [];
    const cold: Course[] = [];
    CT.forEach(c => {
      if (c.s !== '未开始') return;
      if (markOf(c.id)) hot.push(c);
      else cold.push(c);
    });
    return hot.concat(cold).slice(0, 6);
  })();

  /* 卸载时清理计时器 */
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* 弹层打开后聚焦「再想想」,Esc 关闭(对应原 document keydown) */
  useEffect(() => {
    if (!modal) return;
    mCancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }

  /* ---------- 弹层 ---------- */
  function openModal(type: 'change', target: string): void;
  function openModal(type: 'cancel', target: null): void;
  function openModal(type: 'change' | 'cancel', target: string | null) {
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    setModal(type === 'change' ? {type: 'change', target: target as string} : {type: 'cancel', target: null});
  }

  function closeModal() {
    setModal(null);
    lastFocusRef.current?.focus();
  }

  function onModalOk() {
    if (!modal) {
      closeModal();
      return;
    }
    if (modal.type === 'change') {
      const target = modal.target;
      closeModal();
      doConfirm(target);
    } else {
      const old = confirmed ? jobById(confirmed) : undefined;
      setConfirmed(null);
      setPicked(null);
      closeModal();
      setToolbarOn('empty');
      if (old) toast(`已取消目标岗位，课程池里「${old.n}」的 ${old.cs.length} 个标记已移除`);
    }
  }

  /* ---------- 职业规划页 ---------- */
  function onPickJob(id: string) {
    setPicked(id);
    setToolbarOn(confirmed && confirmed === id ? 'confirmed' : 'picked');
  }

  /* 岗位组 ↑/↓ 键切换(整组键盘可达) */
  function onJlistKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    let idx = -1;
    JOBS.forEach((j, i) => {
      if (j.id === picked) idx = i;
    });
    const next = idx < 0 ? 0 : idx + (e.key === 'ArrowDown' ? 1 : -1);
    if (next < 0 || next >= JOBS.length) return;
    e.preventDefault();
    onPickJob(JOBS[next].id);
    jobRefs.current.get(JOBS[next].id)?.focus();
  }

  function doConfirm(id: string) {
    const j = jobById(id);
    const old = confirmed ? jobById(confirmed) : undefined;
    if (!j) return;
    setConfirmed(id);
    setPicked(id);
    setToolbarOn('confirmed');
    if (old && old.id !== id) {
      toast(`已切换目标岗位为「${j.n}」：移除「${old.n}」的 ${old.cs.length} 个标记，新增「${j.n}」的 ${j.cs.length} 个`);
    } else {
      toast(`已确认目标岗位「${j.n}」，课程池里 ${j.cs.length} 门课已带「${j.n}」标记`);
    }
  }

  function onConfirm() {
    if (!picked) {
      toast('先选一个目标岗位，再确认 —— 现在确认不会在课程池留下任何标记');
      return;
    }
    const j = jobById(picked);
    if (!j) return;
    if (confirmed === picked) {
      toast(`「${j.n}」已经是当前目标岗位，课程池的标记不用再打一次`);
      return;
    }
    if (confirmed) {
      openModal('change', picked);
      return;
    }
    doConfirm(picked);
  }

  function onChangeJob() {
    if (!confirmed) return;
    const other = confirmed === 'j1' ? 'j4' : 'j1';
    setPicked(other);
    openModal('change', other);
  }

  function onCancelJob() {
    if (!confirmed) return;
    openModal('cancel', null);
  }

  /* ---------- 视图跳转(对应原 data-nav 全局委托) ---------- */
  function nav(k: 'plan' | 'pool' | 'pick') {
    if (k === 'plan') {
      setView('plan');
      setToolbarOn('confirmed');
    } else if (k === 'pool') {
      setView('pool');
      setToolbarOn('pool');
    } else {
      setView('pick');
      setToolbarOn('pick');
    }
  }

  /* ---------- 演示态工具条(对应原 go(key)) ---------- */
  function go(key: ToolbarKey) {
    setView('plan');
    if (key === 'empty') {
      setPicked(null);
      setToolbarOn('empty');
    } else if (key === 'picked') {
      if (!picked) setPicked(confirmed || 'j1');
      setToolbarOn('picked');
    } else if (key === 'confirmed') {
      const conf = confirmed ?? picked ?? 'j1';
      setConfirmed(conf);
      setPicked(conf);
      setToolbarOn('confirmed');
    } else if (key === 'pool') {
      setView('pool');
      setToolbarOn('pool');
    } else if (key === 'detail') {
      setView('detail');
      setDetail(confirmed ? (jobById(confirmed)?.cs[1] ?? 'c02') : 'c02');
      setToolbarOn('detail');
    } else if (key === 'pick') {
      setView('pick');
      setToolbarOn('pick');
    } else if (key === 'change') {
      if (!confirmed) setConfirmed('j1');
      const conf = confirmed || 'j1';
      const target = conf === 'j4' ? 'j1' : 'j4';
      setPicked(target);
      setToolbarOn('change');
      openModal('change', target);
    }
  }

  /* ---------- 预览面板派生态 ---------- */
  const isConf = !!pickedJob && confirmed === picked;
  const otherJob = confirmed && picked && confirmed !== picked ? jobById(confirmed) : undefined;
  const confirmOff = !pickedJob || isConf;
  const confirmLabel = !pickedJob
    ? '确认目标岗位'
    : isConf
      ? '已确认 · 当前目标岗位'
      : otherJob
        ? `更换为「${pickedJob.n}」`
        : '确认目标岗位';
  const confirmCls = !pickedJob
    ? cx(styles.btn, styles.primary, styles.isOff)
    : isConf
      ? cx(styles.btn, styles.isOff)
      : cx(styles.btn, styles.primary);

  const markedInPool = poolList.filter(c => markOf(c.id)).length;
  const modalCur = confirmedJob;
  const modalNext = modal?.type === 'change' && modal.target ? jobById(modal.target) : undefined;

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <p className={styles.docTitle}>US-06 职业规划 · 低保真线框（Web）</p>
        <p className={styles.docSub}>V1.0 / 职业规划 / 3 故事点 &nbsp;·&nbsp; 灰阶线框，可点击走查：选岗位 → 看清单 → 确认 → 课程池标记</p>

        <div className={styles.toolbar} role="group" aria-label="走查状态切换">
          {DEMOS.map(d => (
            <button key={d.key} type="button" className={cx(styles.tbtn, toolbarOn === d.key && styles.on)} onClick={() => go(d.key)}>
              {d.label}
            </button>
          ))}
          <span className={styles.tbarNote}>点岗位卡可切换选择；确认后去课程池看标记落点</span>
        </div>

        <div className={styles.browser}>
          <div className={styles.chrome}>
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <div className={styles.urlbar}>{URL_TITLES[view]}</div>
          </div>

          <div className={styles.page}>
            <header className={styles.nav}>
              <div className={styles.logo}>
                AI 学业陪伴<span>纯软件赛道</span>
              </div>
              <nav className={styles.tabs} aria-label="主导航">
                <button type="button" aria-current={view === 'pool' ? 'page' : undefined} onClick={() => nav('pool')}>
                  课程池
                </button>
                <button type="button" aria-current={view === 'pick' ? 'page' : undefined} onClick={() => nav('pick')}>
                  课程规划
                </button>
                <button type="button" onClick={() => toast('日历本不是本故事范围，走查见 US-08')}>
                  日历本
                </button>
                <button type="button" aria-current={view === 'plan' ? 'page' : undefined} onClick={() => nav('plan')}>
                  职业规划
                </button>
              </nav>
              <div className={styles.spacer} />
              <div className={styles.me}>我</div>
            </header>

            <main>
              {/* ============ 职业规划（选岗位 / 已确认） ============ */}
              <section hidden={view !== 'plan'}>
                <div className={cx(styles.wrap, styles.wide)}>
                  <h1>职业规划</h1>
                  <p className={styles.lead}>选一个目标岗位，把它需要的课在课程池里标出来。只做标记 —— 不生成计划、不排期、不改课程的可选范围。</p>

                  <div className={styles.curjob} hidden={!confirmedJob}>
                    <span className={styles.ck}>当前目标岗位</span>
                    <b>{confirmedJob?.n ?? '—'}</b>
                    <span>{confirmedJob ? `· 已在课程池标记 ${confirmedJob.cs.length} 门课` : '—'}</span>
                    <span className={styles.grow} />
                    <button className={cx(styles.btn, styles.mini)} type="button" onClick={onChangeJob}>
                      更换岗位
                    </button>
                    <button className={cx(styles.btn, styles.mini)} type="button" onClick={onCancelJob}>
                      取消目标岗位
                    </button>
                  </div>

                  <div className={styles.split}>
                    <div className={styles.jlist} role="radiogroup" aria-label="目标岗位列表" onKeyDown={onJlistKey}>
                      {JOB_GROUPS.map(g => (
                        <div key={g.track}>
                          <div className={styles.jgroup}>{g.track}</div>
                          {g.jobs.map(j => {
                            const isCur = confirmed === j.id;
                            const sel = picked === j.id;
                            const dn = doneN(j);
                            return (
                              <button
                                key={j.id}
                                type="button"
                                className={styles.job}
                                role="radio"
                                aria-checked={sel}
                                ref={el => {
                                  if (el) jobRefs.current.set(j.id, el);
                                  else jobRefs.current.delete(j.id);
                                }}
                                onClick={() => onPickJob(j.id)}
                                aria-label={`${j.n}，${j.track}，需学 ${j.cs.length} 门课合计 ${sumH(j)} 小时，已完成 ${dn} 门${isCur ? '，当前目标岗位' : ''}`}
                              >
                                <span className={styles.jr}>
                                  <span className={styles.jn}>{j.n}</span>
                                  {isCur && <span className={styles.jt}>当前目标</span>}
                                  <span className={styles.jm}>
                                    {j.cs.length} 门 · {sumH(j)} 小时
                                  </span>
                                </span>
                                <span className={styles.jd}>{j.d}</span>
                                <span className={styles.jp}>
                                  <span className={styles.dots} aria-hidden="true">
                                    {j.cs.map((_, i) => (
                                      <i key={i} className={i < dn ? styles.on : undefined} />
                                    ))}
                                  </span>
                                  <span className={styles.pt}>
                                    已完成 {dn} / {j.cs.length} 门
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <aside className={styles.preview} aria-labelledby="pvName">
                      <div className={styles.pvH}>
                        <div className={styles.pvK}>目标岗位</div>
                        <h2 id="pvName">{pickedJob ? pickedJob.n : '还没选岗位'}</h2>
                        <p className={styles.pvD}>{pickedJob ? pickedJob.d : '从左边选一个岗位，这里会列出它需要学的课。'}</p>
                      </div>

                      <div className={styles.pvSec}>
                        <span>这个岗位需要学的课</span>
                        <b>{pickedJob ? `${pickedJob.cs.length} 门` : '—'}</b>
                        <span className={styles.grow} />
                        <span className={styles.lg2}>{pickedJob ? '■ = 岗位必需课' : ''}</span>
                      </div>

                      <ul className={styles.pvc}>
                        {pickedJob
                          ? pickedJob.cs.map((cid, i) => {
                              const c = byId(cid);
                              if (!c) return null;
                              const miss = preMissing(c);
                              return (
                                <li key={cid}>
                                  <span className={styles.idx}>{i + 1}</span>
                                  <span className={styles.cn}>
                                    {c.n}
                                    <span className={styles.cm3}>
                                      {c.d} · {c.l} · {c.h} 小时{c.p.length ? ` · 先修 ${c.p.length} 门` : ' · 无先修'}
                                    </span>
                                    {miss.length > 0 && (
                                      <span className={styles.cw}>先修未满足：{miss.map(x => `${x.n}（${x.s}）`).join('、')}</span>
                                    )}
                                  </span>
                                  <span className={cx(styles.cs, stCls(c.s))}>{c.s}</span>
                                </li>
                              );
                            })
                          : <li className={styles.empty2}>选中岗位后，这里逐门列出它需要学的课，并标出你现在的进度。</li>}
                      </ul>

                      <div className={styles.pvSum}>
                        {pickedJob && (
                          <>
                            <span>
                              <b>{pickedJob.cs.length}</b> 门
                            </span>
                            <span>
                              合计 <b>{sumH(pickedJob)}</b> 小时
                            </span>
                            <span>
                              已完成 <b>{doneN(pickedJob)}</b> 门
                            </span>
                            <span>
                              待学 <b>{pickedJob.cs.length - doneN(pickedJob)}</b> 门
                            </span>
                          </>
                        )}
                      </div>

                      <div className={styles.pvNote}>
                        {!pickedJob ? (
                          <>确认前不会在课程池留下任何标记。</>
                        ) : isConf ? (
                          <>这个岗位已经是当前目标，课程池里的标记不会变。</>
                        ) : otherJob ? (
                          <>
                            确认后：<b>{otherJob.n}</b> 的 <b>{otherJob.cs.length}</b> 个标记会从课程池移除，只保留「{pickedJob.n}」的 {pickedJob.cs.length} 个。
                          </>
                        ) : (
                          <>
                            确认后：这 {pickedJob.cs.length} 门课会在课程池带「{pickedJob.n}」标记。<b>不生成计划、不排期、不改课程可选范围。</b>
                          </>
                        )}
                      </div>

                      <div className={styles.pvDone} hidden={!isConf}>
                        <span className={styles.dd} aria-hidden="true" />
                        <span>
                          {pickedJob ? (
                            <>
                              标记结果：课程池里 <b>{pickedJob.cs.length}</b> 门课已带「{pickedJob.n}」标记，与清单 <b>{pickedJob.cs.length}</b> 门一致。
                              <button className={styles.lnk} type="button" style={{marginLeft: '6px'}} onClick={() => nav('pool')}>
                                去课程池看
                              </button>
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>

                      <div className={styles.pvAct}>
                        <button type="button" className={confirmCls} aria-disabled={confirmOff} onClick={onConfirm}>
                          {confirmLabel}
                        </button>
                      </div>
                    </aside>
                  </div>
                </div>
              </section>

              {/* ============ 课程池（标记态） ============ */}
              <section hidden={view !== 'pool'}>
                <div className={cx(styles.wrap, styles.wide)}>
                  <h1>课程池</h1>
                  <p className={styles.lead}>平台内置的 IT 技能课程。带岗位标记的课，是当前目标岗位要求学的那几门。</p>

                  <div className={cx(styles.markbar, !confirmedJob && styles.off)}>
                    {confirmedJob ? (
                      <>
                        <span className={styles.k2}>目标岗位</span>
                        <b>{confirmedJob.n}</b>
                        <span>
                          · 已标记 {confirmedJob.cs.length} 门课，清单 {confirmedJob.cs.length} 门，数量一致
                        </span>
                        <span className={styles.grow} />
                        <button className={styles.lnk} type="button" onClick={() => nav('plan')}>
                          去职业规划改岗位
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={styles.k2} style={{background: '#8a8a86'}}>
                          无目标岗位
                        </span>
                        <span>还没有确认目标岗位，课程池暂无岗位标记</span>
                        <span className={styles.grow} />
                        <button className={styles.lnk} type="button" onClick={() => nav('plan')}>
                          去选一个岗位
                        </button>
                      </>
                    )}
                  </div>

                  <div className={styles.filters}>
                    <div className={styles.frow}>
                      <span className={styles.k} id="kDir">
                        方向
                      </span>
                      <div className={styles.frow} style={{gap: '6px'}} role="group" aria-labelledby="kDir">
                        {['全部', ...DIRS].map(d => (
                          <button key={d} type="button" className={styles.chip} aria-pressed={dir === d} onClick={() => setDir(d)}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.frow}>
                      <span className={styles.k} id="kLv">
                        难度
                      </span>
                      <div className={styles.frow} style={{gap: '6px'}} role="group" aria-labelledby="kLv">
                        {['全部', ...LEVELS].map(l => (
                          <button key={l} type="button" className={styles.chip} aria-pressed={lv === l} onClick={() => setLv(l)}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <span className={styles.grow} />
                      <span className={styles.fnote}>筛选与排序规则同 US-04，此处只演示标记</span>
                    </div>
                  </div>

                  <div className={styles.resultbar}>
                    <span className={styles.n}>共 {poolList.length} 门</span>
                    <span>
                      {dir} · {lv}
                    </span>
                    <span className={styles.spacer} />
                    <span>
                      {confirmedJob ? (
                        <>
                          其中 <b style={{color: 'var(--ink)'}}>{markedInPool}</b> 门带岗位标记
                        </>
                      ) : (
                        '无岗位标记'
                      )}
                    </span>
                  </div>

                  {DIRS.map(d => {
                    const sub = poolList.filter(c => c.d === d);
                    if (!sub.length) return null;
                    const gm = sub.filter(c => markOf(c.id)).length;
                    return (
                      <div className={styles.group} key={d}>
                        <div className={styles.groupHead}>
                          <span className={styles.dir}>{d}</span>
                          <span className={styles.ct}>{sub.length} 门</span>
                          <span className={styles.grow} />
                          {confirmedJob && <span className={styles.gm}>其中 {gm} 门带岗位标记</span>}
                        </div>
                        <ul className={styles.plist}>
                          {sub.map(c => {
                            const mk = markOf(c.id);
                            const miss = preMissing(c);
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className={styles.prowB}
                                  onClick={() => {
                                    setDetail(c.id);
                                    setView('detail');
                                    setToolbarOn('detail');
                                  }}
                                  aria-label={`${c.n}，${c.d} ${c.l}，${c.h} 小时，${c.s}${mk ? `，带${mk.n}岗位标记` : ''}，查看详情`}
                                >
                                  <span className={styles.rmain}>
                                    <span className={styles.rn}>
                                      {c.n}
                                      {mk && <Mk job={mk} />}
                                    </span>
                                    <span className={styles.rs}>
                                      {c.d} · {c.l} · {c.h} 小时 · {c.ch.length} 章{c.p.length ? '' : ' · 无先修'}
                                      {miss.length ? ` · 先修未满足 ${miss.length} 门` : ''}
                                    </span>
                                  </span>
                                  <span className={styles.rt}>
                                    <span className={cx(styles.cs, stCls(c.s))}>{c.s}</span>
                                    <span className={styles.arrow} aria-hidden="true">
                                      ›
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}

                  <div className={styles.mnote} hidden={!confirmedJob}>
                    <b>标记的数据形态</b>：按「岗位编号 + 课程编号」多对多存储，同一门课可以同时带多个岗位标记。
                    本期同一时刻只允许一个目标岗位，所以界面上只会出现一个标记；若将来放开多岗位，这里会并列显示多个标记。
                  </div>

                  <div className={styles.empty} hidden={poolList.length > 0}>
                    <div className={styles.eT}>没有符合条件的课程</div>
                    <div className={styles.eS}>当前方向与难度组合下无课程，可放宽难度再看。</div>
                    <button
                      className={styles.btn}
                      type="button"
                      onClick={() => {
                        setDir('全部');
                        setLv('全部');
                      }}
                    >
                      清空筛选
                    </button>
                  </div>
                </div>
              </section>

              {/* ============ 课程详情（标记态） ============ */}
              <section hidden={view !== 'detail'}>
                <div className={styles.wrap}>
                  <div className={styles.crumb}>
                    <button className={styles.backlink} type="button" onClick={() => nav('pool')}>
                      ‹ 返回课程池
                    </button>
                  </div>
                  <div className={styles.dhead}>
                    <h1>{detailCourse.n}</h1>
                    <div className={styles.dmeta}>
                      {detailCourse.d} · {detailCourse.l} · {detailCourse.h} 小时 · {detailCourse.ch.length} 章 · {detailCourse.s}
                    </div>
                  </div>

                  <div className={styles.dsec}>
                    <div className={styles.dsecH}>所属岗位</div>
                    <div className={styles.dsecB}>
                      {markOf(detailCourse.id) ? (
                        <>
                          <div className={styles.mkrow}>
                            <Mk job={markOf(detailCourse.id)!} />
                            <span className={styles.mkNote}>当前目标岗位「{markOf(detailCourse.id)!.n}」要求学这门课</span>
                          </div>
                          <div className={styles.mkNote}>标记来自职业规划，目标岗位更换或取消时自动移除，课程本身不受影响。</div>
                        </>
                      ) : (
                        <span className={styles.mkNote}>
                          {confirmedJob
                            ? `当前目标岗位「${confirmedJob.n}」的清单里没有这门课，因此无岗位标记。`
                            : '还没有确认目标岗位，暂无岗位标记。'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.dsec} hidden={!confirmedJob}>
                    <div className={styles.dsecH}>
                      {confirmedJob ? `「${confirmedJob.n}」的课程清单 · 共 ${confirmedJob.cs.length} 门` : '岗位课程清单'}
                    </div>
                    <div className={styles.dsecB}>
                      <div className={styles.route}>
                        {confirmedJob?.cs.map((cid, r) => {
                          const rc = byId(cid);
                          if (!rc) return null;
                          const isCur = rc.id === detailCourse.id;
                          return (
                            <button
                              key={cid}
                              type="button"
                              aria-current={isCur ? 'true' : undefined}
                              onClick={() => setDetail(rc.id)}
                              aria-label={`${rc.n}${isCur ? '，当前课程' : ''}`}
                            >
                              <span className={styles.ri}>{r + 1}</span>
                              {rc.n}
                            </button>
                          );
                        })}
                      </div>
                      <div className={styles.routeNote}>清单顺序由岗位维护方给出，不代表强制学习顺序；能不能学仍以先修为准。</div>
                    </div>
                  </div>

                  <div className={styles.dsec}>
                    <div className={styles.dsecH}>先修课程</div>
                    <div className={styles.dsecB}>
                      {detailCourse.p.length === 0 ? (
                        <span className={styles.mkNote}>无先修要求，可以直接学。</span>
                      ) : (
                        detailCourse.p.map(pid => {
                          const q = byId(pid);
                          if (!q) return null;
                          const ok = q.s === '已完成' || q.s === '待复习';
                          return (
                            <div className={styles.mkrow} key={pid}>
                              <span
                                className={cx(styles.cs, stCls(q.s))}
                                style={{fontSize: '10px', lineHeight: '15px', padding: '0 5px', border: '1px solid var(--dash)', borderRadius: '2px'}}
                              >
                                {q.s}
                              </span>
                              <span>{q.n}</span>
                              {!ok && <span className={styles.mkNote}>· 未满足，课程规划里暂不可选</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className={styles.dsec}>
                    <div className={styles.dsecH}>章节知识点</div>
                    <div className={styles.dsecB}>
                      <ul className={styles.chlist}>
                        {detailCourse.ch.map((t, k) => (
                          <li key={k}>
                            {k + 1}. {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* ============ 课程规划 · 选课（标记透传） ============ */}
              <section hidden={view !== 'pick'}>
                <div className={styles.wrap}>
                  <h1>课程规划 · 选课</h1>
                  <p className={styles.lead}>
                    课程池里的岗位标记会在这里照常显示。它只是提示，<b>不影响这门课能不能选</b>。
                  </p>

                  <div className={cx(styles.markbar, !confirmedJob && styles.off)}>
                    {confirmedJob ? (
                      <>
                        <span className={styles.k2}>目标岗位</span>
                        <b>{confirmedJob.n}</b>
                        <span>· 标记只是提示，可选与不可选的判定与未标记时一致</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.k2} style={{background: '#8a8a86'}}>
                          无目标岗位
                        </span>
                        <span>选课列表不带岗位标记</span>
                      </>
                    )}
                  </div>

                  <div className={styles.pickwrap}>
                    {pickRows.map(c2 => {
                      const miss = preMissing(c2);
                      const off = miss.length > 0;
                      const mk = markOf(c2.id);
                      return (
                        <div className={cx(styles.pickrow, off && styles.off)} key={c2.id}>
                          <span className={styles.cbx} aria-hidden="true" />
                          <span className={styles.pm}>
                            <span className={styles.pn}>
                              {c2.n}
                              {mk && <Mk job={mk} />}
                            </span>
                            <span className={styles.ps}>
                              {c2.d} · {c2.l} · {c2.h} 小时 · {c2.ch.length} 章
                            </span>
                            {off && <span className={styles.pw}>先修未完成：{miss.map(x => `${x.n}（${x.s}）`).join('、')}</span>}
                          </span>
                          <span className={styles.px}>{off ? '不可选' : '可勾选'}</span>
                        </div>
                      );
                    })}
                  </div>

                  <p className={styles.docNote} style={{marginTop: '14px'}}>
                    判定规则不变：先修未完成的课仍然置灰、不可勾选，带不带岗位标记都一样。标记只是「这条路线上要学」，不是「现在就能学」。
                  </p>
                </div>
              </section>
            </main>
          </div>
        </div>

        {/* 换岗 / 取消 二次确认 */}
        <div
          className={styles.modal}
          hidden={!modal}
          onClick={e => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="mTitle" aria-describedby="mBody">
            <h3 id="mTitle">{modal?.type === 'change' ? '更换目标岗位' : '取消目标岗位'}</h3>
            <p id="mBody">
              {modal?.type === 'change' && modalNext ? (
                <>
                  同一时刻只能有一个目标岗位。换成「<b>{modalNext.n}</b>」后：
                </>
              ) : (
                <>取消后不再有目标岗位，课程池里的岗位标记会全部移除。</>
              )}
            </p>
            <div className={styles.mList}>
              {modal?.type === 'change' && modalNext && modalCur ? (
                <>
                  · 「<b>{modalCur.n}</b>」在课程池的 <b>{modalCur.cs.length}</b> 个标记会被移除<br />
                  · 「<b>{modalNext.n}</b>」清单内的 <b>{modalNext.cs.length}</b> 门课会新打上标记<br />
                  · 课程学习状态、已生成的计划与日历本任务都不受影响
                </>
              ) : modalCur ? (
                <>
                  · 「<b>{modalCur.n}</b>」的 <b>{modalCur.cs.length}</b> 个标记会被移除<br />
                  · 课程本身、学习状态、已生成的计划都不受影响<br />
                  · 之后随时可以重新选岗位，标记会重新打上
                </>
              ) : (
                '—'
              )}
            </div>
            <div className={styles.modalAct}>
              <button className={styles.btn} type="button" ref={mCancelRef} onClick={closeModal}>
                再想想
              </button>
              <button className={cx(styles.btn, styles.primary)} type="button" onClick={onModalOk}>
                {modal?.type === 'change' ? '确认更换' : '确认取消'}
              </button>
            </div>
          </div>
        </div>

        <div className={cx(styles.toast, toastMsg && styles.on)} role="status" aria-live="polite">
          {toastMsg}
        </div>

      </div>
    </div>
  );
}
