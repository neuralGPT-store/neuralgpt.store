const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { IreneScraper } = require('../skills/irene-scraper.js');

const IreneAutonomy = {

  async scanForSuppliers(urls) {
    const dbPath = path.join(__dirname, 'provider-database.json');
    let db = [];
    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(raw || '[]');
    } catch (e) {
      db = [];
    }

    for (let url of urls) {
      const html = await IreneScraper.getPage(url);
      if (!html) continue;

      const emails = IreneScraper.extractEmails(html);
      const vendors = IreneScraper.extractVendors(html);

      if ((emails && emails.length > 0) || (vendors && vendors.length > 0)) {
        db.push({
          source: url,
          emails: emails,
          vendors: vendors,
          date: new Date().toISOString()
        });
      }
    }

    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (e) {
      // best-effort write; log to console but do not throw
      console.error('Failed to write provider database', e);
    }

    return 'Autonomy scan completed.';
  }
};

module.exports = { IreneAutonomy };


