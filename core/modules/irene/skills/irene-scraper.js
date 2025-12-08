const fetch = require('node-fetch');

const IreneScraper = {

  async getPage(url) {
    try {
      // External scraping disabled by repository policy.
      // fetch(url) is commented out to avoid retrieving remote pages.
      // To enable scraping, confirm explicit authorization and
      // implement server-side safeguards.
      // const res = await fetch(url);
      // return await res.text();
      return null;
    } catch (err) {
      return null;
    }
  },

  extractEmails(text) {
    const regex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    return text.match(regex) || [];
  },

  extractVendors(text) {
    const lines = (text || '').split('\n');
    return lines.filter(l =>
      l.toLowerCase().includes('arduino') ||
      l.toLowerCase().includes('raspberry') ||
      l.toLowerCase().includes('electronics') ||
      l.toLowerCase().includes('robotics')
    );
  }
};

module.exports = { IreneScraper };
