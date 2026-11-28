import type { AuthView } from "../routes";

type AuthTitleProps = {
  view: AuthView;
};

export default function AuthTitle(props: AuthTitleProps) {
  return (
    <h1 className="mb-5 text-3xl font-bold tracking-tight text-foreground">
      {props.view === "login" ? "欢迎回来" : "创建你的账号"}
    </h1>
  );
}
