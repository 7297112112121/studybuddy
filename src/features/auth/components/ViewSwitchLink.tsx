
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AuthView } from "./AuthTabs";

type ViewSwitchLinkProps = {
  target: AuthView;
  prefix: string;
  onSwitch: (view: AuthView) => void;
  children: ReactNode;
};

export default function ViewSwitchLink(props: ViewSwitchLinkProps) {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      {props.prefix}
      <Button
        type="button"
        variant="link"
        onClick={() => props.onSwitch(props.target)}
        className="ml-1 h-auto p-0"
      >
        {props.children}
      </Button>
    </p>
  );
}
