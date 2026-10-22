const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
async function boot(fetch) {
    const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {runScripts:'outside-only', url:'https://gradeflow.test'});
    dom.window.fetch = fetch;
    dom.window.console.error = () => {};
    for (const file of ['config.js','core.js','script.js']) dom.window.eval(fs.readFileSync(file,'utf8'));
    await new Promise(resolve => setTimeout(resolve, 30));
    return dom;
}
const row = {'Student Name':'<img src=x onerror=alert(1)>', 'Assignment Name':'<script>alert(1)</script>', 'Submission Link (Google Drive / GitHub Link)':'javascript:alert(1)', Timestamp:'2026-01-01T00:00:00Z'};
test('actual dashboard renders Sheet text safely, rejects executable links, works without CDN animations', async () => {
    const dom = await boot(async()=>({ok:true,json:async()=>[row]}));
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.sub-card').length,1);
    assert.equal(doc.querySelector('.student-name').textContent,row['Student Name']);
    assert.equal(doc.querySelectorAll('.sub-card img, .sub-card script, .sub-card a, .activity-item script').length,0);
    dom.window.close();
});
test('HTTP failures and invalid API payloads show retry and failed sync', async () => {
    for (const response of [{ok:false,status:403},{ok:true,json:async()=>({error:'denied'})}]) {
        const dom = await boot(async()=>response);
        assert.equal(dom.window.document.querySelector('#last-updated').textContent,'Sync failed');
        assert.equal(dom.window.document.querySelector('#submissions-grid button').textContent,'Retry');
        dom.window.close();
    }
});
test('empty results show an explicit empty state', async () => {
    const dom = await boot(async()=>({ok:true,json:async()=>[]}));
    assert.match(dom.window.document.querySelector('#submissions-grid').textContent,/No submissions yet/);
    dom.window.close();
});
test('refresh recovers from failure and valid links retain tab isolation', async () => {
    let calls = 0;
    const dom = await boot(async()=> ++calls === 1 ? {ok:false,status:503} : {ok:true,json:async()=>[{...row,'Submission Link (Google Drive / GitHub Link)':'https://github.com/student/lab'}]});
    dom.window.document.querySelector('#submissions-grid button').click();
    await new Promise(resolve=>setTimeout(resolve,10));
    const link = dom.window.document.querySelector('.sub-card a');
    assert.ok(link); assert.equal(link.rel,'noopener noreferrer');
    dom.window.localStorage.setItem('studentViews','broken');
    link.dispatchEvent(new dom.window.MouseEvent('click', {bubbles:true,cancelable:true}));
    assert.equal(JSON.parse(dom.window.localStorage.getItem('studentViews'))[row['Student Name']],1);
    dom.window.close();
});
