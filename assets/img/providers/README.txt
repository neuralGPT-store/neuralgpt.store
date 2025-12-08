This folder holds provider logo assets referenced by `data/providers-data.json`.
Currently the sample dataset references SVG logos (aurora.svg, robomech.svg, sensoria.svg, 3dform.svg, edgecore.svg, neurochips.svg, biomech.svg, devboard.svg, semiconix.svg).

If you don't have real logos yet, you can create simple placeholder SVGs with the company name to avoid 404s.
Example placeholder generation (PowerShell):

$companies = @("aurora","robomech","sensoria","3dform","edgecore","neurochips","biomech","devboard","semiconix")
foreach ($c in $companies) {
  $svg = "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120'><rect width='100%' height='100%' fill='#0b0f1a'/><text x='50%' y='50%' fill='#00e5ff' font-family='Arial' font-size='28' text-anchor='middle' dominant-baseline='middle'>" + ($c.ToUpper()) + "</text></svg>"
  $svg | Out-File -FilePath "assets/img/providers/$c.svg" -Encoding utf8
}

This will create simple branded placeholders until you provide real assets.
