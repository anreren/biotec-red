/**
 * HEMOBIO UFPA — Shared 3D Laboratory Utilities
 * Procedural PBR lighting, smooth orbit/touch rig, realistic biological geometries
 * (Evans-Fung biconcave RBCs, Y-shaped antibodies, antigens, leukocytes, platelets).
 */
(function (global) {
    'use strict';

    const BioSimUtils = {};

    /**
     * Check WebGL support gracefully.
     */
    BioSimUtils.isWebGLAvailable = function () {
        try {
            const canvas = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            return false;
        }
    };

    /**
     * Create a WebGLRenderer tuned for scientific glass & glossy organic rendering.
     */
    BioSimUtils.createRenderer = function (container) {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth || 640, container.clientHeight || 480);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.98;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.touchAction = 'pan-y';
        container.appendChild(renderer.domElement);
        return renderer;
    };

    /**
     * Generate a sleek laboratory studio environment map (no external HDR required).
     * Gives glass tubes, metal centrifuge rotors, and blood cells crisp studio reflections.
     */
    BioSimUtils.createLabEnvMap = function (renderer) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x0b1222);

        // Overhead clinical softbox
        const topPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 18),
            new THREE.MeshBasicMaterial({ color: 0xe2f1ff, side: THREE.DoubleSide })
        );
        topPanel.position.set(0, 10, 0);
        topPanel.rotation.x = Math.PI / 2;
        envScene.add(topPanel);

        // Biotech teal side strip light
        const rightStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 5),
            new THREE.MeshBasicMaterial({ color: 0x2dd4bf, side: THREE.DoubleSide })
        );
        rightStrip.position.set(11, 3, 2);
        rightStrip.rotation.y = -Math.PI / 2;
        envScene.add(rightStrip);

        // Warm clinical key rim on left
        const leftStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 6),
            new THREE.MeshBasicMaterial({ color: 0xfff1f2, side: THREE.DoubleSide })
        );
        leftStrip.position.set(-11, 4, 4);
        leftStrip.rotation.y = Math.PI / 2;
        envScene.add(leftStrip);

        // Subtle crimson accent rear strip
        const backStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 4),
            new THREE.MeshBasicMaterial({ color: 0xef233c, side: THREE.DoubleSide })
        );
        backStrip.position.set(0, 2, -12);
        envScene.add(backStrip);

        // Soft cool fill front light
        const frontStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 3),
            new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide })
        );
        frontStrip.position.set(0, 5, 12);
        frontStrip.rotation.y = Math.PI;
        envScene.add(frontStrip);

        const renderTarget = pmrem.fromScene(envScene, 0.04);
        pmrem.dispose();
        return renderTarget.texture;
    };

    /**
     * Soft radial glow texture for particles, sparks, plasma shimmer, and hemoglobin clouds.
     */
    BioSimUtils.createGlowTexture = function (innerColor, midColor, outerColor) {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0.0, innerColor || 'rgba(255,255,255,1)');
        grad.addColorStop(0.35, midColor || 'rgba(255,255,255,0.55)');
        grad.addColorStop(0.7, outerColor || 'rgba(255,255,255,0.12)');
        grad.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    };

    /**
     * Realistic Biconcave Red Blood Cell (Erythrocyte) Geometry
     * Based on the Evans & Fung (1972) empirical profile for human erythrocytes.
     */
    BioSimUtils.createRBCGeometry = function (radius, radialSegments, profileSegments) {
        const R = radius || 0.52;
        const rSegs = radialSegments || 32;
        const pSegs = profileSegments || 20;

        const c0 = 0.207;
        const c2 = 2.003;
        const c4 = -1.123;

        const points = [];
        // Profile from top center (r=0) -> outer rim (r=R) -> bottom center (r=0)
        for (let i = 0; i <= pSegs; i++) {
            const t = i / pSegs; // 0 to 1 (top half)
            const angle = t * (Math.PI / 2);
            const u = Math.sin(angle); // 0 to 1
            const r = u * R;
            const u2 = u * u;
            const y = 0.5 * R * Math.sqrt(Math.max(0, 1 - u2)) * (c0 + c2 * u2 + c4 * u2 * u2);
            points.push(new THREE.Vector2(r, y));
        }
        for (let i = pSegs - 1; i >= 0; i--) {
            const t = i / pSegs;
            const angle = t * (Math.PI / 2);
            const u = Math.sin(angle);
            const r = u * R;
            const u2 = u * u;
            const y = -0.5 * R * Math.sqrt(Math.max(0, 1 - u2)) * (c0 + c2 * u2 + c4 * u2 * u2);
            points.push(new THREE.Vector2(r, y));
        }

        const geom = new THREE.LatheGeometry(points, rSegs);
        geom.computeVertexNormals();
        return geom;
    };

    /**
     * Organic granular Leukocyte (White Blood Cell) geometry with microvilli bumps.
     */
    BioSimUtils.createLeukocyteGeometry = function (radius) {
        const R = radius || 0.22;
        const geom = new THREE.IcosahedronGeometry(R, 2);
        const pos = geom.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const n = Math.sin(v.x * 26) * Math.cos(v.y * 26) * Math.sin(v.z * 26);
            v.multiplyScalar(1 + n * 0.14);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        geom.computeVertexNormals();
        return geom;
    };

    /**
     * Irregular flattened spiny Platelet (Thrombocyte) geometry.
     */
    BioSimUtils.createPlateletGeometry = function (radius) {
        const R = radius || 0.085;
        const geom = new THREE.IcosahedronGeometry(R, 1);
        const pos = geom.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            v.y *= 0.42;
            const spike = Math.sin(v.x * 45 + v.z * 33) * 0.22;
            v.x *= 1 + spike;
            v.z *= 1 - spike * 0.7;
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        geom.computeVertexNormals();
        return geom;
    };

    /**
     * Build a stylized 3D Y-shaped Immunoglobulin (Antibody) group.
     * Color-coded to match its target antigen (Anti-A: cyan, Anti-B: amber, Anti-Rh: violet).
     */
    BioSimUtils.createAntibodyMesh = function (colorHex, emissiveHex, scale) {
        const s = scale || 1.0;
        const group = new THREE.Group();

        const heavyMat = new THREE.MeshPhysicalMaterial({
            color: colorHex,
            emissive: emissiveHex || colorHex,
            emissiveIntensity: 0.42,
            roughness: 0.28,
            metalness: 0.08,
            clearcoat: 0.55,
            envMapIntensity: 0.55
        });

        const tipMat = new THREE.MeshPhysicalMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.95,
            roughness: 0.2,
            metalness: 0.05,
            envMapIntensity: 0.5
        });

        // Fc Stem
        const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.036 * s, 0.16 * s, 6, 12), heavyMat);
        stem.position.y = -0.10 * s;
        group.add(stem);

        // Hinge bead
        const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.044 * s, 10, 10), heavyMat);
        group.add(hinge);

        // Left & Right Fab arms
        [-1, 1].forEach(function (side) {
            const armGroup = new THREE.Group();
            armGroup.rotation.z = side * 0.62;

            const fab = new THREE.Mesh(new THREE.CapsuleGeometry(0.032 * s, 0.15 * s, 6, 12), heavyMat);
            fab.position.y = 0.10 * s;
            armGroup.add(fab);

            // Light chain parallel segment
            const lightChain = new THREE.Mesh(new THREE.CapsuleGeometry(0.022 * s, 0.10 * s, 5, 10), heavyMat);
            lightChain.position.set(side * 0.045 * s, 0.11 * s, 0);
            armGroup.add(lightChain);

            // Glowing binding site tip
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.042 * s, 10, 10), tipMat);
            tip.position.y = 0.20 * s;
            armGroup.add(tip);

            group.add(armGroup);
        });

        return group;
    };

    /**
     * Build surface antigen marker meshes for RBCs:
     * 'A' -> Cyan pyramid/cone spike
     * 'B' -> Amber smooth spherical knob on stalk
     * 'Rh' -> Violet diamond crystal on stalk
     */
    BioSimUtils.createAntigenMesh = function (kind, scale) {
        const s = scale || 1.0;
        const g = new THREE.Group();

        const stalkMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.35,
            metalness: 0.1
        });
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.018 * s, 0.08 * s, 8), stalkMat);
        stalk.position.y = 0.04 * s;
        g.add(stalk);

        if (kind === 'A') {
            const matA = new THREE.MeshPhysicalMaterial({
                color: 0x0ea5e9,
                emissive: 0x0284c7,
                emissiveIntensity: 0.65,
                roughness: 0.22,
                clearcoat: 0.6,
                envMapIntensity: 0.55
            });
            const head = new THREE.Mesh(new THREE.ConeGeometry(0.078 * s, 0.145 * s, 4), matA);
            head.position.y = 0.13 * s;
            g.add(head);
        } else if (kind === 'B') {
            const matB = new THREE.MeshPhysicalMaterial({
                color: 0xf59e0b,
                emissive: 0xd97706,
                emissiveIntensity: 0.6,
                roughness: 0.22,
                clearcoat: 0.6,
                envMapIntensity: 0.55
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 12, 10), matB);
            head.position.y = 0.12 * s;
            g.add(head);
        } else if (kind === 'Rh') {
            const matRh = new THREE.MeshPhysicalMaterial({
                color: 0xd946ef,
                emissive: 0xa21caf,
                emissiveIntensity: 0.65,
                roughness: 0.2,
                clearcoat: 0.6,
                envMapIntensity: 0.55
            });
            const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.072 * s, 0), matRh);
            head.position.y = 0.12 * s;
            g.add(head);
        }
        return g;
    };

    /**
     * Smooth inertial Orbit & Camera Preset Controller (mouse + single-finger drag + pinch zoom).
     * Carefully avoids trapping normal page scrolling until user interacts with the canvas.
     */
    BioSimUtils.OrbitRig = function (camera, domElement, opts) {
        opts = opts || {};
        this.camera = camera;
        this.domElement = domElement;

        this.minRadius = opts.minRadius || 2.2;
        this.maxRadius = opts.maxRadius || 16.0;
        this.minPhi = opts.minPhi || 0.22;
        this.maxPhi = opts.maxPhi || Math.PI - 0.22;
        this.autoRotate = opts.autoRotate !== undefined ? opts.autoRotate : true;
        this.autoRotateSpeed = opts.autoRotateSpeed || 0.16;

        this.target = (opts.target ? opts.target.clone() : new THREE.Vector3(0, 0, 0));
        this.desiredTarget = this.target.clone();

        this.theta = opts.theta !== undefined ? opts.theta : 0.45;
        this.phi = opts.phi !== undefined ? opts.phi : 1.25;
        this.radius = opts.radius !== undefined ? opts.radius : 7.5;

        this.desiredTheta = this.theta;
        this.desiredPhi = this.phi;
        this.desiredRadius = this.radius;

        this.isDragging = false;
        this.hasInteracted = false;
        this.wheelActive = false;
        this.lastX = 0;
        this.lastY = 0;
        this.pinchDist = 0;
        this.pointerDownPos = { x: 0, y: 0 };

        this._bindEvents();
        this.update(1.0);
    };

    BioSimUtils.OrbitRig.prototype._bindEvents = function () {
        const self = this;
        const el = this.domElement;

        el.style.cursor = 'grab';

        el.addEventListener('pointerdown', function (e) {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            self.isDragging = true;
            self.hasInteracted = true;
            self.wheelActive = true;
            self.lastX = e.clientX;
            self.lastY = e.clientY;
            self.pointerDownPos = { x: e.clientX, y: e.clientY };
            el.style.cursor = 'grabbing';
            if (el.setPointerCapture) {
                try { el.setPointerCapture(e.pointerId); } catch (_) {}
            }
        });

        window.addEventListener('pointermove', function (e) {
            if (!self.isDragging) return;
            const dx = e.clientX - self.lastX;
            const dy = e.clientY - self.lastY;
            self.lastX = e.clientX;
            self.lastY = e.clientY;

            self.desiredTheta -= dx * 0.0075;
            self.desiredPhi = Math.max(self.minPhi, Math.min(self.maxPhi, self.desiredPhi - dy * 0.0065));
        });

        const endDrag = function () {
            if (!self.isDragging) return;
            self.isDragging = false;
            el.style.cursor = 'grab';
        };
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);

        // Deactivate wheel capture when clicking outside the canvas so page scrolling stays natural
        window.addEventListener('pointerdown', function (e) {
            if (e.target !== el && !el.contains(e.target)) {
                self.wheelActive = false;
            }
        });

        // Wheel zoom when focused/clicked or holding Ctrl
        el.addEventListener('wheel', function (e) {
            if (!self.wheelActive && !e.ctrlKey) return;
            e.preventDefault();
            const delta = Math.sign(e.deltaY) * 0.55;
            self.zoomBy(delta);
        }, { passive: false });

        // Pinch zoom for mobile devices
        el.addEventListener('touchstart', function (e) {
            if (e.touches.length === 2) {
                self.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                self.pinchDist = Math.hypot(dx, dy);
            }
        }, { passive: true });

        el.addEventListener('touchmove', function (e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                if (self.pinchDist > 0) {
                    const diff = (self.pinchDist - dist) * 0.025;
                    self.zoomBy(diff);
                }
                self.pinchDist = dist;
            }
        }, { passive: false });
    };

    BioSimUtils.OrbitRig.prototype.zoomBy = function (delta) {
        this.desiredRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.desiredRadius + delta));
    };

    BioSimUtils.OrbitRig.prototype.flyTo = function (theta, phi, radius, targetVec) {
        if (theta !== null && theta !== undefined) this.desiredTheta = theta;
        if (phi !== null && phi !== undefined) this.desiredPhi = Math.max(this.minPhi, Math.min(this.maxPhi, phi));
        if (radius !== null && radius !== undefined) this.desiredRadius = Math.max(this.minRadius, Math.min(this.maxRadius, radius));
        if (targetVec) this.desiredTarget.copy(targetVec);
    };

    BioSimUtils.OrbitRig.prototype.update = function (dt) {
        const step = Math.min(1, dt * 6.5);
        if (this.autoRotate && !this.isDragging) {
            this.desiredTheta += this.autoRotateSpeed * dt;
        }
        this.theta += (this.desiredTheta - this.theta) * step;
        this.phi += (this.desiredPhi - this.phi) * step;
        this.radius += (this.desiredRadius - this.radius) * step;
        this.target.lerp(this.desiredTarget, step);

        const sinPhi = Math.sin(this.phi);
        this.camera.position.set(
            this.target.x + this.radius * sinPhi * Math.sin(this.theta),
            this.target.y + this.radius * Math.cos(this.phi),
            this.target.z + this.radius * sinPhi * Math.cos(this.theta)
        );
        this.camera.lookAt(this.target);
    };

    /**
     * Project a 3D world position into 2D pixel coordinates inside the container.
     */
    BioSimUtils.projectToScreen = function (worldPos, camera, width, height) {
        const v = worldPos.clone().project(camera);
        return {
            x: (v.x * 0.5 + 0.5) * width,
            y: (-v.y * 0.5 + 0.5) * height,
            visible: v.z < 1.0 && v.z > -1.0
        };
    };

    global.BioSimUtils = BioSimUtils;
})(window);
