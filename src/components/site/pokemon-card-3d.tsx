import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";
import trainerImg from "/src/assets/homepic.png";

/**
 * Carta Pokémon 3D fiel ao TCG, renderizada com Three.js.
 * - Geometria de caixa fina (card real: 63×88 mm → proporção 0.716)
 * - Frente: imagem do treinador, moldura, nome, tipo, HP, ataques, etc.
 *   (tudo pintado em Canvas 2D e mapeado como textura)
 * - Verso: padrão da Pokébola
 * - Reflexo holográfico iridescente que reage ao mouse
 * - Borda dourada e cantos arredondados em canvas
 * - Rotação suave seguindo o cursor (parallax)
 * - Flutuação vertical contínua
 */

export function PokemonCard3D({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (import.meta.env.SSR) return;
    let cancelled = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (cancelled || !mountRef.current) return;
      cleanup = setupCard(THREE, mountRef.current, trainerImg);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", maxWidth: 380, aspectRatio: "63/88", cursor: "grab" }}
      aria-label="Carta Pokémon 3D do treinador AV"
    />
  );
}

/* ─────────────────────────────────────────────
   SETUP THREE.JS
   ───────────────────────────────────────────── */

function setupCard(THREE: typeof ThreeNS, container: HTMLElement, imgSrc: string) {
  const W = container.clientWidth || 380;
  const H = container.clientHeight || Math.round(W * (88 / 63));

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  /* Scene */
  const scene = new THREE.Scene();

  /* Camera */
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  camera.position.set(0, 0, 5.5);

  /* Lights */
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const pointLight = new THREE.PointLight(0xfff0c0, 2.5, 20);
  pointLight.position.set(3, 3, 5);
  scene.add(pointLight);
  const rimLight = new THREE.PointLight(0xa090ff, 1.2, 12);
  rimLight.position.set(-3, -2, 2);
  scene.add(rimLight);

  /* Card dimensions (real ratio 63:88) */
  const CW = 2.0;
  const CH = CW * (88 / 63);
  const CD = 0.03;

  /* ── Frente da carta (canvas 2D) ── */
  const frontCanvas = buildFrontCanvas(imgSrc);
  const frontTexture = new THREE.CanvasTexture(frontCanvas);

  /* ── Verso da carta (canvas 2D) ── */
  const backCanvas = buildBackCanvas();
  const backTexture = new THREE.CanvasTexture(backCanvas);

  /* ── Holographic overlay ── */
  const holoCanvas = buildHoloCanvas();
  const holoTexture = new THREE.CanvasTexture(holoCanvas);

  /* Materials */
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4a537, metalness: 0.9, roughness: 0.3 });
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture, metalness: 0.4, roughness: 0.35 });
  const backMat = new THREE.MeshStandardMaterial({ map: backTexture, metalness: 0.3, roughness: 0.5 });

  /* Holo overlay (additive, transparent) */
  const holoMat = new THREE.MeshBasicMaterial({
    map: holoTexture,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  /* BoxGeometry: right, left, top, bottom, front, back */
  const geo = new THREE.BoxGeometry(CW, CH, CD);
  const materials = [borderMat, borderMat, borderMat, borderMat, frontMat, backMat];
  const card = new THREE.Mesh(geo, materials);
  scene.add(card);

  /* Holo plane slightly in front of the card face */
  const holoGeo = new THREE.PlaneGeometry(CW, CH);
  const holoMesh = new THREE.Mesh(holoGeo, holoMat);
  holoMesh.position.z = CD / 2 + 0.002;
  card.add(holoMesh);

  /* Shimmer/shine plane */
  const shineCanvas = document.createElement("canvas");
  shineCanvas.width = 256;
  shineCanvas.height = 256;
  const shineTex = new THREE.CanvasTexture(shineCanvas);
  const shineMat = new THREE.MeshBasicMaterial({
    map: shineTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shineMesh = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), shineMat);
  shineMesh.position.z = CD / 2 + 0.004;
  card.add(shineMesh);

  /* ── Mouse tracking ── */
  let mouseX = 0;
  let mouseY = 0;

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX = x;
    mouseY = y;

    const shine = Math.sqrt(x * x + y * y);
    holoMat.opacity = 0.18 + shine * 0.42;
    shineMat.opacity = shine * 0.3;

    redrawHolo(holoCanvas, x, y);
    holoTexture.needsUpdate = true;

    redrawShine(shineCanvas, x, y);
    shineTex.needsUpdate = true;
  }

  function onMouseLeave() {
    mouseX = 0;
    mouseY = 0;
    holoMat.opacity = 0;
    shineMat.opacity = 0;
  }

  container.addEventListener("mousemove", onMouseMove);
  container.addEventListener("mouseleave", onMouseLeave);

  /* ── Animation loop ── */
  const clock = new THREE.Clock();
  let frameId = 0;

  function animate() {
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    /* Float */
    card.position.y = Math.sin(t * 0.8) * 0.04;

    /* Smooth rotation following mouse */
    const targetRotX = -mouseY * 0.45;
    const targetRotY = mouseX * 0.45;
    card.rotation.x += (targetRotX - card.rotation.x) * 0.08;
    card.rotation.y += (targetRotY - card.rotation.y) * 0.08;

    /* Subtle auto-spin when idle */
    if (Math.abs(mouseX) < 0.01 && Math.abs(mouseY) < 0.01) {
      card.rotation.y = Math.sin(t * 0.3) * 0.08;
      card.rotation.x = Math.sin(t * 0.2) * 0.04;
    }

    /* Point light orbit */
    pointLight.position.x = Math.sin(t * 0.5) * 4;
    pointLight.position.y = Math.cos(t * 0.4) * 3;

    renderer.render(scene, camera);
  }
  animate();

  /* ── Resize ── */
  function onResize() {
    const w = container.clientWidth || 380;
    const h = container.clientHeight || Math.round(w * (88 / 63));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  /* ── Cleanup ── */
  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", onResize);
    container.removeEventListener("mousemove", onMouseMove);
    container.removeEventListener("mouseleave", onMouseLeave);
    geo.dispose();
    frontMat.dispose();
    backMat.dispose();
    borderMat.dispose();
    holoMat.dispose();
    shineMat.dispose();
    frontTexture.dispose();
    backTexture.dispose();
    holoTexture.dispose();
    shineTex.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

/* ─────────────────────────────────────────────
   BUILD FRONT CANVAS — carta TCG completa
   ───────────────────────────────────────────── */

function buildFrontCanvas(imgSrc: string): HTMLCanvasElement {
  const CW = 512;
  const CH = Math.round(CW * (88 / 63));
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  const draw = (img: HTMLImageElement | null) => {
    ctx.clearRect(0, 0, CW, CH);

    /* Background */
    const bg = ctx.createLinearGradient(0, 0, CW, CH);
    bg.addColorStop(0, "#1a1040");
    bg.addColorStop(0.5, "#0e0a2a");
    bg.addColorStop(1, "#1a1040");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, CW, CH, 26);
    ctx.fill();

    /* Outer gold border */
    ctx.strokeStyle = "#d4a537";
    ctx.lineWidth = 14;
    roundRect(ctx, 7, 7, CW - 14, CH - 14, 21);
    ctx.stroke();

    /* Inner black border */
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    roundRect(ctx, 15, 15, CW - 30, CH - 30, 17);
    ctx.stroke();

    /* Inner card bg */
    const innerBg = ctx.createLinearGradient(0, 0, CW, CH);
    innerBg.addColorStop(0, "#22174f");
    innerBg.addColorStop(1, "#140e38");
    ctx.fillStyle = innerBg;
    roundRect(ctx, 16, 16, CW - 32, CH - 32, 16);
    ctx.fill();

    /* Header bar */
    const headerY = 20;
    const headerH = 44;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, 18, headerY, CW - 36, headerH, 10);
    ctx.fill();

    drawTypeSymbol(ctx, 24, headerY + 6, "dark");

    ctx.font = "bold 20px 'Oxanium', 'Arial Black', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("AV — Trainer Card", 62, headerY + headerH / 2);

    ctx.font = "bold 13px 'Oxanium', sans-serif";
    ctx.fillStyle = "#ff4444";
    ctx.textAlign = "right";
    ctx.fillText("HP", CW - 52, headerY + headerH / 2 - 2);
    ctx.font = "bold 20px 'Oxanium', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("200", CW - 20, headerY + headerH / 2 + 1);
    ctx.textAlign = "left";

    /* Stage badge */
    const stageBadge = ctx.createLinearGradient(22, 68, 90, 68);
    stageBadge.addColorStop(0, "#c0392b");
    stageBadge.addColorStop(1, "#8e1010");
    ctx.fillStyle = stageBadge;
    roundRect(ctx, 22, 68, 78, 20, 6);
    ctx.fill();
    ctx.font = "bold 11px 'Oxanium', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("FULL ART", 28, 82);

    /* Image area */
    const imgX = 24;
    const imgY = 72;
    const imgW = CW - 48;
    const imgH = Math.round(imgW * 1.08);

    const imgFrame = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
    imgFrame.addColorStop(0, "#2a1a6e");
    imgFrame.addColorStop(0.5, "#10082a");
    imgFrame.addColorStop(1, "#2a1a6e");
    ctx.fillStyle = imgFrame;
    roundRect(ctx, imgX, imgY, imgW, imgH, 12);
    ctx.fill();

    ctx.strokeStyle = "#c8971e";
    ctx.lineWidth = 3;
    roundRect(ctx, imgX, imgY, imgW, imgH, 12);
    ctx.stroke();

    if (img) {
      ctx.save();
      roundRect(ctx, imgX + 3, imgY + 3, imgW - 6, imgH - 6, 10);
      ctx.clip();

      const scale = Math.max(imgW / img.naturalWidth, imgH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const drawOffX = imgX + (imgW - drawW) / 2;
      const drawOffY = imgY + (imgH - drawH) / 2;
      ctx.drawImage(img, drawOffX, drawOffY, drawW, drawH);
      ctx.restore();
    }

    drawSparkles(ctx, imgX, imgY, imgW, imgH);

    /* Accent stripe at bottom of image */
    const stripeY = imgY + imgH - 2;
    const stripe = ctx.createLinearGradient(imgX, stripeY, imgX + imgW, stripeY);
    stripe.addColorStop(0, "transparent");
    stripe.addColorStop(0.5, "#d4a537");
    stripe.addColorStop(1, "transparent");
    ctx.fillStyle = stripe;
    ctx.fillRect(imgX, stripeY, imgW, 3);

    /* Type / category bar */
    const typeBarY = imgY + imgH + 6;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, 22, typeBarY, CW - 44, 26, 8);
    ctx.fill();

    const typeIcons = ["dark", "psychic", "colorless"];
    const typeLabels = ["Trevas", "Psíquico", "Normal"];
    typeIcons.forEach((type, i) => {
      const tx = 34 + i * 85;
      drawTypeSymbol(ctx, tx, typeBarY + 4, type);
      ctx.font = "10px 'Oxanium', sans-serif";
      ctx.fillStyle = "#ccc";
      ctx.fillText(typeLabels[i], tx + 20, typeBarY + 16);
    });

    /* Attacks */
    const atk1Y = typeBarY + 36;
    drawAttack(ctx, 22, atk1Y, CW - 44, "dark", "Coleta de Full Arts", "Recolha 2 cartas Full Art do seu baralho.", "80");
    const atk2Y = atk1Y + 68;
    drawAttack(ctx, 22, atk2Y, CW - 44, "psychic", "Team Rocket Strike", "Descarte 2 Energias do Pokémon adversário.", "120+");

    /* Rule box */
    const ruleY = atk2Y + 76;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(ctx, 22, ruleY, CW - 44, 42, 8);
    ctx.fill();
    ctx.font = "italic 9px 'Rubik', sans-serif";
    ctx.fillStyle = "#d4a537";
    ctx.fillText("Pokémon-ex RULE: Quando este Pokémon for", 30, ruleY + 14);
    ctx.fillText("Nocauteado, seu adversário recebe 2 prêmios.", 30, ruleY + 26);
    ctx.font = "9px 'Rubik', sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Weakness: ×2 ⚡  Resistance: —  Retreat cost: ●●", 30, ruleY + 38);

    /* Footer */
    const footerY = ruleY + 50;
    ctx.font = "9px 'Rubik', sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("AV Collection · SV · 001/250 · Full Art", 30, footerY);
    ctx.textAlign = "right";
    ctx.fillText("Illus. AV Collectr Studio", CW - 26, footerY);
    ctx.textAlign = "left";

    drawCornerDetails(ctx, CW, CH);
  };

  const img = new Image();
  img.onload = () => draw(img);
  img.onerror = () => draw(null);
  img.src = imgSrc;
  draw(null);

  return canvas;
}

/* ─────────────────────────────────────────────
   BUILD BACK CANVAS — padrão Pokébola
   ───────────────────────────────────────────── */

function buildBackCanvas(): HTMLCanvasElement {
  const CW = 512;
  const CH = Math.round(CW * (88 / 63));
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, "#1a0505");
  bg.addColorStop(0.5, "#2a0808");
  bg.addColorStop(1, "#1a0505");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, CW, CH, 26);
  ctx.fill();

  ctx.strokeStyle = "#d4a537";
  ctx.lineWidth = 14;
  roundRect(ctx, 7, 7, CW - 14, CH - 14, 21);
  ctx.stroke();

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  roundRect(ctx, 15, 15, CW - 30, CH - 30, 17);
  ctx.stroke();

  const cx = CW / 2;
  const cy = CH / 2;
  const r = 130;

  /* Top half (red) */
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  const redGrad = ctx.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, r);
  redGrad.addColorStop(0, "#ff4444");
  redGrad.addColorStop(1, "#880000");
  ctx.fillStyle = redGrad;
  ctx.fill();

  /* Bottom half (white) */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.lineTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.closePath();
  const whiteGrad = ctx.createRadialGradient(cx + 20, cy + 40, 5, cx, cy, r);
  whiteGrad.addColorStop(0, "#ffffff");
  whiteGrad.addColorStop(1, "#aaaaaa");
  ctx.fillStyle = whiteGrad;
  ctx.fill();

  /* Band */
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  /* Button */
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#222";
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  const btnGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 16);
  btnGrad.addColorStop(0, "#ffffff");
  btnGrad.addColorStop(1, "#cccccc");
  ctx.fillStyle = btnGrad;
  ctx.fill();

  ctx.font = "bold 28px 'Oxanium', 'Arial Black', sans-serif";
  ctx.fillStyle = "#d4a537";
  ctx.textAlign = "center";
  ctx.fillText("POKÉMON", cx, cy - r - 20);

  ctx.font = "bold 16px 'Oxanium', sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText("AV Collectr TCG", cx, cy + r + 30);
  ctx.textAlign = "left";

  return canvas;
}

/* ─────────────────────────────────────────────
   HOLOGRAPHIC CANVAS
   ───────────────────────────────────────────── */

function buildHoloCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = Math.round(256 * (88 / 63));
  redrawHolo(canvas, 0, 0);
  return canvas;
}

function redrawHolo(canvas: HTMLCanvasElement, mx: number, my: number) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const angle = Math.atan2(my, mx);
  const hue = ((angle / (Math.PI * 2)) * 360 + 360) % 360;

  const grd = ctx.createLinearGradient(W * (0.5 + mx), 0, W * (0.5 - mx), H);
  grd.addColorStop(0,   `hsla(${hue}, 100%, 70%, 0.6)`);
  grd.addColorStop(0.2, `hsla(${(hue + 60) % 360}, 100%, 65%, 0.5)`);
  grd.addColorStop(0.4, `hsla(${(hue + 120) % 360}, 100%, 70%, 0.55)`);
  grd.addColorStop(0.6, `hsla(${(hue + 200) % 360}, 100%, 65%, 0.5)`);
  grd.addColorStop(0.8, `hsla(${(hue + 280) % 360}, 100%, 70%, 0.55)`);
  grd.addColorStop(1,   `hsla(${hue}, 100%, 65%, 0.6)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  /* Scan-lines for real holo texture */
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}

function redrawShine(canvas: HTMLCanvasElement, mx: number, my: number) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W * (0.5 + mx * 0.8);
  const cy = H * (0.5 + my * 0.8);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
  grd.addColorStop(0, "rgba(255,255,255,0.35)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.10)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

/* ─────────────────────────────────────────────
   HELPERS (Canvas 2D drawing)
   ───────────────────────────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const TYPE_COLORS: Record<string, [string, string]> = {
  dark:      ["#4a2b6b", "#c084fc"],
  psychic:   ["#8b1a6b", "#f472b6"],
  colorless: ["#555", "#ccc"],
  fire:      ["#8b2500", "#f97316"],
  water:     ["#003b8b", "#60a5fa"],
};

function drawTypeSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
  const [dark, light] = TYPE_COLORS[type] ?? TYPE_COLORS.colorless;
  const r = 9;
  const cx = x + r;
  const cy = y + r;
  const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawAttack(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  type: string,
  name: string,
  desc: string,
  dmg: string,
) {
  const h = 64;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  drawTypeSymbol(ctx, x + 8, y + 8, type);
  drawTypeSymbol(ctx, x + 28, y + 8, "colorless");

  ctx.font = "bold 14px 'Oxanium', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(name, x + 52, y + 20);

  ctx.font = "10px 'Rubik', sans-serif";
  ctx.fillStyle = "#bbb";
  ctx.fillText(desc, x + 10, y + 40);

  ctx.font = "bold 20px 'Oxanium', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText(dmg, x + w - 10, y + 32);
  ctx.textAlign = "left";
}

function drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const positions = [
    [x + w * 0.15, y + h * 0.2],
    [x + w * 0.78, y + h * 0.15],
    [x + w * 0.60, y + h * 0.82],
    [x + w * 0.25, y + h * 0.70],
    [x + w * 0.90, y + h * 0.50],
    [x + w * 0.05, y + h * 0.55],
  ];
  positions.forEach(([sx, sy]) => {
    const size = 4;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "rgba(255,220,100,0.75)";
    ctx.beginPath();
    for (let p = 0; p < 8; p++) {
      const angle = (p * Math.PI) / 4;
      const r = p % 2 === 0 ? size : size * 0.4;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawCornerDetails(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const corners = [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]] as [number, number][];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212, 165, 55, 0.5)";
    ctx.fill();
  });
}
