/** 顶部错误提示（ErrorAlert）：「账户名已存在」文案可点击切回登录并带入账户名，其余为纯文案。 */
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AuthTopError } from "../forms";

type ErrorAlertProps = {
  errorKey: AuthTopError;
  text: string;
  onSwitchToLogin: () => void;
};

export default function ErrorAlert(props: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      {props.errorKey === "auth.error.usernameRegistered" ? (
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
