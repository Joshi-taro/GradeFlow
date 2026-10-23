const { escapeHtml, normalizeRows, readViews, sortSubmissions, formatTimeAgo, getInitials } = GradeFlowCore;
const animate = (method, ...args) => {
    if (window.gsap && typeof window.gsap[method] === 'function') window.gsap[method](...args);
};
let currentRequest = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (window.gsap && window.ScrollToPlugin) gsap.registerPlugin(ScrollToPlugin);
    animate('from', '.hero-title, .hero-desc, .top-nav', { y: 20, opacity: 0, duration: 0.8, clearProps: 'all' });
    document.getElementById('view-submissions-btn').addEventListener('click', () => {
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('refresh-data').addEventListener('click', fetchData);
    fetchData();
});

function trackStudentView(name) {
    try {
        const views = readViews(localStorage);
        const next = (Object.hasOwn(views, name) ? views[name] : 0) + 1;
        Object.defineProperty(views, name, { value: next, enumerable: true, writable: true, configurable: true });
        localStorage.setItem('studentViews', JSON.stringify(views));
    } catch { /* Private mode or full storage must not block opening assignments. */ }
}

function getFrequentStudent() {
    let views;
    try { views = readViews(localStorage); } catch { return null; }
    return Object.keys(views).sort((a, b) => views[b] - views[a])[0] || null;
}

async function fetchData() {
    const request = ++currentRequest;
    const grid = document.getElementById('submissions-grid');
    const activity = document.getElementById('activity-list');
    const status = document.getElementById('last-updated');
    status.textContent = 'Syncing…';
    activity.replaceChildren();
    grid.innerHTML = '<div class="loading-wrapper"><div class="custom-loader"></div><p>Syncing live data from Google Sheets...</p></div>';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const endpoint = window.GRADEFLOW_CONFIG?.apiUrl;
        if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('Configure an HTTPS Apps Script URL');
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
        const data = normalizeRows(await response.json());
        if (request !== currentRequest) return;
        renderSubmissions(data);
        renderActivity(data);
        status.textContent = new Date().toLocaleTimeString();
        animate('from', '#sync-status', { opacity: 0.5, duration: 0.5 });
    } catch (error) {
        if (request !== currentRequest) return;
        console.error('Error fetching data:', error);
        status.textContent = 'Sync failed';
        grid.innerHTML = '<div class="loading-wrapper"><p>Failed to load data. Check the Google Apps Script deployment and connection.</p><button type="button" class="btn-primary">Retry</button></div>';
        if (!window.GRADEFLOW_CONFIG?.apiUrl) grid.querySelector('p').textContent = 'Google integration is not configured. Set your Apps Script /exec URL in config.js and rebuild.';
        grid.querySelector('button').addEventListener('click', fetchData);
    } finally { clearTimeout(timeout); }
}

function renderSubmissions(data) {
    const grid = document.getElementById('submissions-grid');
    grid.replaceChildren();
    if (!data.length) {
        grid.innerHTML = '<div class="loading-wrapper"><p>No submissions yet.</p></div>';
        return;
    }
    const frequent = getFrequentStudent();
    sortSubmissions(data, frequent).forEach(item => {
        const card = document.createElement('div');
        card.className = `sub-card ${item.name === frequent ? 'highlight' : ''}`;
        card.innerHTML = `
            <div class="card-header"><div class="student-info">
                <div class="avatar">${escapeHtml(getInitials(item.name))}</div>
                <div><div class="student-name">${escapeHtml(item.name)}</div>
                <div class="time-ago">${formatTimeAgo(item.timestamp)}</div></div>
            </div></div>
            <div class="assignment-title">${escapeHtml(item.assignment)}</div>
            <div class="card-footer">${item.link
                ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="link-btn">Open Assignment <i class="ph ph-arrow-up-right"></i></a>`
                : '<span class="link-btn">Submission link unavailable</span>'}</div>`;
        card.addEventListener('mouseenter', () => animate('to', card, { y: -8, duration: 0.3 }));
        card.addEventListener('mouseleave', () => animate('to', card, { y: 0, duration: 0.3 }));
        if (item.link) {
            card.querySelector('a').addEventListener('click', () => trackStudentView(item.name));
            card.addEventListener('click', event => {
                if (!event.target.closest('a')) {
                    trackStudentView(item.name);
                    window.open(item.link, '_blank', 'noopener,noreferrer');
                }
            });
        }
        grid.appendChild(card);
    });
    animate('from', '.sub-card', { y: 40, opacity: 0, duration: 0.6, stagger: 0.1, clearProps: 'all' });
}

function renderActivity(data) {
    const list = document.getElementById('activity-list');
    list.replaceChildren();
    sortSubmissions(data, null).slice(0, 4).forEach(item => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `<div class="act-icon"><i class="ph-bold ph-check"></i></div>
            <div class="act-content"><p><span>${escapeHtml(item.name)}</span> uploaded "${escapeHtml(item.assignment)}"</p>
            <div class="act-time">${formatTimeAgo(item.timestamp)}</div></div>`;
        list.appendChild(li);
    });
    animate('from', '.activity-item', { x: -20, opacity: 0, duration: 0.5, stagger: 0.1, clearProps: 'all' });
}
