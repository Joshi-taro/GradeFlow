const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
test('reject script, data, relative and malformed links', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '#', null]) assert.equal(core.safeUrl(link), null);
    assert.equal(core.safeUrl('https://github.com/student/lab'), 'https://github.com/student/lab');
});
test('escape all HTML attribute and element delimiters', () => {
    assert.equal(core.escapeHtml('<img src="x" onerror=\'x\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;');
});
test('normalize exact Google Form headers and invalid dates', () => {
    const [row] = core.normalizeRows([{ 'Student Name': ' Ada ', 'Assignment Name': 'Lab', 'Submission Link (Google Drive / GitHub Link)': 'javascript:alert(1)', Timestamp: 'bad' }]);
    assert.equal(row.name, 'Ada'); assert.equal(row.assignment, 'Lab'); assert.equal(row.link, null); assert.equal(row.timestamp, null);
    assert.equal(core.normalizeRows([{}])[0].name, 'Unknown Student');
});
test('malformed API responses are errors, not successful empty dashboards', () => {
    for (const value of [{ error: 'unauthorized' }, null, [null], [3]]) assert.throws(() => core.normalizeRows(value));
    assert.deepEqual(core.normalizeRows([]), []);
});
test('frequent student submissions are still newest first and input is untouched', () => {
    const rows = [{name:'Ada', timestamp:new Date(1000)}, {name:'Ada', timestamp:new Date(3000)}, {name:'Bob', timestamp:new Date(4000)}];
    assert.deepEqual(core.sortSubmissions(rows, 'Ada').map(r=>r.timestamp.getTime()), [3000,1000,4000]);
    assert.equal(rows[0].timestamp.getTime(),1000);
});
test('invalid or unavailable browser storage is tolerated', () => {
    for (const value of ['broken', 'null', '[]', '3']) assert.deepEqual(core.readViews({getItem:()=>value}), {});
    assert.deepEqual(core.readViews({getItem:()=>{throw Error('denied');}}), {});
    assert.deepEqual(core.readViews({getItem:()=>'{"Ada":2,"Bob":"oops"}'}), {Ada:2});
});
test('initials tolerate extra whitespace; times handle absent and future timestamps', () => {
    assert.equal(core.getInitials('  Ada   Lovelace '), 'AL');
    assert.equal(core.formatTimeAgo(null), 'Time unavailable');
    assert.equal(core.formatTimeAgo(new Date(60000), 0), '0 seconds ago');
    assert.equal(core.formatTimeAgo(new Date(0), 120000), '2 minutes ago');
});
