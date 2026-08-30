import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ink Ticker — hand-drawn / comic-book 3D candlestick chart.
 *
 * Port of the standalone Ink Ticker scene, scoped to its own container instead
 * of the window, and recoloured into the TENDER palette (red bullish candles,
 * ink-grey bearish candles, black outlines on paper white).
 */
const CONFIG = {
  paper: "#ffffff",
  upColor: "#e8322a", // TENDER red — bullish
  downColor: "#55555c", // ink grey — bearish
  wickColor: "#101012",
  lineColor: "#101012",
  gridColor: "#c9c9ce",
  candleCount: 22,
  speed: 0.45,
  volatility: 1.4,
  formEase: 5,
  yScale: 2.18,
  chartX: -1.4,
  chartY: -0.6,
  gridOpacity: 1,
  gridScale: 1.25,
  upArrowX: 0.8,
  upArrowY: 0.9,
  dnArrowX: 0,
  dnArrowY: 7.5,
  outlineWidth: 2.3,
  depthEdge: 4,
  normalEdge: 0.05,
  camYaw: -0.0444,
  camPitch: 1.56,
  camDist: 16,
  parallax: 0.3,
  hoverLift: 0.6,
};

const ARROW_UP = [
  "...#...",
  "..###..",
  ".#####.",
  "#######",
  "..###..",
  "..###..",
  "..###..",
  "..###..",
];

type Candle = {
  open: number;
  close: number;
  hpad: number;
  lpad: number;
  hi: number;
  lo: number;
  up: boolean;
};

type Entry = {
  group: THREE.Group;
  body: THREE.Mesh;
  wick: THREE.Mesh;
  lift: number;
  hitX: number;
  hitHalfW: number;
  hitYmin: number;
  hitYmax: number;
};

export default function InkTicker({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const cfg = { ...CONFIG };
    if (window.matchMedia("(max-width: 768px)").matches) {
      cfg.candleCount = 11;
      cfg.chartX = -0.8;
    }

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      host.removeChild(canvas);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const hexColor = (hex: string) => new THREE.Color(hex);
    const hexVec3 = (hex: string) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const scene = new THREE.Scene();
    scene.background = hexColor(cfg.paper);

    const size = () => ({
      w: Math.max(1, host.clientWidth),
      h: Math.max(1, host.clientHeight),
    });
    let { w: cw, h: ch } = size();

    const camera = new THREE.PerspectiveCamera(42, cw / ch, 0.1, 100);
    const CAM_TARGET = new THREE.Vector3(0, 0.3, 0);
    let VIS_W = 9;
    let VIS_H = 6;
    let VIEW_WIDTH = 13;
    let spacing = VIEW_WIDTH / cfg.candleCount;
    let bodyWidth = spacing * 0.6;

    const LYR_INK = 0;
    const LYR_FLAT = 1;

    const camPos = (out: THREE.Vector3) => {
      const sp = Math.sin(cfg.camPitch);
      const cp = Math.cos(cfg.camPitch);
      const sy = Math.sin(cfg.camYaw);
      const cy = Math.cos(cfg.camYaw);
      return out
        .set(cfg.camDist * sp * sy, cfg.camDist * cp, cfg.camDist * sp * cy)
        .add(CAM_TARGET);
    };
    const computeVis = () => {
      const t = Math.tan(((camera.fov * Math.PI) / 180) / 2);
      VIS_H = camera.position.distanceTo(CAM_TARGET) * t;
      VIS_W = VIS_H * camera.aspect;
    };
    const sizeChart = () => {
      VIEW_WIDTH = VIS_W * 2 * 0.96;
      spacing = VIEW_WIDTH / cfg.candleCount;
      bodyWidth = spacing * 0.6;
      buildGrid();
      buildArrows();
    };

    camPos(camera.position);
    camera.lookAt(CAM_TARGET);

    // pointer parallax + hover, tracked inside the host element only
    let ptrX = 0;
    let ptrY = 0;
    let parX = 0;
    let parY = 0;
    let pointerInside = false;
    const onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ptrX = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptrY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointerInside = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
      ptrX = 0;
      ptrY = 0;
    };
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    const raycaster = new THREE.Raycaster();
    const hoverNdc = new THREE.Vector2();
    const hoverPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hoverPt = new THREE.Vector3();
    let hoverEntry: Entry | null = null;
    const updateHover = () => {
      if (!pointerInside) {
        hoverEntry = null;
        return;
      }
      hoverNdc.set(ptrX, ptrY);
      raycaster.setFromCamera(hoverNdc, camera);
      let found: Entry | null = null;
      if (raycaster.ray.intersectPlane(hoverPlane, hoverPt)) {
        for (const p of pool) {
          if (!p.body.visible) continue;
          if (
            Math.abs(hoverPt.x - p.hitX) <= p.hitHalfW &&
            hoverPt.y >= p.hitYmin &&
            hoverPt.y <= p.hitYmax
          ) {
            found = p;
            break;
          }
        }
      }
      hoverEntry = found;
    };

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(-4, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.28);
    fill.position.set(6, 2, -4);
    scene.add(fill);

    const steps = new Uint8Array([120, 200, 255]);
    const gradientMap = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;

    const upMat = new THREE.MeshToonMaterial({ color: cfg.upColor, gradientMap });
    const downMat = new THREE.MeshToonMaterial({ color: cfg.downColor, gradientMap });
    const wickMat = new THREE.MeshToonMaterial({ color: cfg.wickColor, gradientMap });

    /* ---------- price series ---------- */
    const REVERSION = 0.06;
    const series: Candle[] = [];
    const reshape = (d: Candle) => {
      d.hi = Math.max(d.open, d.close) + d.hpad;
      d.lo = Math.min(d.open, d.close) - d.lpad;
      d.up = d.close >= d.open;
      return d;
    };
    const genNext = (prevClose: number) => {
      const drift = -prevClose * REVERSION;
      const shock = (Math.random() - 0.5) * cfg.volatility;
      return reshape({
        open: prevClose,
        close: prevClose + drift + shock,
        hpad: Math.random() * cfg.volatility * 0.6,
        lpad: Math.random() * cfg.volatility * 0.6,
        hi: 0,
        lo: 0,
        up: true,
      });
    };
    series.push(reshape({ open: 0, close: 0.3, hpad: 0.3, lpad: 0.25, hi: 0, lo: 0, up: true }));
    const ensure = (idx: number) => {
      while (series.length <= idx) series.push(genNext(series[series.length - 1].close));
      return series[idx];
    };

    /* ---------- candle pool ---------- */
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    let pool: Entry[] = [];
    let scrollX = 0;
    let formBase = -1;
    let livePrice = 0;

    const buildPool = () => {
      for (const p of pool) scene.remove(p.group);
      pool = [];
      spacing = VIEW_WIDTH / cfg.candleCount;
      bodyWidth = spacing * 0.6;
      for (let k = 0; k < cfg.candleCount + 2; k++) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(boxGeo, upMat);
        const wick = new THREE.Mesh(boxGeo, wickMat);
        body.layers.set(LYR_INK);
        wick.layers.set(LYR_INK);
        group.add(body);
        group.add(wick);
        scene.add(group);
        pool.push({ group, body, wick, lift: 0, hitX: 0, hitHalfW: 0, hitYmin: 0, hitYmax: 0 });
      }
    };

    let viewMin = 0;
    let viewMax = 0;
    let viewCenter = 0;
    let viewScale = cfg.yScale;
    let viewInit = false;
    const dispY = (v: number) => (v - viewCenter) * viewScale + cfg.chartY;

    /* ---------- pixel arrows ---------- */
    const buildPixelArrow = (mat: THREE.Material, flip: boolean) => {
      const g = new THREE.Group();
      const cell = 1;
      const cols = ARROW_UP[0].length;
      const rows = ARROW_UP.length;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (ARROW_UP[r][c] !== "#") continue;
          const b = new THREE.Mesh(boxGeo, mat);
          const yy = flip ? r : rows - 1 - r;
          b.position.set((c - (cols - 1) / 2) * cell, (yy - (rows - 1) / 2) * cell, 0);
          b.scale.setScalar(cell * 0.94);
          b.layers.set(LYR_INK);
          g.add(b);
        }
      }
      return g;
    };
    let arrows: { grp: THREE.Group; x0: number; y0: number; z: number; ph: number; spin: number; ox: "upArrowX" | "dnArrowX"; oy: "upArrowY" | "dnArrowY" }[] = [];
    function buildArrows() {
      for (const a of arrows) scene.remove(a.grp);
      arrows = [];
      const up = buildPixelArrow(upMat, false);
      up.scale.setScalar(VIS_H * 0.05);
      scene.add(up);
      arrows.push({ grp: up, x0: -VIS_W * 0.82, y0: VIS_H * 0.64, z: -0.7, ph: 0, spin: 0.15, ox: "upArrowX", oy: "upArrowY" });
      const dn = buildPixelArrow(downMat, true);
      dn.scale.setScalar(VIS_H * 0.044);
      scene.add(dn);
      arrows.push({ grp: dn, x0: VIS_W * 0.84, y0: -VIS_H * 0.62, z: -0.9, ph: 2.0, spin: -0.12, ox: "dnArrowX", oy: "dnArrowY" });
    }
    const updateArrows = (time: number) => {
      for (const a of arrows) {
        a.grp.position.x = a.x0 + cfg[a.ox];
        a.grp.position.y = a.y0 + cfg[a.oy] + Math.sin(time * 0.9 + a.ph) * 0.35;
        a.grp.position.z = a.z;
        a.grp.rotation.z = Math.sin(time * 0.5 + a.ph) * a.spin;
      }
    };

    /* ---------- grid ---------- */
    let gridObj: THREE.Group | null = null;
    function buildGrid() {
      if (gridObj) {
        scene.remove(gridObj);
        gridObj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
      }
      gridObj = new THREE.Group();
      const col = hexColor(cfg.gridColor);
      const op = cfg.gridOpacity;
      const gs = cfg.gridScale;
      const halfW = (VIEW_WIDTH / 2 + 0.4) * gs;
      const topY = 7 * gs;
      const botY = -7 * gs;
      const zBack = -1.4;

      const wallPts: number[] = [];
      for (let i = -5; i <= 5; i++) {
        if (i === 0) continue;
        const y = i * 1.3 * gs;
        wallPts.push(-halfW, y, zBack, halfW, y, zBack);
      }
      for (let i = -7; i <= 7; i++) {
        const x = i * (halfW / 7);
        wallPts.push(x, botY, zBack, x, topY, zBack);
      }
      const wallGeo = new THREE.BufferGeometry();
      wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(wallPts, 3));
      const wall = new THREE.LineSegments(
        wallGeo,
        new THREE.LineDashedMaterial({ color: col, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: op * 0.8 }),
      );
      wall.computeLineDistances();
      wall.layers.set(LYR_FLAT);
      gridObj.add(wall);

      const baseGeo = new THREE.BufferGeometry();
      baseGeo.setAttribute("position", new THREE.Float32BufferAttribute([-halfW, 0, zBack, halfW, 0, zBack], 3));
      const baseLine = new THREE.Line(
        baseGeo,
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: Math.min(1, op * 1.2) }),
      );
      baseLine.layers.set(LYR_FLAT);
      gridObj.add(baseLine);
      scene.add(gridObj);
    }

    /* ---------- ink outline pass ---------- */
    let dpr = renderer.getPixelRatio();
    let W = Math.floor(cw * dpr);
    let H = Math.floor(ch * dpr);

    const depthTex = new THREE.DepthTexture(W, H);
    depthTex.type = THREE.UnsignedIntType;
    const normalTarget = new THREE.WebGLRenderTarget(W, H, {
      depthTexture: depthTex,
      depthBuffer: true,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    const colorTarget = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const normalMat = new THREE.MeshNormalMaterial();

    const outlineMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: colorTarget.texture },
        tNormal: { value: normalTarget.texture },
        tDepth: { value: depthTex },
        texel: { value: new THREE.Vector2(1 / W, 1 / H) },
        thickness: { value: cfg.outlineWidth },
        depthEdge: { value: cfg.depthEdge },
        normalEdge: { value: cfg.normalEdge },
        lineColor: { value: hexVec3(cfg.lineColor) },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tColor, tNormal, tDepth;
        uniform vec2 texel; uniform float thickness, depthEdge, normalEdge, cameraNear, cameraFar;
        uniform vec3 lineColor; varying vec2 vUv;
        float lin(vec2 uv){
          float z = texture2D(tDepth, uv).x;
          float ndc = z * 2.0 - 1.0;
          return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndc * (cameraFar - cameraNear));
        }
        void main(){
          vec3 col = texture2D(tColor, vUv).rgb;
          vec2 o = texel * thickness;
          float dc = lin(vUv);
          float dd = abs(dc - lin(vUv + vec2(o.x,0.0))) + abs(dc - lin(vUv - vec2(o.x,0.0)))
                   + abs(dc - lin(vUv + vec2(0.0,o.y))) + abs(dc - lin(vUv - vec2(0.0,o.y)));
          float de = step(depthEdge, dd);
          vec3 nc = texture2D(tNormal, vUv).xyz;
          float nd = length(nc - texture2D(tNormal, vUv + vec2(o.x,0.0)).xyz)
                   + length(nc - texture2D(tNormal, vUv - vec2(o.x,0.0)).xyz)
                   + length(nc - texture2D(tNormal, vUv + vec2(0.0,o.y)).xyz)
                   + length(nc - texture2D(tNormal, vUv - vec2(0.0,o.y)).xyz);
          float ne = step(normalEdge, nd);
          float edge = max(de, ne);
          gl_FragColor = vec4(mix(col, lineColor, edge), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const quadScene = new THREE.Scene();
    const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outlineMat);
    quadScene.add(quadMesh);
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const resize = () => {
      const s = size();
      cw = s.w;
      ch = s.h;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      camPos(camera.position);
      camera.lookAt(CAM_TARGET);
      computeVis();
      sizeChart();
      dpr = renderer.getPixelRatio();
      W = Math.floor(cw * dpr);
      H = Math.floor(ch * dpr);
      normalTarget.setSize(W, H);
      colorTarget.setSize(W, H);
      depthTex.image.width = W;
      depthTex.image.height = H;
      depthTex.needsUpdate = true;
      outlineMat.uniforms.texel.value.set(1 / W, 1 / H);
    };

    computeVis();
    buildPool();
    sizeChart();
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(host);

    /* ---------- candles ---------- */
    const updateCandles = (dt: number, time: number) => {
      scrollX += cfg.speed * dt;
      const base = Math.floor(scrollX);
      const frac = scrollX - base;
      const N = cfg.candleCount;
      const leftEdge = -(N * spacing) / 2;
      const wickWidth = Math.max(spacing * 0.14, 0.05);

      const live = ensure(base + N);
      if (base !== formBase) {
        formBase = base;
        const openPrice = ensure(base + N - 1).close;
        live.open = openPrice;
        live.close = openPrice;
        live.hi = openPrice;
        live.lo = openPrice;
        livePrice = openPrice;
      }
      livePrice += (Math.random() - 0.5) * cfg.volatility * 1.6 * dt;
      livePrice += -livePrice * REVERSION * dt;
      live.close += (livePrice - live.close) * Math.min(1, dt * cfg.formEase);
      if (live.close > live.hi) live.hi = live.close;
      if (live.close < live.lo) live.lo = live.close;
      live.up = live.close >= live.open;

      let tlo = Infinity;
      let thi = -Infinity;
      for (let k = 0; k <= N; k++) {
        const d = ensure(base + k);
        if (d.lo < tlo) tlo = d.lo;
        if (d.hi > thi) thi = d.hi;
      }
      if (!viewInit) {
        viewMin = tlo;
        viewMax = thi;
        viewInit = true;
      }
      const expand = Math.min(1, dt * 4.0);
      const shrink = Math.min(1, dt * 0.7);
      viewMin += (tlo - viewMin) * (tlo < viewMin ? expand : shrink);
      viewMax += (thi - viewMax) * (thi > viewMax ? expand : shrink);
      viewCenter = (viewMin + viewMax) * 0.5;
      const range = Math.max(1e-3, viewMax - viewMin);
      const halfBand = Math.max(1, (VIS_H - Math.abs(cfg.chartY)) * 0.86);
      viewScale = Math.min(cfg.yScale, (halfBand * 2) / range);

      for (let k = 0; k < pool.length; k++) {
        const p = pool[k];
        if (k > N) {
          p.body.visible = false;
          p.wick.visible = false;
          p.lift = 0;
          continue;
        }
        const d = ensure(base + k);
        const bodyH = Math.max(Math.abs(d.close - d.open) * viewScale, 0.02);
        const wickH = Math.max((d.hi - d.lo) * viewScale, 0.02);
        if (k === N && (d.hi - d.lo) * viewScale < 0.03) {
          p.body.visible = false;
          p.wick.visible = false;
          p.lift = 0;
          continue;
        }
        p.body.visible = true;
        p.wick.visible = true;
        const x = leftEdge + (k - frac) * spacing + cfg.chartX;
        const midY = dispY((d.open + d.close) / 2);
        const wickY = dispY((d.hi + d.lo) / 2);
        const targetLift = p === hoverEntry ? cfg.hoverLift : 0;
        p.lift += (targetLift - p.lift) * Math.min(1, dt * 10);
        p.body.material = d.up ? upMat : downMat;
        p.body.position.set(x, midY + p.lift, 0);
        p.body.scale.set(bodyWidth, bodyH, bodyWidth);
        p.wick.position.set(x, wickY + p.lift, 0);
        p.wick.scale.set(wickWidth, wickH, wickWidth);
        p.hitX = x;
        p.hitHalfW = bodyWidth / 2;
        p.hitYmin = wickY - wickH / 2;
        p.hitYmax = wickY + wickH / 2;
      }
      updateArrows(time);
    };

    /* ---------- loop (paused when off-screen) ---------- */
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.01 },
    );
    io.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;

      parX += (ptrX - parX) * 0.06;
      parY += (ptrY - parY) * 0.06;
      camPos(camera.position);
      camera.position.x += parX * cfg.parallax;
      camera.position.y += parY * cfg.parallax;
      camera.lookAt(CAM_TARGET);
      camera.updateMatrixWorld();
      updateHover();
      updateCandles(dt, clock.elapsedTime);

      camera.layers.set(LYR_INK);
      scene.overrideMaterial = normalMat;
      const bg = scene.background;
      scene.background = null;
      renderer.setClearColor(0x7f7fff, 1);
      renderer.setRenderTarget(normalTarget);
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
      scene.background = bg;

      camera.layers.enable(LYR_FLAT);
      renderer.setRenderTarget(colorTarget);
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      normalTarget.dispose();
      colorTarget.dispose();
      depthTex.dispose();
      outlineMat.dispose();
      normalMat.dispose();
      quadMesh.geometry.dispose();
      boxGeo.dispose();
      upMat.dispose();
      downMat.dispose();
      wickMat.dispose();
      gradientMap.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return <div ref={hostRef} className={className} />;
}
