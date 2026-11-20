/** 注册视图的顶部错误条（AuthTopError），账户名已存在文案可点击切回登录并带入账户名。 */
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AuthTopError as AuthTopErrorKey } from "../errors";

type AuthTopErrorProps = {
  topError: AuthTopErrorKey;
  text: string;
  onSwitchToLogin: () => void;
};

export default function AuthTopError(props: AuthTopErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      {props.topError === "auth.error.usernameRegistered" ? (
        <Button
          type="button"
          variant="link"
          onClick={props.onSwitchToLogin}
          className="h-auto p-0 text-destructive"
        >
          {props.text}
        </Button>
      ) : (
        props.text
      )}
    </Alert>
  );
}
