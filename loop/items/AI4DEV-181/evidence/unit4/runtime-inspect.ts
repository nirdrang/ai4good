import http from 'node:http';
import { writeFileSync } from 'node:fs';
const request = http.get({ socketPath: '\\\\.\\pipe\\docker_engine', path: '/containers/supabase_edge_runtime_poancmeitlmxejofwzuu/json' }, (response) => {
  let body = '';
  response.on('data', (chunk) => { body += chunk; });
  response.on('end', () => {
    const value = JSON.parse(body);
    const env = Object.fromEntries((value.Config.Env as string[]).map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
    const functions = JSON.parse(env.SUPABASE_INTERNAL_FUNCTIONS_CONFIG ?? '{}');
    const result = { state: value.State.Status, mounts: value.Mounts, functionNames: Object.keys(functions),
      hasDiscoveryFile: 'discovery-file' in functions,
      model: Object.fromEntries(['DISCOVERY_PROVIDER', 'DISCOVERY_MODEL', 'DISCOVERY_BASE_URL', 'DISCOVERY_REASONING_EFFORT'].map((key) => [key, env[key] ?? null])) };
    console.log(JSON.stringify(result, null, 2));
    writeFileSync(new URL('./runtime.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  });
});
request.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
