/**
 * US-01 用户信息录入 · 低保真线框(学籍六项录入 / 确认 · 网页端)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 录入页 ② 确认页 + 重置。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us01Profile.module.css';

type View = 's1' | 's3';
type FieldKey = 'school' | 'major' | 'grade' | 'term' | 'weeks';
type ComboKey = 'school' | 'major';
type Entry = {n: string; a: string[]; m: string};

/* ---------- 默认值(与原原型一致) ---------- */
const DEF = {school: '北京邮电大学', major: '软件工程', termStart: '2027-03-01', termWeeks: 18};

/* 院校库:线框演示用最小样本,真实实现走后端院校库接口 */
const SCHOOLS: Entry[] = [
  {n: '北京邮电大学', a: ['北邮', 'bupt'], m: '北京 · 211 · 双一流'},
  {n: '北京航空航天大学', a: ['北航', 'buaa'], m: '北京 · 985'},
  {n: '北京理工大学', a: ['北理', 'bit'], m: '北京 · 985'},
  {n: '北京交通大学', a: ['北交', 'bjtu'], m: '北京 · 211'},
  {n: '电子科技大学', a: ['成电', 'uestc'], m: '成都 · 985'},
  {n: '西安电子科技大学', a: ['西电', 'xidian'], m: '西安 · 211'},
  {n: '华中科技大学', a: ['华科', 'hust'], m: '武汉 · 985'},
  {n: '哈尔滨工业大学', a: ['哈工大', 'hit'], m: '哈尔滨 · 985'},
  {n: '浙江大学', a: ['浙大', 'zju'], m: '杭州 · 985'},
  {n: '南京大学', a: ['南大', 'nju'], m: '南京 · 985'},
  {n: '武汉大学', a: ['武大', 'whu'], m: '武汉 · 985'},
  {n: '中山大学', a: ['中大', 'sysu'], m: '广州 · 985'},
  {n: '四川大学', a: ['川大', 'scu'], m: '成都 · 985'},
  {n: '同济大学', a: ['同济', 'tongji'], m: '上海 · 985'},
  {n: '杭州电子科技大学', a: ['杭电', 'hdu'], m: '杭州 · 省属'},
];

/* 专业:纯软件赛道常见本科专业样本,真实实现走后端专业库接口 */
const MAJORS: Entry[] = [
  {n: '软件工程', a: ['软工', 'se'], m: '工学 · 计算机类'},
  {n: '计算机科学与技术', a: ['计科', 'cs'], m: '工学 · 计算机类'},
  {n: '人工智能', a: ['ai'], m: '工学 · 电子信息类'},
  {n: '数据科学与大数据技术', a: ['大数据', 'ds'], m: '工学 · 计算机类'},
  {n: '网络工程', a: ['网工'], m: '工学 · 计算机类'},
  {n: '信息安全', a: ['信安'], m: '工学 · 计算机类'},
  {n: '物联网工程', a: ['物联网'], m: '工学 · 计算机类'},
  {n: '数字媒体技术', a: ['数媒'], m: '工学 · 计算机类'},
  {n: '智能科学与技术', a: ['智能'], m: '工学 · 计算机类'},
  {n: '电子信息工程', a: ['电信', 'ee'], m: '工学 · 电子信息类'},
  {n: '信息管理与信息系统', a: ['信管'], m: '管理学 · 管理科学与工程类'},
  {n: '区块链工程', a: ['区块链'], m: '工学 · 计算机类'},
];

const GRADES = ['大一', '大二', '大三', '大四'];

const FIELD_TITLES: Record<FieldKey, string> = {
  school: '修改院校',
  major: '修改专业',
  grade: '修改年级',
  term: '修改学期与学期开始时间',
  weeks: '修改每学期周数',
};

/* ---------- 纯逻辑(与原原型一致) ---------- */
function fmtDate(iso: string): string {
  if (!iso) return '—';
  const p = iso.split('-');
  return `${p[0]} 年 ${parseInt(p[1], 10)} 月 ${parseInt(p[2], 10)} 日`;
}

function clampWeeks(v: string): number {
  let n = parseInt(v, 10);
  if (Number.isNaN(n)) n = DEF.termWeeks;
  if (n < 12) n = 12;
  if (n > 30) n = 30;
  return n;
}

function findIn(data: Entry[], name: string): Entry | null {
  for (let i = 0; i < data.length; i++) {
    if (data[i].n === name) return data[i];
  }
  return null;
}

function match(data: Entry[], q: string): Entry[] {
  const s = (q || '').trim().toLowerCase();
  if (!s) return data.slice(0, 6);
  const hit = data.filter(x => {
    if (x.n.toLowerCase().indexOf(s) > -1) return true;
    return x.a.some(k => k.toLowerCase().indexOf(s) > -1);
  });
  return hit.slice(0, 6);
}

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us01ProfileWireframe() {
  /* ---------- 视图(s1 录入 / s3 确认) ---------- */
  const [view, setView] = useState<View>('s1');

  /* ---------- 学籍六项(受控;school/major 存输入框原文,取值时 trim) ---------- */
  const [school, setSchool] = useState(DEF.school);
  const [major, setMajor] = useState(DEF.major);
  const [grade, setGrade] = useState('大二');
  const [term, setTerm] = useState('下');
  const [termStart, setTermStart] = useState(DEF.termStart); // 显示值,允许清空
  const [termStartKeep, setTermStartKeep] = useState(DEF.termStart); // 最近一次有效日期(清空时沿用)
  const [termWeeks, setTermWeeks] = useState(String(DEF.termWeeks)); // 显示值,失焦钳 12—30

  const schoolVal = school.trim();
  const majorVal = major.trim();
  const termStartVal = termStart || termStartKeep;
  const weeksVal = clampWeeks(termWeeks);

  /* 确认页副行:库内命中显示层次标签,未命中显示手动填写 */
  const schoolSub = findIn(SCHOOLS, schoolVal)?.m ?? '手动填写';
  const majorSub = findIn(MAJORS, majorVal)?.m ?? '手动填写';

  /* ---------- 录入页联想下拉 ---------- */
  const [acOpen, setAcOpen] = useState({school: false, major: false});
  const schoolRef = useRef<HTMLInputElement>(null);
  const majorRef = useRef<HTMLInputElement>(null);
  const acCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------- 字段就地编辑浮窗 ---------- */
  const [field, setField] = useState<FieldKey | null>(null);
  const [fmText, setFmText] = useState(''); // 院校 / 专业浮窗内的输入
  const [fmWeeks, setFmWeeks] = useState(''); // 周数浮窗内的输入

  /* ---------- 轻提示(1.7 秒自动消失) ---------- */
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* 卸载时清理所有计时器 */
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(acCloseTimer.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1700);
  }

  function go(v: View) {
    setView(v);
  }

  /* ---------- 联想列表(录入页与浮窗共用一套条目渲染) ---------- */
  function acItems(data: Entry[], q: string, cur: string, onPick: (n: string) => void) {
    const list = match(data, q);
    if (!list.length) return <div className={styles.acEmpty}>未收录，可直接填写后确认</div>;
    return list.map(s => (
      <div
        key={s.n}
        className={cx(styles.acItem, s.n === cur && styles.act)}
        onMouseDown={e => e.preventDefault()}
        onClick={() => onPick(s.n)}
      >
        <span className={styles.nm}>{s.n}</span>
        <span className={styles.mt}>{s.m}</span>
      </div>
    ));
  }

  /* ---------- 录入页院校 / 专业联想(focus 打开、输入过滤、blur 延迟关闭、Esc/Enter 键盘) ---------- */
  function comboData(key: ComboKey): Entry[] {
    return key === 'school' ? SCHOOLS : MAJORS;
  }

  function comboText(key: ComboKey): string {
    return key === 'school' ? school : major;
  }

  function setComboText(key: ComboKey, v: string) {
    if (key === 'school') setSchool(v);
    else setMajor(v);
  }

  function pickAc(key: ComboKey, n: string) {
    setComboText(key, n);
    setAcOpen(p => ({...p, [key]: false}));
    toast('已选择 ' + n);
  }

  function onAcBlur(key: ComboKey) {
    clearTimeout(acCloseTimer.current);
    acCloseTimer.current = setTimeout(() => setAcOpen(p => ({...p, [key]: false})), 140);
  }

  function onAcKeyDown(key: ComboKey, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setAcOpen(p => ({...p, [key]: false}));
      (key === 'school' ? schoolRef : majorRef).current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      const first = match(comboData(key), comboText(key))[0];
      if (first) {
        e.preventDefault();
        setComboText(key, first.n);
        setAcOpen(p => ({...p, [key]: false}));
      } else {
        setAcOpen(p => ({...p, [key]: false}));
      }
    }
  }

  /* ---------- 学期开始时间(清空时保留最近一次有效值) ---------- */
  function onTermStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v) setTermStartKeep(v);
    setTermStart(v);
  }

  /* ---------- 每学期周数(12—30,失焦钳制并提示) ---------- */
  function onWeeksBlur() {
    const n = clampWeeks(termWeeks);
    if (n !== parseInt(termWeeks, 10)) toast('每学期周数按 12—30 周记录');
    setTermWeeks(String(n));
  }

  /* ---------- 下一步:院校 / 专业为空拦截并聚焦 ---------- */
  function nextStep() {
    if (!school.trim()) {
      toast('请先选择或填写院校');
      schoolRef.current?.focus();
      return;
    }
    if (!major.trim()) {
      toast('请先选择或填写专业');
      majorRef.current?.focus();
      return;
    }
    setView('s3');
  }

  /* ---------- 确认页就地编辑浮窗 ---------- */
  function openField(f: FieldKey) {
    if (f === 'school') setFmText(schoolVal);
    if (f === 'major') setFmText(majorVal);
    if (f === 'weeks') setFmWeeks(String(weeksVal));
    setField(f);
  }

  function closeField() {
    setField(null);
  }

  function doneCombo(key: ComboKey) {
    const v = fmText.trim() || (key === 'school' ? schoolVal : majorVal);
    setComboText(key, v);
    setField(null);
    toast('已更新为 ' + v);
  }

  function doneTerm() {
    setTermStart(termStartVal); // 输入框回填语义值(清空时恢复最近有效日期)
    setField(null);
    toast('已更新为' + term + '学期 · ' + fmtDate(termStartVal) + ' 开始');
  }

  function doneWeeks() {
    const n = clampWeeks(fmWeeks);
    setTermWeeks(String(n));
    setField(null);
    toast('已更新为每学期 ' + n + ' 周');
  }

  /* ---------- 重置:回默认演示数据 ---------- */
  function resetAll() {
    setSchool(DEF.school);
    setMajor(DEF.major);
    setGrade('大二');
    setTerm('下');
    setTermStart(DEF.termStart);
    setTermStartKeep(DEF.termStart);
    setTermWeeks(String(DEF.termWeeks));
    setAcOpen({school: false, major: false});
    setField(null);
    setView('s1');
  }

  const isMajorField = field === 'major';

  return (
    <div className={styles.root}>
      <div className={styles.stage}>

        <div className={styles.toolbar}>
          <button type="button" className={cx(styles.tbtn, view === 's1' && styles.on)} onClick={() => go('s1')}>
            ① 录入页
          </button>
          <button type="button" className={cx(styles.tbtn, view === 's3' && styles.on)} onClick={() => go('s3')}>
            ② 确认页
          </button>
          <button type="button" className={styles.tbtn} onClick={resetAll}>
            重置
          </button>
        </div>

        <div className={styles.browser}>
          <div className={styles.chrome}>
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <span className={styles.dot3} />
            <div className={styles.urlbar}>用户信息 · 录入</div>
          </div>

          <div className={styles.page}>
            <header className={styles.nav}>
              <div className={styles.logo}>
                AI 学业陪伴<span>纯软件赛道</span>
              </div>
              <div className={styles.steps}>
                <span className={cx(styles.dot, view === 's1' && styles.cur)}>1</span>
                <span>录入信息</span>
                <span className={styles.line} />
                <span className={cx(styles.dot, view === 's3' && styles.cur)}>2</span>
                <span>确认信息</span>
              </div>
              <div className={styles.spacer} />
              <div className={styles.me}>我</div>
            </header>

            <main>
              {/* ============ 一、采集页 ============ */}
              <section hidden={view !== 's1'}>
                <div className={styles.wrap}>
                  <h1>先填一下你的学籍信息</h1>
                  <p className={styles.lead}>六项就够，其余交给系统。</p>

                  <div className={styles.row}>
                    <div className={styles.k}>院校</div>
                    <div className={styles.ctrl}>
                      <div className={styles.ac}>
                        <input
                          ref={schoolRef}
                          className={cx(styles.inp, styles.text)}
                          type="text"
                          autoComplete="off"
                          placeholder="输入院校名称或简称，如：北邮"
                          value={school}
                          onFocus={() => setAcOpen(p => ({...p, school: true}))}
                          onBlur={() => onAcBlur('school')}
                          onChange={e => {
                            setSchool(e.target.value);
                            setAcOpen(p => ({...p, school: true}));
                          }}
                          onKeyDown={e => onAcKeyDown('school', e)}
                        />
                        <div className={styles.acList} hidden={!acOpen.school}>
                          {acItems(SCHOOLS, school, schoolVal, n => pickAc('school', n))}
                        </div>
                      </div>
                      <div className={styles.hint}>用于对齐院校课程难度与进度，未收录可手动填写</div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.k}>专业</div>
                    <div className={styles.ctrl}>
                      <div className={styles.ac}>
                        <input
                          ref={majorRef}
                          className={cx(styles.inp, styles.text)}
                          type="text"
                          autoComplete="off"
                          placeholder="输入专业名称或简称，如：软工"
                          value={major}
                          onFocus={() => setAcOpen(p => ({...p, major: true}))}
                          onBlur={() => onAcBlur('major')}
                          onChange={e => {
                            setMajor(e.target.value);
                            setAcOpen(p => ({...p, major: true}));
                          }}
                          onKeyDown={e => onAcKeyDown('major', e)}
                        />
                        <div className={styles.acList} hidden={!acOpen.major}>
                          {acItems(MAJORS, major, majorVal, n => pickAc('major', n))}
                        </div>
                      </div>
                      <div className={styles.hint}>用于决定技能路线与项目难度，未收录可手动填写</div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.k}>年级</div>
                    <div className={styles.ctrl}>
                      <div className={styles.seg}>
                        {GRADES.map(v => (
                          <button key={v} type="button" className={cx(grade === v && styles.on)} onClick={() => setGrade(v)}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.k}>学期</div>
                    <div className={styles.ctrl}>
                      <div className={styles.rowline}>
                        <div className={styles.seg}>
                          <button type="button" className={cx(term === '上' && styles.on)} onClick={() => setTerm('上')}>
                            上学期
                          </button>
                          <button type="button" className={cx(term === '下' && styles.on)} onClick={() => setTerm('下')}>
                            下学期
                          </button>
                        </div>
                        <span className={styles.lbl}>学期开始时间</span>
                        <input className={cx(styles.inp, styles.date)} type="date" value={termStart} onChange={onTermStartChange} />
                      </div>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.k}>每学期周数</div>
                    <div className={styles.ctrl}>
                      <div className={styles.rowline}>
                        <input
                          className={cx(styles.inp, styles.num)}
                          type="number"
                          min={12}
                          max={30}
                          step={1}
                          value={termWeeks}
                          onChange={e => setTermWeeks(e.target.value)}
                          onBlur={onWeeksBlur}
                        />
                        <span className={styles.unit}>周</span>
                        <span className={styles.note}>每学期按此周数安排课程</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <span className={styles.tip}>院校、专业、年级、学期、学期开始时间、周数，共六项</span>
                    <button type="button" className={styles.primary} onClick={nextStep}>
                      下一步 · 确认信息
                    </button>
                  </div>
                </div>
              </section>

              {/* ============ 二、确认页 ============ */}
              <section hidden={view !== 's3'}>
                <div className={styles.wrap}>
                  <h1>信息确认</h1>

                  <div className={styles.grid2} style={{marginBottom: 12}}>
                    <div className={styles.cell} onClick={() => openField('school')}>
                      <div className={styles.k}>院校</div>
                      <div className={styles.v}>{schoolVal}</div>
                      <div className={styles.sub}>{schoolSub}</div>
                      <span className={styles.edit}>修改 ›</span>
                    </div>
                    <div className={styles.cell} onClick={() => openField('major')}>
                      <div className={styles.k}>专业</div>
                      <div className={styles.v}>{majorVal}</div>
                      <div className={styles.sub}>{majorSub}</div>
                      <span className={styles.edit}>修改 ›</span>
                    </div>
                  </div>

                  <div className={cx(styles.grid2, styles.three)}>
                    <div className={styles.cell} onClick={() => openField('grade')}>
                      <div className={styles.k}>年级</div>
                      <div className={styles.v}>{grade}</div>
                      <span className={styles.edit}>修改 ›</span>
                    </div>
                    <div className={styles.cell} onClick={() => openField('term')}>
                      <div className={styles.k}>学期</div>
                      <div className={styles.v}>{term}学期</div>
                      <div className={styles.sub}>{fmtDate(termStartVal)} 开始</div>
                      <span className={styles.edit}>修改 ›</span>
                    </div>
                    <div className={styles.cell} onClick={() => openField('weeks')}>
                      <div className={styles.k}>每学期周数</div>
                      <div className={styles.v}>{weeksVal} 周 / 学期</div>
                      <span className={styles.edit}>修改 ›</span>
                    </div>
                  </div>

                  <div className={styles.nextNote}>院校与专业用于对齐课程与技能路线，其余四项用于换算学期与周数，之后可随时回来修改。</div>

                  <div className={styles.actions}>
                    <button type="button" className={cx(styles.primary, styles.ghost)} onClick={() => go('s1')}>
                      返回修改
                    </button>
                    <button type="button" className={styles.primary} onClick={() => toast('信息已保存')}>
                      确认，保存信息
                    </button>
                  </div>
                </div>
              </section>
            </main>
          </div>

          {/* ============ 字段就地编辑浮窗 ============ */}
          <div
            className={styles.modal}
            hidden={!field}
            onClick={e => {
              if (e.target === e.currentTarget) closeField();
            }}
          >
            <div className={styles.fmBox}>
              <div className={styles.fmHead}>
                <span className={styles.t}>{field ? FIELD_TITLES[field] : '修改'}</span>
                <button type="button" className={styles.x} onClick={closeField}>
                  取消 ✕
                </button>
              </div>
              <div className={styles.fmBody}>
                {(field === 'school' || field === 'major') && (
                  <>
                    <div className={styles.fmCol} style={{marginBottom: 12}}>
                      <span className={styles.lbl}>{isMajorField ? '专业名称' : '院校名称'}</span>
                      <input
                        className={cx(styles.inp, styles.text)}
                        type="text"
                        autoComplete="off"
                        placeholder={isMajorField ? '输入专业名称或简称' : '输入院校名称或简称'}
                        value={fmText}
                        onChange={e => setFmText(e.target.value)}
                      />
                    </div>
                    <div className={styles.fmList}>
                      {acItems(
                        isMajorField ? MAJORS : SCHOOLS,
                        fmText,
                        isMajorField ? majorVal : schoolVal,
                        n => {
                          setComboText(field, n);
                          setFmText(n);
                        },
                      )}
                    </div>
                    <div className={styles.fmActions} style={{marginTop: 0}}>
                      <button type="button" className={styles.primary} onClick={() => doneCombo(field)}>
                        完成
                      </button>
                    </div>
                  </>
                )}

                {field === 'grade' && (
                  <div className={styles.fmOpts}>
                    {GRADES.map(v => (
                      <button
                        key={v}
                        type="button"
                        className={cx(styles.fmOpt, grade === v && styles.sel)}
                        onClick={() => {
                          setGrade(v);
                          setField(null);
                          toast('已更新为 ' + v);
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                {field === 'term' && (
                  <>
                    <div className={styles.fmFrow}>
                      <div className={styles.seg}>
                        <button type="button" className={cx(term === '上' && styles.on)} onClick={() => setTerm('上')}>
                          上学期
                        </button>
                        <button type="button" className={cx(term === '下' && styles.on)} onClick={() => setTerm('下')}>
                          下学期
                        </button>
                      </div>
                      <div className={styles.fmCol}>
                        <span className={styles.lbl}>学期开始时间</span>
                        <input className={cx(styles.inp, styles.date)} type="date" value={termStart} onChange={onTermStartChange} />
                      </div>
                    </div>
                    <div className={styles.fmActions} style={{marginTop: 0}}>
                      <button type="button" className={styles.primary} onClick={doneTerm}>
                        完成
                      </button>
                    </div>
                  </>
                )}

                {field === 'weeks' && (
                  <>
                    <div className={styles.rowline}>
                      <input
                        className={cx(styles.inp, styles.num)}
                        type="number"
                        min={12}
                        max={30}
                        step={1}
                        value={fmWeeks}
                        onChange={e => setFmWeeks(e.target.value)}
                      />
                      <span className={styles.unit}>周 / 学期</span>
                    </div>
                    <div className={styles.fmActions}>
                      <button type="button" className={styles.primary} onClick={doneWeeks}>
                        完成
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={cx(styles.toast, toastMsg && styles.show)}>{toastMsg}</div>
        </div>
      </div>
    </div>
  );
}
