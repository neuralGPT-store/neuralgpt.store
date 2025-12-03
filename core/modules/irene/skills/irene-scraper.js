import fetch from 'node-fetch';

export const IreneScraper = {

  async getPage(url) {
    try {
      const res = await fetch(url);
      return await res.text();
    } catch {
      return null;
    }
  },

  extractEmails(text) {
    const regex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    return text.match(regex) || [];
  },

  extractVendors(text) {
    const lines = text.split('\n');
    return lines.filter(l =>
      l.toLowerCase().includes('arduino') ||
      l.toLowerCase().includes('raspberry') ||
      l.toLowerCase().includes('electronics') ||
      l.toLowerCase().includes('robotics')
    );
  }
};
