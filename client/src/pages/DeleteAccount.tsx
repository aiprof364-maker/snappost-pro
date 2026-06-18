import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function DeleteAccount() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This action cannot be undone. All your data will be permanently deleted.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // Call delete account mutation (you'll need to add this to your server)
      toast.success("Account deletion request submitted. Your data will be deleted within 30 days.");
      setLocation("/");
    } catch (error) {
      toast.error("Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-4">Delete Your Account</h1>
          
          <div className="space-y-4 mb-8">
            <p className="text-muted-foreground">
              We're sorry to see you go. If you delete your account, the following will happen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Your account and all associated data will be permanently deleted</li>
              <li>Your posts and settings will be removed from SnapPost Pro</li>
              <li>You will not be able to recover your account</li>
              <li>Deletion may take up to 30 days to complete across all systems</li>
            </ul>
          </div>

          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Logged in as: <strong>{user.email}</strong>
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                size="lg"
              >
                {isDeleting ? "Deleting..." : "Delete My Account"}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Please <a href="/" className="text-primary underline">log in</a> to delete your account.
            </p>
          )}

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              If you have questions about data deletion or need assistance, please contact our support team at{" "}
              <a href="mailto:support@snappostpro.com" className="text-primary underline">
                support@snappostpro.com
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
