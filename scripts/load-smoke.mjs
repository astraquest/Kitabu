const target = process.env.KITABU_LOAD_URL;
const requests = Number(process.env.KITABU_LOAD_REQUESTS || 100);
const concurrency = Number(process.env.KITABU_LOAD_CONCURRENCY || 10);
if (!target) throw new Error('KITABU_LOAD_URL is required');
if (!Number.isInteger(requests) || requests < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('KITABU_LOAD_REQUESTS and KITABU_LOAD_CONCURRENCY must be positive integers');
}

let next = 0;
const results = [];
const started = performance.now();
async function worker() {
  while (true) {
    const index = next++;
    if (index >= requests) return;
    const began = performance.now();
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(10_000) });
      results[index] = { ok: response.ok, status: response.status, ms: performance.now() - began };
      await response.arrayBuffer();
    } catch (error) {
      results[index] = { ok: false, status: 0, ms: performance.now() - began, error: error.message };
    }
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
const failures = results.filter((result) => !result.ok);
const latencies = results.map((result) => result.ms).sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
const summary = {
  target,
  requests,
  concurrency,
  failures: failures.length,
  errorRate: failures.length / requests,
  p95Ms: Math.round(percentile(0.95)),
  elapsedMs: Math.round(performance.now() - started),
};
console.log(JSON.stringify(summary));
if (failures.length > 0 || summary.errorRate > 0.01 || summary.p95Ms > 2_000) process.exitCode = 1;
