// @ts-check
'use strict';

// Node.
import { cwd } from 'node:process';

// Express and other dependencies.
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { body, matchedData, validationResult } from 'express-validator';

import { CANNED_ANALYSIS } from './mock-api.mjs';

/*------------------------------------------------------------------------------------------------
 * Environment variables
 *------------------------------------------------------------------------------------------------*/

dotenv.config();
const meaningCloudApiKey = process.env.MEANING_CLOUD_API_KEY || '';

/*------------------------------------------------------------------------------------------------
 * Utilities
 *------------------------------------------------------------------------------------------------*/

const DEFAULT_TIMEOUT_MS = 5_000; // 5 seconds.

/**
 * Retrieves a resource using GET, and returns a pair (response, deserialized JSON).
 *
 * @param {string} url the URL to use.
 * @param {number} timeoutMs the timeout, in ms (optional).
 * @returns {Promise<[Response, any]>} as described above.
 */
async function getData(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // We want strict timeouts on all API calls.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('getData: Aborting fetch...');
    controller.abort();
  }, timeoutMs);
  try {
    // This may throw.
    const res = await fetch(url, { signal: controller.signal });
    // At this point: we received status and headers.
    let resData = null;
    try {
      // This may throw.
      resData = await res.json();
      // At this point: we received and deserialized the body as JSON.
    } catch {}
    return [res, resData];
  } finally {
    clearTimeout(timeoutId);
  }
}

/*------------------------------------------------------------------------------------------------
 * Integrating the MeaningCloud API
 *------------------------------------------------------------------------------------------------*/

// See https://learn.meaningcloud.com/developer/sentiment-analysis/2.1/doc.

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
 * Base URL of the Sentiment Analysis API, version 2.1 (up to and including the version number):
 */
const SENTIMENT_ANALYSIS_API_BASE_URL = 'https://api.meaningcloud.com/sentiment-2.1';

/**
 * Maps score to a textual description.
 * @type {Map<string, string>}
 */
const SCORE_TAG_TO_POLARITY = (() => {
  const m = new Map();
  m.set('P+', 'very positive');
  m.set('P', 'positive');
  m.set('NEU', 'neutral');
  m.set('N', 'negative');
  m.set('N+', 'very negative');
  m.set('NONE', 'without polarity');
  return m;
})();

/**
 * Builds the request URL to do sentiment analysis.
 *
 * @param {string} url the URL of the web page to analyze.
 * @param {string} apiKey the API key to use.
 * @returns {string} as described above.
 */
function sentimentMakeUrl(url, apiKey) {
  const reqUrlObj = new URL(SENTIMENT_ANALYSIS_API_BASE_URL);
  reqUrlObj.search = new URLSearchParams({
    key: apiKey,
    lang: 'auto', // Perform language detection on the target page.
    ilang: 'en', // Return values in English.
    url: url,
  }).toString();
  return reqUrlObj.toString();
}

/**
 * Builds an excerpt made of trimmed sentences, joined by a separator. Trimmed sentences are added
 * until their cumulated length is ≥ `stopLength`.
 *
 * @param {any} resData deserialized JSON returned by the API.
 * @param {number} stopLength as described above.
 * @param {string} separator as described above.
 * @returns {String} as described above.
 */
function sentimentGetSnippet(resData, stopLength = 200, separator = ' ') {
  /** @type {Array<String>} */
  const buffer = [];
  let cumLen = 0;
  for (const sentence of resData.sentence_list) {
    /* @type {String} */
    const text = sentence?.text?.trim() || '';
    if (text.length > 0) {
      buffer.push(text);
      cumLen += text.length;
      if (cumLen >= stopLength) {
        break;
      }
    }
  }
  return buffer.join(separator);
}

/**
 * Checks the response and maps the API error code to an HTTP status.
 *
 * @param {any} resData deserialized JSON returned by the API.
 * @param {string} errMsg a generic error message.
 * @returns {[number, any]} a pair (HTTP status, data) to return.
 */
function sentimentCheckResponse(resData, errMsg) {
  // See https://www.meaningcloud.com/developer/documentation/error-codes.
  /** @type {string} */
  const apiCode = resData?.status?.code || '';

  if (apiCode === '0') {
    // OK
    const polarity = SCORE_TAG_TO_POLARITY.get(resData.score_tag) || 'n/a';
    const snippet = sentimentGetSnippet(resData);
    /** @type {SentimentAnalysis} */
    const analysis = {
      polarity,
      agreement: resData.agreement.toLowerCase(),
      subjectivity: resData.subjectivity.toLowerCase(),
      confidence: parseInt(resData.confidence),
      irony: resData.irony.toLowerCase(),
      snippet,
    };
    return [200, analysis];
  }

  // There was an error.
  switch (apiCode) {
    case '103': // Request too large
      return [
        400,
        {
          message: [errMsg, 'Hint: The page is probably too large.'].join(' '),
        },
      ];
    case '202': // Engine internal error
    case '203': // Cannot connect to service
      return [503, { message: errMsg }];
    case '212': // No content to analyze.
      return [
        400,
        {
          message: [
            errMsg,
            'Hint: Make sure that the URL is valid and that the page is public.',
          ].join(' '),
        },
      ];
    default:
      // Map all other API codes to 500.
      return [500, { message: errMsg }];
  }
}

/**
 * Uses the MeaningCloud Sentiment Analysis API to do sentiment analysis on a given web page.
 *
 * @param {string} url the URL of the page to analyze.
 * @param {string} apiKey the API key to use.
 * @param {number} timeoutMs the timeout, in ms (optional).
 * @returns {Promise<[number, any]>} see the documentation of the
 * {@link https://learn.meaningcloud.com/developer/sentiment-analysis/2.1/doc |Sentiment Analysis API}.
 */
async function sentimentAnalyze(url, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // Generic error message.
  const errMsg = `Failed to analyze page at URL='${url}'.`;

  // We build the request URL.
  const reqUrl = sentimentMakeUrl(url, apiKey);
  console.log('analyzeSentiment: reqUrl:', reqUrl);

  // We send the request to the API.
  try {
    // This may throw.
    const [res, resData] = await getData(reqUrl, timeoutMs);
    console.log('analyzeSentiment: res.status, resData:', res.status, resData);

    // 1. We check the HTTP status code.
    if (!res.ok || resData === null) {
      // Not a 2xx status.
      if (res.status == 503) {
        return [503, { message: errMsg }];
      } else {
        // Map all other errors to 500.
        return [500, { message: errMsg }];
      }
    }

    // 2. We check the API error code.
    return sentimentCheckResponse(resData, errMsg);
  } catch (err) {
    console.log('analyzeSentiment: err:', err);
    if (err.name == 'AbortError') {
      return [503, { message: errMsg }];
    } else {
      // Map all other errors to 500.
      return [500, { message: errMsg }];
    }
  }
}

/*------------------------------------------------------------------------------------------------
 * Handlers
 *------------------------------------------------------------------------------------------------*/

/**
 * Handles a request for sentiment analysis.
 * Note: We return a 400 - Bad Request if the request failed validation.
 *
 * @param {express.Request} req the request.
 * @param {express.Response} res the response.
 */
async function handleAnalyzeSentiment(req, res) {
  console.log('handleAnalyzeSentiment: req.body:', req.body);
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // There are validation errors.
    res.status(400).send({
      message: 'Invalid argument(s).',
      errors: result.array(),
    });
  } else {
    const reqData = matchedData(req);
    const [resStatus, resData] = await sentimentAnalyze(reqData.url, meaningCloudApiKey);
    res.status(resStatus).send(resData);
  }
  // Required for POST.
  res.end();
}

/**
 * Behaves exactly like 'handleAnalyzeSentiment' but returns canned data.
 * Note: Used for testing purposes.
 *
 * @param {express.Request} req the request.
 * @param {express.Response} res the response.
 */
async function handleAnalyzeSentimentTest(req, res) {
  console.log('handleAnalyzeSentimentTest: req.body:', req.body);
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // There are validation errors.
    res.status(400).send({
      message: 'Invalid argument(s).',
      errors: result.array(),
    });
  } else {
    res.send(CANNED_ANALYSIS);
  }
  // Required for POST.
  res.end();
}

/*------------------------------------------------------------------------------------------------
 * Main part
 *------------------------------------------------------------------------------------------------*/

/** The port to listen on. */
const PORT = 3000;

/** The runtime environment: 'production' or 'development'. */
const runenv = process.env.NODE_ENV || 'development';

/* Express application. */

const app = express();

/* Middlewares. */

// Automatically parse POST requests with
// Content-Type: application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Automatically parse POST requests with
// Content-Type: application/json
app.use(express.json());

// Tell the browser to allow cross-origin requests for all origins.
app.use(cors());

// Enable serving static content.
app.use(express.static('./dist'));

/* Routes. */

app.get('/', function (_req, res) {
  // Assumption: server run from parent directory of 'dist'.
  res.sendFile('dist/index.html');
});

/**
 * Builds the validation chain to use for the 'analyze-sentiment' end-point.
 * @returns {import('express-validator').ValidationChain} as described above.
 */
function validateAnalyzeSentiment() {
  return body('url')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
    })
    .withMessage('must be a valid URL');
}

app.post('/analyze-sentiment', [validateAnalyzeSentiment()], handleAnalyzeSentiment);

// We only add test endpoints in development.
if (runenv === 'development') {
  console.log('Adding test endpoints...');
  app.post('/test/analyze-sentiment', [validateAnalyzeSentiment()], handleAnalyzeSentimentTest);
}

/* Server. */

// Start the server.
const server = app.listen(PORT, () => {
  console.log(`Express app running on localhost: ${PORT}`);
  console.log(`Express app cwd: ${cwd()}`);

  // Validate the configuration.
  if (meaningCloudApiKey === '') {
    console.log(
      [
        'ERROR:',
        "Environment variable 'MEANING_CLOUD_API_KEY' is not set or empty.",
        'Stopping.',
      ].join(' '),
    );
    server.close();
  }
});

// Uncomment to print all properties of the server to the console.
// console.log(server);
