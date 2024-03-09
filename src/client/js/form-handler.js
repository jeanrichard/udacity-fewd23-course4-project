// @ts-check
'use strict';

import { isValidUrl } from "./url-checker";

/*------------------------------------------------------------------------------------------------
 * Utilities
 *------------------------------------------------------------------------------------------------*/

const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Sends a POST request, and returns a pair (response, JSON).
 * May throw the same exceptions as 'fetch'.
 * @param {string} url the URL to use.
 * @param {any} data the data to send (will be serialized to JSON).
 * @param {number} timeoutMs the timeout, in ms (optional).
 * @returns {Promise<[Response, any]>} as described above.
 */
export async function postData(url, data = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    // We want strict timeouts on all API calls.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log('postData: Aborting fetch...');
        controller.abort();
    }, timeoutMs);
    try {
        // This may throw.
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
            // Serialize to JSON to match 'Content-Type' header.
            body: JSON.stringify(data),
            signal: controller.signal,
        });
        // At this point: we received status and headers.
        let resData = null;
        try {
            // This may throw.
            resData = await res.json();
            // At this point: we received and deserialized the body as JSON.
        } catch { }
        return [res, resData];
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Returns the submit button.
 * Convenience function to get the right type hint.
 * @returns {HTMLInputElement} as described above.
 */
function getSubmitButton() {
    /** @type {HTMLInputElement} */
    // @ts-ignore: Type 'HTMLInputElement | null' is not assignable ... .
    return document.querySelector('#submit-btn');
}

/**
 * Disables the submit button.
 */
function disableSubmit() {
    getSubmitButton().disabled = true;
}

/**
 * Enables the submit button.
 */
function enableSubmit() {
    getSubmitButton().disabled = false;
}

/*------------------------------------------------------------------------------------------------
 * Main part
 *------------------------------------------------------------------------------------------------*/

/**
 * The result of a sentiment analysis.
 * @typedef {Object} SentimentAnalysis
 * @property {string} polarity
 * @property {string} agreement
 * @property {string} subjectivity
 * @property {number} confidence
 * @property {string} irony
 * @property {string} snippet 
 */

/**
 * Base URL of our backend API:
 */
const BACKEND_API_BASE_URL = 'http://localhost:3000';

/**
 * Endpoint for sentiment analysis.
 */
// const SENTIMENT_ANALYSIS_ENDPOINT = `${BACKEND_API_BASE_URL}/analyze-sentiment`;
const SENTIMENT_ANALYSIS_ENDPOINT = `${BACKEND_API_BASE_URL}/test/analyze-sentiment`;

/**
 * Updates the UI.
 * 
 * @param {SentimentAnalysis} analysis  
 */
function displayResults(analysis) {
    // Retrieve the template and clone it.
    /** @type{ HTMLTemplateElement } */
    // @ts-ignore: Type 'HTMLTemplateElement | null' is not assignable ... .
    const resultTemplate = document.querySelector('#results-template');
    /** @type {DocumentFragment} */
    // @ts-ignoreType: Type 'Node' is missing the following properties ... .
    const resultFragment = resultTemplate.content.cloneNode(/*deep=*/true);

    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-snippet').textContent = analysis.snippet;
    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-polarity').textContent = analysis.polarity;
    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-agreement').textContent = analysis.agreement;
    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-subjectivity').textContent = analysis.subjectivity;
    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-confidence').textContent = `${analysis.confidence}%`;
    // @ts-ignore: Object is possibly 'null'.
    resultFragment.querySelector('#result-irony').textContent = analysis.irony;

    // Insert the fragment and replace the current one (if any).
    /** @type {HTMLElement} */
    // @ts-ignore: Type 'HTMLElement | null' is not assignable ... .
    const parent = document.querySelector('#results');
    parent.replaceChildren(resultFragment);
}

/**
 * Handles the submit event: 1) Validates the target URL. (Displays an alert and stops if invalid.)
 * 2) Contact the backend API to perform sentiment analysis. (Displays an alert and stops if error.)
 * 3) Updates the UI. Note: We disable the submit button while handling the event to prevent the 
 * user from triggering multiple concurrent requests.
 * 
 * @param {SubmitEvent} event the submit event.
 */
export async function handleSubmit(event) {
    console.log("::: Form submitted :::");

    // We do no want to submit the form.
    event.preventDefault();

    // We retrieve the URL.
    // @ts-ignore: Object is possibly 'null'.
    let targetUrl = document.getElementById('target-url').value
    if (!isValidUrl(targetUrl)) {
        alert('Please, enter a valid URL and try again.');
        return;
    }

    // Generic error message.
    const errMsg = `Failed to analyze page at URL='${targetUrl}'.`;

    try {
        // Disable submit button until response or error.
        disableSubmit();

        const endpoint = SENTIMENT_ANALYSIS_ENDPOINT;
        console.log('handleSubmit: endpoint:', endpoint);

        const [res, resData] = await postData(endpoint, { url: targetUrl });
        console.log('handleSubmit: res.status, resData:', res.status, resData);

        // We check the HTTP status code and the data.
        if (!res.ok || resData === null) {
            // Not a 2xx status.
            const buffer = [resData?.message || errMsg];
            if (res.status === 503) {
                buffer.push('Hint: The service may be overloaded, try again later.');
            }
            alert(buffer.join(' '));
            return;
        }

        displayResults(resData);
    } catch (err) {
        console.log('handleSubmit: err:', err);
        alert(errMsg);
    } finally {
        enableSubmit();
    }
}
