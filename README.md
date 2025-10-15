# 3D Kitchen Model

An interactive, isometric-style 3D kitchen built with Three.js. The scene showcases a modern L-shaped kitchen, dining setup, rich materials (granite, tile, wood, metal), small appliances, and subtle lighting.

## Project structure

- `index.html` – Base page, loads Tailwind, Three.js, and OrbitControls, and wires the UI panels. Sets the header title shown on-page.
- `assets/css/styles.css` – Custom styles for layout and info panels.
- `assets/js/main.js` – Your Three.js scene code, interactions, and animation loop.

## Run locally

You can open `index.html` directly in a browser. If controls or textures fail due to CORS on some browsers, use a simple static server.

On Windows PowerShell you can run a tiny static server (recommended to avoid CORS issues):

```powershell
# Python 3
python -m http.server 5500 ; Start-Process http://localhost:5500/index.html

# Or Node (if installed)
npx serve . -l 5500 ; Start-Process http://localhost:5500/index.html
```

Or, just double-click `index.html` to open it directly in Chrome/Edge/Firefox.

## Controls

- Orbit: Left mouse drag
- Zoom: Mouse wheel / trackpad pinch
- Pan: Right mouse drag (limited)
- Click on highlighted items to view details in the right info panel

## Features

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

## Technical notes

- Three.js r128 and OrbitControls are loaded from CDNs to keep setup simple.
- The renderer and all CanvasTextures are configured for sRGB to keep colors accurate.
- Many materials use MeshStandardMaterial with tuned roughness/metalness for realism.
- Geometry is built from primitives for clarity and easy tweaking; dimensions are parameterized.

## Troubleshooting

- Black screen: reload the page and check the browser console. Texture encodings and materials are set, but errors will appear here if something is off.
- Colors look washed out: verify your display color profile and browser settings. sRGB is enabled in the renderer and textures.
- Slow performance: reduce window size or device pixel ratio (add `renderer.setPixelRatio(window.devicePixelRatio*0.75)` in `main.js`).

## Deploy

- GitHub Pages: enable Pages in repo Settings → Pages → Source: Deploy from a branch → `main` → `/root` to host `index.html`.
- Any static host: upload the repository files as-is (no build step required).

## License

This project is for educational purposes. Add a license if you plan to reuse or share broadly.
