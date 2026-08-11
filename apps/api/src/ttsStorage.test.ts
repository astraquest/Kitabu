import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseTtsAssetStorage } from './ttsStorage.js';

test('Supabase TTS storage upserts with server-only auth and reads authenticated objects', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const storage = new SupabaseTtsAssetStorage(
    'https://project.supabase.co/',
    'service-role-secret',
    'tts-audio',
    'https://project.supabase.co/storage/v1/object/public/tts-audio',
    async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response(init?.method === 'POST' ? '{}' : new Uint8Array([1, 2, 3]), { status: 200 });
    }
  );

  await storage.put('tts/voice sample.wav', new Uint8Array([1, 2, 3]));
  const bytes = await storage.read('tts/voice sample.wav');
  assert.deepEqual([...bytes], [1, 2, 3]);
  assert.equal(storage.backend, 'supabase');
  assert.equal(storage.publicUrl('tts/voice sample.wav'), 'https://project.supabase.co/storage/v1/object/public/tts-audio/tts/voice%20sample.wav');
  assert.equal(requests[0].init?.method, 'POST');
  assert.equal(new Headers(requests[0].init?.headers).get('x-upsert'), 'true');
  assert.equal(new Headers(requests[0].init?.headers).get('Authorization'), 'Bearer service-role-secret');
  assert.equal(requests[1].init?.method, undefined);
});

test('Supabase TTS storage rejects unsafe keys', async () => {
  const storage = new SupabaseTtsAssetStorage('https://project.supabase.co', 'secret', 'tts-audio', undefined, async () => new Response(null, { status: 200 }));
  await assert.rejects(() => storage.read('../secret.wav'), /Invalid TTS storage key/);
  await assert.rejects(() => storage.put('/absolute.wav', new Uint8Array([1])), /Invalid TTS storage key/);
});
