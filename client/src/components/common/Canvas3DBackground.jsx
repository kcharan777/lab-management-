import React, { useEffect, useRef } from 'react';

/**
 * Grand Large-Scale 3D Cybernetic Reactor & Gyroscopic Quantum Grid
 * Pure HTML5 Canvas 60fps 3D perspective projection with gyroscopic rings,
 * rotating polyhedron lattice, undulating 3D wave matrix, and dynamic mouse parallax.
 */
export default function Canvas3DBackground({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates with smooth damping
    let mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      normalizedX: 0,
      normalizedY: 0,
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.normalizedX = (e.clientX - width / 2) / (width / 2);
      mouse.normalizedY = (e.clientY - height / 2) / (height / 2);
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // ==========================================
    // 3D Geometry Definitions
    // ==========================================
    const fov = 500;

    // 1. Rotating Polyhedral Core (3D Icosahedron / Geodesic Sphere)
    const coreRadius = 260; // Large size
    const tRatio = (1 + Math.sqrt(5)) / 2;
    const baseVertices = [
      [-1, tRatio, 0], [1, tRatio, 0], [-1, -tRatio, 0], [1, -tRatio, 0],
      [0, -1, tRatio], [0, 1, tRatio], [0, -1, -tRatio], [0, 1, -tRatio],
      [tRatio, 0, -1], [tRatio, 0, 1], [-tRatio, 0, -1], [-tRatio, 0, 1]
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return { x: (x / len) * coreRadius, y: (y / len) * coreRadius, z: (z / len) * coreRadius };
    });

    // 2. Large Gyroscopic Rings (3 Concentric 3D Orbital Rings)
    const rings = [
      { radius: 460, tiltX: 0.8, tiltY: 0.4, speed: 0.007, color: 'rgba(56, 189, 248, ', pointsCount: 48, dash: [8, 12] },
      { radius: 380, tiltX: -0.6, tiltY: 0.9, speed: -0.009, color: 'rgba(99, 102, 241, ', pointsCount: 40, dash: [14, 8] },
      { radius: 300, tiltX: 1.1, tiltY: -0.5, speed: 0.012, color: 'rgba(168, 85, 247, ', pointsCount: 32, dash: [6, 16] },
    ];

    // Precalculate ring points
    const ringPointSets = rings.map((ring) => {
      const pts = [];
      for (let i = 0; i < ring.pointsCount; i++) {
        const theta = (i / ring.pointsCount) * Math.PI * 2;
        pts.push({
          x: Math.cos(theta) * ring.radius,
          y: Math.sin(theta) * ring.radius,
          z: 0,
          theta,
        });
      }
      return pts;
    });

    // 3. 3D Cyber Undulating Wave Grid (Ground/Ceiling Matrix)
    const waveGridRows = 14;
    const waveGridCols = 22;
    const waveGridSpacing = 75;

    // 4. Floating 3D Cyber Particles
    const particleCount = 80;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1200,
        z: (Math.random() - 0.5) * 900,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1,
        color: i % 3 === 0 ? 'rgba(56, 189, 248,' : i % 3 === 1 ? 'rgba(99, 102, 241,' : 'rgba(16, 185, 129,',
      });
    }

    // Camera angles with inertia
    let rotX = 0.2;
    let rotY = 0;
    let time = 0;

    const render = () => {
      time += 0.016;

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const targetParallaxX = ((mouse.y - height / 2) / height) * 0.5;
      const targetParallaxY = ((mouse.x - width / 2) / width) * 0.5;

      rotX += 0.002 + targetParallaxX * 0.005;
      rotY += 0.003 + targetParallaxY * 0.005;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Rotation matrix values
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      // Helper for 3D rotation & projection
      const project = (x, y, z, customZOffset = 600) => {
        // Rotate Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        // Rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const depth = z2 + customZOffset;
        const scale = fov / Math.max(depth, 50);

        return {
          px: centerX + x1 * scale,
          py: centerY + y2 * scale,
          scale,
          z: z2,
        };
      };

      // ==========================================
      // A. Draw Undulating 3D Cyber Wave Grid
      // ==========================================
      const gridPoints = [];
      const gridStartY = 180; // located lower down as horizon grid

      for (let r = 0; r < waveGridRows; r++) {
        gridPoints[r] = [];
        for (let c = 0; c < waveGridCols; c++) {
          const gx = (c - waveGridCols / 2) * waveGridSpacing;
          const gz = (r - waveGridRows / 2) * waveGridSpacing + 100;
          // Undulating sine wave
          const gy = gridStartY + Math.sin(c * 0.45 + time * 1.5) * 35 + Math.cos(r * 0.4 + time * 1.2) * 25;

          gridPoints[r][c] = project(gx, gy, gz, 550);
        }
      }

      ctx.lineWidth = 0.8;
      for (let r = 0; r < waveGridRows; r++) {
        for (let c = 0; c < waveGridCols; c++) {
          const pt = gridPoints[r][c];
          if (c < waveGridCols - 1) {
            const nextC = gridPoints[r][c + 1];
            const alpha = Math.max(0.02, Math.min(0.2, (pt.scale + nextC.scale) * 0.1));
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pt.px, pt.py);
            ctx.lineTo(nextC.px, nextC.py);
            ctx.stroke();
          }
          if (r < waveGridRows - 1) {
            const nextR = gridPoints[r + 1][c];
            const alpha = Math.max(0.02, Math.min(0.2, (pt.scale + nextR.scale) * 0.1));
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pt.px, pt.py);
            ctx.lineTo(nextR.px, nextR.py);
            ctx.stroke();
          }

          // Small node glow on grid intersections
          if (r % 2 === 0 && c % 2 === 0) {
            const nodeAlpha = Math.min(0.35, pt.scale * 0.25);
            ctx.fillStyle = `rgba(56, 189, 248, ${nodeAlpha})`;
            ctx.beginPath();
            ctx.arc(pt.px, pt.py, 1.4 * pt.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ==========================================
      // B. Draw Large 3D Gyroscopic Rings
      // ==========================================
      rings.forEach((ring, ringIdx) => {
        const ringAngle = time * ring.speed * 2;
        const cRot = Math.cos(ringAngle), sRot = Math.sin(ringAngle);

        const projectedRingPts = ringPointSets[ringIdx].map((pt) => {
          // Local ring rotation around Z
          const lx = pt.x * cRot - pt.y * sRot;
          const ly = pt.x * sRot + pt.y * cRot;

          // Apply ring tilt
          const cxTilt = Math.cos(ring.tiltX), sxTilt = Math.sin(ring.tiltX);
          const cyTilt = Math.cos(ring.tiltY), syTilt = Math.sin(ring.tiltY);

          // Tilt around X
          const txY = ly * cxTilt;
          const txZ = ly * sxTilt;

          // Tilt around Y
          const tyX = lx * cyTilt + txZ * syTilt;
          const tyZ = -lx * syTilt + txZ * cyTilt;

          return project(tyX, txY, tyZ, 550);
        });

        // Draw ring orbit path
        ctx.beginPath();
        for (let i = 0; i < projectedRingPts.length; i++) {
          const pt = projectedRingPts[i];
          if (i === 0) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        }
        ctx.closePath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `${ring.color}0.28)`;
        ctx.stroke();

        // Draw luminous ring beacons (satellites orbiting on the ring)
        projectedRingPts.forEach((pt, idx) => {
          if (idx % 4 === 0) {
            const glow = Math.sin(time * 3 + idx) * 0.5 + 0.5;
            const size = Math.max(1.5, (3 + glow * 2) * pt.scale);

            // Core beacon
            ctx.fillStyle = `${ring.color}${0.7 + glow * 0.3})`;
            ctx.beginPath();
            ctx.arc(pt.px, pt.py, size, 0, Math.PI * 2);
            ctx.fill();

            // Glow aura
            const halo = ctx.createRadialGradient(pt.px, pt.py, 0, pt.px, pt.py, size * 3.5);
            halo.addColorStop(0, `${ring.color}0.45)`);
            halo.addColorStop(1, `${ring.color}0)`);
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(pt.px, pt.py, size * 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });

      // ==========================================
      // C. Draw Large 3D Polyhedral Quantum Core
      // ==========================================
      const projectedCore = baseVertices.map((v) => project(v.x, v.y, v.z, 550));

      // Draw wireframe edges
      ctx.lineWidth = 1.1;
      for (let i = 0; i < baseVertices.length; i++) {
        for (let j = i + 1; j < baseVertices.length; j++) {
          const dx = baseVertices[i].x - baseVertices[j].x;
          const dy = baseVertices[i].y - baseVertices[j].y;
          const dz = baseVertices[i].z - baseVertices[j].z;
          const dist3D = Math.hypot(dx, dy, dz);

          if (dist3D < coreRadius * 1.15) {
            const p1 = projectedCore[i];
            const p2 = projectedCore[j];
            const alpha = Math.max(0.12, Math.min(0.65, (p1.scale + p2.scale) * 0.32));

            // Cybernetic glowing edge
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw glowing vertices of the core
      projectedCore.forEach((p) => {
        const pulse = Math.sin(time * 3 + p.z * 0.01) * 0.5 + 0.5;
        const rad = Math.max(2, (3.5 + pulse * 2) * p.scale);

        ctx.fillStyle = `rgba(168, 85, 247, ${0.8 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, rad, 0, Math.PI * 2);
        ctx.fill();

        // Neon halo
        const halo = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, rad * 4);
        halo.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        halo.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.px, p.py, rad * 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // D. Draw Floating 3D Cyber Particles
      // ==========================================
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < -800) p.x = 800;
        if (p.x > 800) p.x = -800;
        if (p.y < -600) p.y = 600;
        if (p.y > 600) p.y = -600;
        if (p.z < -450) p.z = 450;
        if (p.z > 450) p.z = -450;

        const proj = project(p.x, p.y, p.z, 550);
        const alpha = Math.min(0.65, proj.scale * 0.4);

        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.beginPath();
        ctx.arc(proj.px, proj.py, Math.max(1, p.size * proj.scale), 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      style={{ willChange: 'transform' }}
    />
  );
}
