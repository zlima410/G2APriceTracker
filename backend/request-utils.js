function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(axios, url, config = {}, { maxRetries = 4, baseDelayMs = 2000 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      return await axios.get(url, config);
    } catch (err) {
      const status = err.response?.status;

      if (status === 429 && attempt < maxRetries) {
        const retryAfterHeader = err.response.headers?.["retry-after"];
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
        const backoffMs = retryAfterMs ?? baseDelayMs * 2 ** attempt;

        console.warn(`429 from ${url} — waiting ${Math.round(backoffMs)}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(backoffMs);
        attempt++;
        continue;
      }

      throw err;
    }
  }
}

module.exports = { sleep, getWithRetry };