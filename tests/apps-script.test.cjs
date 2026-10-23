const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../core.js');
const headers = ['Timestamp', 'Student Name', 'Assignment Name', 'Submission Link (Google Drive / GitHub Link)', 'Publish'];
const demo = [46318.5, ' Demo Student 01 ', ' Demo Lab ', 'https://github.com/Joshi-taro/GradeFlow/blob/main/README.md', true];
function backend({values = [headers, demo], properties = {}, timezone = 'Etc/UTC', failure = false} = {}) {
    const reads = [];
    const context = vm.createContext({
        console: {log: () => {}},
        PropertiesService: {getScriptProperties: () => ({getProperties: () => ({PUBLIC_DEMO_ENABLED:'true', SPREADSHEET_ID:'test-sheet', RESPONSE_SHEET_NAME:"Form's Responses", ...properties})})},
        ContentService: {MimeType: {JSON:'application/json'}, createTextOutput: text => ({text, setMimeType(type) { this.mime = type; return this; }, getContent() { return this.text; }})},
        Sheets: {Spreadsheets: {
            get: (...args) => { reads.push(args); if (failure) throw Error('SECRET ID private email@example.test'); return {properties: {timeZone: timezone}}; },
            Values: {get: (...args) => {reads.push(args); return {values};}}
        }}
    });
    vm.runInContext(fs.readFileSync('google-apps-script/Code.js', 'utf8'), context);
    return {context, reads, get: () => JSON.parse(context.doGet().text)};
}

test('actual Apps Script maps exact frontend keys, trims text and serial dates', () => {
    const b = backend();
    const rows = b.get();
    assert.deepEqual(Object.keys(rows[0]), headers.slice(0,4));
    assert.equal(rows[0].Timestamp, '2026-10-23T12:00:00.000Z');
    assert.equal(rows[0]['Student Name'], 'Demo Student 01');
    assert.equal(core.normalizeRows(rows)[0].assignment, 'Demo Lab');
    assert.equal(b.context.doGet().mime, 'application/json');
    assert.equal(b.reads[1][1], "'Form''s Responses'");
    assert.equal(b.reads[1][2].valueRenderOption, 'UNFORMATTED_VALUE');
});

test('empty responses are [], but absent or broken headers are errors', () => {
    assert.deepEqual(backend({values:[headers]}).get(), []);
    for (const values of [undefined, [], null, {}, [['wrong']], [[...headers, 'Publish']]]) {
        // undefined is passed explicitly through the mock after construction.
        const b = backend({values: values === undefined ? [] : values});
        assert.equal(b.get().error.code, 'BACKEND_UNAVAILABLE');
    }
});

test('only checked owner approval publishes; extra private columns never escape', () => {
    const rows = [false, '', 'TRUE', 'yes', undefined].map(publish => [...demo.slice(0,4), publish, 'private@example.test']);
    const b = backend({values:[[...headers, 'Email Address'], ...rows, [...demo, 'private@example.test']]});
    assert.equal(b.get().length, 1);
    assert.ok(!JSON.stringify(b.get()).includes('private@example.test'));
});

test('column ordering is independent and mapping preserves text for frontend escaping', () => {
    const b = backend({values:[['Publish', 'Assignment Name', 'Timestamp', 'Student Name', headers[3]], [true, '<script>demo</script>', demo[0], '<img src=x>', demo[3]]]});
    assert.equal(b.get()[0]['Student Name'], '<img src=x>');
    assert.equal(core.escapeHtml(core.normalizeRows(b.get())[0].name), '&lt;img src=x&gt;');
});

test('malformed approved dates/text/links fail closed, never masquerade as empty data', () => {
    for (const [index, value] of [[0,'10/23/2026'], [0,NaN], [1,''], [2,{}], [3,'javascript:alert(1)'], [3,'https://github.com.evil.test/file'], [3,'https://user@github.com/file'], [3,'https://example.test/file']]) {
        const row = [...demo]; row[index] = value;
        const data = backend({values:[headers,row]}).get();
        assert.equal(data.error.code, 'BACKEND_UNAVAILABLE');
        assert.throws(() => core.normalizeRows(data));
    }
    assert.equal(backend({values:[headers, null]}).get().error.code, 'BACKEND_UNAVAILABLE');
});

test('publication switch and missing properties prevent any Sheets reads', () => {
    for (const properties of [{PUBLIC_DEMO_ENABLED:'false'}, {PUBLIC_DEMO_ENABLED:''}, {SPREADSHEET_ID:''}, {RESPONSE_SHEET_NAME:''}]) {
        const b = backend({properties});
        assert.equal(b.get().error.code, 'BACKEND_UNAVAILABLE');
        assert.equal(b.reads.length, 0);
    }
});

test('backend failures and incorrect timezone return sanitized errors', () => {
    for (const options of [{failure:true}, {timezone:'Asia/Kolkata'}]) {
        const data = backend(options).get();
        assert.equal(data.error.code, 'BACKEND_UNAVAILABLE');
        assert.doesNotMatch(JSON.stringify(data), /SECRET|private|test-sheet/);
    }
});

test('POST and query overrides cannot write or select a different Sheet', () => {
    const b = backend();
    assert.equal(JSON.parse(b.context.doPost({postData:{contents:'malicious'}}).text).error.code, 'METHOD_NOT_ALLOWED');
    assert.equal(b.reads.length, 0);
    b.context.doGet({parameter:{spreadsheetId:'another-sheet', callback:'alert'}});
    assert.equal(b.reads[0][0], 'test-sheet');
});

test('bounded demo dataset fails rather than silently truncates', () => {
    assert.equal(backend({values:[headers, ...Array.from({length:1001}, () => demo)]}).get().error.code, 'BACKEND_UNAVAILABLE');
});

test('manifest grants only read-only Sheets access, without Drive or Forms scopes', () => {
    const manifest = JSON.parse(fs.readFileSync('google-apps-script/appsscript.json', 'utf8'));
    assert.deepEqual(manifest.oauthScopes, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
    assert.equal(manifest.dependencies.enabledAdvancedServices[0].serviceId, 'sheets');
});
