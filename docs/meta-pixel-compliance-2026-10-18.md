# Meta Pixel compliance check — 18 October 2026

The planned tracking update retains the existing consent gate for all browser-side Meta Pixel events. It adds first-party database-only funnel telemetry and does not send email addresses, event URLs containing PII, financial information, or other prohibited information to Meta.

- Meta requires a lawful basis and any needed consent before sharing information with Meta Business Tools. The page specifically says the Meta Pixel must not share data until a person has accepted cookies where consent is required.
- Meta defines `Lead` as a person submitting information with the understanding they may be contacted later, and `CompleteRegistration` as information submitted in exchange for a business service. The current consent-gated use of those events remains appropriate for a successful magic-link request and a completed new account.

Sources:

- https://www.facebook.com/business/help/363303621411154
- https://www.facebook.com/business/help/402791146561655
