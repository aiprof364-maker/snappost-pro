import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    verifyMutation.mutate(
      { token },
      {
        onSuccess: (data) => {
          setStatus("success");
          setMessage(`Email verified! Welcome, ${data.email}`);
          setTimeout(() => window.location.href = "/dashboard", 2000);
        },
        onError: (error) => {
          setStatus("error");
          setMessage(error.message || "Verification failed. Token may be expired.");
        },
      }
    );
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Spinner />
            <p className="text-center text-muted-foreground">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl text-green-600">✓</span>
            </div>
            <h2 className="text-2xl font-bold">Email Verified!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl text-red-600">✕</span>
            </div>
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => window.location.href = "/"} className="mt-4">
              Back to Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
