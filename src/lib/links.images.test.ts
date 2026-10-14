import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isSafeImageSrc } from './links.ts';

describe('isSafeImageSrc', () => {
  it('accepts absolute public paths and http(s) urls', () => {
    assert.equal(isSafeImageSrc('/media/a.svg'), true);
    assert.equal(isSafeImageSrc('https://example.com/a.png'), true);
    assert.equal(isSafeImageSrc('HTTP://example.com/a.png'), true);
  });

  it('refuses relative, protocol-relative and scripted sources', () => {
    for (const src of [
      '',
      'a.png',
      './a.png',
      '../a.png',
      '//evil.example/a.png',
      'data:image/svg+xml;base64,AAAA',
      'javascript:alert(1)',
      'java\nscript:alert(1)',
      'ftp://example.com/a.png',
    ]) {
      assert.equal(isSafeImageSrc(src), false, JSON.stringify(src));
    }
  });
});
