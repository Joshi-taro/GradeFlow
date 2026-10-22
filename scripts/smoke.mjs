const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
for (const [path, pattern] of [['/', /Student Assignment Portal/], ['/healthz', /^ok\s*$/], ['/script.js', /fetchData/], ['/core.js', /normalizeRows/], ['/config.js', /apiUrl/], ['/style.css', /\.sub-card/]]) {
    const response = await fetch(`${base}${path}`, {signal:AbortSignal.timeout(10000)});
    if (!response.ok || !pattern.test(await response.text())) throw new Error(`Smoke failed: ${path} HTTP ${response.status}`);
    console.log(`PASS ${path}`);
}
