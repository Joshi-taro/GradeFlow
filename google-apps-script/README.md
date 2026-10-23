# Own your GradeFlow Google integration

This is a new backend you deploy under **your Google account**. Nothing here transfers or accesses the previous developer's Google files. Their inaccessible Drive links cannot be repaired by changing the API URL: create your own synthetic demo submissions and replace those links.

## Contract and privacy model

`doGet()` returns a JSON array. Each published record has exactly these four keys:

```json
[
  {
    "Timestamp": "2026-10-23T12:00:00.000Z",
    "Student Name": "Demo Student 01",
    "Assignment Name": "Demo Lab 01",
    "Submission Link (Google Drive / GitHub Link)": "https://github.com/Joshi-taro/GradeFlow/blob/main/README.md"
  }
]
```

This is an illustrative synthetic record, **not evidence of a live submission**. Header-only or wholly unapproved data returns `[]`. Backend/configuration errors return `{"error":{"code":"BACKEND_UNAVAILABLE","message":"..."}}`; the existing frontend rejects non-array payloads and displays Retry. Apps Script ContentService does not provide arbitrary HTTP status controls, so an application error can arrive with HTTP 200. Checking HTTP status alone is insufficient.

The public endpoint executes as you and deliberately exposes approved rows to **anyone**, including readers outside GradeFlow. The endpoint URL is not a password. There is no authentication for private students in this architecture. Only synthetic names, assignments and reviewed demo links belong here. The checkbox is a publication control, not automatic anonymization or consent verification. Once published, data may have been copied even if you later uncheck it.

The Sheet stays private. The script has only `spreadsheets.readonly`, uses the Advanced Sheets API, and has no Drive, Forms, email, write or external-fetch permission. That read scope covers spreadsheets the authorizing account can access; it is not an OAuth restriction to one file. The code fixes the source via owner-controlled Script Properties and ignores all HTTP parameters. Keep project editors restricted to yourself. Form responders cannot set `Publish` through the form. No data-writing endpoint or installed trigger is included; `doPost()` returns a read-only error.

## Numbered setup: Google first, approved Jenkins release last

### 1. Create your own demo Google Form

Sign into the Google account you intend to keep. At [Google Forms](https://forms.google.com), create a blank form named **GradeFlow Demo Submissions**. In its description write: “Synthetic demo submissions only. Approved names, assignments and links may be displayed publicly.”

Add exactly three **Short answer**, **Required** questions with these titles (copy spelling and punctuation):

1. `Student Name`
2. `Assignment Name`
3. `Submission Link (Google Drive / GitHub Link)`

Do not add a Timestamp question: Forms creates that column. Do not add a Publish question or file-upload question. In Settings, turn email collection **off** and disable sharing response summaries/results with respondents. Keep form and Sheet collaborators limited to yourself. Use the form yourself or restrict responders to intended demo testers; no public posting of the form URL is necessary. If Forms requires Publish before responding, review the responder audience before you publish it. No OAuth automation or credentials are needed to create these items manually.

### 2. Link a NEW private Google Sheet and prepare its schema

Open the form's **Responses** tab → **Link to Sheets** (green Sheets icon), or menu → **Select destination for responses** → **Create a new spreadsheet**. Name it **GradeFlow Demo Responses**. Confirm that you own both files. Never select the original developer's Sheet.

In Sheets, open **File → Settings**, select an English/US locale for reproducible headers, and set **Time zone to GMT+00:00 with no daylight saving (UTC)**. Save. The backend accepts the Google timezone IDs `Etc/UTC`, `UTC`, `Etc/GMT`, or `GMT`; it rejects other zones rather than guessing. The Apps Script manifest timezone alone does not change the Sheet's timezone.

Use this schema in the response tab (usually `Form Responses 1`):

| Column | Exact header | Value / purpose |
|---|---|---|
| A | `Timestamp` | Native Forms date/time cell; do not replace with locale text |
| B | `Student Name` | Synthetic alias such as `Demo Student 01` |
| C | `Assignment Name` | Synthetic label such as `Demo Lab 01` |
| D | `Submission Link (Google Drive / GitHub Link)` | Full HTTPS link to an owned demo file/repository |
| E | `Publish` | Owner-only checkbox; unchecked by default |

Forms may localize its timestamp header: rename A1 to exactly `Timestamp` if needed. Add `Publish` in E1 yourself. After responses arrive, select only their corresponding E cells → **Insert → Checkbox**, using default TRUE/FALSE values (no custom values). Leave future rows blank rather than pre-filling a large range that could affect where Forms appends responses. Do not give responders Sheet edit access. Add the checkbox manually for each new response; blank and unchecked rows are safely unpublished.

The mapper finds columns by header, tolerates reordered columns, ignores extra fields (including emails), and rejects duplicate/missing required headers. The backend reads the named response tab and rejects data over 1,000 response rows instead of truncating it. Keep this dedicated demo Sheet small; it is not designed for large datasets. Do not store real student information in it. Keep Sheet sharing **Restricted**; do not “Publish to web”.

### 3. Submit two synthetic records with links you control

Open the form's responder view, signed into your own account, and submit these examples:

| Student Name | Assignment Name | Submission Link |
|---|---|---|
| Demo Student 01 | Demo Lab 01 | `https://github.com/Joshi-taro/GradeFlow/blob/main/README.md` |
| Demo Student 02 | Demo Lab 02 | `https://github.com/Joshi-taro/GradeFlow/blob/main/Dockerfile` |

These links refer to files in your own public fork; no Drive permission change is needed. You can replace them with another synthetic file you create in your own repository. Verify every link in an incognito browser before approving it. The backend allows HTTPS links on `github.com`, `drive.google.com`, and `docs.google.com` only; it does not fetch links or prove ownership/accessibility.

If you prefer Drive, use a new synthetic demo file you own and explicitly share only that file with the intended named testers. Restricted files will still require sign-in for those testers. For anonymous public visitors, prefer the owned public GitHub demo above. Never broadly share your Drive, a folder of student work, the response Sheet, or someone else's file.

Check the two new rows in your Sheet. Insert default checkboxes in their E cells, inspect their contents, then check `Publish` only on one row initially so you can verify the exclusion rule later.

### 4. Create a standalone Apps Script project and install the backend

At [Apps Script](https://script.google.com), create a new standalone project named **GradeFlow Demo Read API** under the same account. Paste all of [Code.js](Code.js) into the editor's default **Code.gs** file, replacing its starter function. The repository uses `.js` so ESLint and Node can test it; the editor uses `.gs`. Do not paste markdown fences.

In **Project Settings**, enable **Show appsscript.json manifest file in editor**. Replace its contents with [appsscript.json](appsscript.json), then Save. In the editor, confirm **Services** lists **Google Sheets API / Sheets / v4**. The manifest enables it; if it is not listed, click **Services + → Google Sheets API → v4 → Add** once. Do not add Google Drive API. For the default Apps Script Cloud project this is normally sufficient; if you intentionally use a standard Google Cloud project, enable Sheets API there as documented by Google. No service account key, billing or CLI OAuth token is needed for this setup.

### 5. Configure private Script Properties and authorize read access

In Apps Script **Project Settings → Script Properties → Add script property**, add:

| Property | Value |
|---|---|
| `SPREADSHEET_ID` | The text between `/d/` and `/edit` in YOUR Sheet URL (not its `gid`) |
| `RESPONSE_SHEET_NAME` | Exact tab name, e.g. `Form Responses 1` |
| `PUBLIC_DEMO_ENABLED` | `true`, only after reviewing all checked demo rows |

These are server-side properties, not frontend config. Do not commit Sheet IDs, Google tokens or private records. Keep the property set to `false` when you want publication disabled; that returns an error, not a misleading empty success.

In the function selector, choose **validateSetup** → **Run**. Select your account and review the authorization prompt. The manifest requests only viewing spreadsheets, not editing them or managing Drive. Authorize your own reviewed project. If Google presents an unverified-app notice, verify the project/account/scopes before deciding whether to proceed yourself; if your institution blocks it, stop and ask its administrator rather than weakening policies. Do not enter OAuth tokens into GradeFlow or Jenkins.

The helper should log only the count of approved synthetic rows. It does not verify anonymous access or print rows. If it fails, check properties, service activation, header spelling, native checkbox values, Sheet UTC timezone, timestamp cells, field lengths (200 characters maximum), permitted link hosts and the row limit. Google authorization/API availability is not tested by local mocks.

### 6. Review and explicitly deploy YOUR read-only web app

Apps Script → **Deploy → New deployment → Select type: Web app**:

- Description: `GradeFlow synthetic demo read API v1`
- Execute as: **Me** (your owner account)
- Who has access: **Anyone** (anonymous, not “Anyone with a Google account”)

Choosing Anyone makes checked rows publicly readable. Approve this only for the dedicated synthetic demo dataset. The Sheet itself remains Restricted. If your Workspace does not offer Anyone, this static anonymous frontend cannot use that restricted deployment as-is: stop and ask an administrator or use an eligible personal account with demo-only data. Do not substitute browser tokens or `mode: no-cors`.

Click **Deploy**, complete the reviewed authorization if prompted, and copy the **Web app URL**:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Use `/exec`, not the editor URL, `/dev`, Sheet URL, or temporary `script.googleusercontent.com` redirect URL. Do not place client secrets or query tokens in the URL. No deployment has been performed for you.

### 7. Verify the Google endpoint before changing the website

Open the `/exec` URL in a signed-out/incognito browser. Expect a JSON array containing exactly the one checked synthetic row and four public keys. If you see sign-in HTML or an authorization page, anonymous access is not correctly configured.

From a terminal (replace the placeholder):

```bash
curl -fL 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
```

`-L` follows Google's ContentService redirect. HTTP 200 alone is not success: inspect the JSON shape and ensure there is no `error` object. Check the second row's Publish box and refresh: it should appear. Uncheck both and refresh: expect `[]`. Re-check the intended synthetic records. Changes to Sheet data/properties do not require a new script deployment; code changes do. No cache is introduced by this backend.

### 8. Set the public frontend URL and run checks locally

This PR intentionally removes the previous developer's endpoint and leaves `config.js` unconfigured. **Do not redeploy the blank config to your working public service.** Finish the Google setup and put your real owner-controlled URL in the branch before the approved release:

```javascript
window.GRADEFLOW_CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};
```

Only this public endpoint belongs in `config.js`. It is copied unchanged into the existing Docker image. Render environment variables do not become browser JavaScript automatically, and no Dockerfile change is necessary. Commit the config so Jenkins, kind and Render build the same reviewed source revision. A nonempty URL is not evidence that it is live.

Using the project's Node 24 toolchain:

```bash
npm ci --ignore-scripts
npm run check
npm run serve
# Visit http://127.0.0.1:8080 in a real browser.
# In another terminal:
node scripts/smoke.mjs http://127.0.0.1:8080
```

The HTTP smoke checks assets/Nginx, not Google access. In the browser verify cards, recent activity, refresh, opening your owned links, and browser-local frequent-student behavior. Open Developer Tools → Network: confirm the request goes to YOUR deployment, follows Google's redirect, and returns JSON. Test an unchecked row and an empty Sheet, then temporarily disable `PUBLIC_DEMO_ENABLED` and confirm **Sync failed / Retry**; restore it afterwards.

Browser CORS/redirect behavior must be tested from the actual Render origin too. Use the existing simple GET without custom authorization headers. `no-cors` produces an unreadable opaque response and is not a fix; no public proxy is added. Google quotas, Workspace policies, deployment errors or redirect failures can still block integration.

### 9. Review the PR, merge, and redeploy through your existing Jenkins

Review that the frontend URL is yours and the dataset is synthetic, wait for GitHub checks, then merge the PR/config into `main`. Keep Render auto-deploy **off** so merging alone does not publish this configuration.

In your existing Jenkins main job, choose **Build with Parameters**, set **DEPLOY_LOCAL=true** and **DEPLOY_RENDER=true**. Let lint/tests, hardened Docker build, Ansible, kind rollout and local smoke complete. At the Render gate, sign in as the configured approver (`gradeflow-admin` in the repository pipeline), inspect the commit and **explicitly approve** the public release. No new Google credential is needed in Jenkins; it serves a public URL, while Apps Script retains Google authorization server-side.

After Jenkins and Render report success, verify the REAL public URL:

```bash
node scripts/smoke.mjs https://YOUR-EXISTING-SERVICE.onrender.com
```

Then repeat the browser behavior/Network checks from step 8 at that URL, including incognito access to assignment links. Save only redacted screenshots of actual successful steps. Neither mocked tests nor static smoke establishes that Google integration works in a live browser. This change has not deployed or modified your Render service.

### 10. Maintain ownership, updates and rollback

Keep recovery access to your Google account and ownership of the Form, Sheet and Apps Script project. Record IDs/deployment details privately. To update backend code: paste the reviewed file, test `validateSetup`, then **Deploy → Manage deployments → Edit → Version: New version → Deploy** to retain the existing `/exec` URL. Saving code alone does not update the deployed version.

To withdraw publication, set `PUBLIC_DEMO_ENABLED=false` or archive the web-app deployment. Previously copied public data cannot be recalled. To roll back code, select a previous reviewed Apps Script version in Manage deployments, or revert the frontend config commit and use your usual reviewed Jenkins release. Do not roll back to the previous developer's URL or restore their private data. The existing Kubernetes and Render rollback procedures remain in the main README.

## Audit and verification boundary

Audit: `core.js` expects exact form headers and an array, safely escapes text, filters URL protocols and sorts submissions; `script.js` has a 15-second abort timeout, race protection, refresh and retry behavior. `config.js` held a third-party deployment URL; it is now intentionally empty until your setup. Drive ACL failures are external permissions failures, not a frontend rendering defect. Docker/Jenkins/Kubernetes/Terraform/Ansible files and the UI layout/styles are unchanged.

Local tests execute the actual Code.js with mocked Apps Script services and cover field mapping, serial dates, approval filtering, private-column exclusion, empty/malformed data, backend errors, write rejection, configuration guards and read-only scopes. Frontend tests use explicit fake endpoints, so no test fetches a previous developer's data. The CI integration job checks the container and kind, not Google authorization.

Observed on 2026-10-23: ESLint and HTML validation passed; all 29 Node tests passed using Node 24.15.0, including the 18 existing tests and 11 added checks. Repository diff confirms the Dockerfile, Jenkinsfile, Kubernetes, Terraform, Ansible and UI layout/style files were preserved. See this PR's GitHub Actions checks for its exact revision's container/kind and infrastructure results.

Still manual: Google account ownership, Forms creation/linking, API authorization, public web-app deployment, your configured endpoint, actual Google CORS/quotas/permissions, owned-link accessibility, and the approved Render redeploy/public browser checks. No live success is claimed.

References: [link Forms responses to Sheets](https://support.google.com/docs/answer/2917686), [Apps Script web apps and execution identity](https://developers.google.com/apps-script/guides/web), [ContentService redirects](https://developers.google.com/apps-script/guides/content), [Advanced Sheets service](https://developers.google.com/apps-script/advanced/sheets), [explicit OAuth scopes](https://developers.google.com/apps-script/concepts/scopes), [Sheets serial dates](https://developers.google.com/workspace/sheets/api/reference/rest/v4/DateTimeRenderOption).
