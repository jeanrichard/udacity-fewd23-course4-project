// @ts-check
'use strict';

import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks();

import { beforeEach, describe, expect, it } from '@jest/globals';
import { postData } from '../src/client/js/form-handler.js';

/*
References:
- https://jestjs.io/docs/asynchronous
- https://www.npmjs.com/package/jest-fetch-mock
*/

const CANNED_ANALYSIS = {
  "polarity": "positive",
  "agreement": "agreement",
  "subjectivity": "objective",
  "confidence": 42,
  "irony": "ironic",
  "snippet": "What do you get if you multiply six by nine?"
};

describe('Testing functionality to POST a request and return a pair (response, JSON)', () => {

  beforeEach(() => {
    /** @ts-ignore: Property 'resetMocks' does not exist on type ... */
    fetch.resetMocks();
    /** @ts-ignore: Property 'doMock' does not exist on type ... */
    fetch.doMock();
  });

  it("throws the exception thrown by fetch", async () => {
    /** @ts-ignore: Property 'mockRejectOnce' does not exist on type ... */
    fetch.mockRejectOnce('network is down');

    expect.assertions(1);
    try {
      await postData("https//example.com/");
    } catch (err) {
      expect(err).toMatch('network is down');
    }
  });

  it("returns a pair (response, JSON) if the server sends JSON", async () => {
    /** @ts-ignore: Property 'mockRejectOnce' does not exist on type ... */
    fetch.mockResponseOnce(JSON.stringify(CANNED_ANALYSIS));
    const [_res, resData] = await postData("http://example.com/");
    expect(resData).not.toBeNull();
    expect(resData).toStrictEqual(CANNED_ANALYSIS);
  });

  it("return a pair (response, null) if the server does not send JSON", async () => {
    /** @ts-ignore: Property 'mockRejectOnce' does not exist on type ... */
    fetch.mockResponseOnce('not valid JSON');
    const [_res, resData] = await postData("http://example.com/");
    expect(resData).toBeNull();
  });

});
