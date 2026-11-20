/** 登录/注册屏的 aurora 背景层：纯装饰，不参与交互与可访问性树。 */
export default function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-aurora-aqua/30 blur-3xl" />
      <div className="absolute top-1/4 right-1/3 size-96 rounded-full bg-aurora-indigo/30 blur-3xl" />
      <div className="absolute -bottom-44 -right-24 size-[30rem] rounded-full bg-aurora-magenta/25 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 size-72 rounded-full bg-aurora-indigo-deep/40 blur-3xl" />
      <div className="absolute top-1/2 -left-16 size-80 rounded-full bg-aurora-magenta-deep/20 blur-3xl" />
      <div className="aurora-veil absolute inset-0" />
      <div className="absolute inset-0 bg-aurora-ink/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--aurora-ink)_100%)]" />
    </div>
  );
}
