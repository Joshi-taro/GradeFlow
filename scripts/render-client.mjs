// All HTTP is injectable for offline regression tests. Never log API responses
// or authorization headers: service metadata can include sensitive values.
export async function deployRender(env, {request = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 90} = {}) {
    if (env.BRANCH_NAME !== 'main' || env.CHANGE_ID || env.RENDER_APPROVED !== 'yes') throw new Error('Main and explicit approval required');
    if (!/^[a-f0-9]{40}$/.test(env.COMMIT || '')) throw new Error('Full commit SHA required');
    if (!/^srv-[a-z0-9]+$/.test(env.RENDER_SERVICE_ID || '') || !env.RENDER_API_KEY) throw new Error('Render credentials missing or invalid');
    const base = `https://api.render.com/v1/services/${env.RENDER_SERVICE_ID}`;
    async function api(path = '', body) {
        const response = await request(base + path, {
            method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
            headers: {Authorization: `Bearer ${env.RENDER_API_KEY}`, 'Content-Type': 'application/json'},
            ...(body ? {body: JSON.stringify(body)} : {})
        });
        if (!response.ok) throw new Error(`Render API HTTP ${response.status}; inspect dashboard (POST is never retried)`);
        return response.json();
    }
    const service = await api();
    const details = service.serviceDetails || {};
    const docker = details.envSpecificDetails || {};
    if (service.type !== 'web_service' || service.branch !== 'main' ||
        service.repo?.replace(/\.git$/, '').replace(/\/$/, '') !== 'https://github.com/Joshi-taro/GradeFlow' ||
        service.autoDeploy !== 'no' || details.plan !== 'free' || details.buildPlan !== 'starter' || details.runtime !== 'docker' ||
        details.healthCheckPath !== '/healthz' || details.disk) throw new Error('Service must be the fork/main Docker Free service, auto-deploy off, /healthz, no disk');
    if (!['Dockerfile', './Dockerfile'].includes(docker.dockerfilePath) ||
        !['.', './', ''].includes(docker.dockerContext) || docker.dockerCommand || docker.preDeployCommand || service.rootDir) throw new Error('Expected root Dockerfile/context and no command overrides');
    const url = new URL(details.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.onrender.com') || url.username || url.password) throw new Error('Expected public Render HTTPS URL');
    const deploy = await api('/deploys', {commitId: env.COMMIT, clearCache: 'do_not_clear'});
    if (!/^dep-[a-z0-9]+$/.test(deploy.id || '')) throw new Error('Invalid deployment ID; inspect dashboard');
    for (let attempt = 0; attempt < attempts; attempt++) {
        const state = await api(`/deploys/${deploy.id}`);
        if (state.status === 'live') {
            if (state.commit?.id !== env.COMMIT) throw new Error('Render deployed the wrong commit');
            return {id: deploy.id, url: url.origin, commit: env.COMMIT};
        }
        if (['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'].includes(state.status)) throw new Error(`Render deployment ${state.status}`);
        await sleep(10000);
    }
    throw new Error('Render deployment timed out; inspect dashboard before retrying');
}
