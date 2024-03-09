// @ts-check
'use strict';

/**
 * 
 * @param {*} event 
 */
export function handleAbout(event) {
    console.log("::: About information requested :::");

    // We do no want to submit the form.
    event.preventDefault();

    alert("Front End Web Developer Udacity Nanodegree 2023-2024 - Course 4 Project: Evaluate a News Article with NLP");
}
