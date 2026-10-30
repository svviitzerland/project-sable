import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('PCM worklet flushes the final partial block before acknowledgement', () => {
  const messages = [];
  let Processor;
  class AudioWorkletProcessor {
    port = { postMessage: value => messages.push(value) };
  }
  vm.runInNewContext(readFileSync(new URL('../static/audio/pcm-worklet.js', import.meta.url), 'utf8'), {
    AudioWorkletProcessor,
    Int16Array,
    registerProcessor: (_name, implementation) => { Processor = implementation; },
  });
  const processor = new Processor();
  const samples = new Float32Array(128).fill(0.5);
  for (let i = 0; i < 17; i++) processor.process([[samples]]);
  assert.equal(messages.length, 1);
  processor.port.onmessage({ data: { type: 'flush' } });
  assert.equal(new Int16Array(messages[0]).length, 2048);
  assert.equal(new Int16Array(messages[1]).length, 128);
  assert.equal(new Int16Array(messages[1])[0], 16384);
  assert.equal(messages[2].type, 'flushed');
  processor.process([[samples]]);
  assert.equal(messages.length, 3, 'capture stays stopped after flushing');
});


test('a rotation flush preserves subsequent PCM until an explicit final stop', () => {
  const messages = [];
  let Processor;
  class AudioWorkletProcessor {
    port = { postMessage: value => messages.push(value) };
  }
  vm.runInNewContext(readFileSync(new URL('../static/audio/pcm-worklet.js', import.meta.url), 'utf8'), {
    AudioWorkletProcessor, Int16Array,
    registerProcessor: (_name, implementation) => { Processor = implementation; },
  });
  const processor = new Processor();
  processor.process([[new Float32Array(128).fill(0.25)]]);
  processor.port.onmessage({ data: { type: 'flush', continueCapture: true } });
  assert.equal(new Int16Array(messages[0]).length, 128);
  assert.equal(messages[1].type, 'flushed');
  processor.process([[new Float32Array(128).fill(0.75)]]);
  processor.port.onmessage({ data: { type: 'flush' } });
  assert.equal(new Int16Array(messages[2]).length, 128);
  assert.equal(new Int16Array(messages[2])[0], 24575);
  assert.equal(messages[3].type, 'flushed');
  processor.process([[new Float32Array(2048)]]);
  assert.equal(messages.length, 4);
});
