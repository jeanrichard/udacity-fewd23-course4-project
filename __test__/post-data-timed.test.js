// @ts-check
'use strict';

import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks();

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { postData } from '../src/client/js/form-handler.js';

/*
References:
- https://jestjs.io/docs/asynchronous
- https://jestjs.io/docs/timer-mocks
- https://www.npmjs.com/package/jest-fetch-mock
- https://testing-library.com/docs/using-fake-timers/
*/

describe('Testing timed functionality to POST a request and return a pair (response, JSON)', () => {

  beforeEach(() => {
    /** @ts-ignore: Property 'resetMocks' does not exist on type ... */
    fetch.resetMocks();
    /** @ts-ignore: Property 'doMock' does not exist on type ... */
    fetch.doMock();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("throws a DOMException with name 'AbortError' if the timeout is exceeded", async () => {
    /** @ts-ignore: Property 'mockAbortOnce' does not exist on type ... */
    fetch.mockAbortOnce();
    await expect(postData('https://example.com/')).rejects.toThrow('The operation was aborted.');
  });

});
