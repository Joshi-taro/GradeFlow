# Verification record

Prepared on 2026-10-22. These are observed local results, not a claim of OCI or production deployment.

| Check | Observed result |
|---|---|
| Fork lineage | GitHub API confirmed `Joshi-taro/GradeFlow` forks `prisshhhuuu/student-assignment-portal`; baseline trees identical |
| Clean `npm ci --ignore-scripts` | Passed with Node 24.15.0 / npm 12.2.1 |
| `npm run check` | Passed: ESLint, html-validate, 13 Node unit/DOM tests |
| `npm audit --omit=optional` | 0 reported vulnerabilities at verification time; not a security guarantee |
| Terraform fmt / validate | Passed using Terraform 1.16.3 and OCI provider 7.32.0 |
| `terraform test` | 3 passed, 0 failed using `mock_provider`; no OCI authentication or apply |
| Provider dependency locks | Recorded linux_amd64, linux_arm64 and windows_amd64 checksums |
| Ansible syntax | Passed using ansible-core 2.19.3 on WSL Python 3.12; no remote connection |
| Bash parsing | All four shell scripts parsed successfully with Bash |
| Docker native build | Passed on local linux/amd64 engine |
| Hardened container execution | UID/GID 101, read-only root filesystem, dropped capabilities and writable /tmp; `nginx -t` passed |
| Docker health check | Observed `healthy` |
| Container HTTP smoke | All 6 paths passed on loopback port 18081 |
| Multi-platform Docker build | Exported local OCI archive containing linux/amd64 and linux/arm64; no registry push |
| Jenkins Compose | `docker compose ... config --quiet` passed; no persistent Jenkins installation created |
| Local Kubernetes integration | kind v0.33.0 / Kubernetes v1.36.4: namespace, Service and Deployment applied; 2/2 pods ready; rollout script and all 6 HTTP smoke paths passed |
| Scoped CI credential | Generated expiring ServiceAccount kubeconfig; actual deployment/smoke ran with it; `can-i patch deployments` = yes, `can-i get secrets` = no |
| Update / rollback | Second image reference rolled out, `rollout undo` restored the original reference, rollout verification and 6-path smoke passed again. The same tested frontend image was tagged with two source commit SHAs to exercise Deployment revisions. |
| Mutable tag guard | `deploy.sh gradeflow:latest` failed before any apply as required |

Environment repairs: the system Node 20.17/npm 10 cannot run the current validator versions. Isolated Node/npm were downloaded inside ignored `.runtime`; system Node was not changed. The `desktop-linux` Docker context was unavailable; local checks explicitly used the working `default` context. A validator found an existing unescaped HTML ampersand; it was fixed. Terraform mock tests initially exposed a numeric/string mismatch in the test assertion (OCI models boot size as string); the assertion was corrected and all three passed.

Not verified here: live Jenkins declarative compilation/execution and credential/agent configuration; authenticated registry publishing/pulling; Terraform real-account plan/apply, quotas, cost/eligibility/capacity; remote Ansible installation and second-run idempotency; native Oracle ARM runtime; actual Google Apps Script CORS/permissions/quotas; notification delivery. These require the operator's environment and approvals. Mock tests do not prove cloud deployment. A multi-platform build does not prove native ARM execution. A healthy Nginx endpoint does not prove Google API availability.

Reproduce checks with the exact commands in README. Collect actual screenshots only after those steps succeed, redact student data and credentials, and record any skipped/failed checks in your submission.
