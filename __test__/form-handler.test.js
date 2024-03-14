/** @jest-environment jsdom */
// @ts-check
'use strict';

import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

import { afterEach, beforeEach, describe, expect, jest, it } from '@jest/globals';

import { handleSubmit } from '../src/client/js/form-handler.js';
import * as urlChecker from '../src/client/js/url-checker.js';

const CANNED_ANALYSIS = {
  polarity: 'positive',
  agreement: 'agreement',
  subjectivity: 'objective',
  confidence: 42,
  irony: 'ironic',
  snippet: 'What do you get if you multiply six by nine?',
};

/**
 * Returns a subset of 'index.html' useful for the test.
 * @param {*} targetUrl
 * @returns
 */
function makePageSnippet(targetUrl) {
  return `
  <form class="" onsubmit="return clientlib.handleSubmit(event)">
    <input
      id="target-url"
      type="text"
      name="target-url"
      value="${targetUrl}"
      placeholder="Enter the URL of a web page to do sentiment analysis on"
    />
    <input
      id="submit-btn"
      type="submit"
      name="submit-btn"
      value="Submit"
      onclick="return clientlib.handleSubmit(event)"
    />
  </form>

  <div id="results"></div>

  <!-- Results template. -->
  <template id="results-template">
    <div class="results--snippet">
      <p>Page snippet:</p>
      <blockquote id="result-snippet"></blockquote>
    </div>
    <div class="results--features">
      <p>Page features:</p>
      <table class="results--features">
        <tbody>
          <tr>
            <th scope="row">Polarity</th>
            <td id="result-polarity"></td>
          </tr>
          <tr>
            <th scope="row">Agreement</th>
            <td id="result-agreement"></td>
          </tr>
          <tr>
            <th scope="row">Subjectivity</th>
            <td id="result-subjectivity"></td>
          </tr>
          <tr>
            <th scope="row">Confidence</th>
            <td id="result-confidence"></td>
          </tr>
          <tr>
            <th scope="row">Irony</th>
            <td id="result-irony"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
`;
}

describe('Testing functionality to submit the form', () => {
  beforeEach(() => {
    // Fetch.
    /** @ts-ignore: Property 'resetMocks' does not exist on type ... */
    fetch.resetMocks();
    /** @ts-ignore: Property 'doMock' does not exist on type ... */
    fetch.doMock();
  });

  afterEach(() => {
    // Mocks.
    jest.clearAllMocks();
  });

  it('displays an alert if the URL is invalid', () => {
    // Arrange.

    // Setup the document body.
    document.body.innerHTML = makePageSnippet('example.com');

    // Mock our 'isValidUrl' function to return false.
    const isValidSpy = jest.spyOn(urlChecker, 'isValidUrl').mockReturnValueOnce(false);

    // Mock the 'window.alert' function to do nothing.
    const alertSpy = jest.spyOn(window, 'alert').mockImplementationOnce(() => {});

    // Act.

    // Call our 'handleSubmit' function.
    /** @type {SubmitEvent} */
    // @ts-ignore: Type ... is missing the following properties from type 'SubmitEvent': ... .
    const mockSubmitEvent = { preventDefault: () => {} };
    handleSubmit(mockSubmitEvent);

    // Assert.

    expect(isValidSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Please, enter a valid URL and try again.');
  });

  it('analyzes the target page and updates the UI if the URL is valid', async () => {
    // Arrange.

    // Setup the document body.
    document.body.innerHTML = makePageSnippet('example.com');

    // Mock our 'isValidUrl' function to return true.
    const isValidSpy = jest.spyOn(urlChecker, 'isValidUrl').mockReturnValueOnce(true);

    // Mock the 'window.alert' function to do nothing.
    const alertSpy = jest.spyOn(window, 'alert').mockImplementationOnce(() => {});

    /** @ts-ignore: Property 'mockRejectOnce' does not exist on type ... */
    fetch.mockResponseOnce(JSON.stringify(CANNED_ANALYSIS));

    // Act.

    // Call our 'handleSubmit' function.
    /** @type {SubmitEvent} */
    // @ts-ignore: Type ... is missing the following properties from type 'SubmitEvent': ... .
    const mockSubmitEvent = { preventDefault: () => {} };
    // Do no forget to wait.
    await handleSubmit(mockSubmitEvent);

    // Assert.

    expect(isValidSpy).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    /** @ts-ignore */
    expect(document.querySelector('#result-snippet').textContent).toEqual(CANNED_ANALYSIS.snippet);
    /** @ts-ignore */
    expect(document.querySelector('#result-polarity').textContent).toEqual(
      CANNED_ANALYSIS.polarity,
    );
    /** @ts-ignore */
    expect(document.querySelector('#result-agreement').textContent).toEqual(
      CANNED_ANALYSIS.agreement,
    );
    /** @ts-ignore */
    expect(document.querySelector('#result-subjectivity').textContent).toEqual(
      CANNED_ANALYSIS.subjectivity,
    );
    /** @ts-ignore */
    expect(document.querySelector('#result-confidence').textContent).toEqual(
      `${CANNED_ANALYSIS.confidence}%`,
    );
    /** @ts-ignore */
    expect(document.querySelector('#result-irony').textContent).toEqual(CANNED_ANALYSIS.irony);
  });
});
