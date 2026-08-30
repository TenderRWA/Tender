/**
 * Shaders for the hero point cloud.
 *
 * Four things live in the vertex stage on purpose:
 *
 * - **Cursor repulsion**, rather than a per-frame JS loop over 87k points
 *   (obsidian/workflows/optimize-3d-scene.md §9).
 * - **The idle drift**, for the same reason — 87k sines a frame is free on the
 *   GPU and would be the whole frame budget on the CPU.
 * - **The depth fade**, which has to be measured in *view* space so the back of
 *   the subject keeps fading whichever way parallax has turned it.
 * - **The two-light rig.** Shading used to be baked into a colour attribute on
 *   the CPU, which made a colour change an 87k-point rebuild. The geometry now
 *   carries the approximated normal instead — that never changes — so the
 *   colours are plain uniforms and the tuning panel can drive them for free.
 */

export const HERO_CLOUD_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aNormal;
  attribute vec3 aRandom;

  uniform float uSize;
  uniform float uScale;
  uniform float uTime;

  uniform vec3  uCursor;
  uniform float uScatterRadius;
  uniform float uScatterForce;
  uniform float uTurbulence;

  uniform float uDriftAmount;
  uniform float uDriftSpeed;

  uniform float uDepthNear;
  uniform float uDepthFar;
  uniform float uDepthStart;
  uniform float uDepthStrength;

  uniform vec3  uKeyColor;
  uniform vec3  uRimColor;
  uniform vec3  uFillColor;

  varying vec3  vColor;
  varying float vFade;

  const vec3 KEY_DIR = vec3(-0.55, 0.25, 0.79);
  const vec3 RIM_DIR = vec3(0.85, 0.08, -0.52);

  // The key is half-lambert (dot * 0.5 + 0.5) so the form keeps reading where
  // it turns away — a hard max(0, dot) left most of the cloud near black. The
  // rim stays directional and tight, which is what makes the red edge.
  const float KEY_WRAP = 0.5;
  const float KEY_FALLOFF = 2.2;
  const float KEY_INTENSITY = 1.5;
  const float RIM_FALLOFF = 1.6;
  const float RIM_INTENSITY = 1.3;

  const float TAU = 6.2831853;

  /**
   * A slow wander **along the surface**, so the cloud is never completely
   * still. The two tangents carry almost all of it and the normal only a
   * little, which is what keeps a drifting point on the form rather than
   * lifting it off into a haze. Each point gets its own phase and its own
   * slightly different rate from aRandom, so the cloud never beats in unison.
   */
  vec3 driftOffset(vec3 normal, vec3 seed, float t) {
    // Any vector not parallel to the normal will do as the basis guide; the
    // swap keeps the cross product away from zero at the poles.
    vec3 guide = abs(normal.y) > 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 tangent = normalize(cross(normal, guide));
    vec3 bitangent = cross(normal, tangent);

    return tangent   * sin(t * (1.00 + seed.x * 0.40) + seed.x * TAU)
         + bitangent * sin(t * (0.83 + seed.y * 0.40) + seed.y * TAU) * 0.9
         + normal    * sin(t * (0.61 + seed.z * 0.40) + seed.z * TAU) * 0.3;
  }

  void main() {
    vec3 normal = normalize(aNormal);
    float key = pow(
      max(0.0, dot(normal, normalize(KEY_DIR)) * KEY_WRAP + (1.0 - KEY_WRAP)),
      KEY_FALLOFF
    ) * KEY_INTENSITY;
    float rim = pow(
      max(0.0, dot(normal, normalize(RIM_DIR))),
      RIM_FALLOFF
    ) * RIM_INTENSITY;

    vColor = min(vec3(1.0), uFillColor + uKeyColor * key + uRimColor * rim);

    vec3 displaced = position;

    if (uDriftAmount > 0.0) {
      displaced += driftOffset(normal, aRandom, uTime * uDriftSpeed) * uDriftAmount;
    }

    if (uScatterForce > 0.0) {
      vec3 away = displaced - uCursor;
      float dist = length(away);
      // Falloff is 1 at the cursor and 0 at the radius edge.
      float influence = 1.0 - smoothstep(0.0, uScatterRadius, dist);
      if (influence > 0.0) {
        // The epsilon keeps a particle sitting exactly on the cursor from
        // normalising a zero vector into NaN.
        vec3 direction = normalize(away + aRandom * uTurbulence + vec3(1e-5));
        displaced += direction * influence * uScatterForce;
      }
    }

    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);

    // Distance from the camera, not depth along the model's own Z — so the
    // band stays put in front of the lens and it is always the far side of the
    // subject that thins out, whichever way parallax has turned it.
    float through = clamp(
      (-viewPosition.z - uDepthNear) / max(uDepthFar - uDepthNear, 1e-4),
      0.0,
      1.0
    );
    // The clamp is not cosmetic: smoothstep divides by (edge1 - edge0), and
    // the panel's Start slider goes all the way to 1.
    vFade = 1.0 - uDepthStrength * smoothstep(min(uDepthStart, 0.99), 1.0, through);

    gl_PointSize = uSize * (uScale / -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const HERO_CLOUD_FRAGMENT_SHADER = /* glsl */ `
  varying vec3  vColor;
  varying float vFade;

  /**
   * Below this a point contributes nothing anyone can see, and it is thrown
   * away rather than drawn — a faded point that still wrote depth would go on
   * occluding the points behind it while being invisible itself.
   */
  const float MIN_ALPHA = 0.004;

  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float distanceSquared = dot(offset, offset);
    if (distanceSquared > 0.25) discard;

    float alpha = smoothstep(0.25, 0.02, distanceSquared) * vFade;
    if (alpha < MIN_ALPHA) discard;

    gl_FragColor = vec4(vColor, alpha);

    // Colours are mixed in three's linear working space; a ShaderMaterial gets
    // no automatic output conversion, so without this the linear values would
    // be written straight out as sRGB and read muddy.
    #include <colorspace_fragment>
  }
`;
