import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const BACKGROUND = 0x030C12;
const ACCENT = new THREE.Color(0x38BDF8);

export default function EventGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isLowPower = (navigator.hardwareConcurrency || 4) < 4;
    const particleCount = isLowPower ? 50 : 150;
    const useBloom = !isLowPower;
    const rotSpeed = isLowPower ? 0.001 : 0.002;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: !isLowPower });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1 : 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Post-processing
    let composer: EffectComposer | null = null;
    if (useBloom) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2, 0.4, 0.6
      );
      composer.addPass(bloomPass);
    }

    // Group for the whole graph
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // --- Layer 1: Inner Solid Core ---
    const innerVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const innerFragmentShader = `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float dist = distance(vUv, vec2(0.5));
        float glow = pow(1.0 - dist, 3.0);
        float pulse = sin(uTime * 0.5) * 0.3 + 0.7;
        gl_FragColor = vec4(uColor, glow * pulse * 0.4);
      }
    `;

    const innerGeo = new THREE.IcosahedronGeometry(1, 1);
    const innerMat = new THREE.ShaderMaterial({
      vertexShader: innerVertexShader,
      fragmentShader: innerFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: ACCENT },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    graphGroup.add(innerMesh);

    // --- Layer 2: Outer Wireframe Shell ---
    const wireVertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const wireFragmentShader = `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vPosition;
      void main() {
        float edge = smoothstep(0.0, 0.15, min(vPosition.x, min(vPosition.y, vPosition.z)) + 0.5);
        float pulse = sin(uTime * 2.0 + vPosition.x * 10.0) * 0.5 + 0.5;
        float alpha = edge * pulse * 0.8;
        gl_FragColor = vec4(uColor, alpha);
      }
    `;

    const wireGeo = new THREE.IcosahedronGeometry(1, 1);
    const edgesGeo = new THREE.EdgesGeometry(wireGeo);
    const wireMat = new THREE.ShaderMaterial({
      vertexShader: wireVertexShader,
      fragmentShader: wireFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: ACCENT },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wireMesh = new THREE.LineSegments(edgesGeo, wireMat);
    graphGroup.add(wireMesh);

    // --- Layer 3: Particle Halo Orbit ---
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.4;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: isLowPower ? 1.5 : 2.0,
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    graphGroup.add(particles);

    // Mouse handler
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Update uniforms
      innerMat.uniforms.uTime.value = elapsed;
      wireMat.uniforms.uTime.value = elapsed;

      // Auto-rotation
      graphGroup.rotation.y += rotSpeed;
      particles.rotation.y += 0.0003;

      // Mouse parallax (smooth interpolation)
      const targetRotX = mouseRef.current.y * 0.15;
      const targetRotY = mouseRef.current.x * 0.15;
      graphGroup.rotation.x += (targetRotX - graphGroup.rotation.x) * 0.03;
      graphGroup.rotation.y += (targetRotY * 0.3); // subtle additional influence

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      wireGeo.dispose();
      edgesGeo.dispose();
      wireMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
    />
  );
}
