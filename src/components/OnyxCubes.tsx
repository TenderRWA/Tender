import type * as THREE_NS from "three";
import { useEffect, useRef } from "react";

/**
 * Onyx Cubes — a weightless swarm of glossy cubes (TENDER red) inside a
 * rigid-body sim. Ported from the standalone onyx-cubes source bundle and
 * scoped to its container instead of the window, so it can sit inside a tile.
 * Cursor sweeps push the swarm; pressing a cube grabs and flings it.
 */
export default function OnyxCubes({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [THREE, { RoundedBoxGeometry }, CANNON] = await Promise.all([
        import("three"),
        import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
        import("cannon-es"),
      ]);
      if (disposed) return;

      const CONFIG = {
        bgTop: "#fbfcfd",
        bgBottom: "#e6d9d8",
        cubeColor: "#e8322a", // TENDER red
        envTint: "#2a0f0e",
        exposure: 1.05,
        metalness: 1.0,
        roughness: 0.16,
        clearcoat: 0.6,
        envIntensity: 1.0,
        cubeCount: 12,
        cubeSize: 1.05,
        sizeVar: 0.32,
        cornerR: 0.1,
        spawnSpread: 2.6,
        centerPull: 5.5,
        bob: 0.9,
        bobSpeed: 0.55,
        linDamp: 0.32,
        angDamp: 0.28,
        spin: 0.8,
        restitution: 0.28,
        pushRadius: 2.3,
        pushStrength: 34,
        dragForce: 90,
        keyLight: 0.55,
        ambient: 0.55,
        rim: 0.35,
        shadowOpacity: 0.16,
        shadowY: -3.4,
        fov: 32,
        camDist: 10.0,
        parallax: 0.4,
      };

      const canvas = document.createElement("canvas");
      canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
      host.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = CONFIG.exposure;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(CONFIG.fov, 1, 0.1, 100);
      camera.position.set(0, 0, CONFIG.camDist);
      camera.lookAt(0, 0, 0);

      // studio gradient backdrop
      const bg = document.createElement("canvas");
      bg.width = 16;
      bg.height = 512;
      const bctx = bg.getContext("2d")!;
      const grad = bctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, CONFIG.bgTop);
      grad.addColorStop(1, CONFIG.bgBottom);
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, 16, 512);
      const bgTex = new THREE.CanvasTexture(bg);
      bgTex.colorSpace = THREE.SRGBColorSpace;
      scene.background = bgTex;

      // dark studio env → glossy chrome-red reflections
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(CONFIG.envTint);
      const panel = (v: number, pos: [number, number, number], scale: [number, number], rot: [number, number, number]) => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), toneMapped: false, side: THREE.DoubleSide })
        );
        m.position.set(...pos);
        m.rotation.set(rot[0], rot[1], rot[2]);
        m.scale.set(scale[0], scale[1], 1);
        envScene.add(m);
      };
      panel(7.0, [0, 11, 3], [16, 8], [Math.PI / 2, 0, 0]);
      panel(5.0, [7, 3, 4], [4, 12], [0, -Math.PI / 2.3, 0]);
      panel(3.2, [-7, 2, 3], [4, 12], [0, Math.PI / 2.3, 0]);
      panel(1.1, [0, 0, 10], [18, 12], [0, 0, 0]);
      const envRT = pmrem.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;

      scene.add(new THREE.AmbientLight(0xffffff, CONFIG.ambient));
      const key = new THREE.DirectionalLight(0xffffff, CONFIG.keyLight);
      key.position.set(3.5, 8, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.radius = 10;
      key.shadow.bias = -0.0005;
      const sc = key.shadow.camera;
      sc.near = 1;
      sc.far = 30;
      sc.left = -8;
      sc.right = 8;
      sc.top = 8;
      sc.bottom = -8;
      sc.updateProjectionMatrix();
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffd7d3, CONFIG.rim);
      rim.position.set(-4, 2, -6);
      scene.add(rim);

      const shadowMat = new THREE.ShadowMaterial({ opacity: CONFIG.shadowOpacity });
      const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
      shadowFloor.rotation.x = -Math.PI / 2;
      shadowFloor.position.y = CONFIG.shadowY;
      shadowFloor.receiveShadow = true;
      scene.add(shadowFloor);

      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
      world.broadphase = new CANNON.SAPBroadphase(world);
      world.allowSleep = false;
      const cubeMat = new CANNON.Material("cube");
      world.addContactMaterial(
        new CANNON.ContactMaterial(cubeMat, cubeMat, { friction: 0.15, restitution: CONFIG.restitution })
      );

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(CONFIG.cubeColor),
        metalness: CONFIG.metalness,
        roughness: CONFIG.roughness,
        clearcoat: CONFIG.clearcoat,
        clearcoatRoughness: 0.12,
        envMapIntensity: CONFIG.envIntensity,
      });

      let seed = 1;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      type Rec = { mesh: THREE_NS.Mesh; body: InstanceType<typeof CANNON.Body>; phase: number };
      const cubes: Rec[] = [];
      const R = CONFIG.spawnSpread;
      for (let i = 0; i < CONFIG.cubeCount; i++) {
        const s = CONFIG.cubeSize * (1 - CONFIG.sizeVar * 0.5 + rand() * CONFIG.sizeVar);
        const geo = new RoundedBoxGeometry(s, s, s, 4, Math.min(CONFIG.cornerR, s * 0.45));
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 1, material: cubeMat });
        body.addShape(new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)));
        body.position.set((rand() * 2 - 1) * R, (rand() * 2 - 1) * R * 0.7, (rand() * 2 - 1) * R * 0.6);
        body.quaternion.setFromEuler(rand() * 6.28, rand() * 6.28, rand() * 6.28);
        body.linearDamping = CONFIG.linDamp;
        body.angularDamping = CONFIG.angDamp;
        const sp = CONFIG.spin;
        body.angularVelocity.set((rand() * 2 - 1) * sp, (rand() * 2 - 1) * sp, (rand() * 2 - 1) * sp);
        world.addBody(body);
        cubes.push({ mesh, body, phase: rand() * 6.28 });
      }

      // pointer
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const ndcPrev = new THREE.Vector2();
      let pointerSpeed = 0;
      let pointerInside = false;
      const parallax = new THREE.Vector2();
      let grabbed: Rec | null = null;
      let pointerBody: InstanceType<typeof CANNON.Body> | null = null;
      let dragConstraint: InstanceType<typeof CANNON.PointToPointConstraint> | null = null;
      const dragPlane = new THREE.Plane();
      const _hit = new THREE.Vector3();

      const setNDC = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      };

      const onDown = (e: PointerEvent) => {
        setNDC(e);
        pointerInside = true;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(cubes.map((c) => c.mesh));
        if (!hits.length) return;
        const rec = cubes.find((c) => c.mesh === hits[0].object);
        if (!rec) return;
        grabbed = rec;
        const p = hits[0].point;
        pointerBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
        pointerBody.position.set(p.x, p.y, p.z);
        world.addBody(pointerBody);
        const pivotA = rec.body.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z));
        dragConstraint = new CANNON.PointToPointConstraint(rec.body, pivotA, pointerBody, new CANNON.Vec3(), CONFIG.dragForce);
        world.addConstraint(dragConstraint);
        const n = new THREE.Vector3();
        camera.getWorldDirection(n);
        dragPlane.setFromNormalAndCoplanarPoint(n, p);
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      };

      const onMove = (e: PointerEvent) => {
        setNDC(e);
        pointerInside = true;
        if (grabbed && pointerBody) {
          raycaster.setFromCamera(ndc, camera);
          if (raycaster.ray.intersectPlane(dragPlane, _hit)) pointerBody.position.set(_hit.x, _hit.y, _hit.z);
        }
      };

      const endGrab = (e?: PointerEvent) => {
        if (dragConstraint) {
          world.removeConstraint(dragConstraint);
          dragConstraint = null;
        }
        if (pointerBody) {
          world.removeBody(pointerBody);
          pointerBody = null;
        }
        grabbed = null;
        if (e?.pointerId != null) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {
            /* noop */
          }
        }
      };
      const onLeave = () => {
        pointerInside = false;
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", endGrab as EventListener);
      canvas.addEventListener("pointercancel", endGrab as EventListener);
      canvas.addEventListener("pointerleave", onLeave);

      const _ray = new THREE.Ray();
      const _closest = new THREE.Vector3();
      const _bodyPos = new THREE.Vector3();
      const _dir = new THREE.Vector3();
      const _force = new CANNON.Vec3();

      const applyForces = (t: number) => {
        raycaster.setFromCamera(ndc, camera);
        _ray.copy(raycaster.ray);
        for (const c of cubes) {
          const b = c.body;
          b.applyForce(
            _force.set(-b.position.x * CONFIG.centerPull, -b.position.y * CONFIG.centerPull, -b.position.z * CONFIG.centerPull)
          );
          b.applyForce(
            _force.set(
              Math.sin(t * CONFIG.bobSpeed + c.phase) * CONFIG.bob * 0.5,
              Math.cos(t * CONFIG.bobSpeed * 0.8 + c.phase) * CONFIG.bob,
              Math.sin(t * CONFIG.bobSpeed * 1.1 + c.phase * 1.7) * CONFIG.bob * 0.5
            )
          );
          if (pointerInside && c !== grabbed) {
            _bodyPos.set(b.position.x, b.position.y, b.position.z);
            _ray.closestPointToPoint(_bodyPos, _closest);
            const d = _bodyPos.distanceTo(_closest);
            if (d < CONFIG.pushRadius) {
              const falloff = 1 - d / CONFIG.pushRadius;
              const gain = Math.min(1, pointerSpeed * 8) * 0.85 + 0.15;
              _dir.copy(_bodyPos).sub(_closest);
              if (_dir.lengthSq() < 1e-6) _dir.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
              _dir.normalize().multiplyScalar(falloff * falloff * CONFIG.pushStrength * gain);
              b.applyForce(_force.set(_dir.x, _dir.y, _dir.z));
            }
          }
        }
      };

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      // only run while visible
      let visible = true;
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(host);

      const clock = new THREE.Clock();
      let raf = 0;
      const render = () => {
        raf = requestAnimationFrame(render);
        const dt = Math.min(clock.getDelta(), 1 / 30);
        if (!visible) return;
        const t = clock.elapsedTime;
        pointerSpeed = ndc.distanceTo(ndcPrev);
        ndcPrev.copy(ndc);
        applyForces(t);
        world.step(1 / 120, dt, 4);
        for (const c of cubes) {
          c.mesh.position.copy(c.body.position as unknown as THREE_NS.Vector3);
          c.mesh.quaternion.copy(c.body.quaternion as unknown as THREE_NS.Quaternion);
        }
        const px = grabbed ? 0 : ndc.x * CONFIG.parallax;
        const py = grabbed ? 0 : ndc.y * CONFIG.parallax;
        parallax.x += (px - parallax.x) * 0.05;
        parallax.y += (py - parallax.y) * 0.05;
        camera.position.set(parallax.x, parallax.y, CONFIG.camDist);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", endGrab as EventListener);
        canvas.removeEventListener("pointercancel", endGrab as EventListener);
        canvas.removeEventListener("pointerleave", onLeave);
        for (const c of cubes) c.mesh.geometry.dispose();
        material.dispose();
        bgTex.dispose();
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
