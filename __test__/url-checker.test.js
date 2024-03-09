// @ts-check
'use strict';

import { describe, expect, it } from '@jest/globals';
import { isValidUrl } from '../src/client/js/url-checker';

describe("Testing 'isValidUrl'", () => {

  it('is defined', () => {
    expect(isValidUrl).toBeDefined();
  });

  it("returns 'true' for valid URLs", () => {
    const validUrlParts = [
      'example.com',
      'example.com/',
      'example.com/index.html',
      'example.com/index.html#fragment',
    ];
    validUrlParts.forEach(part => {
      expect(isValidUrl(`http://${part}`)).toBe(true);
      expect(isValidUrl(`https://${part}`)).toBe(true);
    });
  });

  it("returns 'false' for invalid URLs or not allowed protocols", () => {
    const invalidUrls = [
      '',
      'example.com',
      'ftp://example.com',
    ];
    invalidUrls.forEach(url => {
      expect(isValidUrl('invalid_url')).toBe(false);
    });

  });

});
