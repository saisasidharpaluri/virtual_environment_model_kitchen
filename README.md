# Isometric Kitchen Study

This project separates HTML, CSS, and JavaScript for your Three.js kitchen scene.

## Files

- `index.html` – Base page, loads Tailwind, Three.js, and OrbitControls, and wires the UI panels.
- `assets/css/styles.css` – Custom styles for layout and info panels.
- `assets/js/main.js` – Your Three.js scene code, interactions, and animation loop.

## How to run

You can open `index.html` directly in a browser. If controls or textures fail due to CORS on some browsers, use a simple static server.

### Option A: Double-click

- Open `index.html` in Chrome/Edge/Firefox.

### Option B: Simple static server (recommended)

On Windows PowerShell run:

```powershell
# Python 3
python -m http.server 5500 ; Start-Process http://localhost:5500/index.html

# Or Node (if installed)
npx serve . -l 5500 ; Start-Process http://localhost:5500/index.html
```

## Notes

- External CDNs are used for Three.js r128 and OrbitControls to match your original file.
- Info panel content is sourced from `userData` on intersected meshes; components created with either `details.description` or `details.desc` will display correctly.

## Current scene highlights

- Enlarged kitchen with L-shaped base cabinets and granite countertops.
- Dining table (6 chairs) positioned near the front-right, chairs arranged and oriented realistically.
- Dark, high-contrast backsplash applied across counter-mounted walls; decorative panels retained with trim.
- Small appliances and details: 4-burner cooktop with oven, sink with faucet, toaster, kettle, spice rack, utensil holder, fruit bowl, and a detailed coffee maker.
- Wall-mounted drinking water purifier (replaces geyser), colored white with navy accent and translucent tank window.
- Upper cabinet doors with brass handles and a warm under-cabinet light bar.
- Realistic bar stools behind the island: round wood seat, black metal legs, chrome footrest ring.
- Left wall has a colored wainscot with chair rail and baseboard for visual interest.
- Door removed from the scene per latest request.

## Troubleshooting

- If the scene appears too dark or color-shifted, ensure sRGB encoding is enabled (already set in `assets/js/main.js`).
- If you see a black screen, reload the page; check the browser console for errors. The code sets texture encodings and avoids undefined material references.
