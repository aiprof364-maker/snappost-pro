import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const query = new URLSearchParams(window.location.search);
  const next = query.get("next") || "/dashboard";
  const requestLink = trpc.auth.requestSignInLink.useMutation({
    onSuccess: () => {
      setSent(true);
      setCooldown(60);
    },
    onError: error => setMessage(error.message),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestSignInLink = () => {
    setMessage("");
    requestLink.mutate({ email, origin: window.location.origin, next });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    requestSignInLink();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#e9e7ff_0,transparent_32%),linear-gradient(135deg,#fafbff,#f7f6ee)] px-5 py-12 text-slate-950">
      <section className="mx-auto max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 shadow-xl shadow-slate-900/10 backdrop-blur">
        <Link href="/" className="text-sm font-bold text-primary">← SnapPost Pro</Link>
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Mail className="h-6 w-6" /></div>
        <h1 className="mt-5 text-3xl font-black tracking-tight">Sign in securely</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your email and we’ll send a one-time sign-in link. No Manus account is needed.</p>
        {sent ? (
          <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
            <div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0" /><div><p><strong>Check your inbox.</strong><br />Your secure sign-in link expires in 15 minutes.</p><p className="mt-3 text-emerald-800">No email after two minutes? Check spam, then request another link.</p><Button type="button" variant="outline" className="mt-3 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100" disabled={cooldown > 0 || requestLink.isPending} onClick={requestSignInLink}>{cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend sign-in link"}</Button>{message && <p className="mt-3 text-destructive">{message}</p>}</div></div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">Email address<Input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@yourbusiness.com" className="mt-2 h-12" /></label>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button type="submit" className="h-12 w-full text-base font-bold" disabled={requestLink.isPending}>
              {requestLink.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Email me a sign-in link"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
