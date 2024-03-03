
// @ts-check
'use strict';

/**
 * Checks if a string contains a valid URL, and if that URL begins with an allowed scheme.
 * @param {string} text the text to check.
 * @param {string[]} protocols the allowed protocols.
 * @returns {boolean} `true` if the check is successful, and `false` otherwise.
 */
export function checkIsValidUrl(text, protocols = ['http:', 'https:']) {
    // The most robust way sseems to use the URL class constructor.
    try {
        // This may throw `TypeError`.
        const url = new URL(text);
        console.log('checkIsValidUrl, url:', url);
        return protocols.includes(url.protocol);
    } catch (err) {
        console.log('checkIsValidUrl, err:', err);
        return false;
    }
}
