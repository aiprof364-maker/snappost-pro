import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container max-w-xl">
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </span>
              <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
                Get in touch
              </h1>
              <p className="mt-3 text-muted-foreground">
                Questions about SnapPost Pro? Send us a message and we'll get
                back to you.
              </p>
            </div>

            {sent ? (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <h2 className="font-display text-xl font-bold">Message sent</h2>
                <p className="text-muted-foreground">
                  Thanks for reaching out. We'll reply to your email soon.
                </p>
                <Button variant="outline" onClick={() => setSent(false)}>
                  Send another
                </Button>
              </div>
            ) : (
              <form
                className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
                onSubmit={e => {
                  e.preventDefault();
                  submit.mutate({ name, email, message });
                }}
              >
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send message"
                  )}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
