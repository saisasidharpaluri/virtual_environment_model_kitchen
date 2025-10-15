// --- Core Setup Variables ---
let scene, renderer, camera, controls;
let raycaster, mouse;

const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;

// Configuration for Orthographic Camera to achieve Isometric Projection
const frustumSize = 16; 
const halfFrustum = frustumSize / 2;

const infoPanel = document.getElementById('component-details');
const detailName = document.getElementById('detail-name');
const detailDesc = document.getElementById('detail-description');
const detailSpecs = document.getElementById('detail-specs');

/**
 * Function to create an object with metadata for the info system.
 */
function createComponent(geometry, material, position, name, details) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Attach metadata for raycasting and information display
  const description = details?.description ?? details?.desc ?? '';
  const specs = details?.specs ?? '';
  mesh.userData = { 
    isComponent: true, 
    name: name, 
    details: description, 
    specs: specs 
  };
  return mesh;
}

/**
 * Initializes the Three.js scene, camera, renderer, and lighting.
 */
function init() {
  // 1. Scene Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x555555); // Darker gray background from image

  // 2. Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  // Improve color correctness
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  document.body.appendChild(renderer.domElement);

  // 3. Isometric Camera Setup (Orthographic)
  camera = new THREE.OrthographicCamera(
    -halfFrustum * aspect, // left
     halfFrustum * aspect, // right
     halfFrustum,          // top
    -halfFrustum,          // bottom
     0.1,                  // near
     1000                  // far
  );

  // Position the camera to get a classic 30-degree isometric view angle
  camera.position.set(12, 12, 12);
  camera.lookAt(scene.position);

  // 4. Controls Setup
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; 
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minZoom = 0.5;
  controls.maxZoom = 3.0;
  // Constrain rotation
  controls.minPolarAngle = Math.PI / 4; 
  controls.maxPolarAngle = Math.PI / 2.5; 

  // 5. Lighting Setup
  setupLighting();

  // 6. Build the Kitchenette Scene
  buildKitchenette();

  // 6b. Recenter view: raise target slightly so model appears lower on screen
  if (controls) {
    controls.target.set(0, 1.2, 0); // adjust this value to nudge scene up/down
    controls.update();
  }

  // 7. Raycaster Setup for Interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  window.addEventListener('click', onMouseClick, false);
  window.addEventListener('resize', onWindowResize, false);
}

/**
 * Sets up the lighting: Ambient and Directional (Sun) + new features.
 */
function setupLighting() {
  // Ambient Light: Provides general illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // Directional Light: Simulates sunlight from the large window
  const sunLight = new THREE.DirectionalLight(0xfffff0, 1.2); 
  sunLight.position.set(-15, 20, -10); // Coming from the left/back to simulate window light
  sunLight.castShadow = true;

  // Configure shadow properties
  sunLight.shadow.mapSize.width = 2048; 
  sunLight.shadow.mapSize.height = 2048;
  const d = 20; 
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 60;

  scene.add(sunLight);
  
  // A faint fill light to soften shadows on the right
  const fillLight = new THREE.PointLight(0xfff5dd, 0.3, 20, 2);
  fillLight.position.set(5, 4, 5);
  scene.add(fillLight);
}

/**
 * Creates the structural elements and kitchen furniture using primitives.
 */
function buildKitchenette() {
  // --- Materials (Matching Image Reference) ---
  // Helper: create a repeating tile texture using Canvas
  function createTileTexture({ tileColor = '#dfe6ea', groutColor = '#a9b0b6', tilePx = 128, groutPx = 4, jitter = 0 }) {
    const size = tilePx + groutPx; // one tile cell including grout on one side
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw grout background
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, size, size);

    // Optional slight color variation for tile body
    let base = tileColor;
    if (jitter > 0) {
      const c = parseInt(tileColor.replace('#',''), 16);
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
      const j = (v) => Math.max(0, Math.min(255, v + Math.floor((Math.random()*2-1)*jitter)));
      base = `rgb(${j(r)},${j(g)},${j(b)})`;
    }

    // Draw tile square leaving groutPx margins at top/left to form grid when repeated
    ctx.fillStyle = base;
    ctx.fillRect(groutPx, groutPx, tilePx - groutPx, tilePx - groutPx);

    const tx = new THREE.CanvasTexture(canvas);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.anisotropy = 4;
    tx.encoding = THREE.sRGBEncoding;
    tx.needsUpdate = true;
    return tx;
  }

  // Helper: create a speckled granite texture using Canvas
  function createGraniteTexture({ base = '#3a3a3a', speckles = ['#d9d9d9', '#7a7a7a', '#111111'], count = 800 }) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    // base
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    // subtle cloudy variation
    for (let i = 0; i < 2000; i++) {
      const x = Math.random()*size, y = Math.random()*size;
      const r = Math.random()*2 + 0.5;
      const alpha = 0.02;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    }
    // speckles
    for (let i = 0; i < count; i++) {
      const x = Math.random()*size, y = Math.random()*size;
      const r = Math.random()*1.8 + 0.2;
      ctx.fillStyle = speckles[Math.floor(Math.random()*speckles.length)];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    }
    const tx = new THREE.CanvasTexture(canvas);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.anisotropy = 4;
    tx.encoding = THREE.sRGBEncoding;
    tx.needsUpdate = true;
    return tx;
  }

  // Materials
  // Warmer floor tiles
  const tileTexFloor = createTileTexture({ tileColor: '#eae3d6', groutColor: '#c7bfb4', tilePx: 196, groutPx: 6, jitter: 4 });
  const tileTexWall = createTileTexture({ tileColor: '#ffffff', groutColor: '#cfd6db', tilePx: 90, groutPx: 4, jitter: 0 });
  // Decorative patterned tile for backsplash
  function createDecorTileTexture() {
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    // background
    ctx.fillStyle = '#f7f1e9';
    ctx.fillRect(0,0,size,size);
    // vibrant star/flower motif: layered rotated squares (teal/mustard/terra)
    function star(x, y, r, colors) {
      ctx.save();
      ctx.translate(x,y);
      for (let i=0;i<3;i++){
        ctx.rotate(Math.PI/4);
        ctx.fillStyle = colors[i%colors.length];
        ctx.beginPath();
        ctx.moveTo(-r,0); ctx.lineTo(0,-r); ctx.lineTo(r,0); ctx.lineTo(0,r); ctx.closePath();
        ctx.fill();
        r *= 0.7;
      }
      ctx.restore();
    }
    const colors = ['#2b8a83','#ffb703','#cc6b49'];
    for (let y=0; y<=size; y+=64){
      for (let x=0; x<=size; x+=64){
        star(x+16, y+16, 22, colors);
      }
    }
    // dot accents
    ctx.fillStyle = '#2b3a67';
    for (let y=0; y<=size; y+=32){
      for (let x=0; x<=size; x+=32){
        ctx.beginPath(); ctx.arc(x+8,y+8,2.2,0,Math.PI*2); ctx.fill();
      }
    }
    const tx = new THREE.CanvasTexture(canvas);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.anisotropy = 4;
    tx.encoding = THREE.sRGBEncoding;
    tx.needsUpdate = true;
    return tx;
  }
  const tileTexDecor = createDecorTileTexture();
  // Dark, high-contrast backsplash texture for visibility
  function createBacksplashDarkTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    // deep navy background
    ctx.fillStyle = '#1f2a44';
    ctx.fillRect(0,0,size,size);
    // geometric lattice (diamonds) with bright accents
    ctx.strokeStyle = '#3ec1a9';
    ctx.lineWidth = 3;
    const step = 32;
    for (let y = -step; y <= size + step; y += step) {
      for (let x = -step; x <= size + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step/2, y + step/2);
        ctx.lineTo(x, y + step);
        ctx.lineTo(x - step/2, y + step/2);
        ctx.closePath();
        ctx.stroke();
      }
    }
    // small mustard dots at intersections
    ctx.fillStyle = '#ffb703';
    for (let y = 0; y <= size; y += step) {
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }
    const tx = new THREE.CanvasTexture(canvas);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.anisotropy = 4;
    tx.encoding = THREE.sRGBEncoding;
    tx.needsUpdate = true;
    return tx;
  }
  const tileTexBack = createBacksplashDarkTexture();
  const graniteTex = createGraniteTexture({ base: '#2f3133', speckles: ['#e0e0e0', '#9aa0a6', '#0e0e0e'], count: 1200 });
  const matFloor = new THREE.MeshStandardMaterial({ map: tileTexFloor, metalness: 0.05, roughness: 0.95 }); // Tiled floor
  const matWallPrimary = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: 0.05, roughness: 0.95 }); // Light neutral
  const matWallAccent = new THREE.MeshStandardMaterial({ color: 0x2d6f76, metalness: 0.1, roughness: 0.5 }); // Teal accent
  const matCabinetBase = new THREE.MeshStandardMaterial({ color: 0x2f3e46, metalness: 0.2, roughness: 0.7 }); // Dark slate base cabinets
  const matCabinetUpper = new THREE.MeshStandardMaterial({ color: 0xf7f5f2, metalness: 0.05, roughness: 0.9 }); // Warm white uppers
  const matCounter = new THREE.MeshStandardMaterial({ color: 0xd3b897, metalness: 0.2, roughness: 0.6 }); // Light wood (keep for stool seats, cutting board)
  const matGranite = new THREE.MeshStandardMaterial({ map: graniteTex, metalness: 0.15, roughness: 0.85 }); // Granite for countertops
  const matAppliance = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.1 }); // Brushed Steel
  const matCooktop = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.2 }); // Black glass cooktop
  const matTiling = new THREE.MeshStandardMaterial({ map: tileTexDecor, metalness: 0.0, roughness: 0.9 }); // Backsplash tiles with pattern
  const matTilingPlain = new THREE.MeshStandardMaterial({ map: tileTexWall, metalness: 0.0, roughness: 0.95 }); // Plain white tile
  const matBacksplashDark = new THREE.MeshStandardMaterial({ map: tileTexBack, metalness: 0.0, roughness: 0.85 }); // Darker, more visible backsplash
  const matTrim = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.6, roughness: 0.3 });
  const matDoor = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.8 });
  const matWindowFrame = new THREE.MeshStandardMaterial({ color: 0xadd8e6, metalness: 0.2, roughness: 0.7 }); // Light blueish frame
  const matClutterRed = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });
  const matPan = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 });
  const matChairSeat = new THREE.MeshStandardMaterial({ color: 0x5a6b7a, metalness: 0.05, roughness: 0.95 }); // Darker slate fabric
  const matTableTop = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.2, roughness: 0.6 }); // Dark walnut tabletop
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xdadada, metalness: 1.0, roughness: 0.25 }); // Chrome
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x9bd3ff, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.3 }); // Glassy water
  // High-contrast accents for visibility on dark granite
  const matApplianceWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.4 });
  const matApplianceBlack = new THREE.MeshStandardMaterial({ color: 0x202124, metalness: 0.2, roughness: 0.6 });
  const matAccentRed = new THREE.MeshStandardMaterial({ color: 0xe53935, metalness: 0.1, roughness: 0.6 });
  const matAccentYellow = new THREE.MeshStandardMaterial({ color: 0xffc107, metalness: 0.1, roughness: 0.6 });
  const matAccentBlue = new THREE.MeshStandardMaterial({ color: 0x42a5f5, metalness: 0.1, roughness: 0.6 });
  const matAccentGreen = new THREE.MeshStandardMaterial({ color: 0x66bb6a, metalness: 0.1, roughness: 0.6 });
  // Extra palette for cabinets and accents
  const matNavy = new THREE.MeshStandardMaterial({ color: 0x2b3a67, metalness: 0.15, roughness: 0.6 });
  const matCharcoal = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, metalness: 0.1, roughness: 0.8 });
  const matBrass = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1.0, roughness: 0.3 });
  const matTerracotta = new THREE.MeshStandardMaterial({ color: 0xcc6b49, metalness: 0.05, roughness: 0.8 });
  const matEmissiveWarm = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffc95b, emissiveIntensity: 0.9, roughness: 1.0 });
  const matWainscot = new THREE.MeshStandardMaterial({ color: 0xbf6d45, metalness: 0.05, roughness: 0.9 }); // warm lower wall color
  const matDoorAccent = new THREE.MeshStandardMaterial({ color: 0xffb703, metalness: 0.2, roughness: 0.6 }); // contrasting door color
  // Recolor base cabinet bodies to a richer navy
  matCabinetBase.color.set(0x2b3a67);


  // --- Structural Elements: Floor and Walls (parametric sizing) ---
  const roomWidth = 14;   // X dimension (left to right)
  const roomDepth = 12;   // Z dimension (front to back)
  const wallHeight = 7;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);
  // Scale tile repeats so each tile ~0.6 world units
  const tileWorld = 0.6;
  tileTexFloor.repeat.set(Math.max(1, Math.floor(roomWidth / tileWorld)), Math.max(1, Math.floor(roomDepth / tileWorld)));

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, wallHeight, 0.1), matWallAccent);
  backWall.position.set(0, wallHeight/2, -roomDepth/2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, roomDepth), matWallPrimary);
  leftWall.position.set(-roomWidth/2, wallHeight/2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Add colored wainscot and chair rail on the wall with the door (left wall)
  const wainscotDepth = roomDepth - 0.4; // small margins at ends
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, wainscotDepth), matWainscot);
  wainscot.position.set(-roomWidth/2 + 0.08, 1.0, 0);
  scene.add(wainscot);
  const chairRail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, wainscotDepth + 0.02), matTrim);
  chairRail.position.set(-roomWidth/2 + 0.085, 2.03, 0);
  scene.add(chairRail);
  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, wainscotDepth + 0.02), matTrim);
  baseboard.position.set(-roomWidth/2 + 0.075, 0.04, 0);
  scene.add(baseboard);

  // --- Door on Left Wall ---
  function createDoor() {
    const group = new THREE.Group();
    const doorFrameGeo = new THREE.BoxGeometry(1.2, 2.5, 0.15);
    // Use contrasting door color
    const doorFrame = new THREE.Mesh(doorFrameGeo, matDoorAccent);
    
    const doorGlassGeo = new THREE.BoxGeometry(0.8, 1.2, 0.05);
    const doorGlass = new THREE.Mesh(doorGlassGeo, matWindowFrame);
    doorGlass.position.y = 0.4;
    doorGlass.position.z = 0.02;
    doorFrame.add(doorGlass);

    // Add lower inset panels for realism
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xe8a501, metalness: 0.15, roughness: 0.7 });
    const panelGeo = new THREE.BoxGeometry(0.45, 0.5, 0.02);
    const panel1 = new THREE.Mesh(panelGeo, panelMat);
    panel1.position.set(0, -0.35, 0.06);
    doorFrame.add(panel1);
    const panel2 = new THREE.Mesh(panelGeo, panelMat);
    panel2.position.set(0, -0.95, 0.06);
    doorFrame.add(panel2);

    // Add a brass handle and backplate
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.01), matBrass);
    backPlate.position.set(0.45, 0.0, 0.07);
    doorFrame.add(backPlate);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 16), matBrass);
    handle.rotation.z = Math.PI/2;
    handle.position.set(0.45, 0.0, 0.085);
    doorFrame.add(handle);

    group.add(doorFrame);
  group.position.set(-roomWidth/2 + 0.1, 1.25, -2);

    const doorComponent = createComponent(doorFrameGeo, matDoor, group.position, "Kitchen Door", {
      description: "White panel door with a glass window, leading outside.",
      specs: "Dimensions: 1.2 x 2.5 units | Material: Painted Wood"
    });
    doorComponent.visible = false;
    group.userData = doorComponent.userData;
    scene.add(doorComponent);

    return group;
  }
  // Door removed per request
  // scene.add(createDoor());

  // --- Large Window on Back Wall ---
  function createWindow() {
    const group = new THREE.Group();
    const frameThickness = 0.1;
    const windowWidth = 2.5;
    const windowHeight = 4;
    
    // Main frame
    const mainFrame = new THREE.Mesh(new THREE.BoxGeometry(windowWidth, windowHeight, 0.1), matWindowFrame);
    group.add(mainFrame);

    // Panes (as cutouts, simulated by adding smaller dark boxes)
    const paneMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const paneWidth = (windowWidth - frameThickness * 4) / 3;
    const paneHeight = (windowHeight - frameThickness * 5) / 4;
    
    for(let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, paneHeight, 0.05), paneMat);
        pane.position.x = -windowWidth/2 + frameThickness + paneWidth/2 + i * (paneWidth + frameThickness);
        pane.position.y = -windowHeight/2 + frameThickness + paneHeight/2 + j * (paneHeight + frameThickness);
        pane.position.z = 0.06;
        mainFrame.add(pane);
      }
    }
    
  group.position.set(roomWidth/2 - 2.3, wallHeight/2, -roomDepth/2 + 0.1);
    
    const windowComponent = createComponent(new THREE.BoxGeometry(windowWidth, windowHeight, 0.1), matWindowFrame, group.position, "Large Kitchen Window", {
      description: "Multi-pane crittall-style window providing ample natural light.",
      specs: "Dimensions: 2.5 x 4.0 units | Frame: Light Blue Steel"
    });
    windowComponent.visible = false;
    group.userData = windowComponent.userData;
    scene.add(windowComponent);
    return group;
  }
  scene.add(createWindow());


  // --- L-Shaped Kitchen Modules ---
  const cabinetHeight = 1.5;
  const counterHeight = 0.1;
  const cabinetDepth = 2.0;
  const counterTopY = cabinetHeight + counterHeight / 2;
  
  // Back Wall Run
  const backRunWidth = 7.0; // extended
  const backRunX = -1.0; // shift slightly right to leave door clearance
  const backRunZ = -roomDepth/2 + cabinetDepth/2;
  const baseCabinetBack = createComponent(new THREE.BoxGeometry(backRunWidth, cabinetHeight, cabinetDepth), matCabinetBase, new THREE.Vector3(backRunX, cabinetHeight/2, backRunZ), "Back Base Cabinets", { desc: "Base cabinets.", specs: "Color: Dark Slate"});
  const counterBack = createComponent(new THREE.BoxGeometry(backRunWidth, counterHeight, cabinetDepth), matGranite, new THREE.Vector3(backRunX, counterTopY, backRunZ), "Back Countertop (Granite)", { desc: "Granite countertop.", specs: "Finish: Polished Granite"});
  scene.add(baseCabinetBack);
  scene.add(counterBack);
  
  // Side Wall Run
  const sideRunWidth = 6.0; // extended
  const sideRunX = -0.2;
  const sideRunZ = -roomDepth/2 + 2.0 + sideRunWidth/2; // keep along left half
  const baseCabinetSide = createComponent(new THREE.BoxGeometry(cabinetDepth, cabinetHeight, sideRunWidth), matCabinetBase, new THREE.Vector3(sideRunX, cabinetHeight/2, sideRunZ), "Side Base Cabinets", { desc: "Base cabinets.", specs: "Color: Dark Slate"});
  const counterSide = createComponent(new THREE.BoxGeometry(cabinetDepth, counterHeight, sideRunWidth), matGranite, new THREE.Vector3(sideRunX, counterTopY, sideRunZ), "Side Countertop (Granite)", { desc: "Granite countertop.", specs: "Finish: Polished Granite"});
  scene.add(baseCabinetSide);
  scene.add(counterSide);
  
  // Backsplash Tiling
  // Use plain tile as base, overlay decorative panels in key zones
  const tilingBack = new THREE.Mesh(new THREE.BoxGeometry(backRunWidth, 1.5, 0.05), matBacksplashDark);
  tilingBack.position.set(backRunX, cabinetHeight + 1.5/2, -roomDepth/2 + 0.05);
  scene.add(tilingBack);
  const tilingSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, sideRunWidth), matBacksplashDark);
  tilingSide.position.set(-0.2 + cabinetDepth/2, cabinetHeight + 1.5/2, sideRunZ);
  scene.add(tilingSide);
  // scale dark backsplash texture repeats for both areas
  tileTexBack.repeat.set(Math.max(2, Math.floor(backRunWidth / 0.6)), Math.max(2, Math.floor(1.5 / 0.6)));
  // Decorative panel behind sink
  const decorSink = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ map: tileTexDecor, metalness: 0.0, roughness: 0.9 }));
  decorSink.position.set(backRunX + backRunWidth/2 - 1.1, cabinetHeight + 0.75, -roomDepth/2 + 0.051);
  scene.add(decorSink);
  const trimSinkTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.02), matTrim);
  trimSinkTop.position.set(decorSink.position.x, cabinetHeight + 1.3, -roomDepth/2 + 0.055);
  const trimSinkBottom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.02), matTrim);
  trimSinkBottom.position.set(decorSink.position.x, cabinetHeight + 0.2, -roomDepth/2 + 0.055);
  scene.add(trimSinkTop); scene.add(trimSinkBottom);
  // Decorative panel behind cooktop on side wall
  const decorCook = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({ map: tileTexDecor, metalness: 0.0, roughness: 0.9 }));
  decorCook.rotation.y = Math.PI/2;
  decorCook.position.set(-0.2 + cabinetDepth/2 + 0.026, cabinetHeight + 0.75, sideRunZ);
  scene.add(decorCook);
  const trimCookTop = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.02), matTrim);
  trimCookTop.rotation.y = Math.PI/2;
  trimCookTop.position.set(-0.2 + cabinetDepth/2 + 0.03, cabinetHeight + 1.3, sideRunZ);
  const trimCookBottom = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.02), matTrim);
  trimCookBottom.rotation.y = Math.PI/2;
  trimCookBottom.position.set(-0.2 + cabinetDepth/2 + 0.03, cabinetHeight + 0.2, sideRunZ);
  scene.add(trimCookTop); scene.add(trimCookBottom);
  // Scale pattern repeats to look vibrant
  tileTexDecor.repeat.set(3, 2);
  // Colored accent band across backsplash for added color
  const colorBand = new THREE.Mesh(new THREE.BoxGeometry(backRunWidth, 0.12, 0.03), matTerracotta);
  colorBand.position.set(backRunX, cabinetHeight + 1.1, -roomDepth/2 + 0.065);
  scene.add(colorBand);


  // --- Appliances and Fixtures ---
  // Cooktop on side run
  // Cooktop (aligned beneath hood)
  const cooktopGeo = new THREE.BoxGeometry(1.6, 0.02, 1.0);
  const cooktop = createComponent(cooktopGeo, matCooktop, new THREE.Vector3(sideRunX, counterTopY + 0.01, sideRunZ), "Induction Cooktop", {
    description: "Four-burner induction cooktop.",
    specs: "Power: Induction"
  });
  scene.add(cooktop);
  // Add four burner rings
  const burnerMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.4 });
  const ringGeo = new THREE.TorusGeometry(0.18, 0.01, 10, 40);
  const ringPositions = [
    [-0.35, -0.28], [0.35, -0.28],
    [-0.35,  0.28], [0.35,  0.28]
  ];
  ringPositions.forEach(([dx, dz]) => {
    const ring = new THREE.Mesh(ringGeo, burnerMat);
    ring.rotation.x = -Math.PI/2;
    ring.position.set(sideRunX + dx, counterTopY + 0.02, sideRunZ + dz);
    ring.castShadow = true;
    scene.add(ring);
  });
  
  // Pan on cooktop
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), matPan);
  pan.position.set(sideRunX, counterTopY + 0.05, sideRunZ + 0.5);
  scene.add(pan);

  // Range Hood
  const hood = createComponent(new THREE.BoxGeometry(1.5, 1.0, 0.8), matAppliance, new THREE.Vector3(sideRunX, 4.0, sideRunZ), "Range Hood", {
    description: "Ventilation hood.",
    specs: "Material: Stainless Steel"
  });
  scene.add(hood);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), matAppliance);
  chimney.position.set(sideRunX, 5.75, sideRunZ);
  scene.add(chimney);

  // Simple oven under the cooktop
  const oven = createComponent(new THREE.BoxGeometry(0.9, 0.9, 0.9), matAppliance, new THREE.Vector3(sideRunX, 0.45, sideRunZ), "Built-in Oven", {
    description: "Stainless front oven under cooktop.",
    specs: "Finish: Brushed Steel"
  });
  scene.add(oven);
  const ovenGlass = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.02), matGlass);
  ovenGlass.position.set(sideRunX, 0.55, sideRunZ + 0.46);
  scene.add(ovenGlass);
  const ovenHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 16), matChrome);
  ovenHandle.rotation.z = Math.PI/2;
  ovenHandle.position.set(sideRunX, 0.7, sideRunZ + 0.45);
  scene.add(ovenHandle);

  // Upper Cabinets
  const upperCabinet1 = createComponent(new THREE.BoxGeometry(2, 1.2, 1), matCabinetUpper, new THREE.Vector3(-roomWidth/2 + 3, 3.8, backRunZ), "Upper Cabinet", {desc:"Two-tone scheme", specs:"Color: Warm White"});
  scene.add(upperCabinet1);
  // Add navy doors and brass handles to the upper cabinet
  const ucX = -roomWidth/2 + 3;
  const ucY = 3.8;
  const ucZ = backRunZ;
  const doorThickness = 0.03;
  const doorWidth = 0.95;
  const doorHeight = 1.05;
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness), matNavy);
  leftDoor.position.set(ucX - doorWidth/2 - 0.025, ucY, ucZ + 0.52);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness), matNavy);
  rightDoor.position.set(ucX + doorWidth/2 + 0.025, ucY, ucZ + 0.52);
  // Handles
  const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 12), matBrass);
  handleL.rotation.z = Math.PI/2;
  handleL.position.set(leftDoor.position.x + 0.42, ucY, ucZ + 0.56);
  const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 12), matBrass);
  handleR.rotation.z = Math.PI/2;
  handleR.position.set(rightDoor.position.x - 0.42, ucY, ucZ + 0.56);
  scene.add(leftDoor); scene.add(rightDoor); scene.add(handleL); scene.add(handleR);
  // Under-cabinet warm light bar
  const underLight = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.02, 0.1), matEmissiveWarm);
  underLight.position.set(ucX, 3.15, ucZ + 0.45);
  scene.add(underLight);
  
  // Wall-mounted drinking water purifier near sink (replaces geyser)
  const windowXPos = roomWidth/2 - 2.3; // reference for window position if needed
  (function(){
    const purifier = new THREE.Group();
    const bodyMat = matApplianceWhite; // clean white body
    const accentMat = matNavy;         // navy accent band
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.5 }); // translucent tank window

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.25), bodyMat);
    purifier.add(body);
    // front accent band
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.02), accentMat);
    band.position.set(0, 0.38, 0.14);
    purifier.add(band);
    // tank window
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.02), tankMat);
    tank.position.set(0, 0.0, 0.14);
    purifier.add(tank);
    // outlet nozzle and drip tray
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 12), matChrome);
    nozzle.rotation.x = Math.PI/2;
    nozzle.position.set(0.22, -0.22, 0.14);
    purifier.add(nozzle);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.12), matApplianceBlack);
    tray.position.set(0.22, -0.33, 0.12);
    purifier.add(tray);

    // place above back counter near sink, away from window
    const px = (backRunX + backRunWidth/2 - 1.2) + 0.6; // sinkX + 0.6
    const py = 3.7;         
    const pz = -roomDepth/2 + 0.5;
    purifier.position.set(px, py, pz);
    scene.add(purifier);

    const purifierComponent = createComponent(new THREE.BoxGeometry(0.8, 1.0, 0.25), bodyMat, purifier.position.clone(), "Water Purifier", { desc: "Wall-mounted RO water purifier with translucent tank.", specs: "Body: White | Accent: Navy | Tank: Aqua" });
    purifierComponent.visible = false;
    purifier.userData = purifierComponent.userData;
    scene.add(purifierComponent);
  })();

  // Coffee maker
  const coffeeMaker = createComponent(new THREE.BoxGeometry(0.4, 0.6, 0.5), matApplianceBlack, new THREE.Vector3(backRunX - backRunWidth/2 + 1.0, counterTopY + 0.3, backRunZ), "Coffee Maker", {desc:"", specs:"Color: Black"});
  scene.add(coffeeMaker);
  // Coffee maker details: carafe, handle, buttons, and display
  const cmx = backRunX - backRunWidth/2 + 1.0;
  const cmz = backRunZ + 0.08;
  const carafe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 24), matGlass);
  carafe.position.set(cmx, counterTopY + 0.09, cmz);
  scene.add(carafe);
  const carafeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24), matApplianceBlack);
  carafeBase.position.set(cmx, counterTopY + 0.01, cmz);
  scene.add(carafeBase);
  const carafeLid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24), matApplianceBlack);
  carafeLid.position.set(cmx, counterTopY + 0.19, cmz);
  scene.add(carafeLid);
  const carafeHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 10, 24, Math.PI/1.2), matApplianceBlack);
  carafeHandle.rotation.y = Math.PI/2;
  carafeHandle.position.set(cmx + 0.17, counterTopY + 0.12, cmz);
  scene.add(carafeHandle);
  const cmSpout = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), matApplianceBlack);
  cmSpout.position.set(cmx, counterTopY + 0.19, cmz + 0.12);
  scene.add(cmSpout);
  // Drip tray with grill lines
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.16), matApplianceBlack);
  tray.position.set(cmx, counterTopY + 0.02, backRunZ + 0.18);
  scene.add(tray);
  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.01), matChrome);
    bar.position.set(cmx, counterTopY + 0.03, backRunZ + 0.18 + i*0.02);
    scene.add(bar);
  }
  const cmDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), new THREE.MeshStandardMaterial({ color: 0x00ff99, emissive: 0x00ff66, emissiveIntensity: 0.6 }));
  cmDisplay.position.set(cmx, counterTopY + 0.25, backRunZ + 0.24);
  scene.add(cmDisplay);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), [matAccentRed, matAccentYellow, matAccentBlue][i]);
    btn.position.set(cmx - 0.09 + i * 0.09, counterTopY + 0.22, backRunZ + 0.24);
    scene.add(btn);
  }
  
  // Clutter on shelf
  const clutterGroup = new THREE.Group();
  for(let i=0; i<5; i++){
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), matClutterRed);
    can.position.set(-1.5 + i * 0.25, 3.2, -roomDepth/2 + 0.5);
    can.castShadow = true;
    clutterGroup.add(can);
  }
  scene.add(clutterGroup);

  // --- Sink + Faucet on back run ---
  const sinkX = backRunX + backRunWidth/2 - 1.2; // towards right half of back run
  const sinkZ = backRunZ;
  const sinkOuter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.55), matGranite);
  sinkOuter.position.set(sinkX, counterTopY + 0.04, sinkZ);
  scene.add(sinkOuter);
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.45), matAppliance);
  sinkBasin.position.set(sinkX, counterTopY - 0.05, sinkZ);
  scene.add(sinkBasin);
  const sinkWater = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.43), matGlass);
  sinkWater.position.set(sinkX, counterTopY - 0.02, sinkZ);
  scene.add(sinkWater);
  // Faucet (gooseneck)
  const tapBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), matChrome);
  tapBase.position.set(sinkX - 0.25, counterTopY + 0.06, sinkZ - 0.15);
  scene.add(tapBase);
  const tapNeck = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 12, 24, Math.PI), matChrome);
  tapNeck.rotation.z = Math.PI/2;
  tapNeck.position.set(sinkX - 0.25, counterTopY + 0.28, sinkZ - 0.15);
  scene.add(tapNeck);
  const tapSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 12), matChrome);
  tapSpout.rotation.x = Math.PI/2;
  tapSpout.position.set(sinkX - 0.07, counterTopY + 0.28, sinkZ - 0.15);
  scene.add(tapSpout);

  // --- Small countertop appliances and accessories ---
  // Toaster on back run (left of sink)
  const toaster = createComponent(new THREE.BoxGeometry(0.35, 0.25, 0.22), matAccentYellow, new THREE.Vector3(sinkX - 1.1, counterTopY + 0.125, backRunZ + 0.1), "Toaster", {desc:"Two-slice toaster.", specs:"Color: Yellow"});
  scene.add(toaster);
  // Kettle on back run (right of sink)
  const kettle = createComponent(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24), matAccentBlue, new THREE.Vector3(sinkX + 0.9, counterTopY + 0.11, backRunZ + 0.05), "Kettle", {desc:"Electric kettle.", specs:"Color: Blue"});
  scene.add(kettle);
  const kettleLid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24), matAppliance);
  kettleLid.position.set(sinkX + 0.9, counterTopY + 0.23, backRunZ + 0.05);
  scene.add(kettleLid);
  const kettleHandle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 12, 24, Math.PI), matPan);
  kettleHandle.rotation.y = Math.PI/2;
  kettleHandle.position.set(sinkX + 0.95, counterTopY + 0.16, backRunZ - 0.05);
  scene.add(kettleHandle);

  // Spice rack near cooktop
  const spiceGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const jarMat = [matAccentRed, matAccentGreen, matAccentYellow, matAccentBlue, matApplianceWhite][i%5];
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), jarMat);
    jar.position.set(sideRunX + 0.25 + i * 0.16, counterTopY + 0.06, sideRunZ - 0.35);
    jar.castShadow = true;
    spiceGroup.add(jar);
  }
  scene.add(spiceGroup);

  // Utensil holder near cooktop
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 16), matWoodDark);
  holder.position.set(sideRunX - 0.5, counterTopY + 0.075, sideRunZ - 0.35);
  scene.add(holder);
  for (let i = 0; i < 3; i++) {
    const utensil = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22 + 0.04*i, 8), matChrome);
    utensil.position.set(sideRunX - 0.5 + (i - 1) * 0.03, counterTopY + 0.20, sideRunZ - 0.35);
    scene.add(utensil);
  }

  // Fruit bowl on island
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI*2, 0, Math.PI/2), matWoodDark);
  bowl.rotation.x = Math.PI; // concave up
  bowl.position.set(-4.0, 1.4 + 0.08, 2.7);
  scene.add(bowl);
  for (let i = 0; i < 5; i++) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: i%2 ? 0xffcc33 : 0xcc3333, roughness: 0.6 }));
    fruit.position.set(-4.0 + (Math.random()-0.5)*0.25, 1.48, 2.7 + (Math.random()-0.5)*0.25);
    scene.add(fruit);
  }


  // --- Island Table and Chairs ---
  function createIsland() {
    const group = new THREE.Group();
    const islandWidth = 1.0;
    const islandDepth = 2.0;
    const islandHeight = 1.4;

  const islandBody = new THREE.Mesh(new THREE.BoxGeometry(islandWidth, islandHeight, islandDepth), matCabinetBase);
    
  const islandCounter = new THREE.Mesh(new THREE.BoxGeometry(islandWidth, 0.1, islandDepth), matGranite);
    islandCounter.position.y = islandHeight/2 + 0.05;
    islandBody.add(islandCounter);
    
    // Wine Rack
    const holeGeo = new THREE.CylinderGeometry(0.1, 0.1, islandWidth, 12);
    const holeMat = new THREE.MeshBasicMaterial({color: 0x333333});
    for(let i=0; i<3; i++) {
      for(let j=0; j<4; j++){
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.rotation.z = Math.PI/2;
        hole.position.z = islandDepth/2 - 0.3 - j * 0.3;
        hole.position.y = islandHeight/2 - 0.3 - i * 0.3;
        islandBody.add(hole);
      }
    }
  group.add(islandBody);
  group.position.set(-4, islandHeight/2, 2.5);

    // Cutting board
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), matWoodDark);
  board.position.set(-4, islandHeight + 0.1, 2.7);
    scene.add(board);
    
    const islandComponent = createComponent(new THREE.BoxGeometry(islandWidth, islandHeight, islandDepth), matCabinetBase, group.position, "Kitchen Island", {
      description: "Small kitchen island with integrated wine rack and dining space.",
      specs: "Dimensions: 1.0 x 1.4 x 2.0 units"
    });
    islandComponent.visible = false;
    group.userData = islandComponent.userData;
    scene.add(islandComponent);
    
    return group;
  }
  scene.add(createIsland());

  function createChair(x, z, rotationY) {
    const group = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(0.6, 0.05, 0.6);
    const seat = new THREE.Mesh(seatGeo, matCounter);
    seat.position.y = 1.0;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(0.05, 0.8, 0.6);
    const back = new THREE.Mesh(backGeo, matCounter);
    back.position.set(-0.27, 1.4, 0);
    group.add(back);
    
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    group.castShadow = true;

    const chairComponent = createComponent(new THREE.BoxGeometry(0.6, 1.8, 0.6), matCounter, group.position, "Dining Stool", {
      description: "Simple wooden stool for the kitchen island.",
      specs: "Material: Light Oak"
    });
    chairComponent.visible = false;
    group.userData = chairComponent.userData;
    scene.add(chairComponent);

    return group;
  }
  // Replace simple stools with more realistic bar stools
  function createBarStool(x, z) {
    const group = new THREE.Group();
    // Round wood seat
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 24), matCounter);
    seat.position.y = 1.0;
    group.add(seat);
    // Metal legs
    const legMat = matApplianceBlack;
    const legH = 1.0;
    const legR = 0.02;
    const legPositions = [
      [ 0.16,  0.16],
      [-0.16,  0.16],
      [ 0.16, -0.16],
      [-0.16, -0.16]
    ];
    legPositions.forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR, legH, 12), legMat);
      leg.position.set(dx, legH/2, dz);
      group.add(leg);
    });
    // Footrest ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 10, 24), matChrome);
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.38;
    group.add(ring);
    // Rubber feet caps
    legPositions.forEach(([dx, dz]) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), matApplianceBlack);
      cap.position.set(dx, 0.01, dz);
      group.add(cap);
    });

    const stoolComponent = createComponent(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 24), matCounter, new THREE.Vector3(x, 1.0, z), "Bar Stool", {
      description: "Round wood seat with black metal legs and chrome footrest.",
      specs: "Seat: Light wood | Legs: Black | Footrest: Chrome"
    });
    stoolComponent.visible = false;
    group.userData = stoolComponent.userData;
    scene.add(stoolComponent);

    group.position.set(x, 0, z);
    return group;
  }
  scene.add(createBarStool(-4.9, 2.0));
  scene.add(createBarStool(-4.9, 3.0));

  // --- New Dining Table with 6 Chairs in clear kitchen space ---
  function createDiningTable(x, z) {
    const group = new THREE.Group();
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), matTableTop);
    tableTop.position.y = 0.9;
    group.add(tableTop);

    // legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
  const legMat = matWoodDark;
    const legOffsets = [
      [-1.1, -0.45], [1.1, -0.45],
      [-1.1, 0.45], [1.1, 0.45]
    ];
    legOffsets.forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(dx, 0.45, dz);
      group.add(leg);
    });

    group.position.set(x, 0, z);
    group.castShadow = true;

    const tableComponent = createComponent(new THREE.BoxGeometry(2.4, 0.95, 1.1), matCounter, new THREE.Vector3(x, 0.5, z), "Dining Table", {
      description: "Rectangular dining table seating six.",
      specs: "Seats: 6 | Top: Wood | Legs: Dark wood"
    });
    tableComponent.visible = false;
    group.userData = tableComponent.userData;
    scene.add(tableComponent);

    return group;
  }

  function createDiningChair() {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), matChairSeat);
    seat.position.y = 0.5;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), matChairSeat);
    back.position.set(0, 0.9, -0.22);
    group.add(back);

    const legMat = matWoodDark;
    const legGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
    const legs = [
      [-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]
    ];
    legs.forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(dx, 0.25, dz);
      group.add(leg);
    });

    const chairComponent = createComponent(new THREE.BoxGeometry(0.5, 1.2, 0.5), matCounter, new THREE.Vector3(0, 0.6, 0), "Dining Chair", {
      description: "Simple chair for dining table.",
      specs: "Material: Wood + cushion top"
    });
    chairComponent.visible = false;
    group.userData = chairComponent.userData;
    scene.add(chairComponent);

    return group;
  }

  // Place dining set in clear space (right side of room)
  // Place near front-right corner while keeping clearance for chairs and walking space
  const tableHalfX = 2.4 / 2; // 1.2
  const tableHalfZ = 1.1 / 2; // 0.55
   const rightMargin = 1.4; // clearance for right-side chairs
   const frontMargin = 1.4; // clearance for front chair
  const tableX = roomWidth/2 - (tableHalfX + rightMargin);
  const tableZ = roomDepth/2 - (tableHalfZ + frontMargin);
  const diningTable = createDiningTable(tableX, tableZ);

   // Rotate table 90 degrees without moving the chairs
   diningTable.rotation.y = Math.PI / 2;
   scene.add(diningTable);

  // (Rug removed per latest request)

  // Arrange chairs like references: 2 on long sides near ends, 1 centered at each short end
  const yaw = diningTable.rotation.y;
  const longHalf = Math.max(tableHalfX, tableHalfZ);   // half of long side
  const shortHalf = Math.min(tableHalfX, tableHalfZ);  // half of short side
  const clearance = 0.25;   // outside table edge to avoid intersection
  const endMargin = 0.35;   // keep chairs away from table corners along long axis
  const longSeatOffset = Math.max(0.4, longHalf - endMargin); // along long axis where pairs sit

  function placeLocalToWorld(dx, dz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return {
      x: tableX + (dx * c - dz * s),
      z: tableZ + (dx * s + dz * c)
    };
  }

  // Short ends (centered along long axis)
  const headPos = placeLocalToWorld(-(longHalf + clearance), 0);
  const footPos = placeLocalToWorld( (longHalf + clearance), 0);
  const head = createDiningChair(); head.position.set(headPos.x, 0, headPos.z);
  const foot = createDiningChair(); foot.position.set(footPos.x, 0, footPos.z);

  // Long sides (two per side, near ends)
  const leftNearPos  = placeLocalToWorld(-longSeatOffset, -(shortHalf + clearance));
  const leftFarPos   = placeLocalToWorld( longSeatOffset, -(shortHalf + clearance));
  const rightNearPos = placeLocalToWorld(-longSeatOffset,  (shortHalf + clearance));
  const rightFarPos  = placeLocalToWorld( longSeatOffset,  (shortHalf + clearance));

  const leftNear  = createDiningChair(); leftNear.position.set(leftNearPos.x, 0, leftNearPos.z);
  const leftFar   = createDiningChair(); leftFar.position.set(leftFarPos.x, 0, leftFarPos.z);
  const rightNear = createDiningChair(); rightNear.position.set(rightNearPos.x, 0, rightNearPos.z);
  const rightFar  = createDiningChair(); rightFar.position.set(rightFarPos.x, 0, rightFarPos.z);

  // Rotate chairs to face table center
  function faceTowardCenter(chair, pos){
    const dx = tableX - pos.x;
    const dz = tableZ - pos.z;
    chair.rotation.y = Math.atan2(dx, dz);
  }
  faceTowardCenter(head, headPos);
  faceTowardCenter(foot, footPos);

  // Across-table pairs should face each other: (1<->3) and (2<->4)
  function faceTowardPoint(chair, fromPos, toPos){
    const dx = toPos.x - fromPos.x;
    const dz = toPos.z - fromPos.z;
    chair.rotation.y = Math.atan2(dx, dz);
  }
  // 1 (leftNear) faces 3 (rightNear), and 3 faces 1
  faceTowardPoint(leftNear, leftNearPos, rightNearPos);
  faceTowardPoint(rightNear, rightNearPos, leftNearPos);
  // 2 (leftFar) faces 4 (rightFar), and 4 faces 2
  faceTowardPoint(leftFar, leftFarPos, rightFarPos);
  faceTowardPoint(rightFar, rightFarPos, leftFarPos);

  scene.add(head); scene.add(foot); scene.add(leftNear); scene.add(leftFar); scene.add(rightNear); scene.add(rightFar);
}

// --- Interaction Handlers ---

function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Filter for objects that are clickable components
  const intersects = raycaster.intersectObjects(scene.children, true)
                              .filter(i => i.object.userData.isComponent || (i.object.parent && i.object.parent.userData.isComponent));

  if (intersects.length > 0) {
    const object = intersects[0].object;
    const userData = object.userData.isComponent ? object.userData : object.parent.userData;
    displayComponentInfo(userData);
  } else {
    hideComponentInfo();
  }
}

function displayComponentInfo(data) {
  detailName.textContent = data.name || "Component";
  detailDesc.textContent = data.details || data.desc || "";
  detailSpecs.textContent = "Specifications: " + (data.specs || "");
  infoPanel.classList.add('visible');
}

function hideComponentInfo() {
  infoPanel.classList.remove('visible');
}

/**
 * Handles window resize to maintain aspect ratio and prevent distortion.
 */
function onWindowResize() {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  const newAspect = newWidth / newHeight;

  // Update camera with new aspect ratio
  camera.left = -halfFrustum * newAspect;
  camera.right = halfFrustum * newAspect;
  camera.top = halfFrustum;
  camera.bottom = -halfFrustum;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
}

/**
 * Animation loop for continuous rendering and control updates.
 */
function animate() {
  requestAnimationFrame(animate);

  // Update controls for smooth damping effect
  controls.update();

  // Render the scene from the camera's perspective
  renderer.render(scene, camera);
}

// Start the application when DOM is ready
window.onload = function() {
  init();
  animate();
};
