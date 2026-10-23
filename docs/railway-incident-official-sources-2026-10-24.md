# Railway security incident — official sources reviewed 24 October 2026

No credentials, tokens or account identifiers are recorded here.

Railway’s 21 October disclosure says an unauthorized party may have accessed encrypted Railway environment variables and, for some, decrypted contents. Railway recommends rolling all sensitive environment variables and reviewing provider logs.

Its preliminary report says the attack lasted from 20 October 13:58 UTC to 22 October 03:32 UTC. Railway reports that up to 1.85% of workspaces had environment variables potentially compromised, but that its targeted risk-notification group is broader because it includes workspaces whose variable names matched the attacker’s apparent search behavior. Railway’s report says individual Railway user accounts were not accessed. Railway also says existing services remained online while new builds and deployments were paused.

The status page at review time still displays the security incident as a major outage, although it states that builds and deployments are proceeding normally. Railway’s recovery guidance says that commits pushed while builds were paused were not queued; affected users must reconnect GitHub if needed and use Deploy Latest Commit.

Sources:
- https://blog.railway.com/p/security-disclosure-wednesday-october-21st
- https://blog.railway.com/p/preliminary-report-october-security-incident
- https://status.railway.com/
- https://blog.railway.com/p/security-disclosure-recommendation-recover-failing-deploys
