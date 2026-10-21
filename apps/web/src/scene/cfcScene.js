import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDING, GLAZING_TYPES, SHADING_STRATEGIES } from '@cfc/energy-core';

const COLORS = {
  background: 0x07111c,
  slab: 0x0b1c2b,
  slabEdge: 0x4b7188,
  spandrel: 0x173246,
  glass: 0x62d8f4,
  glassSelected: 0x9ae6ff,
  core: 0x0e2638,
  roof: 0x102838,
  shading: 0x8a643f,
  pv: 0x0c2342,
  pvFrame: 0x4e7fa8,
  openlab: 0xf97316,
  accent: 0x22d3ee,
};

function makeTextSprite(text, { color = '#e8f2fb', background = 'rgba(6,17,28,0.8)', fontSize = 44, scale = [6, 3] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(20, 78, 472, 100, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(102,217,239,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `600 ${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 130);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale[0], scale[1], 1);
  return sprite;
}

export class CFCScene {
  constructor(container, { onSelect } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.background, 0.0025);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
    this.camera.position.set(45, 32, 56);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 12, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 32;
    this.controls.maxDistance = 190;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];
    this.floorGroups = [];
    this.design = null;
    this.result = null;
    this.selectedFloor = null;
    this.hovered = null;
    this.highlight = new THREE.BoxHelper(new THREE.Mesh(), 0x22d3ee);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    this.timer = 0;
    this.pointerDown = null;

    this.setupLights();
    this.setupGround();
    this.bindEvents();
    this.resize();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xbcdfef, 0x071018, 1.2);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe4b5, 2.8);
    sun.position.set(52, 78, 34);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.00035;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x3aa7d8, 1.6);
    fill.position.set(-48, 32, -58);
    this.scene.add(fill);
    const warm = new THREE.PointLight(0xf6b73c, 28, 90);
    warm.position.set(0, 2, 24);
    this.scene.add(warm);
  }

  setupGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshStandardMaterial({ color: 0x06111b, roughness: 0.94, metalness: 0.08 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.45;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(180, 36, 0x1c5064, 0x0e2b3a);
    grid.position.y = -0.42;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    this.scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(34, 34.5, 96),
      new THREE.MeshBasicMaterial({ color: 0x1a6a7a, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.4;
    this.scene.add(ring);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(58, 0.6, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a1a27, roughness: 0.75, metalness: 0.18 }),
    );
    plinth.position.y = -0.2;
    plinth.receiveShadow = true;
    this.scene.add(plinth);
  }

  build(result) {
    this.result = result;
    this.design = result.design;
    if (this.buildingGroup) {
      this.scene.remove(this.buildingGroup);
      this.disposeGroup(this.buildingGroup);
    }
    this.pickables = [];
    this.floorGroups = [];
    this.buildingGroup = new THREE.Group();
    this.buildingGroup.name = 'CFC-Cairo';
    this.scene.add(this.buildingGroup);
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: COLORS.glass,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.25,
      thickness: 0.4,
      emissive: 0x0b3c50,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    this.spandrelMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.spandrel,
      roughness: 0.42,
      metalness: 0.55,
    });
    this.slabMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.slab,
      roughness: 0.5,
      metalness: 0.45,
    });
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.core,
      roughness: 0.36,
      metalness: 0.5,
    });
    this.shadingMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.shading,
      roughness: 0.4,
      metalness: 0.62,
    });
    this.pvMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.pv,
      roughness: 0.18,
      metalness: 0.72,
      emissive: 0x071b38,
      emissiveIntensity: 0.7,
    });
    this.openlabMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.openlab,
      emissive: 0x8a2c00,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
    });

    for (const floor of BUILDING.floors) {
      this.buildFloor(floor);
    }
    this.buildRoof();
    this.buildEntrance();
    this.applyFloorVisibility();
  }

  buildFloor(floor) {
    const baseY = floor.level * BUILDING.floorHeight;
    const height = BUILDING.floorHeight;
    const group = new THREE.Group();
    group.userData = { floor: floor.level };
    this.buildingGroup.add(group);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(BUILDING.width + 0.8, 0.28, BUILDING.depth + 0.8), this.slabMaterial);
    slab.position.set(0, baseY + 0.14, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(slab.geometry),
      new THREE.LineBasicMaterial({ color: COLORS.slabEdge, transparent: true, opacity: 0.36 }),
    );
    edges.position.copy(slab.position);
    group.add(edges);

    const exterior = new THREE.Group();
    exterior.userData = { type: 'exterior' };
    group.add(exterior);
    const windowHeight = height * this.design.wwr;
    const spandrelHeight = (height - windowHeight) / 2;
    const glassY = baseY + spandrelHeight + windowHeight / 2;

    const addSpandrel = (width, depth, x, z, orientation) => {
      for (const side of [-1, 1]) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, spandrelHeight, depth), this.spandrelMaterial);
        mesh.position.set(x, baseY + (side < 0 ? spandrelHeight / 2 : height - spandrelHeight / 2), z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { kind: 'wall', floor: floor.level, orientation };
        exterior.add(mesh);
        this.pickables.push(mesh);
      }
    };
    const addGlass = (width, depth, x, z, orientation) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(width, windowHeight, depth), this.glassMaterial);
      glass.position.set(x, glassY, z);
      glass.userData = { kind: 'window', floor: floor.level, orientation };
      exterior.add(glass);
      this.pickables.push(glass);
    };
    addSpandrel(BUILDING.width, 0.16, 0, BUILDING.depth / 2, 'south');
    addSpandrel(BUILDING.width, 0.16, 0, -BUILDING.depth / 2, 'north');
    addSpandrel(0.16, BUILDING.depth, BUILDING.width / 2, 0, 'east');
    addSpandrel(0.16, BUILDING.depth, -BUILDING.width / 2, 0, 'west');
    addGlass(BUILDING.width - 0.2, 0.08, 0, BUILDING.depth / 2 + 0.03, 'south');
    addGlass(BUILDING.width - 0.2, 0.08, 0, -BUILDING.depth / 2 - 0.03, 'north');
    addGlass(0.08, BUILDING.depth - 0.2, BUILDING.width / 2 + 0.03, 0, 'east');
    addGlass(0.08, BUILDING.depth - 0.2, -BUILDING.width / 2 - 0.03, 0, 'west');

    // Vertical façade fins.
    const finMaterial = new THREE.MeshStandardMaterial({ color: 0x2a5065, metalness: 0.7, roughness: 0.3 });
    for (let x = -18; x <= 18; x += 9) {
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, height * 0.92, 0.3), finMaterial);
        fin.position.set(x, baseY + height / 2, side * (BUILDING.depth / 2 + 0.16));
        fin.castShadow = true;
        exterior.add(fin);
      }
    }
    for (let z = -9; z <= 9; z += 9) {
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, height * 0.92, 0.16), finMaterial);
        fin.position.set(side * (BUILDING.width / 2 + 0.16), baseY + height / 2, z);
        fin.castShadow = true;
        exterior.add(fin);
      }
    }

    // External shading louvres on E/S/W.
    const slatGroup = new THREE.Group();
    slatGroup.userData = { kind: 'shading', floor: floor.level };
    for (const side of ['south', 'east', 'west']) {
      const count = 4;
      for (let i = 0; i < count; i += 1) {
        const y = baseY + spandrelHeight + windowHeight * (0.18 + i * 0.2);
        const horizontal = side === 'south';
        const slat = new THREE.Mesh(
          horizontal
            ? new THREE.BoxGeometry(BUILDING.width + 0.8, 0.06, 0.36)
            : new THREE.BoxGeometry(0.36, 0.06, BUILDING.depth + 0.8),
          this.shadingMaterial,
        );
        if (horizontal) slat.position.set(0, y, BUILDING.depth / 2 + 0.36);
        else slat.position.set(side === 'east' ? BUILDING.width / 2 + 0.36 : -BUILDING.width / 2 - 0.36, y, 0);
        slat.rotation.z = horizontal ? -0.05 : 0;
        slat.castShadow = true;
        slat.userData = { kind: 'shading', floor: floor.level, orientation: side };
        slatGroup.add(slat);
        this.pickables.push(slat);
      }
    }
    exterior.add(slatGroup);

    // Interior zones / partitions.
    const interior = new THREE.Group();
    interior.visible = false;
    interior.userData = { type: 'interior' };
    group.add(interior);
    for (const zone of floor.zones) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(zone.profile.color),
        transparent: true,
        opacity: 0.27,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.6, zone.width - 0.3), 2.5, Math.max(0.6, zone.depth - 0.3)),
        material,
      );
      mesh.position.set(zone.x, baseY + 1.3, zone.z);
      mesh.userData = { kind: 'zone', floor: floor.level, zone };
      interior.add(mesh);
      this.pickables.push(mesh);
      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: zone.profile.color, transparent: true, opacity: 0.65 }),
      );
      border.position.copy(mesh.position);
      interior.add(border);
      const label = makeTextSprite(zone.name, { color: '#e8f2fb', fontSize: 34, scale: [Math.min(9, zone.width * 0.7), 3] });
      label.position.set(zone.x, baseY + 2.95, zone.z);
      interior.add(label);
    }

    // Core / lift / restrooms. The core is shown in cutaway only.
    const coreFloor = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.12, 9),
      new THREE.MeshStandardMaterial({ color: 0x1a3d50, roughness: 0.55, metalness: 0.3 }),
    );
    coreFloor.position.set(0, baseY + 0.32, 0);
    interior.add(coreFloor);
    const coreParts = [
      { name: '电梯', x: 0, z: 0, w: 5, d: 4, color: 0x6fa6bd },
      { name: '男洗手间', x: -4.5, z: 0, w: 4.2, d: 4, color: 0x38bdf8 },
      { name: '女洗手间', x: 4.5, z: 0, w: 4.2, d: 4, color: 0xf472b6 },
    ];
    for (const part of coreParts) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(part.w, 2.9, part.d),
        new THREE.MeshStandardMaterial({
          color: part.color,
          transparent: true,
          opacity: 0.66,
          roughness: 0.45,
          metalness: 0.18,
        }),
      );
      mesh.position.set(part.x, baseY + 1.8, part.z);
      mesh.userData = { kind: 'core', floor: floor.level, part: part.name };
      interior.add(mesh);
      this.pickables.push(mesh);
      const label = makeTextSprite(part.name, { color: '#e8f2fb', fontSize: 30, scale: [4.8, 2.4] });
      label.position.set(part.x, baseY + 3.55, part.z);
      interior.add(label);
    }

    if (floor.level === 1) {
      const labZone = floor.zones.find((zone) => zone.type === 'openlab');
      if (labZone) {
        const lab = new THREE.Mesh(new THREE.BoxGeometry(labZone.width - 0.4, 3.0, labZone.depth - 0.4), this.openlabMaterial);
        lab.position.set(labZone.x, baseY + 1.55, labZone.z);
        lab.userData = { kind: 'openlab', floor: floor.level, zone: labZone };
        group.add(lab);
        this.pickables.push(lab);
      }
    }

    const label = null;
    this.floorGroups.push({ level: floor.level, group, exterior, interior, slab, edges, label });
  }

  buildRoof() {
    const y = BUILDING.floors.length * BUILDING.floorHeight;
    this.roofGroup = new THREE.Group();
    this.roofGroup.userData = { kind: 'roof' };
    this.buildingGroup.add(this.roofGroup);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(BUILDING.width + 1.2, 0.42, BUILDING.depth + 1.2),
      new THREE.MeshStandardMaterial({ color: COLORS.roof, roughness: 0.8, metalness: 0.15 }),
    );
    roof.position.set(0, y + 0.21, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.roofGroup.add(roof);
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(BUILDING.width + 1.8, 0.8, BUILDING.depth + 1.8),
      new THREE.MeshStandardMaterial({ color: 0x153549, transparent: true, opacity: 0.35, roughness: 0.4, metalness: 0.5 }),
    );
    parapet.position.set(0, y + 0.8, 0);
    this.roofGroup.add(parapet);

    const pvGroup = new THREE.Group();
    pvGroup.userData = { kind: 'pv' };
    const rows = 7;
    const cols = 9;
    const panelW = 3.7;
    const panelD = 1.9;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.09, panelD), this.pvMaterial);
        panel.rotation.x = -0.35;
        panel.position.set(
          (col - (cols - 1) / 2) * 4.25,
          y + 1.2 + (row % 2) * 0.05,
          (row - (rows - 1) / 2) * 2.6,
        );
        panel.castShadow = true;
        panel.receiveShadow = true;
        panel.userData = { kind: 'pv', floor: 'roof' };
        pvGroup.add(panel);
        this.pickables.push(panel);
      }
    }
    this.roofGroup.add(pvGroup);
    const inverter = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.5, 3),
      new THREE.MeshStandardMaterial({ color: 0x31556a, metalness: 0.65, roughness: 0.3 }),
    );
    inverter.position.set(-17, y + 1.1, -9);
    this.roofGroup.add(inverter);
    this.roofY = y;
  }

  buildEntrance() {
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.35, 5),
      new THREE.MeshStandardMaterial({ color: 0x173b4d, metalness: 0.5, roughness: 0.35 }),
    );
    canopy.position.set(0, 3.8, BUILDING.depth / 2 + 2.5);
    canopy.castShadow = true;
    this.buildingGroup.add(canopy);
    const steps = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.35, 7),
      new THREE.MeshStandardMaterial({ color: 0x163241, roughness: 0.7 }),
    );
    steps.position.set(0, 0.18, BUILDING.depth / 2 + 4.2);
    this.buildingGroup.add(steps);
  }

  setFloor(level) {
    this.selectedFloor = level;
    this.applyFloorVisibility();
    if (level === null) {
      this.controls.target.set(0, 12, 0);
    } else {
      this.controls.target.set(0, level * BUILDING.floorHeight + 1.6, 0);
      this.camera.position.set(42, level * BUILDING.floorHeight + 24, 52);
    }
    this.controls.update();
  }

  applyFloorVisibility() {
    const selected = this.selectedFloor;
    for (const item of this.floorGroups) {
      const active = selected === null || selected === item.level;
      item.group.visible = active;
      item.exterior.visible = selected === null || selected !== item.level;
      item.interior.visible = selected !== null && selected === item.level;
      if (item.label) item.label.visible = true;
    }
    if (this.roofGroup) this.roofGroup.visible = selected === null;
    this.controls.update();
  }

  updateResult(result) {
    this.result = result;
    this.applyFloorVisibility();
  }

  setHighlight(object) {
    if (this.hovered === object) return;
    this.hovered = object;
    if (!object) {
      this.highlight.visible = false;
      return;
    }
    this.highlight.setFromObject(object);
    this.highlight.visible = true;
  }

  bindEvents() {
    this.onResize = () => this.resize();
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.container);
    this.onPointerDown = (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY };
    };
    this.onPointerUp = (event) => {
      if (!this.pointerDown) return;
      const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
      this.pointerDown = null;
      if (moved > 5) return;
      const hit = this.pick(event);
      if (hit?.object?.userData?.kind) {
        this.onSelect?.({ ...hit.object.userData, point: hit.point, result: this.result });
      }
    };
    this.onPointerMove = (event) => {
      const hit = this.pick(event);
      const object = hit?.object?.userData?.kind ? hit.object : null;
      this.setHighlight(object);
      this.renderer.domElement.style.cursor = object ? 'pointer' : 'grab';
    };
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    return hits.find((hit) => hit.object.visible && hit.object.parent?.visible) ?? hits[0] ?? null;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate(time) {
    this.timer = time;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  }

  disposeGroup(group) {
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.disposeGroup(this.buildingGroup);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
