import {execFileSync} from 'node:child_process';
import {deployRender} from './render-client.mjs';

try {
    const result = await deployRender(process.env);
    // Public URL receives no API credential. Smoke verifies actual assets,
    // not just the Render API's "live" state. Allow a free-instance cold start.
    let passed = false;
    for (let attempt = 0; attempt < 12; attempt++) {
        try {
            execFileSync(process.execPath, ['scripts/smoke.mjs', result.url], {stdio: 'inherit', env: {PATH: process.env.PATH}});
            passed = true;
            break;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    if (!passed) throw new Error('Public URL smoke failed');
    console.log(`Verified Render deploy ${result.id}: ${result.commit} at ${result.url}`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
