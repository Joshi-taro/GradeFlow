// Invoked only by an opted-in trusted Jenkins main build. No secrets in output.
const url = new URL(process.env.STATUS_WEBHOOK);
if (url.protocol !== 'https:' || url.hostname !== 'hooks.slack.com') throw new Error('Expected a Slack HTTPS webhook credential');
const response = await fetch(url, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({text: `GradeFlow ${process.env.BUILD_STATUS}; commit ${process.env.COMMIT || 'unknown'}; rollout ${process.env.DEPLOY_VERIFIED === 'true' ? 'verified' : 'not verified in this build'}; ${process.env.BUILD_URL || ''}`}),
    signal: AbortSignal.timeout(10000)
});
if (!response.ok) throw new Error(`Status notification failed: HTTP ${response.status}`);
