// @ts-check
'use strict';

import { checkIsValidUrl } from "./url-checker";

const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Sends a POST request, and returns a pair (response, JSON).
 * @param {string} url the URL to use.
 * @param {any} data the data to send (will be serialized to JSON).
 * @param {number} timeoutMs the timeout, in ms (optional).
 * @returns {Promise<[Response, any]>} as described above.
 */
const postData = async (url, data = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
    // We want strict timeouts on all API calls.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
        });
        // At this point: we received status and headers.
        let resData = null;
        try {
            // This may throw.
            resData = await res.json();
            // At this point: we received and deserialized the body as JSON.
        } catch (_) { }
        return [res, resData];
    } finally {
        clearTimeout(timeoutId);
    }
};

export async function handleSubmit(event) {
    console.log("::: Form Submitted :::");

    // We do no want to submit the form.
    event.preventDefault();

    // We retrieve the URL.
    // @ts-ignore: Object is possibly 'null'.
    let targetUrl = document.getElementById('target-url').value
    if (!checkIsValidUrl(targetUrl)) {
        alert('Please, enter a valid URL and try again.');
        return;
    }

    try {
        const [res, resData] = await postData('http://localhost:3000/test/analyze-sentiment', { url: targetUrl });
        console.log('handleSubmit: res.status, resData:', res.status, resData);

        // Retrieve the template and clone it.
        /** @type{ HTMLTemplateElement } */
        // @ts-ignore: Type 'HTMLTemplateElement | null' is not assignable ... .
        const resultsTemplate = document.querySelector('#results-template');
        /** @type {DocumentFragment} */
        // @ts-ignoreType: Type 'Node' is missing the following properties ... .
        const resultsFragment = resultsTemplate.content.cloneNode(/*deep=*/true);

        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-snippet').textContent = resData.snippet;
        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-polarity').textContent = resData.polarity;
        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-agreement').textContent = resData.agreement;
        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-subjectivity').textContent = resData.subjectivity;
        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-confidence').textContent = `${resData.confidence}%`;
        // @ts-ignore: Object is possibly 'null'.
        resultsFragment.querySelector('#result-irony').textContent = resData.irony;

        // Insert the fragment.
        /** @type {HTMLElement} */
        // @ts-ignore: Type 'HTMLElement | null' is not assignable ... .
        const parent = document.querySelector('#results');
        parent.replaceChildren(resultsFragment);
    } catch (err) {
        console.log('handleSubmit: err:', err);
    }
}
