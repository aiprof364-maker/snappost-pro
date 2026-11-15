import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatReferralCredit } from "@shared/referrals";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReferralPanel() {
  const referral = trpc.account.referral.useQuery();
  const [copied, setCopied] = useState(false);
  const data = referral.data;
  if (!data) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      toast.success("Referral link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Select it and copy it manually.");
    }
  };

  const credit = formatReferralCredit(data.paidCreditCents);
  const applied = formatReferralCredit(data.stats.creditAppliedCents);

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold">Invite another business</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Share your link. When a new business creates an account, you get{" "}
        {data.signupBonusPosts} extra free posts, up to {data.maxSignupBonuses}{" "}
        signups. Extra posts are added to the free allowance. When they become
        a paying customer, you get {credit} off a future invoice. A trial by
        itself does not count.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={data.url}
          aria-label="Your referral link"
          className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"
          onFocus={event => event.currentTarget.select()}
        />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Signups</dt>
          <dd className="text-lg font-semibold">{data.stats.signups}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Extra free posts</dt>
          <dd className="text-lg font-semibold">{data.stats.bonusPostsEarned}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paying customers</dt>
          <dd className="text-lg font-semibold">{data.stats.payingReferrals}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Invoice credit</dt>
          <dd className="text-lg font-semibold">{applied}</dd>
        </div>
      </dl>
      {data.stats.creditsWaiting > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {data.stats.creditsWaiting === 1
            ? "One credit is waiting"
            : `${data.stats.creditsWaiting} credits are waiting`}{" "}
          for a Stripe billing account. It is applied to your balance when you
          start or renew a subscription.
        </p>
      )}
    </section>
  );
}
