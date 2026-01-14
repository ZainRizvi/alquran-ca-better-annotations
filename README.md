# AlQuran.ca Better Annotations

A Chrome extension that adds brackets around italicized translator annotations on [alquran.ca/read](https://alquran.ca/read) for better readability.

## What it does

The translator of this Quran translation uses italics to indicate their own annotations/explanations that are not part of the original Arabic text. This extension wraps those italicized sections in brackets `[like this]` to make them more visually distinct.

**Before:** *the One who is* Beneficent *to believers and* unbelievers

**After:** [the One who is] Beneficent [to believers and] unbelievers

Adjacent italic sections separated only by punctuation or whitespace are merged into a single bracketed group.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this folder (`alQuranCaPlugin`)
5. Navigate to https://alquran.ca/read - brackets will appear automatically

## Disabling

To temporarily disable the extension:
1. Go to `chrome://extensions/`
2. Find "AlQuran.ca better annotations"
3. Toggle the switch to disable

## Publishing to Chrome Web Store

1. **Create a developer account** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)

2. **Build the package:**
   ```bash
   npm run package
   ```
   This creates `alquran-ca-better-annotations.zip`

3. **Upload to Chrome Web Store:**
   - Go to the Developer Dashboard
   - Click "New Item"
   - Upload the zip file
   - Fill in store listing (description, screenshots, category)
   - Submit for review

4. **Wait for review** (typically 1-3 business days)

## Development

**Regenerate icons** (if you modify `icons/logo source.png`):
```bash
npm install
npm run generate-icons
```

## Files

- `manifest.json` - Chrome extension configuration
- `content.js` - Script that adds brackets to italic text
- `icons/` - Extension icons (16x16, 48x48, 128x128)
- `scripts/generate-icons.js` - Icon generation from source image
