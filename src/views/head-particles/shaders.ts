/**
 * GLSL ES 1.00 shaders for the head particle field.
 *
 * Four programs (background, particles, rising embers, and a fullscreen
 * COMPOSITE that adds chromatic dispersion) render the scene:
 *  - BACKGROUND — two layers in one fullscreen pass: an animated smoky
 *    shape-gradient (domain-warped fbm) and, on top, straight animated light
 *    beams radiating from above the head down onto it.
 *  - PARTICLES — the head point cloud. Lit per-vertex from a fixed key light
 *    (rim/fresnel + diffuse + spec, cool blue→white tint). The shadow side
 *    jitters more; brightness drives a soft bloom (lit points grow and wash to
 *    white), so the light side reads blurrier than the crisp dark side.
 *  - RISING — procedural embers streaming up from below into the head, each
 *    driven entirely on the GPU from a per-point random seed + time.
 */

// Shared GLSL noise (value noise + hashes). Prepended to shaders that need it.
const NOISE = /* glsl */ `
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
          mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
          mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`;

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aNormal;

  uniform mat4 uProjection;
  uniform mat4 uModelView;
  uniform mat3 uNormalMatrix;
  uniform vec3 uLightPos;
  uniform vec3 uLightDir;      // view-space head→light direction (for shadow term)
  uniform float uTime;
  uniform float uRadius;
  uniform float uPointScale;
  uniform float uAmbient;
  uniform float uDissolve;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uFogMin;
  uniform float uJitter;       // 0 = base layer, 1 = second denser layer
  uniform float uBurst;        // 0..1 pointer-present factor
  uniform vec2 uCursor;        // cursor position in NDC
  uniform float uBurstRadius;  // burst radius in NDC (aspect-corrected)
  uniform float uAspect;       // width / height
  uniform float uReveal;       // 0..1 intro scan: head materialises bottom→top

  varying float vBright;
  varying float vAlpha;
  varying vec3 vTint;

  ${NOISE}

  void main() {
    float rnd = hash13(aPosition * 13.7);
    vec3 ndir = normalize(hash33(aPosition * 7.0) - 0.5);

    vec3 pos = aPosition;
    // Second layer sits between the originals — doubles the apparent density.
    pos += normalize(hash33(aPosition * 23.1 + 5.0) - 0.5)
           * uJitter * (0.4 + 0.6 * rnd) * uRadius * 0.022;
    float ny = pos.y / uRadius;                 // -1..1 vertical

    // Dissolution mask — gentle, so the head stays recognisable.
    float bottom = smoothstep(-0.15, -0.9, ny);
    float back = smoothstep(-0.1, -0.65, aNormal.z);
    float mask = clamp(bottom * 0.7 + back * 0.35, 0.0, 1.0);

    float t = uDissolve * 0.35;
    vec3 debris = aNormal * (0.2 + 0.5 * rnd) + ndir * 0.3;
    pos += debris * mask * t * uRadius * 0.5;
    pos.y -= mask * uDissolve * (0.08 + rnd * 0.25) * uRadius;

    // Gentle idle life: each point slides ALONG the surface, within its normal's
    // tangent plane, on its own phase. Because the motion is purely tangential
    // (never along the normal), the head's geometry/silhouette is preserved — the
    // particles float across the surface rather than the shape breathing in/out.
    vec3 tN = normalize(aNormal);
    float tSel = step(0.99, abs(tN.y));                       // avoid a degenerate up
    vec3 tUp = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), tSel);
    vec3 tT1 = normalize(cross(tUp, tN));
    vec3 tT2 = cross(tN, tT1);
    float tph = rnd * 6.2832;
    float tdx = sin(uTime * 0.45 + tph) * 0.6 + sin(uTime * 0.21 + tph * 2.3) * 0.4;
    float tdy = cos(uTime * 0.38 + tph * 1.7) * 0.6 + cos(uTime * 0.17 + tph * 3.1) * 0.4;
    pos += (tT1 * tdx + tT2 * tdy) * 0.02 * uRadius;

    vec3 N = normalize(uNormalMatrix * aNormal);
    vec4 viewPos = uModelView * vec4(pos, 1.0);
    vec3 V = normalize(-viewPos.xyz);
    vec3 L = normalize(uLightPos - viewPos.xyz);

    // FRONT-LIT so the FACE surface reads (not just the outline): a diffuse key
    // light near the camera lights the front of the face; features carve because
    // the nose faces the light (bright) while eye sockets/under-brow recess
    // (dark). A soft rim keeps a faint glowing edge. Low ambient so the feature
    // shadows stay dark and the detail pops.
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(1.0 - ndv, 2.5);            // grazing edge (subtle now)
    float faceL = max(dot(N, L), 0.0);          // how much it faces the light
    float b = uAmbient + faceL * 0.7 + faceL * faceL * faceL * 0.6 + rim * faceL * 0.4;
    // Extra rim on the RIGHT contour (view-space normals pointing right) so the
    // right edge of the head glows even though the key light is on the left.
    b += rim * smoothstep(0.15, 0.7, N.x) * 0.8;
    b = pow(b, 1.1);

    float dist = -viewPos.z;
    float fog = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);
    b *= mix(uFogMin, 1.0, fog);

    // Upward flow + regeneration: every point streams smoothly up on its own
    // phase. Position eases up (lingers near home so the face stays sharp, then
    // flies off the top); alpha fades in at spawn and out as it rises, so fresh
    // points continuously refill the head where risen ones left. Screen-up (view
    // Y) regardless of head rotation; applied after lighting so shading is stable.
    // Only the DARK side sheds particles: shadowed points (low lit brightness)
    // rise and BRIGHTEN as they fly up, then fade at the top and regenerate at
    // home. Lit points (the face) stay put, so the features stay sharp.
    float darkness = 1.0 - smoothstep(0.08, 0.3, b);   // 1 = shadow, 0 = lit
    float risePhase = hash13(aPosition * 5.7);
    float riseLife = fract(uTime * 0.09 + risePhase);
    float rise = pow(riseLife, 2.5) * darkness;
    viewPos.y += rise * 1.3 * uRadius;
    float brightenAdd = rise * 0.9;                    // lighten as it rises
    float darkFade = smoothstep(0.0, 0.05, riseLife)
                   * (1.0 - smoothstep(0.7, 1.0, riseLife));
    float riseAlpha = mix(1.0, darkFade, darkness);    // lit solid; dark cycles

    // Sci-fi materialisation: a soft, WIDE band sweeps bottom→top on intro
    // (uReveal 0→1). Each point's threshold is noise-jittered so the front reads
    // as an organic dust edge (not a hard horizontal line); not-yet-formed points
    // sit lower and rise into place as they resolve; a soft glow rides the front.
    // Computed before projection so the rise-into-place also shifts on screen.
    float yn = ny * 0.5 + 0.5;                        // 0 = bottom, 1 = top
    float rvNoise = hash13(aPosition * 3.1 + 11.0);   // per-point edge jitter
    float rThresh = yn + (rvNoise - 0.5) * 0.16;
    float front = uReveal * 1.65 - 0.35;              // clears fully past both ends
    float band = 0.3;                                 // wide, soft reveal gradient
    float revealed = smoothstep(front + band, front - 0.02, rThresh);
    float scan = smoothstep(front - band, front, rThresh)
               * (1.0 - smoothstep(front, front + 0.06, rThresh))
               * (1.0 - smoothstep(0.96, 1.0, uReveal));    // fades out as it finishes
    viewPos.y -= (1.0 - revealed) * 0.12 * uRadius;   // rise into place

    // Hover: soft illumination around the cursor (no displacement).
    vec4 clip = uProjection * viewPos;
    vec2 ndc = clip.xy / clip.w;
    float cd = length((ndc - uCursor) * vec2(uAspect, 1.0));
    float hoverGlow = uBurst * (1.0 - smoothstep(0.0, uBurstRadius, cd));

    vBright = b + hoverGlow * 0.6 + brightenAdd + scan * 0.9;  // soft bloom on front
    vAlpha = (1.0 - mask * 0.7) * riseAlpha * revealed;        // hidden until revealed
    // Light-blue ink washing to white at the brightest edge; the dark interior
    // stays black via low brightness + the fragment alpha gate.
    vTint = mix(vec3(0.4, 0.6, 1.0), vec3(0.95, 0.98, 1.0), smoothstep(0.35, 1.1, vBright));
    vTint = mix(vTint, vec3(0.6, 0.88, 1.0), hoverGlow * 0.6);
    vTint = mix(vTint, vec3(0.6, 0.85, 1.0), clamp(scan, 0.0, 1.0) * 0.7);

    gl_Position = clip;
    gl_PointSize = max(1.0, uPointScale / dist) * (0.7 + 0.6 * rnd)
                   * (1.0 + clamp(b, 0.0, 2.0) * 0.6) * (1.0 + hoverGlow * 0.6)
                   * (1.0 + scan * 0.6);
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  varying float vBright;
  varying float vAlpha;
  varying vec3 vTint;

  void main() {
    vec2 pc = gl_PointCoord - vec2(0.5);
    float d = length(pc);
    if (d > 0.5) discard;

    // Softer falloff on brighter points reinforces the bloom. The smoothstep
    // gate makes dim (shadow-side) points nearly vanish — with additive blending
    // that is what actually yields a dark shadow side instead of a grey pile-up.
    float soft = smoothstep(0.5, 0.0, d);
    // Lower gate so the faint fill particles survive (form in the dark part),
    // while the very darkest still fade.
    float a = soft * clamp(vBright, 0.0, 2.0) * vAlpha * smoothstep(0.005, 0.07, vBright);
    gl_FragColor = vec4(uColor * vTint * vBright, a);
  }
`;

export const BACKGROUND_VERTEX_SHADER = /* glsl */ `
  precision highp float;
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

// Post-process: composite the offscreen scene to the screen with chromatic
// dispersion — R/G/B are sampled at radially-offset UVs (offset grows toward the
// frame edges, like lens dispersion), so bright particles gain a prismatic fringe.
export const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform float uDispersion;
  void main() {
    vec2 dir = vUv - 0.5;                 // radial from centre
    vec2 off = dir * uDispersion;
    float r = texture2D(uScene, vUv + off).r;
    float g = texture2D(uScene, vUv).g;
    float b = texture2D(uScene, vUv - off).b;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

export const BACKGROUND_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uBgTop;
  uniform vec3 uBgBottom;
  uniform vec3 uRayColor;
  uniform vec2 uLightUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0));
    float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) { s += amp * vnoise2(p); p *= 2.0; amp *= 0.5; }
    return s;
  }
  // Domain-warped fbm — slow flowing smoke.
  float smoke(vec2 uv, float t) {
    vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.04)),
                  fbm(uv + vec2(3.2, 1.3) - t * 0.03));
    vec2 r = vec2(fbm(uv + 1.6 * q + vec2(1.7, 9.2) + t * 0.02),
                  fbm(uv + 1.6 * q + vec2(8.3, 2.8) - t * 0.015));
    return fbm(uv + 1.8 * r);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Layer 1 — animated smoky shape-gradient: the visible flowing drapes, kept
    // contrasty (deep darks) but NOT brightened.
    vec3 col = mix(uBgBottom, uBgTop, pow(uv.y, 1.15));
    float sm = smoke(vec2(uv.x * aspect * 2.0, uv.y * 1.3), uTime * 3.2);
    sm = smoothstep(0.22, 0.92, sm);       // restore the smoke pattern
    sm = pow(sm, 1.3);                      // keep the darks deep (contrast)
    col += uRayColor * sm * 0.32;

    // Layer 2 — several distinct light beams entering from the LEFT of the screen
    // and falling diagonally left→right onto the head.
    vec2 pt = uv * vec2(aspect, 1.0);
    float across = pt.x * 0.75 + pt.y;               // diagonal band coordinate
    float beams = pow(0.5 + 0.5 * sin(across * 8.0 - uTime * 0.4), 7.0);
    beams += 0.6 * pow(0.5 + 0.5 * sin(across * 8.0 + 2.0 - uTime * 0.26), 7.0);
    float leftFade = smoothstep(1.15, -0.05, uv.x);  // brightest on the left
    float topFade = smoothstep(-0.1, 0.9, uv.y);
    col += uRayColor * beams * leftFade * topFade * 0.8;

    // Soft glow at the upper-left source.
    float glow = smoothstep(0.75, 0.0, length((uv - vec2(0.08, 1.0)) * vec2(aspect, 1.0)));
    col += uRayColor * glow * 0.08;

    // Stronger vignette adds dark area at the edges (contrast).
    col *= smoothstep(1.32, 0.22, length((uv - 0.5) * vec2(1.13, 1.0)));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const RISING_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec4 aSeed;        // x[-1,1], z[-1,1], phase[0,1], rnd[0,1]
  uniform mat4 uProjection;
  uniform vec3 uCenter;        // view-space head centre
  uniform float uTime;
  uniform float uRadius;
  uniform float uPointScale;
  uniform float uReveal;       // 0..1 intro scan — embers stream in as it finishes

  varying float vA;

  void main() {
    float speed = 0.02 + 0.045 * aSeed.w;                // slower rise
    float life = fract(aSeed.z + uTime * speed);         // 0 (bottom) → 1 (top)

    // Chaotic multi-frequency drift so the embers wander as they climb.
    float t = uTime;
    float sway = sin(t * 0.5 + aSeed.z * 40.0) * 0.16
               + sin(t * 0.9 + aSeed.w * 23.0) * 0.10
               + sin(t * 1.7 + aSeed.x * 15.0) * 0.06;
    float swayZ = cos(t * 0.6 + aSeed.z * 31.0) * 0.13
                + sin(t * 1.3 + aSeed.w * 19.0) * 0.07;

    float x = uCenter.x + aSeed.x * uRadius * 0.9 + sway * uRadius;
    float z = uCenter.z + aSeed.y * uRadius * 1.0 + swayZ * uRadius;
    float y = mix(uCenter.y - uRadius * 2.4, uCenter.y + uRadius * 1.5, life);

    vec4 viewPos = vec4(x, y, z, 1.0);
    vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.7, 1.0, life));
    vA *= smoothstep(0.4, 1.0, uReveal);   // hold embers back until the head forms
    gl_Position = uProjection * viewPos;
    float dist = -viewPos.z;
    gl_PointSize = max(1.0, uPointScale / dist) * (0.9 + 1.5 * aSeed.w);  // bigger
  }
`;

export const RISING_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 pc = gl_PointCoord - vec2(0.5);
    float d = length(pc);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * vec3(0.72, 0.83, 1.0), soft * vA * 0.9);
  }
`;
