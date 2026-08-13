import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";

/**
 * Fundo animado em Three.js: montanhas em camadas (parallax), névoa e
 * partículas douradas flutuantes. Sem nenhum personagem/elemento
 * reconhecível de Pokémon — só paisagem/atmosfera, para não esbarrar em
 * direitos de propriedade intelectual.
 *
 * Segue a paleta real do projeto (tokens de src/styles.css) e reage à
 * troca de tema dark/light feita pelo ThemeToggle (classe `.dark` na
 * <html>). Roda em position: fixed, atrás de todo o conteúdo.
 */

const DARK_PALETTE = {
  fog: 0x14131f,
  far: 0x2a2740,
  mid: 0x1e1c30,
  near: 0x100f19,
  gold: 0xeac54f,
  glowOpacity: 0.5,
};

const LIGHT_PALETTE = {
  fog: 0xf7f5fb,
  far: 0xdcd7ea,
  mid: 0xc3bcdb,
  near: 0xa89fcb,
  gold: 0xc79a2e,
  glowOpacity: 0.3,
};

export function PokemonBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nunca executa de fato durante o SSR (useEffect não roda no servidor),
    // mas esse guard deixa isso explícito para o Vite: com
    // `import.meta.env.SSR` ele consegue eliminar este bloco no build do
    // servidor, evitando que o three.js (~1,8MB) seja incluído no bundle
    // do worker/edge à toa.
    if (import.meta.env.SSR) return;

    let cancelled = false;
    let cleanup = () => {};

    // Import dinâmico: mantém o three.js fora do bundle inicial do client
    // também (carrega só quando o componente monta).
    import("three").then((THREE) => {
      if (cancelled || !containerRef.current) return;
      cleanup = setupScene(THREE, containerRef.current);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1, backgroundColor: "var(--background)" }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Camada de contraste geral (usa o próprio token de cor do tema) */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--background)", opacity: 0.22 }}
      />

      {/* Reforço de legibilidade perto do header e do rodapé/conteúdo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--background) 0%, transparent 20%, transparent 68%, var(--background) 100%)",
          opacity: 0.65,
        }}
      />
    </div>
  );
}

function setupScene(THREE: typeof ThreeNS, container: HTMLElement) {
  const isDark = () => document.documentElement.classList.contains("dark");
  const palette = () => (isDark() ? DARK_PALETTE : LIGHT_PALETTE);

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || window.innerHeight;
  const isMobile = width < 768;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0.1,
    2000,
  );
  camera.position.z = 500;

  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const p = palette();
  scene.fog = new THREE.Fog(p.fog, 300, 950);

  // ---------- Camadas de montanha (silhueta, parallax) ----------
  type Layer = { mesh: ThreeNS.Mesh };
  let layers: Layer[] = [];

  function ridgeShape(baseY: number, amplitude: number, seed: number) {
    const shape = new THREE.Shape();
    const half = width / 2 + 60;
    const segments = 24;
    shape.moveTo(-half, -height);
    for (let i = 0; i <= segments; i++) {
      const x = -half + (i / segments) * (half * 2);
      const y =
        baseY +
        Math.sin(x * 0.006 + seed) * amplitude * 0.6 +
        Math.sin(x * 0.014 + seed * 1.8) * amplitude * 0.4;
      shape.lineTo(x, y);
    }
    shape.lineTo(half, -height);
    shape.closePath();
    return shape;
  }

  function buildLayers() {
    layers.forEach((l) => {
      scene.remove(l.mesh);
      l.mesh.geometry.dispose();
      (l.mesh.material as ThreeNS.Material).dispose();
    });
    layers = [];

    const defs = [
      { z: -300, baseY: -height * 0.05, amp: height * 0.16, seed: 1.3, color: p.far },
      { z: -150, baseY: -height * 0.12, amp: height * 0.2, seed: 4.1, color: p.mid },
      { z: -50, baseY: -height * 0.22, amp: height * 0.22, seed: 8.7, color: p.near },
    ];

    for (const d of defs) {
      const geometry = new THREE.ShapeGeometry(ridgeShape(d.baseY, d.amp, d.seed));
      const material = new THREE.MeshBasicMaterial({ color: d.color, fog: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = d.z;
      scene.add(mesh);
      layers.push({ mesh });
    }
  }
  buildLayers();

  // ---------- Brilho dourado no horizonte ----------
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 512;
  glowCanvas.height = 512;
  const ctx = glowCanvas.getContext("2d")!;
  function drawGlow(hexColor: number) {
    const c = "#" + hexColor.toString(16).padStart(6, "0");
    ctx.clearRect(0, 0, 512, 512);
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, c);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
  }
  drawGlow(p.gold);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: p.glowOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(width * 1.1, width * 1.1, 1);
  glow.position.set(0, -height * 0.05, -290);
  scene.add(glow);

  // ---------- Partículas douradas flutuantes ----------
  const particleCount = isMobile ? 40 : 110;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * width;
    positions[i * 3 + 1] = (Math.random() - 0.5) * height;
    positions[i * 3 + 2] = Math.random() * 300 - 60;
    speeds[i] = 8 + Math.random() * 14;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: p.gold,
    size: 3,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ---------- Reage à troca de tema (dark/light) ----------
  const observer = new MutationObserver(() => {
    const next = palette();
    scene.fog!.color.setHex(next.fog);
    const colors = [next.far, next.mid, next.near];
    layers.forEach((l, i) =>
      (l.mesh.material as ThreeNS.MeshBasicMaterial).color.setHex(colors[i]),
    );
    (particles.material as ThreeNS.PointsMaterial).color.setHex(next.gold);
    drawGlow(next.gold);
    glowTexture.needsUpdate = true;
    glowMaterial.opacity = next.glowOpacity;
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // ---------- Loop de animação ----------
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let frameId = 0;

  function animate() {
    const t = clock.getElapsedTime();
    const posAttr = particleGeometry.getAttribute("position") as ThreeNS.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      let y = posAttr.getY(i) + speeds[i] * 0.01;
      if (y > height / 2) y = -height / 2;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;

    layers.forEach((l, i) => {
      l.mesh.position.x = Math.sin(t * 0.05 + i) * 6;
    });

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }

  // ---------- Responsivo ----------
  function onResize() {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || window.innerHeight;
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    glow.scale.set(width * 1.1, width * 1.1, 1);
    buildLayers();
  }
  window.addEventListener("resize", onResize);

  // ---------- Limpeza ----------
  return function cleanup() {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", onResize);
    observer.disconnect();
    layers.forEach((l) => {
      l.mesh.geometry.dispose();
      (l.mesh.material as ThreeNS.Material).dispose();
    });
    particleGeometry.dispose();
    particleMaterial.dispose();
    glowMaterial.dispose();
    glowTexture.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
