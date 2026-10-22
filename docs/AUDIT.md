# Repository audit

Baseline: upstream/fork `abc96314f29e7d17b454dad0677621cb113f73e2` (identical at inspection).
Changes are for `Joshi-taro/GradeFlow` only. The upstream author attribution is retained.

| Finding | Effect | Repair / evidence |
|---|---|---|
| Sheet names, titles and URLs interpolated into `innerHTML` | Stored HTML/script injection and executable `javascript:` links | Escape text/attributes and allow only absolute HTTP(S) links; pure and DOM regression tests |
| No HTTP status check; non-array response becomes `[]` | Apps Script errors appear as a successful empty sync | Reject non-2xx and malformed payloads; DOM failure/retry tests |
| Unguarded `JSON.parse(localStorage...)` | Corrupt storage breaks rendering/opening assignments | Validated, exception-safe counters; tests include malformed/blocked storage |
| Comparator returns -1 for both orders when two rows belong to frequent student | Incorrect sorting | Compare highlight priority then date, without mutating input; regression test |
| Missing/invalid dates become current time or NaN | Invented submission times | Show `Time unavailable`; clamp future relative times; unit test |
| Unconditional GSAP global access | CDN failure prevents API initialization | Animation is optional; DOM tests run without GSAP |
| No timeout or refresh race handling | Hanging loads and stale responses overwriting newer results | 15-second abort and request sequence guard; regression tests |
| `target=_blank` and `window.open` without isolation | Opener access risk | `noopener,noreferrer` |
| Empty results have no message; sync initially says Just now | Misleading state | Explicit empty, loading, failure and successful sync states |
| Workflow only greps for tag text and file presence | Broken JS, HTML and runtime behavior pass | ESLint, HTML validator, Node unit/DOM tests, Terraform mocks and Ansible syntax checks |
| Slack job reads its own `job.status`, not validation outcome; claims Netlify deployment | Misleading deployment success | Remove old notifier; optional Jenkins notifier reports actual build and verified rollout status |
| No Netlify configuration/deploy step or deployment evidence in source | Cannot verify existing Netlify integration/account settings | Existing external Netlify site may remain separately configured; no claim that this pipeline deploys there |

`mockSubmissions` was unused demonstration data and was removed. The layout, styling, real API endpoint, Google Form header mapping, recent activity, refresh, frequent-student highlighting and assignment opening are preserved. The footer's raw ampersand was repaired after HTML validation failed.

The Apps Script source, Form, Sheet and access policies are **not in this repository**. Nothing here authenticates users, submits assignments, assigns marks, grades work or stores grades. The application is a submission viewer. `localStorage` is browser-local personalization, not an identity system. Do not expose private student data through an anonymous Sheet API; the owner must choose the access policy and permitted dataset.

Known limits: DOM tests use jsdom, not a full browser; real Google CORS/redirect/permission behavior, CDN availability, ARM runtime execution, OCI eligibility/capacity and live Jenkins/K3s behavior need the documented integration checks. External fonts/icons/animation libraries remain network dependencies.
