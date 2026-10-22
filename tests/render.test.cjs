const {test} = require('node:test');
const assert = require('node:assert/strict');
const env = {BRANCH_NAME: 'main', RENDER_APPROVED: 'yes', COMMIT: 'a'.repeat(40), RENDER_API_KEY: 'offline-test', RENDER_SERVICE_ID: 'srv-test'};
const service = {type: 'web_service', branch: 'main', repo: 'https://github.com/Joshi-taro/GradeFlow', autoDeploy: 'no', serviceDetails: {plan: 'free', runtime: 'docker', healthCheckPath: '/healthz', url: 'https://gradeflow-test.onrender.com', envSpecificDetails: {dockerfilePath: './Dockerfile', dockerContext: '.', dockerCommand: ''}}};
function fake(values) {
    const calls = [];
    return {calls, request: async (url, options) => {
        calls.push({url, ...options});
        const value = values.shift();
        if (!value) throw new Error('Unexpected network call');
        return {ok: true, json: async () => value};
    }, sleep: async () => {}};
}
test('Render refuses PRs, missing approval and non-SHA revisions before HTTP', async () => {
    const {deployRender} = await import('../scripts/render-client.mjs');
    for (const overrides of [{BRANCH_NAME: 'feature'}, {CHANGE_ID: '2'}, {RENDER_APPROVED: ''}, {COMMIT: 'main'}]) {
        const mock = fake([]);
        await assert.rejects(deployRender({...env, ...overrides}, mock));
        assert.equal(mock.calls.length, 0);
    }
});
test('Render rejects paid plans, auto deploys and another repository before POST', async () => {
    const {deployRender} = await import('../scripts/render-client.mjs');
    for (const overrides of [{serviceDetails: {...service.serviceDetails, plan: 'starter'}}, {serviceDetails: {...service.serviceDetails, envSpecificDetails: {dockerfilePath: './wrong/Dockerfile'}}}, {autoDeploy: 'yes'}, {repo: 'https://github.com/prisshhhuuu/student-assignment-portal'}]) {
        const mock = fake([{...service, ...overrides}]);
        await assert.rejects(deployRender(env, mock));
        assert.equal(mock.calls.length, 1);
    }
});
test('Render pins the requested commit and waits for it to become live', async () => {
    const {deployRender} = await import('../scripts/render-client.mjs');
    const mock = fake([service, {id: 'dep-test'}, {status: 'build_in_progress'}, {status: 'live', commit: {id: env.COMMIT}}]);
    const result = await deployRender(env, mock);
    assert.equal(result.commit, env.COMMIT);
    assert.equal(JSON.parse(mock.calls[1].body).commitId, env.COMMIT);
    assert.equal(mock.calls.filter(c => c.method === 'POST').length, 1);
});
test('Render fails on wrong commit, failed deployment and timeout', async () => {
    const {deployRender} = await import('../scripts/render-client.mjs');
    for (const state of [{status: 'live', commit: {id: 'b'.repeat(40)}}, {status: 'build_failed'}, {status: 'build_in_progress'}]) {
        await assert.rejects(deployRender(env, {...fake([service, {id: 'dep-test'}, state]), attempts: 1}));
    }
});
test('Render does not retry an ambiguous POST failure', async () => {
    const {deployRender} = await import('../scripts/render-client.mjs');
    let calls = 0;
    await assert.rejects(deployRender(env, {request: async () => {
        calls++;
        return calls === 1 ? {ok: true, json: async () => service} : {ok: false, status: 503};
    }}));
    assert.equal(calls, 2);
});
