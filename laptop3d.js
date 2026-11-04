/* Ordinateur portable 3D (Three.js r128). Expose window.Lap3D. Si WebGL manque, la page garde son dessin SVG. */
(function () {
  'use strict';
  var L = window.Lap3D = { active: false };
  var T = window.THREE, host = document.getElementById('lapbox');
  if (!T || !host) return;
  var R;
  try { R = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  if (!R || !R.getContext()) return;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function tri(u) { return Math.abs(((u % 2) + 2) % 2 - 1); }

  var cv = R.domElement;
  cv.className = 'lap3d';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Un ordinateur portable en 3D à la batterie vide. En faisant défiler la page, son chargeur se branche, il se recharge, puis il s\'amuse.');
  R.setClearColor(0x000000, 0);
  R.outputEncoding = T.sRGBEncoding;
  R.shadowMap.enabled = true;
  R.shadowMap.type = T.PCFSoftShadowMap;
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new T.Scene();
  var cam = new T.PerspectiveCamera(30, 1.6, 1, 500);
  scene.add(new T.HemisphereLight(0xffffff, 0x9a9ca6, 0.85));
  var keyL = new T.DirectionalLight(0xffffff, 0.9);
  keyL.position.set(-26, 60, 44);
  keyL.castShadow = true;
  keyL.shadow.mapSize.set(1024, 1024);
  var sh = keyL.shadow.camera; sh.left = -55; sh.right = 55; sh.top = 55; sh.bottom = -55; sh.near = 10; sh.far = 170;
  keyL.shadow.bias = -0.0005;
  scene.add(keyL);
  var rim = new T.DirectionalLight(0xb9c4ff, 0.35); rim.position.set(40, 25, -30); scene.add(rim);
  var sparkLight = new T.PointLight(0xff8445, 0, 30); sparkLight.position.set(17, 3, 2); scene.add(sparkLight);

  var floor = new T.Mesh(new T.PlaneGeometry(240, 240), new T.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  var alu = new T.MeshStandardMaterial({ color: 0xc4c7cf, metalness: 0.35, roughness: 0.45 });
  var dark = new T.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.7 });
  var white = new T.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.5 });
  var rubber = new T.MeshStandardMaterial({ color: 0x6a6d77, roughness: 0.6 });
  var steel = new T.MeshStandardMaterial({ color: 0xb8bbc3, metalness: 0.3, roughness: 0.35 });

  function box(w, h, d, m, x, y, z, parent) {
    var o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    (parent || scene).add(o); return o;
  }

  /* corps */
  var lap = new T.Group(); scene.add(lap);
  box(32, 1.2, 22, alu, 0, 0.6, 0, lap);
  var well = new T.Mesh(new T.PlaneGeometry(29.5, 11.8), dark);
  well.rotation.x = -Math.PI / 2; well.position.set(0, 1.205, -3.6); lap.add(well);
  var pad = box(10, 0.1, 6.4, new T.MeshStandardMaterial({ color: 0xb5b8c1, roughness: 0.4 }), 0, 1.25, 7.2, lap);
  pad.castShadow = false;
  var hinge = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 26, 16), alu);
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 1.5, -11); lap.add(hinge);

  /* touches */
  var COLS = 13, ROWS = 5, N = COLS * ROWS;
  var keys = new T.InstancedMesh(new T.BoxGeometry(1.6, 0.35, 1.6), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), N);
  keys.castShadow = true;
  var m4 = new T.Matrix4(), baseCol = new T.Color(0x2c2f38), litOrange = new T.Color(0xff8445), litBlue = new T.Color(0x7b8cff);
  var litUntil = [], i, r, c;
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
    i = r * COLS + c;
    m4.setPosition(-12 + c * 2, 1.375, -7.5 + r * 2);
    keys.setMatrixAt(i, m4); keys.setColorAt(i, baseCol); litUntil[i] = 0;
  }
  lap.add(keys);

  /* port et voyant */
  box(0.3, 0.7, 1.8, dark, 16.05, 0.6, 2, lap);
  var led = new T.Mesh(new T.SphereGeometry(0.2, 12, 12), new T.MeshBasicMaterial({ color: 0xff5a4d }));
  led.position.set(16.05, 0.6, 5.2); lap.add(led);

  /* couvercle */
  var lid = new T.Group(); lid.position.set(0, 1.6, -11); lap.add(lid);
  box(32, 0.7, 21, alu, 0, 0.35, 10.5, lid);
  var bez = new T.Mesh(new T.PlaneGeometry(30.4, 19.6), new T.MeshBasicMaterial({ color: 0x07080b }));
  bez.rotation.x = Math.PI / 2; bez.position.set(0, -0.005, 10.9); lid.add(bez);
  var SW = 800, SH = 496, scv = document.createElement('canvas'); scv.width = SW; scv.height = SH;
  var g = scv.getContext('2d');
  var tex = new T.CanvasTexture(scv);
  tex.encoding = T.sRGBEncoding; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false; tex.anisotropy = 4;
  var scr = new T.Mesh(new T.PlaneGeometry(29, 18.2), new T.MeshBasicMaterial({ map: tex }));
  scr.rotation.x = Math.PI / 2; scr.position.set(0, -0.012, 11.2); lid.add(scr);
  var logo = new T.Mesh(new T.CircleGeometry(1.4, 32), new T.MeshBasicMaterial({ color: 0xf1f2f5 }));
  logo.rotation.x = -Math.PI / 2; logo.position.set(0, 0.706, 11); lid.add(logo);

  /* chargeur */
  var brick = box(5, 2.2, 4, white, 30, 1.1, 8, scene); brick.rotation.y = 0.3;
  var bled = new T.Mesh(new T.SphereGeometry(0.22, 12, 12), new T.MeshBasicMaterial({ color: 0x9a9ca6 }));
  bled.position.set(30, 2.3, 8); scene.add(bled);
  var plug = new T.Group(); scene.add(plug);
  box(1.4, 0.5, 1.5, steel, 0.7, 0, 0, plug);
  box(3.2, 1.0, 1.9, white, 3.0, 0, 0, plug);
  var cable = new T.Mesh(new T.BufferGeometry(), rubber); cable.castShadow = true; scene.add(cable);
  var spark = new T.Mesh(new T.SphereGeometry(0.7, 12, 12), new T.MeshBasicMaterial({ color: 0xff8445, transparent: true, opacity: 0 }));
  spark.position.set(16.3, 0.7, 2); scene.add(spark);
  var A = new T.Vector3(27.7, 0.9, 7.2), S = new T.Vector3(23, 0.6, 15), PRE = new T.Vector3(21, 0.65, 2), END = new T.Vector3(16.2, 0.65, 2);
  var tmp = new T.Vector3(), q = new T.Vector3(), dirOut = new T.Vector3();

  /* écran 2D */
  var TEXT = 'Salut, je suis Christophe.';
  var SPEC = [[0.37, 0.53, 2.1, 1.5, 0], [0.61, 0.35, 1.6, 2.3, .5], [0.43, 0.27, 2.5, 1.3, 1.1], [0.56, 0.46, 1.4, 1.9, 1.6]];
  var SYM = ['</>', '{ }', '=>', '( )'], SYMC = ['#7B8CFF', '#FF8445', '#4ADE80', '#7B8CFF'];
  var blinkAt = 0, nextBlink = 2;
  var MONO = '15px "Geist Mono", ui-monospace, Menlo, Consolas, monospace';
  function rr(x, y, w, h, rad) {
    g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath();
  }
  function drawScreen(p, t, look, reduce) {
    g.setTransform(SW / 428, 0, 0, SH / 268, 0, 0);
    g.globalAlpha = 1; g.fillStyle = '#0E1016'; g.fillRect(0, 0, 428, 268);
    var connected = p >= 0.34, level = connected ? lerp(0.03, 1, clamp((p - 0.36) / 0.26, 0, 1)) : 0.03;
    var fade = clamp((p - 0.62) / 0.06, 0, 1), f = clamp((p - 0.66) / 0.1, 0, 1);
    g.textAlign = 'center'; g.font = MONO;
    if (fade < 1) {
      g.globalAlpha = 1 - fade;
      g.strokeStyle = '#ECEAE4'; g.lineWidth = 4; rr(154, 84, 108, 52, 9); g.stroke();
      g.fillStyle = '#ECEAE4'; rr(266, 100, 8, 20, 3); g.fill();
      var col = level < .3 ? '#FF5A4D' : level < .85 ? '#FF8445' : '#4ADE80';
      var on = connected || reduce || Math.sin(t * 6) > 0.2;
      g.globalAlpha = (1 - fade) * (on ? 1 : 0.35); g.fillStyle = col; rr(161, 91, Math.max(6, 94 * level), 38, 4); g.fill();
      g.globalAlpha = 1 - fade; g.fillStyle = '#ECEAE4'; g.fillText(Math.round(level * 100) + ' %', 214, 180);
      g.globalAlpha = (1 - fade) * 0.6; g.fillText(!connected ? 'Batterie faible' : (level >= 0.99 ? 'Chargé' : 'Charge en cours'), 214, 206);
    }
    if (fade > 0) {
      g.globalAlpha = fade; g.fillStyle = '#171B28'; g.fillRect(0, 0, 428, 268);
      g.fillStyle = '#0E1016'; g.fillRect(0, 0, 428, 20);
      ['#FF5A4D', '#FF8445', '#4ADE80'].forEach(function (cc, k) { g.fillStyle = cc; g.beginPath(); g.arc(16 + k * 14, 10, 4, 0, 6.2832); g.fill(); });
      g.font = '500 22px "Geist Mono", ui-monospace, Menlo, monospace';
      for (var k = 0; k < 4; k++) {
        var s = SPEC[k], x = reduce ? lerp(14, 370, s[0]) : lerp(14, 380, tri(t * s[0] + s[4])), y = reduce ? lerp(54, 200, s[1]) : lerp(54, 200, tri(t * s[1] * 1.3 + s[4] * 2));
        g.globalAlpha = fade * f * 0.85; g.fillStyle = SYMC[k]; g.fillText(SYM[k], x + 20, y);
      }
      g.globalAlpha = fade;
      var lx, ly;
      if (reduce || t - look.at < 2.5) { lx = look.x; ly = look.y; } else { lx = Math.sin(t * 1.3) * 0.8; ly = Math.sin(t * 0.9) * 0.4; }
      var kb = 1;
      if (!reduce) {
        if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.4 + Math.random() * 2.4; }
        var bt = (t - blinkAt) / 0.16; if (bt >= 0 && bt < 1) kb = 1 - 0.92 * Math.sin(Math.PI * bt);
      }
      g.save(); g.translate(214, 112);
      g.save(); g.translate(0, -4); g.scale(1, kb); g.translate(0, 4);
      g.fillStyle = '#ECEAE4'; rr(-66, -30, 44, 52, 22); g.fill(); rr(22, -30, 44, 52, 22); g.fill();
      g.fillStyle = '#0E1016';
      g.beginPath(); g.arc(-44 + lx * 9, -4 + ly * 8, 10, 0, 6.2832); g.fill();
      g.beginPath(); g.arc(44 + lx * 9, -4 + ly * 8, 10, 0, 6.2832); g.fill();
      g.restore();
      g.strokeStyle = '#FF8445'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-34, 52); g.quadraticCurveTo(0, lerp(54, 84, f), 34, 52); g.stroke();
      g.restore();
      g.font = MONO; g.fillStyle = '#ECEAE4'; g.globalAlpha = fade;
      var n = Math.floor(clamp((p - 0.66) / 0.14, 0, 1) * TEXT.length);
      g.fillText(TEXT.slice(0, n) + ((n < TEXT.length && p > 0.66) ? '_' : ''), 214, 232);
    }
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  }

  /* câble : courbe du bloc d'alimentation à la prise */
  function drawCable() {
    plug.updateMatrixWorld(true);
    q.set(4.7, 0, 0); plug.localToWorld(q);
    dirOut.set(1, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), plug.rotation.y);
    var qOut = q.clone().addScaledVector(dirOut, 2.6); qOut.y = Math.max(qOut.y, 0.5);
    var mid = A.clone().lerp(qOut, 0.5); mid.y = 0.3; mid.z += 4;
    var pts = [A.clone(), A.clone().lerp(mid, 0.6), mid, mid.clone().lerp(qOut, 0.6), qOut, q.clone()];
    pts[1].y = 0.3; pts[3].y = Math.max(0.3, qOut.y * 0.5);
    var curve = new T.CatmullRomCurve3(pts);
    cable.geometry.dispose();
    cable.geometry = new T.TubeGeometry(curve, 44, 0.24, 8, false);
  }

  /* taille */
  var W = 0, H = 0;
  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  L.resize = resize;
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);

  var t0 = performance.now() / 1000;
  L.frame = function (p, t, look, reduce) {
    resize();
    var open = reduce ? 1 : ease(clamp((t - t0 - 0.2) / 1.4, 0, 1));
    lid.rotation.x = -open * 1.82;
    /* branchement */
    var tc = ease(clamp((p - 0.10) / 0.24, 0, 1));
    var a = ease(clamp(tc / 0.7, 0, 1)), b = ease(clamp((tc - 0.7) / 0.3, 0, 1));
    tmp.copy(S).lerp(PRE, a); tmp.y += Math.sin(a * Math.PI) * 4;
    tmp.x = lerp(tmp.x, END.x, b);
    plug.position.copy(tmp); plug.rotation.y = lerp(0.9, 0, a);
    drawCable();
    /* étincelle, voyants */
    var st = clamp((p - 0.34) / 0.08, 0, 1), so = (st > 0 && st < 1) ? Math.sin(Math.PI * st) : 0;
    spark.material.opacity = so; spark.scale.setScalar(0.6 + so); sparkLight.intensity = so * 2.5;
    var connected = p >= 0.34, level = connected ? clamp((p - 0.36) / 0.26, 0, 1) : 0;
    var lc = !connected ? 0xff5a4d : (level >= 0.99 ? 0x4ade80 : 0xff8445);
    led.material.color.setHex(lc); bled.material.color.setHex(connected ? lc : 0x9a9ca6);
    /* animation du portable */
    var f = clamp((p - 0.66) / 0.1, 0, 1);
    lap.position.y = reduce ? 0 : Math.abs(Math.sin(t * 5)) * 0.22 * f;
    lap.rotation.y = reduce ? 0 : Math.sin(t * 2) * 0.07 * f;
    /* touches */
    if (!reduce && p > 0.62) {
      var j = Math.floor(Math.random() * N);
      if (Math.random() < 0.5) { keys.setColorAt(j, Math.random() < 0.5 ? litOrange : litBlue); litUntil[j] = t + 0.22; keys.instanceColor.needsUpdate = true; }
      for (var k = 0; k < N; k++) if (litUntil[k] && t > litUntil[k]) { keys.setColorAt(k, baseCol); litUntil[k] = 0; keys.instanceColor.needsUpdate = true; }
    }
    /* écran */
    drawScreen(p, t, look, reduce);
    /* caméra */
    var z = ease(clamp((p - 0.88) / 0.12, 0, 1));
    var e1 = ease(clamp(p / 0.62, 0, 1)), e2 = ease(clamp(p / 0.5, 0, 1));
    var phi = lerp(0.8, 0, e1) + (p > 0.66 && !reduce ? Math.sin(t * 0.7) * 0.12 * f : 0);
    var elev = lerp(0.4, 0.2, e1);
    var rad = lerp(98, 80, e1) * clamp(1.35 / cam.aspect, 1, 2.2);
    var tx = lerp(7, 0, e2), ty = lerp(6, 9, e2), tz = lerp(3, -4, e2);
    phi += look.x * 0.12; elev -= look.y * 0.05;
    rad = lerp(rad, 25 * clamp(1.35 / cam.aspect, 1, 2.2), z);
    tx = lerp(tx, 0, z); ty = lerp(ty, 12.4, z); tz = lerp(tz, -13.4, z);
    phi = lerp(phi, 0, z); elev = lerp(elev, 0.12, z);
    cam.position.set(tx + rad * Math.sin(phi) * Math.cos(elev), ty + rad * Math.sin(elev), tz + rad * Math.cos(phi) * Math.cos(elev));
    cam.lookAt(tx, ty, tz);
    cv.style.opacity = (1 - clamp((z - 0.45) / 0.55, 0, 1)).toFixed(2);
    R.render(scene, cam);
  };

  var svg = document.getElementById('lapSvg');
  if (svg) svg.style.display = 'none';
  host.appendChild(cv);
  L.active = true;
  resize();
})();
