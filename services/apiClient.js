const fetch = require('node-fetch');

/**
 * A wrapper around node-fetch to standardize API calls.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options for the fetch call.
 * @returns {Promise<any>} - The JSON response from the API.
 */
async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed with status ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * A wrapper around node-fetch for fetching text data.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options for the fetch call.
 * @returns {Promise<string>} - The text response from the API.
 */
async function fetchText(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed with status ${response.status}: ${errorText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
        throw error;
    }
}


module.exports = { fetchJSON, fetchText };