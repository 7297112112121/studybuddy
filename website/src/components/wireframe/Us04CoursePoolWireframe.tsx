/**
 * US-04 课程池 · 低保真线框(筛选 → 分组列表 → 详情与先修拦截 · 网页端)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 课程池列表 ② 课程详情 ③ 筛选空态 + 重置。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us04CoursePool.module.css';

/** 视图:列表(s1)/ 详情(s2)/ 筛选空态演示(empty,仍渲染列表) */
type Screen = 's1' | 's2' | 'empty';
type Status = '未开始' | '学习中' | '已完成' | '待复习';

/** 课程:名称 / 方向 / 难度 / 时长(小时)/ 先修 / 章节知识点 + 学习状态 */
interface Course {
  id: string;
  n: string;
  d: string;
  l: string;
  h: number;
  p: string[];
  s: Status;
  ch: string[];
}

const DIRS: string[] = ['后端', '前端', '算法', '数据', '测试'];
const LEVELS: string[] = ['入门', '进阶', '高阶'];
const STATUSES: Status[] = ['未开始', '学习中', '已完成', '待复习'];
const STAT_CLS: Record<Status, string> = {未开始: 's0', 学习中: 's1', 已完成: 's2', 待复习: 's3'};

/* 数据集样例:字段对齐业务规则六项(名称/方向/难度/时长(小时)/先修/章节知识点)+ 学习状态 */
const CT: Course[] = [
  {id: 'c01', n: '程序设计基础(C 语言)', d: '后端', l: '入门', h: 32, p: [], s: '已完成',
    ch: ['变量与流程控制', '函数与数组', '指针与内存', '结构体与文件']},
  {id: 'c02', n: '数据结构与算法基础', d: '后端', l: '进阶', h: 40, p: ['c01'], s: '学习中',
    ch: ['线性表与栈队列', '树与递归', '图与遍历', '排序与查找']},
  {id: 'c03', n: '计算机网络', d: '后端', l: '进阶', h: 36, p: [], s: '未开始',
    ch: ['TCP/IP 分层', 'HTTP 与 HTTPS', '传输层机制', '网络编程入门']},
  {id: 'c04', n: '数据库原理与 SQL', d: '后端', l: '进阶', h: 32, p: ['c02'], s: '未开始',
    ch: ['关系模型', 'SQL 查询与联结', '索引与执行计划', '事务与隔离级别']},
  {id: 'c05', n: '分布式系统设计', d: '后端', l: '高阶', h: 48, p: ['c03', 'c04'], s: '未开始',
    ch: ['一致性与 CAP', '分布式事务', '服务拆分与治理', '容错与限流']},

  {id: 'c06', n: 'HTML / CSS 基础', d: '前端', l: '入门', h: 24, p: [], s: '已完成',
    ch: ['语义化标签', '盒模型与布局', 'Flex 与 Grid', '响应式基础']},
  {id: 'c07', n: 'JavaScript 与 DOM 编程', d: '前端', l: '入门', h: 32, p: ['c06'], s: '学习中',
    ch: ['语法与作用域', 'DOM 操作与事件', '异步与 Promise', '模块化']},
  {id: 'c08', n: '前端框架实战(Vue)', d: '前端', l: '进阶', h: 40, p: ['c07'], s: '未开始',
    ch: ['响应式原理', '组件与插槽', '路由与状态管理', '接口联调']},
  {id: 'c09', n: '前端工程化与构建', d: '前端', l: '高阶', h: 28, p: ['c08'], s: '未开始',
    ch: ['构建工具链', '按需加载与拆包', '性能预算', 'CI 与发布']},

  {id: 'c10', n: '算法复杂度与基础题训', d: '算法', l: '入门', h: 24, p: [], s: '待复习',
    ch: ['时间与空间复杂度', '数组与字符串', '双指针与滑动窗口', '二分查找']},
  {id: 'c11', n: '动态规划专题', d: '算法', l: '进阶', h: 20, p: ['c10'], s: '未开始',
    ch: ['状态与转移方程', '背包问题', '区间 DP', '题单训练']},
  {id: 'c12', n: '图论与最短路', d: '算法', l: '高阶', h: 24, p: ['c11'], s: '未开始',
    ch: ['图的存储', '最短路算法', '最小生成树', '综合赛题']},

  {id: 'c13', n: 'Python 数据分析入门', d: '数据', l: '入门', h: 24, p: [], s: '未开始',
    ch: ['NumPy 基础', 'Pandas 表格处理', '数据清洗', '统计描述']},
  {id: 'c14', n: '数据可视化与 BI 报表', d: '数据', l: '进阶', h: 20, p: ['c13'], s: '未开始',
    ch: ['图表选型', '可视化库实战', '看板搭建', '指标口径']},

  {id: 'c15', n: '软件测试基础与用例设计', d: '测试', l: '入门', h: 20, p: [], s: '未开始',
    ch: ['测试流程', '用例设计方法', '缺陷管理', '测试报告']},
  {id: 'c16', n: '接口自动化测试实战', d: '测试', l: '进阶', h: 24, p: ['c15'], s: '未开始',
    ch: ['接口协议与断言', '测试框架', '数据驱动', '持续集成']},
];

const DEMOS: {key: Screen; label: string}[] = [
  {key: 's1', label: '① 课程池列表'},
  {key: 's2', label: '② 课程详情'},
  {key: 'empty', label: '③ 筛选空态'},
];

function byId(id: string): Course | undefined {
  return CT.find(c => c.id === id);
}
function nameOf(id: string): string {
  const c = byId(id);
  return c ? c.n : id;
}

/* 先修满足:已完成 / 待复习 视为修完(待复习 口径待产品确认) */
function done(st: string): boolean {
  return st === '已完成' || st === '待复习';
}
function satisfied(c: Course, sm: Record<string, Status>): boolean {
  return c.p.every(id => {
    const q = byId(id);
    return q ? done(sm[id]) : false;
  });
}
function unmetNames(c: Course, sm: Record<string, Status>): string[] {
  return c.p
    .filter(id => {
      const q = byId(id);
      return !(q && done(sm[id]));
    })
    .map(nameOf);
}

/* 组内排序:先修未满足置后 → 同层按难度升序 → 按预计时长升序 */
function sortGroup(list: Course[], sm: Record<string, Status>): Course[] {
  return list.slice().sort((a, b) => {
    const ua = satisfied(a, sm) ? 0 : 1;
    const ub = satisfied(b, sm) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    const la = LEVELS.indexOf(a.l);
    const lb = LEVELS.indexOf(b.l);
    if (la !== lb) return la - lb;
    return a.h - b.h;
  });
}

/** 原原型直接改写数据对象的学习状态,这里收敛为独立 state 的初始值 */
function initialStatuses(): Record<string, Status> {
  const m: Record<string, Status> = {};
  CT.forEach(c => {
    m[c.id] = c.s;
  });
  return m;
}

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us04CoursePoolWireframe() {
  /* ---------- 视图与筛选状态 ---------- */
  const [screen, setScreen] = useState<Screen>('s1');
  const [dir, setDir] = useState('全部');
  const [lv, setLv] = useState('全部');
  const [onlyNew, setOnlyNew] = useState(false);
  const [cur, setCur] = useState('c04');

  /* ---------- 课程学习状态(详情页四值切换,列表与先修判定实时联动) ---------- */
  const [statusMap, setStatusMap] = useState<Record<string, Status>>(initialStatuses);

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
    toastTimer.current = setTimeout(() => setToastMsg(''), 1700);
  }

  /* ---------- 派生:当前筛选结果 ---------- */
  const list = CT.filter(
    c =>
      (dir === '全部' || c.d === dir) &&
      (lv === '全部' || c.l === lv) &&
      (!onlyNew || statusMap[c.id] === '未开始'),
  );

  const det = byId(cur);
  const detUnmet = det ? unmetNames(det, statusMap) : [];

  /* ---------- 课程行 ---------- */
  function rowOf(c: Course) {
    const ok = satisfied(c, statusMap);
    const st = statusMap[c.id];
    return (
      <li key={c.id}>
        <a
          className={cx(styles.rowc, !ok && styles.locked)}
          href={`#course-${c.id}`}
          onClick={e => {
            e.preventDefault();
            openDetail(c.id);
          }}
        >
          <span>
            <span className={styles.nm}>{c.n}</span>
            <span className={styles.mt}>
              <span className={styles.tag}>{c.d}</span>
              <span className={styles.tag}>{c.l}</span>
              <span>预计 {c.h} 小时</span>
              <span className={styles.dotSep}>·</span>
              <span>{c.ch.length} 章</span>
              {c.p.length ? (
                <>
                  <span className={styles.dotSep}>·</span>
                  <span>先修 {c.p.length} 门</span>
                </>
              ) : (
                <>
                  <span className={styles.dotSep}>·</span>
                  <span>无先修</span>
                </>
              )}
            </span>
          </span>
          <span className={styles.rt}>
            {!ok && <span className={styles.lock}>先修未完成</span>}
            <span className={cx(styles.stat, styles[STAT_CLS[st]])}>{st}</span>
            <span className={styles.arrow} aria-hidden="true">
              ›
            </span>
          </span>
        </a>
      </li>
    );
  }

  /* ---------- 视图切换 ---------- */
  function openDetail(id: string) {
    setCur(id);
    setScreen('s2');
  }

  function onToolbar(key: Screen) {
    if (key === 's2') {
      /* 原型为 openDetail(state.cur):重渲染当前课程详情并落详情视图 */
      setScreen('s2');
      return;
    }
    if (key === 'empty') {
      setDir('数据');
      setLv('高阶');
      setOnlyNew(false);
    }
    setScreen(key);
  }

  function resetAll() {
    setDir('全部');
    setLv('全部');
    setOnlyNew(false);
    setCur('c04');
    setScreen('s1');
  }

  function clearFilters() {
    setDir('全部');
    setLv('全部');
    setOnlyNew(false);
  }

  /* ---------- 学习状态四值切换(原原型直接改写数据对象) ---------- */
  function changeStatus(s: Status) {
    const c = byId(cur);
    if (!c) return;
    setStatusMap(prev => ({...prev, [c.id]: s}));
    toast(`「${c.n}」状态已改为 ${s}`);
  }

  /* ---------- 加入课程规划(仅轻提示,不跳转) ---------- */
  function onCta() {
    const c = byId(cur);
    if (!c) return;
    toast(`「${c.n}」已加入课程规划 · 新学页签`);
  }

  /* ---------- 筛选 chips(「全部」+ 各选项,aria-pressed 表达选中) ---------- */
  function chipRow(options: string[], value: string, onPick: (v: string) => void) {
    return ['全部'].concat(options).map(v => (
      <button key={v} type="button" className={styles.chip} aria-pressed={value === v} onClick={() => onPick(v)}>
        {v}
      </button>
    ));
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>

        <div className={styles.toolbar}>
          {DEMOS.map(d => (
            <button
              key={d.key}
              type="button"
              className={cx(styles.tbtn, screen === d.key && styles.on)}
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
            <div className={styles.urlbar}>{screen === 's2' && det ? `课程池 · ${det.n}` : '课程池'}</div>
          </div>

          <div className={styles.page}>
            <header className={styles.nav}>
              <div className={styles.logo}>
                AI 学业陪伴<span>纯软件赛道</span>
              </div>
              <nav className={styles.tabs} aria-label="主导航">
                <button type="button" aria-current="page">
                  课程池
                </button>
                <button type="button">课程规划</button>
                <button type="button">日历本</button>
              </nav>
              <div className={styles.spacer} />
              <div className={styles.me}>我</div>
            </header>

            <main className={styles.pageMain}>
              {/* ============ 一、课程池列表 ============ */}
              <section hidden={screen === 's2'}>
                <div className={cx(styles.wrap, styles.wide)}>
                  <h1>课程池</h1>
                  <p className={styles.lead}>平台内置的 IT 技能课程,按方向筛、按先修判断能不能学。</p>

                  <div className={styles.filters}>
                    <div className={styles.frow}>
                      <span className={styles.k} id="kDir">
                        方向
                      </span>
                      <div className={styles.frow} style={{gap: 6}} role="group" aria-labelledby="kDir">
                        {chipRow(DIRS, dir, setDir)}
                      </div>
                    </div>
                    <div className={styles.frow}>
                      <span className={styles.k} id="kLv">
                        难度
                      </span>
                      <div className={styles.frow} style={{gap: 6}} role="group" aria-labelledby="kLv">
                        {chipRow(LEVELS, lv, setLv)}
                      </div>
                      <span className={styles.grow} />
                      <label className={styles.switch} htmlFor="onlyNew">
                        <input
                          type="checkbox"
                          id="onlyNew"
                          checked={onlyNew}
                          onChange={e => setOnlyNew(e.target.checked)}
                        />
                        <span className={styles.track} aria-hidden="true" />
                        <span>仅看未修习</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.resultbar} aria-live="polite">
                    <span className={styles.n}>{list.length ? `共 ${list.length} 门` : '无匹配课程'}</span>
                    <span>
                      {`${dir === '全部' ? '全部分向' : dir} · ${lv === '全部' ? '全部难度' : lv}${
                        onlyNew ? ' · 仅看未修习' : ''
                      }`}
                    </span>
                    <span className={styles.spacer} />
                    <span className={styles.sort}>排序:先修未满足置后 · 同层按难度升序</span>
                  </div>

                  <div>
                    {DIRS.map(d => {
                      const g = list.filter(c => c.d === d);
                      if (!g.length) return null;
                      const sorted = sortGroup(g, statusMap);
                      const open = sorted.filter(c => satisfied(c, statusMap));
                      const unmet = sorted.filter(c => !satisfied(c, statusMap));
                      return (
                        <section className={styles.group} key={d}>
                          <div className={styles.groupHead}>
                            <span className={styles.dir}>{d}</span>
                            <span className={styles.ct}>{`${sorted.length} 门 · 可选 ${open.length} 门`}</span>
                          </div>
                          <ul className={styles.list}>{open.map(rowOf)}</ul>
                          {unmet.length > 0 && (
                            <>
                              <div className={styles.dividerNote}>
                                {`以下 ${unmet.length} 门课程先修未完成,排在组内末尾,暂不可加入规划`}
                              </div>
                              <ul className={styles.list}>{unmet.map(rowOf)}</ul>
                            </>
                          )}
                        </section>
                      );
                    })}
                  </div>

                  <div className={styles.empty} hidden={list.length !== 0}>
                    <div className={styles.eT}>没有符合条件的课程</div>
                    <div className={styles.eS}>当前方向与难度组合下无课程,可放宽难度或关闭「仅看未修习」。</div>
                    <button type="button" className={cx(styles.primary, styles.ghost)} onClick={clearFilters}>
                      清空筛选
                    </button>
                  </div>
                </div>
              </section>

              {/* ============ 二、课程详情 ============ */}
              <section hidden={screen !== 's2'}>
                {det && (
                  <div className={styles.wrap}>
                    <div className={styles.crumb}>
                      <button type="button" className={styles.backlink} onClick={() => setScreen('s1')}>
                        ‹ 返回课程池
                      </button>
                    </div>

                    <div className={styles.dhead}>
                      <h1>{det.n}</h1>
                      <div className={styles.meta}>
                        <span className={styles.tag}>{det.d}</span>
                        <span className={styles.tag}>{det.l}</span>
                        <span>预计 {det.h} 小时</span>
                        <span className={styles.dotSep}>·</span>
                        <span>{det.ch.length} 章知识点</span>
                        <span className={styles.dotSep}>·</span>
                        <span className={cx(styles.stat, styles[STAT_CLS[statusMap[det.id]]])}>
                          {statusMap[det.id]}
                        </span>
                      </div>
                    </div>

                    <div className={styles.notice} hidden={!detUnmet.length}>
                      <b>先修未完成,本课暂不可开始</b>
                      {`未满足:${detUnmet.join('、')}。该课不会出现在「课程规划 · 新学」页签的可选列表中,先修完成后自动恢复可选。`}
                    </div>

                    <div className={styles.dgrid}>
                      <div>
                        <div className={styles.card}>
                          <h2>
                            先修课程<span className={styles.sub}>未完成的先修会拦住本课的可选资格</span>
                          </h2>
                          <ul className={styles.prereq}>
                            {det.p.length === 0 ? (
                              <li>
                                <span className={styles.pn}>无先修要求,可直接开始</span>
                                <span className={styles.ps}>已满足</span>
                              </li>
                            ) : (
                              det.p.map((pid, i) => {
                                const q = byId(pid);
                                const ok = q && done(statusMap[pid]);
                                return (
                                  <li key={pid}>
                                    <span className={styles.pn}>
                                      <span className={styles.idx} aria-hidden="true">
                                        {i + 1}
                                      </span>
                                      <span>{nameOf(pid)}</span>
                                    </span>
                                    <span className={cx(styles.ps, !ok && styles.bad)}>
                                      {ok ? `已满足 · ${statusMap[pid]}` : `未完成 · ${q ? statusMap[pid] : '缺失'}`}
                                    </span>
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        </div>

                        <div className={styles.card}>
                          <h2>
                            章节知识点<span className={styles.sub}>共 {det.ch.length} 章</span>
                          </h2>
                          <ol className={styles.chapters}>
                            {det.ch.map((t, i) => (
                              <li key={i}>
                                <span className={styles.no}>{String(i + 1).padStart(2, '0')}</span>
                                <span className={styles.chT}>{t}</span>
                                <span className={styles.chH}>约 {Math.round(det.h / det.ch.length)} 小时</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      <aside className={styles.side}>
                        <div className={styles.card}>
                          <h2>学习状态</h2>
                          <div className={styles.statuses} role="radiogroup" aria-label="学习状态">
                            {STATUSES.map(s => (
                              <label key={s} className={cx(statusMap[det.id] === s && styles.hit)}>
                                <input
                                  type="radio"
                                  name="st"
                                  value={s}
                                  checked={statusMap[det.id] === s}
                                  onChange={() => changeStatus(s)}
                                />
                                <span className={styles.rd} aria-hidden="true" />
                                <span>{s}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className={styles.cta}
                            disabled={detUnmet.length > 0}
                            aria-describedby={detUnmet.length ? 'dCtaNote' : undefined}
                            onClick={onCta}
                          >
                            {detUnmet.length ? '先修未完成,暂不可加入' : '加入课程规划'}
                          </button>
                          <p className={styles.ctaNote} id="dCtaNote">
                            {detUnmet.length
                              ? `需先完成:${detUnmet.join('、')}。先修完成前,本课不进「课程规划 · 新学」的可选列表。`
                              : '加入后出现在「课程规划 · 新学」页签,由你决定排进哪个学期。'}
                          </p>
                          <button type="button" className={styles.ghostLink} onClick={() => setScreen('s1')}>
                            回到课程池继续看
                          </button>
                        </div>

                        <div className={styles.card}>
                          <h2>课程信息</h2>
                          <ul className={styles.prereq} style={{fontSize: 12}}>
                            <li>
                              <span>课程编号</span>
                              <span className={styles.ps}>{det.id.toUpperCase()}</span>
                            </li>
                            <li>
                              <span>方向标签</span>
                              <span className={styles.ps}>{det.d}</span>
                            </li>
                            <li>
                              <span>难度</span>
                              <span className={styles.ps}>{det.l}</span>
                            </li>
                            <li>
                              <span>预计时长</span>
                              <span className={styles.ps}>{det.h} 小时</span>
                            </li>
                            <li>
                              <span>来源</span>
                              <span className={styles.ps}>平台内置 · 只读</span>
                            </li>
                          </ul>
                        </div>
                      </aside>
                    </div>
                  </div>
                )}
              </section>
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
