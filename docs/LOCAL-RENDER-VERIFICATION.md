# Local + Render verification record

Prepared 2026-10-22. This record distinguishes offline/local checks from account-dependent deployment.

| Check | Observed result |
|---|---|
| Frontend and Render regression suite | Node 24.15.0: 18 passed, 0 failed (13 preserved frontend tests + 5 Render guard/failure tests) |
| ESLint and HTML validation | Passed |
| Local Terraform | fmt, validate and 1 mocked Docker-provider test passed; Linux amd64/arm64 and Windows checksums locked |
| Legacy OCI Terraform mocks | 3 passed; no OCI credentials or resource operations |
| Local Ansible | Syntax check passed with ansible-core 2.19.3 / WSL Python 3.12 |
| Shell and YAML | All shell scripts parsed; Ansible, Render and Actions YAML parsed |
| kind integration and Ansible idempotency | Automated disposable-runner job added; record actual PR result before claiming success |
| Jenkins declarative execution | Requires your local controller, plugins, agent and job setup; not executed here |
| Terraform local apply | Not executed; operator must review and explicitly approve the saved plan |
| Render account / credentials / API deployment | Not configured, no requests sent to authenticated Render API |
| Public HTTPS URL and live Google API | Not verified; requires your initial publication approval and actual service URL |

An initial test attempt used system Node 20 and failed because the existing HTML validator requires newer filesystem APIs. Re-running with pinned Node 24 passed; no frontend workaround was introduced. Render client tests use injected HTTP fixtures, never tokens or real deployments. Vendor documentation and the current Render OpenAPI schema were consulted for commit-pinned deployment and service checks.

The previous [verification record](VERIFICATION.md) documents the unchanged image's hardened Docker execution, multiarchitecture build, kind rollout and rollback. Those historical results do not establish this new Jenkins/Render pipeline is deployed.

After completing README steps, append the Jenkins build number, tested Git SHA, two ready pod result, Ansible second-run changed count, Render deployment ID, public URL smoke result and date. Capture screenshots only from actual successful steps. Do not record secrets or student data.
