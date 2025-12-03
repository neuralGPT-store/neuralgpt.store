const fs = require('fs');
const fetch = require('node-fetch');
const { IreneScraper } = require('../skills/irene-scraper.js');

const IreneAutonomy = {

  async scanForSuppliers(urls) {
    let db = JSON.parse(fs.readFileSync('C:/neuralGPT.store/core/modules/irene/autonomy/provider-database.json'));

    for (let url of urls) {
      const html = await IreneScraper.getPage(url);
      if (!html) continue;

      const emails = IreneScraper.extractEmails(html);
      const vendors = IreneScraper.extractVendors(html);

      if (emails.length > 0 || vendors.length > 0) {
        db.push({
          source: url,
          emails: emails,
          vendors: vendors,
          date: new Date().toISOString()
        });
      }
    }

    fs.writeFileSync(
      'C:/neuralGPT.store/core/modules/irene/autonomy/provider-database.json',
      JSON.stringify(db, null, 2)
    );

    return 'Autonomy scan completed.';
  }
};


