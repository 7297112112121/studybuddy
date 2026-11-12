/**
 * US-09 登录注册 · 低保真线框(登录 / 注册 / 找回密码 · 网页端)
 * 由原独立 HTML 原型迁移:外观与交互 1:1 保留,原生 JS DOM 操作改写为 React 状态与钩子。
 * 演示态工具条:① 登录 ② 校验失败 ③ 登录中 ④ 注册 ⑤ 验证码已发送 ⑥ 找回密码 + 重置。
 */
import {useEffect, useRef, useState} from 'react';
import styles from './us09Auth.module.css';

type View = 'login' | 'register' | 'reset';
type LoadingKey = 'login' | 'reg' | 'reset' | null;
type ErrKey = 'acct' | 'pwd' | 'regPhone' | 'regCode' | 'regPwd' | 'regPwd2';

const TITLES: Record<View, string> = {login: '登录', register: '注册', reset: '找回密码'};

/* ---------- 校验规则(与原原型一致) ---------- */
const RE_PHONE = /^1[3-9]\d{9}$/;
const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_CODE = /^\d{6}$/;
const RE_PWD = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;

const DEMOS: {key: string; view: View; demo?: string; label: string}[] = [
  {key: 'login', view: 'login', label: '① 登录'},
  {key: 'error', view: 'login', demo: 'error', label: '② 登录 · 校验失败'},
  {key: 'loading', view: 'login', demo: 'loading', label: '③ 登录中'},
  {key: 'register', view: 'register', label: '④ 注册'},
  {key: 'sent', view: 'register', demo: 'sent', label: '⑤ 注册 · 验证码已发送'},
  {key: 'reset', view: 'reset', label: '⑥ 找回密码'},
];

/** 60 秒验证码倒计时(setTimeout 链,自动清理) */
function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      setLeft(null);
      return;
    }
    const h = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(h);
  }, [left]);
  return {left, start: (n: number) => setLeft(n), stop: () => setLeft(null)};
}

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function Us09AuthWireframe() {
  /* ---------- 视图与演示态 ---------- */
  const [view, setView] = useState<View>('login');
  const [toolbarOn, setToolbarOn] = useState<string>('login');

  /* ---------- 受控表单 ---------- */
  const [acct, setAcct] = useState('');
  const [pwd, setPwd] = useState('');
  const [agreeLogin, setAgreeLogin] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [regPwd2, setRegPwd2] = useState('');
  const [agreeReg, setAgreeReg] = useState(false);
  const [rsPhone, setRsPhone] = useState('');
  const [rsCode, setRsCode] = useState('');
  const [rsPwd, setRsPwd] = useState('');

  /* ---------- 密码可见性 ---------- */
  const [eye, setEye] = useState({pwd: false, regPwd: false, rsPwd: false});

  /* ---------- 校验错误态 ---------- */
  const [errs, setErrs] = useState<Partial<Record<ErrKey, string>>>({});
  const [agreeBad, setAgreeBad] = useState({login: false, reg: false});
  const [loginAlert, setLoginAlert] = useState(false);

  /* ---------- 提交加载 / 轻提示 ---------- */
  const [loading, setLoading] = useState<LoadingKey>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------- 验证码倒计时(注册 / 找回各一路) ---------- */
  const regCd = useCountdown();
  const rsCd = useCountdown();
  const [regSent, setRegSent] = useState(false);
  const [rsSent, setRsSent] = useState(false);

  /* 卸载时清理所有计时器 */
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(loadTimer.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  }

  function fail(k: ErrKey, msg: string) {
    setErrs(prev => ({...prev, [k]: msg}));
  }

  function clearErr() {
    setErrs({});
    setAgreeBad({login: false, reg: false});
    setLoginAlert(false);
  }

  function cancelLoading() {
    clearTimeout(loadTimer.current);
    setLoading(null);
  }

  /* ---------- 校验(失焦/提交即校验,不改输入内容) ---------- */
  function vLogin(): boolean {
    let ok = true;
    const e: Partial<Record<ErrKey, string>> = {};
    const a = acct.trim();
    if (!a) {
      e.acct = '请输入手机号或邮箱';
      ok = false;
    } else if (!RE_PHONE.test(a) && !RE_MAIL.test(a)) {
      e.acct = '格式不对:手机号 11 位,或 name@mail.com';
      ok = false;
    }
    if (!pwd) {
      e.pwd = '请输入密码';
      ok = false;
    } else if (!RE_PWD.test(pwd)) {
      e.pwd = '密码为 8—20 位,需含字母与数字';
      ok = false;
    }
    let agreeOk = true;
    if (!agreeLogin) {
      agreeOk = false;
      ok = false;
    }
    setErrs(e);
    setAgreeBad(prev => ({...prev, login: !agreeOk}));
    if (!ok) setLoginAlert(true);
    return ok;
  }

  function vReg(): boolean {
    let ok = true;
    const e: Partial<Record<ErrKey, string>> = {};
    if (!RE_PHONE.test(regPhone.trim())) {
      e.regPhone = '请输入 11 位有效手机号';
      ok = false;
    }
    if (!RE_CODE.test(regCode.trim())) {
      e.regCode = '请输入 6 位数字验证码';
      ok = false;
    }
    if (!RE_PWD.test(regPwd)) {
      e.regPwd = '密码为 8—20 位,需含字母与数字';
      ok = false;
    }
    if (regPwd2 !== regPwd || !regPwd2) {
      e.regPwd2 = '两次输入的密码不一致';
      ok = false;
    }
    let agreeOk = true;
    if (!agreeReg) {
      agreeOk = false;
      ok = false;
    }
    setErrs(e);
    setAgreeBad(prev => ({...prev, reg: !agreeOk}));
    return ok;
  }

  /* ---------- 提交:换文案 + 旋转指示,1.1s 后轻提示 ---------- */
  function startLoad(which: Exclude<LoadingKey, null>, doneMsg: string) {
    setLoading(which);
    loadTimer.current = setTimeout(() => {
      setLoading(null);
      toast(doneMsg);
    }, 1100);
  }

  function submitLogin(ev: React.FormEvent) {
    ev.preventDefault();
    cancelLoading();
    clearErr();
    if (!vLogin()) return;
    startLoad('login', '登录成功 —— 原型内不跳转,真实流程进「工作台」');
  }

  function submitReg(ev: React.FormEvent) {
    ev.preventDefault();
    cancelLoading();
    clearErr();
    if (!vReg()) return;
    startLoad('reg', '注册成功 —— 真实流程直接进「工作台」,先走 US-01 信息录入');
  }

  function submitReset(ev: React.FormEvent) {
    ev.preventDefault();
    cancelLoading();
    if (!RE_PHONE.test(rsPhone.trim())) {
      toast('请输入 11 位有效手机号');
      return;
    }
    if (!RE_CODE.test(rsCode.trim())) {
      toast('请输入 6 位数字验证码');
      return;
    }
    if (!RE_PWD.test(rsPwd)) {
      toast('新密码为 8—20 位,需含字母与数字');
      return;
    }
    startLoad('reset', '密码已重设,请用新密码登录');
  }

  /* ---------- 显示密码 ---------- */
  function toggleEye(k: keyof typeof eye) {
    setEye(prev => ({...prev, [k]: !prev[k]}));
  }

  /* ---------- 验证码:先校验手机号,再进入 60 秒倒计时 ---------- */
  function sendCode(which: 'reg' | 'rs') {
    const phone = (which === 'reg' ? regPhone : rsPhone).trim();
    if (!RE_PHONE.test(phone)) {
      toast('先填 11 位手机号再获取验证码');
      return;
    }
    if (which === 'reg') {
      regCd.start(60);
      setRegSent(true);
    } else {
      rsCd.start(60);
      setRsSent(true);
    }
    toast('验证码已发送,请查看手机短信(原型不发真实短信)');
  }

  /* ---------- 视图切换(表单值保留,仅清错误) ---------- */
  function goto(v: View) {
    cancelLoading();
    clearErr();
    setView(v);
  }

  /* ---------- 演示态(工具条点选时套用) ---------- */
  function applyDemo(demo?: string) {
    if (demo === 'error') {
      setAcct('1380013');
      setPwd('abc123');
      setAgreeLogin(false);
      setErrs({
        acct: '格式不对:手机号 11 位,或 name@mail.com',
        pwd: '密码为 8—20 位,需含字母与数字',
      });
      setAgreeBad(prev => ({...prev, login: true}));
      setLoginAlert(true);
    } else if (demo === 'loading') {
      setAcct('13800138000');
      setPwd('study2026');
      setAgreeLogin(true);
      setLoading('login');
    } else if (demo === 'sent') {
      setRegPhone('13800138000');
      setRegCode('');
      setRegSent(true);
      regCd.start(52);
      toast('倒计时演示:60 秒后可重发');
    }
  }

  function onToolbar(key: string) {
    const d = DEMOS.find(x => x.key === key);
    if (!d) return;
    cancelLoading();
    clearErr();
    setView(d.view);
    setToolbarOn(key);
    applyDemo(d.demo);
  }

  /* ---------- 重置 ---------- */
  function resetAll() {
    cancelLoading();
    setAcct('');
    setPwd('');
    setAgreeLogin(false);
    setRegPhone('');
    setRegCode('');
    setRegPwd('');
    setRegPwd2('');
    setAgreeReg(false);
    setRsPhone('');
    setRsCode('');
    setRsPwd('');
    setEye({pwd: false, regPwd: false, rsPwd: false});
    setRegSent(false);
    setRsSent(false);
    regCd.stop();
    rsCd.stop();
    clearErr();
    setView('login');
    setToolbarOn('login');
  }

  const sendLabel = (cd: {left: number | null}, sent: boolean) =>
    cd.left !== null ? `${cd.left} 秒后重发` : sent ? '重新发送' : '获取验证码';

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
            <div className={styles.urlbar}>AI 学业陪伴 · {TITLES[view]}</div>
          </div>

          <div className={styles.auth}>
            {/* ===== 左:品牌区 ===== */}
            <aside className={styles.brand}>
              <div className={styles.logo}>
                AI 学业陪伴<span>纯软件赛道</span>
              </div>
              <h2>
                你的规划、任务和情绪
                <br />
                都在一个账号里
              </h2>
              <p className={styles.lead}>登录后接着上次的进度继续,换设备也一样。</p>
              <ol>
                <li>
                  <span className={styles.no}>1</span>
                  <span>
                    <b>规划不断档</b>　课程池、课程规划、日历本都在账号下,换设备不重来。
                  </span>
                </li>
                <li>
                  <span className={styles.no}>2</span>
                  <span>
                    <b>进度自己记</b>　打卡与自测结果自动回写,不用手工维护计划表。
                  </span>
                </li>
                <li>
                  <span className={styles.no}>3</span>
                  <span>
                    <b>陪伴有记忆</b>　长期记忆记住你的节奏与卡点,越用越懂你。
                  </span>
                </li>
              </ol>
              <div className={styles.foot}>
                账号只用于保存你的学习数据
                <br />
                本期不支持企业 / 高校账号对接
              </div>
            </aside>

            {/* ===== 右:表单区 ===== */}
            <section className={styles.formWrap}>
              <div className={styles.card}>
                <div className={styles.seg} role="tablist" aria-label="登录或注册" hidden={view === 'reset'}>
                  <button type="button" role="tab" aria-selected={view === 'login'} aria-controls="paneLogin" onClick={() => goto('login')}>
                    登录
                  </button>
                  <button type="button" role="tab" aria-selected={view === 'register'} aria-controls="paneReg" onClick={() => goto('register')}>
                    注册
                  </button>
                </div>

                <div className={styles.resetHead} hidden={view !== 'reset'}>
                  <h3>找回密码</h3>
                  <p>手机号验证后重设密码,原学习数据不受影响。</p>
                </div>

                {/* ---------- 登录 ---------- */}
                <form id="paneLogin" noValidate hidden={view !== 'login'} onSubmit={submitLogin}>
                  <div className={styles.formAlert} role="alert" hidden={!loginAlert}>
                    <span className={styles.ic}>!</span>
                    <span>有 2 项没填对,改完再点登录。</span>
                  </div>

                  <div className={cx(styles.fld, errs.acct && styles.bad)}>
                    <label htmlFor="acct">手机号 / 邮箱</label>
                    <div className={styles.ipt}>
                      <input
                        id="acct"
                        type="text"
                        inputMode="text"
                        autoComplete="username"
                        placeholder="13800138000 或 name@mail.com"
                        aria-describedby="acctErr"
                        aria-invalid={errs.acct ? true : undefined}
                        value={acct}
                        onChange={e => setAcct(e.target.value)}
                      />
                    </div>
                    <p className={styles.err} id="acctErr" hidden={!errs.acct}>
                      {errs.acct}
                    </p>
                  </div>

                  <div className={cx(styles.fld, errs.pwd && styles.bad)}>
                    <div className={styles.rowLab}>
                      <label htmlFor="pwd">密码</label>
                      <span className={styles.grow} />
                      <button type="button" className={styles.link} onClick={() => goto('reset')}>
                        忘记密码?
                      </button>
                    </div>
                    <div className={cx(styles.ipt, styles.hasEye)}>
                      <input
                        id="pwd"
                        type={eye.pwd ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="8 位以上,含字母与数字"
                        aria-describedby="pwdErr"
                        aria-invalid={errs.pwd ? true : undefined}
                        value={pwd}
                        onChange={e => setPwd(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.eye}
                        aria-label={eye.pwd ? '隐藏密码' : '显示密码'}
                        onClick={() => toggleEye('pwd')}
                      >
                        {eye.pwd ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <p className={styles.err} id="pwdErr" hidden={!errs.pwd}>
                      {errs.pwd}
                    </p>
                  </div>

                  <label className={cx(styles.agree, agreeBad.login && styles.bad)}>
                    <input type="checkbox" checked={agreeLogin} onChange={e => setAgreeLogin(e.target.checked)} />
                    <span>
                      我已阅读并同意
                      <a href="#" onClick={e => e.preventDefault()}>
                        《用户协议》
                      </a>
                      与
                      <a href="#" onClick={e => e.preventDefault()}>
                        《隐私政策》
                      </a>
                    </span>
                  </label>

                  <button className={cx(styles.primary, loading === 'login' && styles.isLoading)} type="submit" disabled={loading === 'login'}>
                    <span className={styles.sp} aria-hidden="true" />
                    <span className="tx">{loading === 'login' ? '登录中…' : '登录'}</span>
                  </button>

                  <p className={styles.swap}>
                    还没有账号?
                    <button type="button" onClick={() => goto('register')}>
                      注册一个
                    </button>
                  </p>
                </form>

                {/* ---------- 注册 ---------- */}
                <form id="paneReg" noValidate hidden={view !== 'register'} onSubmit={submitReg}>
                  <div className={cx(styles.fld, errs.regPhone && styles.bad)}>
                    <label htmlFor="regPhone">手机号</label>
                    <div className={styles.ipt}>
                      <input
                        id="regPhone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        autoComplete="tel"
                        placeholder="11 位手机号,用作登录账号"
                        aria-describedby="regPhoneErr"
                        aria-invalid={errs.regPhone ? true : undefined}
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                      />
                    </div>
                    <p className={styles.err} id="regPhoneErr" hidden={!errs.regPhone}>
                      {errs.regPhone}
                    </p>
                  </div>

                  <div className={cx(styles.fld, errs.regCode && styles.bad)}>
                    <label htmlFor="regCode">验证码(本期不做,只占位)</label>
                    <div className={cx(styles.ipt, styles.hasSend)}>
                      <input
                        id="regCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位数字"
                        aria-describedby="regCodeErr codeHint"
                        aria-invalid={errs.regCode ? true : undefined}
                        value={regCode}
                        onChange={e => setRegCode(e.target.value)}
                      />
                      <button type="button" className={styles.send} disabled={regCd.left !== null} onClick={() => sendCode('reg')}>
                        {sendLabel(regCd, regSent)}
                      </button>
                    </div>
                    <p className={styles.hint} id="codeHint">
                      同一号码 60 秒内只能发送一次
                    </p>
                    <p className={styles.err} id="regCodeErr" hidden={!errs.regCode}>
                      {errs.regCode}
                    </p>
                  </div>

                  <div className={cx(styles.fld, errs.regPwd && styles.bad)}>
                    <label htmlFor="regPwd">设置密码</label>
                    <div className={cx(styles.ipt, styles.hasEye)}>
                      <input
                        id="regPwd"
                        type={eye.regPwd ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="8 位以上,含字母与数字"
                        aria-describedby="regPwdErr regPwdHint"
                        aria-invalid={errs.regPwd ? true : undefined}
                        value={regPwd}
                        onChange={e => setRegPwd(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.eye}
                        aria-label={eye.regPwd ? '隐藏密码' : '显示密码'}
                        onClick={() => toggleEye('regPwd')}
                      >
                        {eye.regPwd ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <p className={styles.hint} id="regPwdHint">
                      长度 8—20 位,需同时含字母与数字
                    </p>
                    <p className={styles.err} id="regPwdErr" hidden={!errs.regPwd}>
                      {errs.regPwd}
                    </p>
                  </div>

                  <div className={cx(styles.fld, errs.regPwd2 && styles.bad)}>
                    <label htmlFor="regPwd2">确认密码</label>
                    <div className={styles.ipt}>
                      <input
                        id="regPwd2"
                        type="password"
                        autoComplete="new-password"
                        placeholder="再输一次"
                        aria-describedby="regPwd2Err"
                        aria-invalid={errs.regPwd2 ? true : undefined}
                        value={regPwd2}
                        onChange={e => setRegPwd2(e.target.value)}
                      />
                    </div>
                    <p className={styles.err} id="regPwd2Err" hidden={!errs.regPwd2}>
                      {errs.regPwd2}
                    </p>
                  </div>

                  <label className={cx(styles.agree, agreeBad.reg && styles.bad)}>
                    <input type="checkbox" checked={agreeReg} onChange={e => setAgreeReg(e.target.checked)} />
                    <span>
                      我已阅读并同意
                      <a href="#" onClick={e => e.preventDefault()}>
                        《用户协议》
                      </a>
                      与
                      <a href="#" onClick={e => e.preventDefault()}>
                        《隐私政策》
                      </a>
                    </span>
                  </label>

                  <button className={cx(styles.primary, loading === 'reg' && styles.isLoading)} type="submit" disabled={loading === 'reg'}>
                    <span className={styles.sp} aria-hidden="true" />
                    <span className="tx">{loading === 'reg' ? '注册中…' : '注册并进入'}</span>
                  </button>

                  <p className={styles.swap}>
                    已经有账号了?
                    <button type="button" onClick={() => goto('login')}>
                      去登录
                    </button>
                  </p>
                </form>

                {/* ---------- 找回密码 ---------- */}
                <form noValidate hidden={view !== 'reset'} onSubmit={submitReset}>
                  <div className={styles.fld}>
                    <label htmlFor="rsPhone">注册手机号</label>
                    <div className={styles.ipt}>
                      <input
                        id="rsPhone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="11 位手机号"
                        value={rsPhone}
                        onChange={e => setRsPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.fld}>
                    <label htmlFor="rsCode">验证码</label>
                    <div className={cx(styles.ipt, styles.hasSend)}>
                      <input
                        id="rsCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位数字"
                        value={rsCode}
                        onChange={e => setRsCode(e.target.value)}
                      />
                      <button type="button" className={styles.send} disabled={rsCd.left !== null} onClick={() => sendCode('rs')}>
                        {sendLabel(rsCd, rsSent)}
                      </button>
                    </div>
                  </div>

                  <div className={styles.fld}>
                    <label htmlFor="rsPwd">新密码</label>
                    <div className={cx(styles.ipt, styles.hasEye)}>
                      <input
                        id="rsPwd"
                        type={eye.rsPwd ? 'text' : 'password'}
                        placeholder="8 位以上,含字母与数字"
                        value={rsPwd}
                        onChange={e => setRsPwd(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.eye}
                        aria-label={eye.rsPwd ? '隐藏密码' : '显示密码'}
                        onClick={() => toggleEye('rsPwd')}
                      >
                        {eye.rsPwd ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <p className={styles.hint}>重设后其他设备需重新登录</p>
                  </div>

                  <button className={cx(styles.primary, loading === 'reset' && styles.isLoading)} type="submit" disabled={loading === 'reset'}>
                    <span className={styles.sp} aria-hidden="true" />
                    <span className="tx">{loading === 'reset' ? '提交中…' : '重设密码'}</span>
                  </button>

                  <p className={styles.swap}>
                    <button type="button" onClick={() => goto('login')}>
                      ‹ 返回登录
                    </button>
                  </p>
                </form>

                <div className={styles.oauth}>
                  <b>其他登录方式</b>
                  <div className={styles.row}>
                    <button type="button" disabled>
                      微信登录
                    </button>
                    <button type="button" disabled>
                      手机号一键登录
                    </button>
                  </div>
                  <span>本期不做,仅占位</span>
                </div>
              </div>
            </section>
          </div>

          <div className={cx(styles.toast, toastMsg && styles.show)} role="status" aria-live="polite">
            {toastMsg}
          </div>
        </div>
      </div>
    </div>
  );
}
