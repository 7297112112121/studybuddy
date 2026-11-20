import {
  AuroraBackground,
  AuthRedirect,
  PromoColumn,
  getCurrentSession,
} from "@/modules/auth";

export const instant = false;

export default async function AuthLayout(props: LayoutProps<"/">) {
  const session = await getCurrentSession();
  if (session) {
    return <AuthRedirect />;
  }
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <AuroraBackground />

      <div className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-2 lg:gap-10">
        <PromoColumn />
        {props.children}
      </div>
    </main>
  );
}
