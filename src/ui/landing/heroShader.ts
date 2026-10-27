export const VERTEX_SHADER = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// One pass: silver light ribbons on a near-black stage, seen through a slab of glass shaped like
// a video frame. The slab's normal comes from its distance field (flat face, curved rim), so the
// rim refracts and Fresnel reflects; dispersion comes from sampling the ribbons at several
// wavelengths, each with its own index. The flat face minifies what is behind it, so the light
// looks compressed: hours of footage into a reel.
export const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uRes;      // canvas size in pixels
uniform float uTime;    // seconds
uniform vec2 uTilt;     // smoothed pointer, -1..1
uniform vec4 uGlass;    // centre xy, half size zw, in pixels
uniform float uRadius;  // corner radius in pixels

const int TAPS = 10;
// Real glass disperses far too little to see at this scale; this spread is deliberately large.
const float DISPERSION = 0.55;
const float RIM = 0.32;          // rim width as a share of the smaller half size
const float COMPRESS = 2.6;      // how much the flat face minifies the light behind it
const vec3 STAGE = vec3(0.039, 0.039, 0.047);

// A fine core line plus a faint halo, so the light reads as a filament rather than a band.
float ribbon(vec2 p, float freq, float speed, float phase, float amp, float y0, float width) {
  float y = y0 + amp * sin(p.x * freq + uTime * speed + phase) + 0.35 * amp * sin(p.x * freq * 2.3 - uTime * speed * 0.7);
  float d = (p.y - y) / width;
  return exp(-d * d) + 0.09 * exp(-d * d * 0.04);
}

// The light field in normalised coordinates (y up, x scaled by aspect).
float light(vec2 p) {
  float l = 0.0;
  l += 0.70 * ribbon(p, 1.6, 0.22, 0.0, 0.12, 0.05, 0.010);
  l += 0.45 * ribbon(p, 2.1, -0.17, 1.7, 0.12, -0.08, 0.007);
  l += 0.30 * ribbon(p, 1.2, 0.13, 3.1, 0.15, 0.16, 0.014);
  l += 0.25 * ribbon(p, 2.8, 0.28, 4.4, 0.08, -0.20, 0.006);
  // A broad haze keeps the stage from reading as flat black.
  l += 0.08 * exp(-dot(p - vec2(0.35, 0.05), p - vec2(0.35, 0.05)) * 2.5);
  return l;
}

vec2 toField(vec2 px) {
  return (px - 0.5 * uRes) / uRes.y;
}

// The light runs at the slab's height on every layout, so it always passes through the glass. On
// tall screens the visible stretch of each wave is short, so x is stretched to keep the filaments
// curving through the slab instead of lying flat and drifting off it.
float stage(vec2 p) {
  vec2 q = p - vec2(0.0, toField(uGlass.xy).y);
  q.x *= max(1.0, uRes.y / uRes.x);
  return light(q);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Approximate visible-spectrum colour for t in 0..1 (violet to red), summing to white.
vec3 spectrum(float t) {
  vec3 c = vec3(
    smoothstep(0.45, 0.85, t) + 0.35 * smoothstep(0.15, 0.0, t),
    smoothstep(0.15, 0.5, t) * smoothstep(0.95, 0.6, t),
    smoothstep(0.55, 0.15, t)
  );
  return c;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, gl_FragCoord.y);
  vec2 p = toField(px);
  vec3 col = STAGE + vec3(0.78, 0.80, 0.86) * stage(p + 0.015 * uTilt);

  vec2 local = px - uGlass.xy;
  float d = sdRoundBox(local, uGlass.zw, uRadius);
  float edgeSoft = 1.5;
  if (d < edgeSoft) {
    float rimW = RIM * min(uGlass.z, uGlass.w);
    float inside = clamp(-d / rimW, 0.0, 1.0);
    // Distance-field gradient points outward; the rim curves from flat (inside) to steep (edge).
    vec2 e = vec2(1.0, 0.0);
    vec2 grad = normalize(vec2(
      sdRoundBox(local + e.xy, uGlass.zw, uRadius) - sdRoundBox(local - e.xy, uGlass.zw, uRadius),
      sdRoundBox(local + e.yx, uGlass.zw, uRadius) - sdRoundBox(local - e.yx, uGlass.zw, uRadius)
    ) + 1e-5);
    float slope = 1.0 - inside * inside;
    vec3 n = normalize(vec3(grad * slope * 1.35 + 0.25 * uTilt, 1.0));

    // Position: minify around the slab centre. Separation: a wedge from the tilt, per wavelength.
    vec2 centre = toField(uGlass.xy);
    vec2 base = centre + (p - centre) * COMPRESS;
    vec3 acc = vec3(0.0);
    vec3 norm = vec3(0.0);
    for (int i = 0; i < TAPS; i++) {
      float t = float(i) / float(TAPS - 1);
      float bend = 0.07 * (1.0 + DISPERSION * (t - 0.5));
      vec2 q = base - n.xy * bend;
      vec3 w = spectrum(t);
      acc += w * stage(q);
      norm += w;
    }
    vec3 through = STAGE * 1.6 + vec3(0.95) * acc / norm;

    // Fresnel: grazing angles at the rim reflect a soft studio light instead of transmitting.
    float cosT = clamp(n.z, 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
    vec3 env = vec3(0.55, 0.57, 0.62) * (0.35 + 0.65 * smoothstep(-0.2, 0.9, n.y + 0.3 * uTilt.y));
    vec3 glass = mix(through, env, fresnel);
    // A thin bright edge where the rim meets the stage.
    glass += vec3(0.20) * smoothstep(-2.5, 0.0, d) * (0.5 + 0.5 * n.y);

    float cover = 1.0 - smoothstep(-edgeSoft, edgeSoft, d);
    col = mix(col, glass, cover);
  }

  // Soft vignette toward the edges of the stage.
  vec2 v = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - 0.35 * dot(v, v);
  gl_FragColor = vec4(col, 1.0);
}
`;
