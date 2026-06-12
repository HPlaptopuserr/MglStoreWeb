import LoginHero from "@/components/login/LoginHero";
import LoginPanel from "@/components/login/LoginPanel";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[0.95fr_1.05fr]">
      <LoginHero />
      <LoginPanel />
    </main>
  );
}
