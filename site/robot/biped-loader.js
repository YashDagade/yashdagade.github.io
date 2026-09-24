/* Biped robot model loader (classic script, no dependencies).
 *
 *   Site.biped.load(base)      -> Promise<model>     base = folder holding biped.json + biped.bin (default 'site/robot/')
 *   Site.biped.flat(part)      -> { positions, normals, colors }   non-indexed Float32Arrays, flat face normals
 *   Site.biped.edges(part, deg)-> { pairs, faceA, faceB, feature } unique edges (vertex index pairs) + adjacent faces
 *   Site.biped.pose(model, anglesDeg, opts) -> { linkId: Float32Array(16) }  forward kinematics, column-major 4x4
 *   Site.biped.gait(phase, opts) -> anglesDeg  a simple in-place sagittal walk (phase in cycles)
 *   Site.biped.groundShift(model, mats) -> mm to add to Z so the lowest sole touches Z = 0
 *
 * Frame (see biped.json "frame"): mm, +X forward (toes), +Y robot's left, +Z up, soles on Z = 0.
 * The geometry is stored in its rest pose, already in world coordinates, so a link's matrix is applied directly to
 * its parts' positions. Also loads under Node (module.exports) for tests.
 */
(function (root) {
  'use strict';

  function loadJSON(url) {
    return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  function loadBin(url) {
    return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); });
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  // Build the model object from biped.json (parsed) + biped.bin (ArrayBuffer).
  function decode(meta, buffer) {
    const s = meta.quant.scale, o = meta.quant.offset;
    const materials = {};
    for (const m of meta.materials) materials[m.id] = Object.assign({ rgb: hexToRgb(m.color) }, m);
    const parts = meta.parts.map(p => {
      const g = p.mesh;
      const q = new Int16Array(buffer, g.vertexByteOffset, g.vertexCount * 3);
      const positions = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += 3) {
        positions[i] = q[i] * s + o[0];
        positions[i + 1] = q[i + 1] * s + o[1];
        positions[i + 2] = q[i + 2] * s + o[2];
      }
      const indices = g.indexType === 'u32'
        ? new Uint32Array(buffer, g.indexByteOffset, g.indexCount)
        : new Uint16Array(buffer, g.indexByteOffset, g.indexCount);
      const groups = g.groups.map(x => Object.assign({ color: materials[x.material].color, rgb: materials[x.material].rgb }, x));
      return Object.assign({}, p, { positions, indices, groups, triangleCount: g.triangleCount, vertexCount: g.vertexCount });
    });
    const byId = {};
    for (const p of parts) byId[p.id] = p;
    const joints = {}, links = {};
    for (const j of meta.joints) joints[j.id] = j;
    for (const l of meta.links) links[l.id] = l;
    return { meta, parts, byId, materials, joints, links, dims: meta.dims };
  }

  function load(base) {
    base = base == null ? 'site/robot/' : base;
    if (base && !base.endsWith('/')) base += '/';
    return Promise.all([loadJSON(base + 'biped.json'), loadBin(base + 'biped.bin')])
      .then(([meta, buf]) => decode(meta, buf));
  }

  // Non-indexed arrays with flat normals (one normal per triangle) and per-vertex material colours.
  function flat(part) {
    const P = part.positions, I = part.indices, n = I.length / 3;
    const positions = new Float32Array(n * 9), normals = new Float32Array(n * 9), colors = new Float32Array(n * 9);
    const triColor = new Array(n);
    for (const g of part.groups) for (let t = g.start; t < g.start + g.count; t++) triColor[t] = g.rgb;
    for (let t = 0; t < n; t++) {
      const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      const rgb = triColor[t] || [0.8, 0.8, 0.8];
      for (let k = 0; k < 3; k++) {
        const src = I[3 * t + k] * 3, dst = 9 * t + 3 * k;
        positions[dst] = P[src]; positions[dst + 1] = P[src + 1]; positions[dst + 2] = P[src + 2];
        normals[dst] = nx; normals[dst + 1] = ny; normals[dst + 2] = nz;
        colors[dst] = rgb[0]; colors[dst + 1] = rgb[1]; colors[dst + 2] = rgb[2];
      }
    }
    return { positions, normals, colors };
  }

  // Unique undirected edges with their (up to two) adjacent faces. feature[i] = 1 when the edge is a crease
  // (dihedral angle > deg) or a boundary; draw those always, and draw an edge as silhouette when exactly one of
  // faceA/faceB faces the camera.
  function edges(part, deg) {
    const P = part.positions, I = part.indices, n = I.length / 3, nv = part.vertexCount;
    const cos = Math.cos(((deg == null ? 30 : deg) * Math.PI) / 180);
    const fn = new Float32Array(n * 3);
    for (let t = 0; t < n; t++) {
      const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1;
      fn[3 * t] = nx / L; fn[3 * t + 1] = ny / L; fn[3 * t + 2] = nz / L;
    }
    const map = new Map();
    const A = [], B = [], FA = [], FB = [];
    for (let t = 0; t < n; t++) {
      for (let k = 0; k < 3; k++) {
        let u = I[3 * t + k], v = I[3 * t + ((k + 1) % 3)];
        if (u > v) { const w = u; u = v; v = w; }
        const key = u * nv + v;
        const e = map.get(key);
        if (e === undefined) { map.set(key, A.length); A.push(u); B.push(v); FA.push(t); FB.push(-1); }
        else if (FB[e] === -1) FB[e] = t;
      }
    }
    const m = A.length;
    const pairs = new Uint32Array(m * 2), faceA = new Int32Array(FA), faceB = new Int32Array(FB), feature = new Uint8Array(m);
    for (let i = 0; i < m; i++) {
      pairs[2 * i] = A[i]; pairs[2 * i + 1] = B[i];
      const fb = FB[i];
      if (fb < 0) { feature[i] = 1; continue; }
      const fa = FA[i];
      const d = fn[3 * fa] * fn[3 * fb] + fn[3 * fa + 1] * fn[3 * fb + 1] + fn[3 * fa + 2] * fn[3 * fb + 2];
      feature[i] = d < cos ? 1 : 0;
    }
    return { pairs, faceA, faceB, feature, faceNormals: fn };
  }

  // ---- 4x4 column-major helpers
  function ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  // rotation by `deg` about unit `axis` through point `p`
  function rotAbout(axis, deg, p) {
    const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
    const [x, y, z] = axis;
    const R = ident();
    R[0] = c + x * x * k; R[4] = x * y * k - z * s; R[8] = x * z * k + y * s;
    R[1] = y * x * k + z * s; R[5] = c + y * y * k; R[9] = y * z * k - x * s;
    R[2] = z * x * k - y * s; R[6] = z * y * k + x * s; R[10] = c + z * z * k;
    // T(p) * R * T(-p)
    R[12] = p[0] - (R[0] * p[0] + R[4] * p[1] + R[8] * p[2]);
    R[13] = p[1] - (R[1] * p[0] + R[5] * p[1] + R[9] * p[2]);
    R[14] = p[2] - (R[2] * p[0] + R[6] * p[1] + R[10] * p[2]);
    return R;
  }

  // anglesDeg: { hip_yaw_R, hip_pitch_R, knee_R, ankle_R, ...L } (missing = 0).
  // opts.root: optional Float32Array(16) applied to the whole robot (e.g. a translation for ground contact).
  function pose(model, anglesDeg, opts) {
    anglesDeg = anglesDeg || {};
    const out = {};
    const rootM = (opts && opts.root) || ident();
    const visit = (lid, parentM) => {
      const l = model.links[lid];
      let M = parentM;
      if (l.joint) {
        const j = model.joints[l.joint];
        M = mul(parentM, rotAbout(j.axis, anglesDeg[j.id] || 0, j.pivot));
      }
      out[lid] = M;
      for (const k in model.links) if (model.links[k].parent === lid) visit(k, M);
    };
    visit('torso', rootM);
    return out;
  }

  // Simple walk-in-place: sagittal hip/knee/ankle with the sole kept level (ankle = -(hip + knee)).
  // phase in cycles (0..1 = one full stride); amplitude scales (hip, knee) in degrees.
  function gait(phase, opts) {
    opts = opts || {};
    const H = opts.hip == null ? 18 : opts.hip, K = opts.knee == null ? 35 : opts.knee, crouch = opts.crouch == null ? 8 : opts.crouch;
    const a = {};
    for (const [side, off] of [['R', 0], ['L', 0.5]]) {
      const ph = 2 * Math.PI * (phase + off);
      const hip = -H * Math.sin(ph) - crouch;              // negative = thigh forward
      const swing = Math.max(0, Math.cos(ph));              // lift the knee while the leg swings forward
      const knee = 2 * crouch + K * swing * swing;
      a['hip_pitch_' + side] = hip;
      a['knee_' + side] = knee;
      a['ankle_' + side] = -(hip + knee);                   // keep the sole flat
      a['hip_yaw_' + side] = 0;
    }
    return a;
  }

  // mm to add to Z (root translation) so the lowest sole corner touches the ground.
  function groundShift(model, mats) {
    let minZ = Infinity;
    for (const s of ['R', 'L']) {
      const p = model.byId['foot_' + s], M = mats['foot_' + s];
      const lo = p.bbox.min, hi = p.bbox.max;
      for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) {
        const z = lo[2];
        const wz = M[2] * x + M[6] * y + M[10] * z + M[14];
        if (wz < minZ) minZ = wz;
      }
    }
    return -minZ;
  }

  const api = { load, decode, flat, edges, pose, gait, groundShift, mat4: { ident, mul, rotAbout } };
  root.Site = root.Site || {};
  root.Site.biped = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
