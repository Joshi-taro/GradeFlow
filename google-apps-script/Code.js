/* Paste this entire file into Code.gs in YOUR Apps Script project.
 * Read-only Sheets API scope; no Drive access, writes, triggers or URL fetches.
 * Anonymous visitors can read every approved row. Use synthetic demos only.
 */
const PUBLIC_FIELDS = ['Timestamp', 'Student Name', 'Assignment Name', 'Submission Link (Google Drive / GitHub Link)'];
const APPROVAL_FIELD = 'Publish';
const MAX_DEMO_ROWS = 1000;

function jsonOutput_(value) {
    return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// Does not accept spreadsheet IDs, ranges or callback names from HTTP input.
function doGet() {
    try {
        const properties = PropertiesService.getScriptProperties().getProperties();
        if (properties.PUBLIC_DEMO_ENABLED !== 'true') throw new Error('Publication disabled');
        if (!/^[a-zA-Z0-9_-]+$/.test(properties.SPREADSHEET_ID || '') || !properties.RESPONSE_SHEET_NAME) throw new Error('Missing configuration');
        const metadata = Sheets.Spreadsheets.get(properties.SPREADSHEET_ID, {fields: 'properties.timeZone'});
        // Form timestamps are serial local wall times. Require UTC explicitly
        // rather than guessing locale/DST and silently changing submission dates.
        if (!['Etc/UTC', 'UTC', 'Etc/GMT', 'GMT'].includes(metadata.properties.timeZone)) throw new Error('Sheet timezone must be UTC');
        const tab = properties.RESPONSE_SHEET_NAME.replace(/'/g, "''");
        // A quoted tab name is valid A1 notation for that whole tab. Reading it
        // avoids out-of-grid ranges and lets the mapper reject oversized data
        // instead of silently dropping records beyond a fixed range.
        const result = Sheets.Spreadsheets.Values.get(properties.SPREADSHEET_ID, `'${tab}'`, {
            valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER', majorDimension: 'ROWS'
        });
        return jsonOutput_(mapSheetRows_(result.values));
    } catch {
        // ContentService cannot set arbitrary HTTP status codes. This object
        // intentionally fails the frontend's array contract, so it shows Retry.
        // Do not leak exception text, IDs, email addresses, sheet values or tokens.
        return jsonOutput_({error: {code: 'BACKEND_UNAVAILABLE', message: 'Demo data unavailable. Contact the GradeFlow operator.'}});
    }
}

function doPost() {
    return jsonOutput_({error: {code: 'METHOD_NOT_ALLOWED', message: 'This endpoint is read-only. Submit through the Google Form.'}});
}

// Owner-only editor helper: validates configuration without printing row data.
function validateSetup() {
    const value = JSON.parse(doGet().getContent());
    if (!Array.isArray(value)) throw new Error('Check Script Properties, Sheets service, UTC timezone, headers and approved rows.');
    console.log(`Configuration readable; ${value.length} approved synthetic rows. Public deployment is not yet verified.`);
}

function timestampIso_(value) {
    // Google Sheets serial days start at 1899-12-30. The spreadsheet must be UTC.
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 25569 || value > 2958465) throw new Error('Invalid Timestamp');
    return new Date(Math.round((value - 25569) * 86400000)).toISOString();
}

function publicLink_(value) {
    if (typeof value !== 'string') throw new Error('Missing submission link');
    const link = value.trim();
    // Apps Script V8 has no browser URL global. Use a narrow HTTPS host/path
    // allowlist, excluding credentials, whitespace, HTML and lookalike hosts.
    if (!/^https:\/\/(?:github\.com|drive\.google\.com|docs\.google\.com)\/[^\s<>"'\\]+$/i.test(link)) throw new Error('Invalid submission link');
    return link;
}

function mapSheetRows_(values) {
    if (!Array.isArray(values) || !Array.isArray(values[0])) throw new Error('Missing header row');
    if (values.length > MAX_DEMO_ROWS + 1) throw new Error('Demo row limit exceeded');
    const headers = values[0].map(value => typeof value === 'string' ? value.trim() : '');
    const required = [...PUBLIC_FIELDS, APPROVAL_FIELD];
    for (const field of required) {
        if (headers.filter(header => header === field).length !== 1) throw new Error('Missing or duplicate header');
    }
    const positions = Object.fromEntries(required.map(field => [field, headers.indexOf(field)]));
    const result = [];
    for (const row of values.slice(1)) {
        if (!Array.isArray(row)) throw new Error('Invalid row');
        // Only a native checked Sheets checkbox is approval. A Form answer
        // "yes" or "TRUE" is not approval. New rows default to unpublished.
        if (row[positions.Publish] !== true) continue;
        const output = {};
        for (const field of PUBLIC_FIELDS) {
            const value = row[positions[field]];
            if (field === 'Timestamp') output[field] = timestampIso_(value);
            else if (field === PUBLIC_FIELDS[3]) output[field] = publicLink_(value);
            else {
                if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Invalid public text');
                output[field] = value.trim();
            }
        }
        result.push(output);
    }
    return result;
}
