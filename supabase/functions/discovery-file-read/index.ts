import { readDiscoveryFile } from '../_shared/discovery-file-read.ts';
import type { FileRow } from '../_shared/discovery-files.ts';
import { discoveryFileWorker } from '../_shared/edge.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST' || !discoveryFileWorker().admits(request)) return new Response(null, { status: 401 });
  const row = await request.json() as FileRow;
  EdgeRuntime.waitUntil(readDiscoveryFile(row));
  return new Response(null, { status: 202 });
});
