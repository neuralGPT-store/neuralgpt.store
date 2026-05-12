<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Sitemap XML — neuralgpt.store</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #00040D;
            color: #e6f0ff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 40px 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 60px;
            padding: 40px 20px;
            border: 1.5px solid rgba(0, 234, 255, 0.3);
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(0, 234, 255, 0.05), rgba(127, 0, 255, 0.05));
          }
          h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #00eaff, #7f00ff, #ff0080);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
          }
          .subtitle {
            color: #7a8ba0;
            font-size: 1rem;
          }
          .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 30px;
            flex-wrap: wrap;
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #00eaff;
          }
          .stat-label {
            font-size: 0.85rem;
            color: #7a8ba0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .url-list {
            display: grid;
            gap: 12px;
          }
          .url-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(0, 234, 255, 0.15);
            border-radius: 12px;
            transition: all 0.3s ease;
            flex-wrap: wrap;
            gap: 12px;
          }
          .url-item:hover {
            border-color: #00eaff;
            background: rgba(0, 234, 255, 0.05);
            transform: translateX(4px);
          }
          .url-loc {
            flex: 1;
            min-width: 200px;
          }
          .url-loc a {
            color: #e6f0ff;
            text-decoration: none;
            word-break: break-all;
          }
          .url-loc a:hover {
            color: #00eaff;
            text-decoration: underline;
          }
          .url-meta {
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            font-size: 0.75rem;
            font-weight: 600;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-priority {
            background: rgba(0, 234, 255, 0.15);
            color: #00eaff;
            border: 1px solid rgba(0, 234, 255, 0.3);
          }
          .badge-changefreq {
            background: rgba(127, 0, 255, 0.15);
            color: #7f00ff;
            border: 1px solid rgba(127, 0, 255, 0.3);
          }
          .badge-lastmod {
            background: rgba(255, 0, 128, 0.15);
            color: #ff0080;
            border: 1px solid rgba(255, 0, 128, 0.3);
          }
          .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid rgba(0, 234, 255, 0.15);
            color: #7a8ba0;
            font-size: 0.9rem;
          }
          .footer a {
            color: #00eaff;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media (max-width: 768px) {
            h1 { font-size: 1.8rem; }
            .stats { gap: 20px; }
            .url-item { flex-direction: column; align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sitemap XML</h1>
            <p class="subtitle">neuralgpt.store — Portal Inmobiliario Premium</p>
            <div class="stats">
              <div class="stat">
                <div class="stat-value"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
                <div class="stat-label">URLs</div>
              </div>
            </div>
          </div>

          <div class="url-list">
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <div class="url-item">
                <div class="url-loc">
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="sitemap:loc"/>
                    </xsl:attribute>
                    <xsl:value-of select="sitemap:loc"/>
                  </a>
                </div>
                <div class="url-meta">
                  <xsl:if test="sitemap:priority">
                    <span class="badge badge-priority">
                      <xsl:text>Priority: </xsl:text>
                      <xsl:value-of select="sitemap:priority"/>
                    </span>
                  </xsl:if>
                  <xsl:if test="sitemap:changefreq">
                    <span class="badge badge-changefreq">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </span>
                  </xsl:if>
                  <xsl:if test="sitemap:lastmod">
                    <span class="badge badge-lastmod">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </span>
                  </xsl:if>
                </div>
              </div>
            </xsl:for-each>
          </div>

          <div class="footer">
            <p>© 2025–2026 neuralgpt.store · <a href="/">Volver al inicio</a> · <a href="/real-estate-index.html">Portal inmobiliario</a></p>
            <p style="margin-top: 10px; font-size: 0.85rem;">Este sitemap XML está optimizado para motores de búsqueda y navegación humana.</p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
