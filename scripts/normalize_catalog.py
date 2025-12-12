#!/usr/bin/env python3
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
ASSETS_PROD = ROOT / 'assets' / 'img' / 'products'
ASSETS_PROV = ROOT / 'assets' / 'img' / 'providers'

PRODUCTS_FILE = DATA_DIR / 'product-catalog.json'
PROVIDERS_FILE = DATA_DIR / 'providers-data.json'

PLACEHOLDER_PROD = ASSETS_PROD / 'placeholder.webp'
PLACEHOLDER_PROV = ASSETS_PROV / 'logo-placeholder.webp'

CATEGORY_MAP = {
    'development-boards': 'development-boards',
    'devboards': 'development-boards',
    'robotics': 'robotics',
    'motors': 'robotics',
    'actuators': 'robotics',
    'electronics': 'electronics',
    'components': 'electronics',
    '3d-printing': '3d-printing',
    'biomech': 'cybernetics',
    'biomechanics': 'cybernetics',
    'sensors': 'sensors',
    'npu': 'ai-modules',
    'accelerators': 'ai-modules',
    'npu-stick': 'ai-modules',
    'computing': 'computing'
}

def ensure_dirs():
    ASSETS_PROD.mkdir(parents=True, exist_ok=True)
    ASSETS_PROV.mkdir(parents=True, exist_ok=True)
    if not PLACEHOLDER_PROD.exists():
        PLACEHOLDER_PROD.write_bytes(b"")
    if not PLACEHOLDER_PROV.exists():
        PLACEHOLDER_PROV.write_bytes(b"")

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path.with_suffix('.bak.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def normalize_tag(t):
    return t.strip().lower()

def map_category(cat):
    if not cat:
        return 'electronics'
    c = cat.strip().lower()
    return CATEGORY_MAP.get(c, c)

def main():
    ensure_dirs()
    products = load_json(PRODUCTS_FILE)
    providers = load_json(PROVIDERS_FILE)

    provider_ids = {p.get('id'): p for p in providers}

    modified_providers = False

    for prod in products:
        pid = prod.get('id')
        # vendorId check
        vendor_id = prod.get('vendorId')
        vendor_name = prod.get('vendorName') or prod.get('vendor')

        if vendor_id and vendor_id not in provider_ids:
            # create minimal provider entry
            newprov = {
                'id': vendor_id,
                'name': vendor_name or vendor_id,
                'sector': 'unknown',
                'country': 'UN',
                'shortDescription': 'Proveedor agregado automáticamente: revisar y completar datos.',
                'vendorLink': '',
                'commissionTier': 'STANDARD',
                'commissionRate': 15,
                'categories': [prod.get('category') or 'components'],
                'logo': '/assets/img/providers/logo-placeholder.webp',
                'payoutInfoReal': {},
                'payoutInfoMasked': {},
                'compliance': {}
            }
            providers.append(newprov)
            provider_ids[vendor_id] = newprov
            modified_providers = True

        # ensure vendorName exists
        if not prod.get('vendorName') and vendor_id in provider_ids:
            prod['vendorName'] = provider_ids[vendor_id].get('name')

        # normalize category
        cat = prod.get('category')
        prod['category'] = map_category(cat)

        # normalize tags
        tags = prod.get('tags') or []
        if isinstance(tags, list):
            normalized = []
            for t in tags:
                nt = normalize_tag(t)
                if nt and nt not in normalized:
                    normalized.append(nt)
            prod['tags'] = normalized
        else:
            prod['tags'] = [normalize_tag(str(tags))]

        # image path
        target = ASSETS_PROD / f"{pid}.webp"
        if target.exists():
            prod['image'] = f"assets/img/products/{pid}.webp"
        else:
            prod['image'] = 'assets/img/products/placeholder.webp'

    # provider logos: ensure path points to /assets/img/providers/ and placeholder if missing file
    for p in providers:
        logo = p.get('logo','').strip()
        if logo.startswith('/core/assets'):
            logo = logo.replace('/core/assets/img/providers/', '/assets/img/providers/')
        # check file exists; if not, set placeholder
        logo_path = ROOT / logo.lstrip('/') if logo else None
        if not logo or not logo_path.exists():
            p['logo'] = '/assets/img/providers/logo-placeholder.webp'
        else:
            p['logo'] = logo

    # save files
    save_json(PROVIDERS_FILE, providers)
    save_json(PRODUCTS_FILE, products)

    print('Normalization complete. Backups written with .bak.json suffix.')

if __name__ == '__main__':
    main()
