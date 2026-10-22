/* Shared pure functions, also loaded by Node's regression tests. */
(function (root) {
    function safeUrl(value) {
        try {
            const url = new URL(value);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
        } catch { return null; }
    }
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }
    function normalizeRows(rows) {
        if (!Array.isArray(rows)) throw new Error('API must return an array of Sheet rows');
        return rows.map((row, id) => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid Sheet row');
            const text = (key, fallback) => typeof row[key] === 'string' && row[key].trim() ? row[key].trim() : fallback;
            const date = row.Timestamp ? new Date(row.Timestamp) : null;
            return {
                id, name: text('Student Name', 'Unknown Student'),
                assignment: text('Assignment Name', 'Unknown Assignment'),
                link: safeUrl(row['Submission Link (Google Drive / GitHub Link)']),
                timestamp: date && Number.isFinite(date.getTime()) ? date : null
            };
        });
    }
    function readViews(storage) {
        try {
            const views = JSON.parse(storage.getItem('studentViews') || '{}');
            if (!views || typeof views !== 'object' || Array.isArray(views)) return {};
            return Object.fromEntries(Object.entries(views).filter(([, count]) => Number.isSafeInteger(count) && count > 0));
        } catch { return {}; }
    }
    function sortSubmissions(data, frequent) {
        return [...data].sort((a, b) => {
            const priority = Number(b.name === frequent) - Number(a.name === frequent);
            return priority || (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0);
        });
    }
    function formatTimeAgo(date, now = Date.now()) {
        if (!date || !Number.isFinite(date.getTime())) return 'Time unavailable';
        const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
        if (seconds < 60) return `${seconds} seconds ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        return `${Math.floor(seconds / 3600)} hours ago`;
    }
    function getInitials(name) {
        return name.trim().split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    const api = { safeUrl, escapeHtml, normalizeRows, readViews, sortSubmissions, formatTimeAgo, getInitials };
    if (typeof module !== 'undefined') module.exports = api;
    else root.GradeFlowCore = api;
})(typeof window === 'undefined' ? {} : window);
