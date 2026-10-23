const FALLBACK_ADMIN_EMAIL = "admin@snappostpro.com";

export function configuredAdminEmail() {
  return (
    process.env.ADMIN_EMAIL ??
    process.env.OWNER_EMAIL ??
    FALLBACK_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();
}

export function isConfiguredAdminEmail(email: string) {
  return email.trim().toLowerCase() === configuredAdminEmail();
}
