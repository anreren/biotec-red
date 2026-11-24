/**
 * HEMOBIO UFPA — Simulação 3D de Centrifugação do Sangue
 * Mostra a centrífuga refrigerada 3D em funcionamento (rotação real, tubos basculantes,
 * força centrífuga, estratificação progressiva por densidade) e, ao final, destaca o tubo
 * separado em modo macro 3D interativo com camadas clicáveis e modo "Expandir Camadas".
 */
(function (global) {
    'use strict';

    const COMPONENT_DETAILS = {
        plasma: {
            id: 'plasma',
            badge: 'Camada Superior • ~55% do volume',
            title: 'Plasma Sanguíneo',
            subtitle: 'Fração líquida menos densa (1,025 – 1,030 g/mL)',
            accentColor: '#FACC15',
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
            dotColor: '#FACC15',
            composition: 'Composto por ~91% de água, proteínas plasmáticas (albumina, imunoglobulinas/anticorpos, fibrinogênio e fatores de coagulação), eletrólitos, hormônios e nutrientes.',
            utilities: [
                'Reposição de fatores de coagulação em hemorragias graves e insuficiência hepática.',
                'Tratamento de grandes queimaduras e reposição proteica/volêmica em UTIs.',
                'Matéria-prima para o Crioprecipitado e hemoderivados (albumina e imunoglobulinas).'
            ],
            storage: 'Congelado a -20°C ou menos (Plasma Fresco Congelado) • Validade: 12 a 24 meses.',
            camera: { theta: 0.36, phi: 1.40, radius: 6.4, targetY: 1.15 }
        },
        buffy: {
            id: 'buffy',
            badge: 'Camada Intermediária • <1% do volume',
            title: 'Camada Leucoplaquetária (Buffy Coat)',
            subtitle: 'Plaquetas + Leucócitos • Densidade intermediária (1,040 – 1,075 g/mL)',
            accentColor: '#E2E8F0',
            badgeClass: 'bg-slate-200/20 text-slate-100 border-slate-300/40',
            dotColor: '#F8FAFC',
            composition: 'Fina faixa esbranquiçada contendo Plaquetas (fragmentos celulares que estancam sangramentos) e Leucócitos (glóbulos brancos de defesa, normalmente filtrados por leucorredução antes da transfusão).',
            utilities: [
                'Concentrado de Plaquetas: estanca sangramentos e previne hemorragias espontâneas.',
                'Vital para pacientes oncológicos (leucemias/quimioterapia), transplante de medula e dengue hemorrágica grave.',
                'A biotecnologia filtra os leucócitos para evitar reações febris transfusionais no paciente.'
            ],
            storage: '20°C a 24°C sob agitação contínua suave • Validade curta: apenas 5 dias!',
            camera: { theta: 0.45, phi: 1.44, radius: 5.9, targetY: 0.65 }
        },
        hemacias: {
            id: 'hemacias',
            badge: 'Camada Inferior • ~44–45% do volume',
            title: 'Concentrado de Hemácias (Eritrócitos)',
            subtitle: 'Fração celular mais densa (1,090 – 1,110 g/mL)',
            accentColor: '#EF233C',
            badgeClass: 'bg-hemo-500/20 text-rose-300 border-hemo-500/40',
            dotColor: '#EF233C',
            composition: 'Glóbulos vermelhos em formato de disco bicôncavo, ricos em hemoglobina (proteína com ferro responsável por transportar oxigênio O₂ dos pulmões para todas as células do corpo).',
            utilities: [
                'Restaura rapidamente o transporte de oxigênio em acidentes graves, traumas e grandes cirurgias.',
                'Suporte vital contínuo para anemias graves (anemia falciforme, talassemias) e hemorragias obstétricas.',
                'Por ser o componente mais denso, a força centrífuga o compacta no fundo do tubo.'
            ],
            storage: 'Refrigerado entre 2°C e 6°C com solução CPDA-1 / SAG-Manitol • Validade: 35 a 42 dias.',
            camera: { theta: 0.32, phi: 1.46, radius: 6.2, targetY: 0.05 }
        },
        crio: {
            id: 'crio',
            badge: '4º Hemocomponente • Derivado do Plasma',
            title: 'Crioprecipitado (Biotecnologia Térmica)',
            subtitle: 'Extraído do Plasma Fresco por descongelamento controlado (4°C) + 2ª centrifugação',
            accentColor: '#14B8A6',
            badgeClass: 'bg-biotech-500/20 text-biotech-300 border-biotech-500/40',
            dotColor: '#14B8A6',
            composition: 'Fração proteica insolúvel ao frio obtida do plasma congelado, altamente concentrada em Fibrinogênio, Fator VIII, Fator XIII e Fator de von Willebrand.',
            utilities: [
                'Essencial em hemorragias maciças com deficiência severa de fibrinogênio.',
                'Auxilia no tratamento de coagulação intravascular disseminada (CIVD) e distúrbios hereditários da coagulação.',
                'É esse fracionamento biotecnológico que permite que 1 bolsa salve até 4 vidas!'
            ],
            storage: 'Congelado a -20°C ou inferior • Validade: até 12 meses.',
            camera: { theta: -0.38, phi: 1.38, radius: 6.6, targetY: 1.05 }
        }
    };

    function createBenchTexture() {
        const size = 512;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#0c1322';
        ctx.fillRect(0, 0, size, size);

        // Subtle radial gradient
        const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(20, 184, 166, 0.14)');
        grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.45)');
        grad.addColorStop(1, 'rgba(9, 13, 22, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Concentric laboratory calibration rings
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.lineWidth = 1.5;
        [75, 130, 185, 235].forEach(function (r) {
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Crosshair axes
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.lineTo(size, size / 2);
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.stroke();

        const tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    function createTubeGraduationTexture() {
        const w = 256;
        const h = 512;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';

        for (let i = 1; i <= 10; i++) {
            const y = h - 45 - (i / 10) * (h - 105);
            const major = i % 2 === 0;
            ctx.lineWidth = major ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.moveTo(26, y);
            ctx.lineTo(major ? 62 : 44, y);
            ctx.stroke();
            if (major) {
                ctx.fillText(i + ' mL', 68, y + 5);
            }
        }

        // Small UFPA Biotech label band
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(150, 90, 92, 160);
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(150, 90, 92, 160);

        ctx.save();
        ctx.translate(196, 170);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EDTA • HEMOBIO', 0, -6);
        ctx.fillStyle = 'rgba(45, 212, 191, 0.95)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('UFPA • 10 mL', 0, 12);
        ctx.restore();

        const tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    function createDisplayCanvas() {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 128;
        const ctx = c.getContext('2d');
        const tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        return { canvas: c, ctx: ctx, texture: tex };
    }

    /**
     * CentrifugeSim class
     */
    function CentrifugeSim(options) {
        this.container = options.container;
        this.pinsContainer = options.pinsContainer;
        this.onStateChange = options.onStateChange || function () {};
        this.onLayerSelect = options.onLayerSelect || function () {};

        this.state = 'idle'; // 'idle' | 'spinning' | 'complete'
        this.viewMode = 'centrifuge'; // 'centrifuge' | 'tube'
        this.progress = 0; // 0.0 -> 1.0
        this.rpm = 0;
        this.targetRpm = 3500;
        this.elapsedSpin = 0;
        this.spinDuration = 8.2; // seconds for full realistic spin choreography
        this.isPaused = false;
        this.exploded = false;
        this.selectedLayer = null; // 'plasma' | 'buffy' | 'hemacias' | 'crio' | null
        this.isActive = true;
        this.isVisible = true;

        this.lidAngle = 0.82; // open at start so students see blood tubes inside
        this.targetLidAngle = 0.82;
        this.rotorAngle = 0;
        this.bucketSwing = 0;
        this.heroBlend = 0; // 0 = centrifuge center stage, 1 = macro hero tube center stage
        this.explodeBlend = 0;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.clickableLayers = [];
        this.pins = [];

        this._initScene();
        this._buildBench();
        this._buildCentrifuge();
        this._buildHeroTube();
        this._buildPins();
        this._bindCanvasClick();
        this._setupResize();

        this.clock = new THREE.Clock();
        this._animate = this._animate.bind(this);
        this._animate();
    }

    CentrifugeSim.prototype._initScene = function () {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x090f1d, 0.036);

        const w = this.container.clientWidth || 640;
        const h = this.container.clientHeight || 480;
        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);

        this.renderer = BioSimUtils.createRenderer(this.container);
        this.scene.environment = BioSimUtils.createLabEnvMap(this.renderer);

        // Lighting rig
        const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.75);
        this.scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
        keyLight.position.set(5, 9, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 25;
        keyLight.shadow.bias = -0.001;
        this.scene.add(keyLight);

        const tealRim = new THREE.PointLight(0x14b8a6, 2.2, 18);
        tealRim.position.set(-5.5, 4, -4);
        this.scene.add(tealRim);

        const redRim = new THREE.PointLight(0xef233c, 1.3, 16);
        redRim.position.set(5, 2.5, -5);
        this.scene.add(redRim);

        this.orbit = new BioSimUtils.OrbitRig(this.camera, this.renderer.domElement, {
            theta: 0.42,
            phi: 1.12,
            radius: 8.4,
            minRadius: 2.8,
            maxRadius: 13.5,
            target: new THREE.Vector3(0, 0.7, 0),
            autoRotate: true,
            autoRotateSpeed: 0.12
        });
    };

    CentrifugeSim.prototype._buildBench = function () {
        const bench = new THREE.Mesh(
            new THREE.CylinderGeometry(7.2, 7.6, 0.25, 64),
            new THREE.MeshStandardMaterial({
                map: createBenchTexture(),
                roughness: 0.45,
                metalness: 0.35
            })
        );
        bench.position.y = -1.65;
        bench.receiveShadow = true;
        this.scene.add(bench);
    };

    CentrifugeSim.prototype._buildCentrifuge = function () {
        this.centrifugeGroup = new THREE.Group();
        this.centrifugeGroup.position.set(0, -1.52, 0);
        this.scene.add(this.centrifugeGroup);

        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: 0xe2e8f0,
            roughness: 0.26,
            metalness: 0.15,
            clearcoat: 0.7,
            clearcoatRoughness: 0.18
        });

        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.42,
            metalness: 0.45
        });

        const steelMat = new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            roughness: 0.22,
            metalness: 0.88
        });

        // Rubber anti-vibration feet
        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2 + Math.PI / 4;
            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 16), darkTrimMat);
            foot.position.set(Math.cos(ang) * 1.9, 0.07, Math.sin(ang) * 1.9);
            this.centrifugeGroup.add(foot);
        }

        // Main cylindrical-beveled chassis
        const baseDrum = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.48, 1.55, 48), bodyMat);
        baseDrum.position.y = 0.92;
        baseDrum.castShadow = true;
        baseDrum.receiveShadow = true;
        this.centrifugeGroup.add(baseDrum);

        // Dark recessed biotech status ring
        const statusRingMat = new THREE.MeshStandardMaterial({
            color: 0x14b8a6,
            emissive: 0x14b8a6,
            emissiveIntensity: 0.9,
            roughness: 0.2
        });
        this.statusRingMat = statusRingMat;
        const statusRing = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.045, 12, 64), statusRingMat);
        statusRing.rotation.x = Math.PI / 2;
        statusRing.position.y = 1.62;
        this.centrifugeGroup.add(statusRing);

        // Stainless steel inner chamber bowl (hollow illusion via outer rim + dark interior)
        const rimTop = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.24, 16, 48), darkTrimMat);
        rimTop.rotation.x = Math.PI / 2;
        rimTop.position.y = 1.72;
        this.centrifugeGroup.add(rimTop);

        const chamberFloor = new THREE.Mesh(
            new THREE.CylinderGeometry(1.98, 1.98, 0.1, 40),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.7 })
        );
        chamberFloor.position.y = 1.68;
        this.centrifugeGroup.add(chamberFloor);

        // Sloped front digital control console
        const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.82, 0.78), darkTrimMat);
        consoleBox.position.set(0, 0.75, 2.25);
        consoleBox.rotation.x = -0.35;
        consoleBox.castShadow = true;
        this.centrifugeGroup.add(consoleBox);

        this.display = createDisplayCanvas();
        const screenMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.42, 0.56),
            new THREE.MeshBasicMaterial({ map: this.display.texture })
        );
        screenMesh.position.set(0, 0.80, 2.66);
        screenMesh.rotation.x = -0.35;
        this.centrifugeGroup.add(screenMesh);
        this._updateDisplayCanvas();

        // Hinged Translucent Protective Dome Lid
        this.lidPivot = new THREE.Group();
        this.lidPivot.position.set(0, 1.85, -2.18);
        this.centrifugeGroup.add(this.lidPivot);

        const lidMat = new THREE.MeshPhysicalMaterial({
            color: 0xcffafe,
            transparent: true,
            opacity: 0.26,
            roughness: 0.08,
            metalness: 0.05,
            clearcoat: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(2.12, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.44),
            lidMat
        );
        dome.scale.y = 0.68;
        dome.position.set(0, 0.0, 2.18);
        this.lidPivot.add(dome);

        const lidRim = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.075, 14, 48), darkTrimMat);
        lidRim.rotation.x = Math.PI / 2;
        lidRim.position.set(0, 0.05, 2.18);
        this.lidPivot.add(lidRim);

        // Hinge knuckles
        const hingeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 16), steelMat);
        hingeBar.rotation.z = Math.PI / 2;
        this.lidPivot.add(hingeBar);

        // Swinging-Bucket Rotor Group
        this.rotorGroup = new THREE.Group();
        this.rotorGroup.position.set(0, 2.15, 0);
        this.centrifugeGroup.add(this.rotorGroup);

        // Central hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.72, 24), steelMat);
        hub.position.y = -0.15;
        this.rotorGroup.add(hub);

        const hubCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.24, 0.16, 16),
            new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.3, metalness: 0.4 })
        );
        hubCap.position.y = 0.26;
        this.rotorGroup.add(hubCap);

        // Glowing Centrifugal Force Ring (visible during high-speed spin)
        this.forceRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.forceRing = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.98, 48), this.forceRingMat);
        this.forceRing.rotation.x = -Math.PI / 2;
        this.forceRing.position.y = 0.08;
        this.rotorGroup.add(this.forceRing);

        // 4 Rotor Arms + Swinging Buckets + Mini Blood Tubes
        this.bucketPivots = [];
        this.miniTubes = [];

        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.28,
            roughness: 0.06,
            clearcoat: 1.0,
            depthWrite: false
        });

        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            const armWrapper = new THREE.Group();
            armWrapper.rotation.y = ang;
            this.rotorGroup.add(armWrapper);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.18), steelMat);
            arm.position.set(0.55, 0.08, 0);
            armWrapper.add(arm);

            // Pivot at outer tip so bucket swings outward as RPM climbs!
            const bucketPivot = new THREE.Group();
            bucketPivot.position.set(1.06, 0.08, 0);
            armWrapper.add(bucketPivot);
            this.bucketPivots.push(bucketPivot);

            // Metal sleeve holder
            const sleeve = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.20, 0.55, 18, 1, true),
                steelMat
            );
            sleeve.position.y = -0.25;
            bucketPivot.add(sleeve);

            // Mini glass tube inside sleeve
            const tubeGroup = new THREE.Group();
            tubeGroup.position.y = -0.10;
            bucketPivot.add(tubeGroup);

            const glassBody = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 1.05, 18), glassMat);
            tubeGroup.add(glassBody);

            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(0.175, 0.165, 0.2, 18),
                new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.35 })
            );
            cap.position.y = 0.58;
            tubeGroup.add(cap);

            // Liquid inside mini tube: lower RBC layer, thin buffy layer, upper plasma layer
            // At separation=0, all three share uniform crimson whole blood color; as separation->1, colors stratify!
            const rbcMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25 });
            const buffyMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25 });
            const plasmaMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25, transparent: true, opacity: 0.95 });

            const miniRbc = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.135, 0.40, 16), rbcMat);
            miniRbc.position.y = -0.28;
            tubeGroup.add(miniRbc);

            const miniBuffy = new THREE.Mesh(new THREE.CylinderGeometry(0.139, 0.139, 0.04, 16), buffyMat);
            miniBuffy.position.y = -0.06;
            tubeGroup.add(miniBuffy);

            const miniPlasma = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.46, 16), plasmaMat);
            miniPlasma.position.y = 0.19;
            tubeGroup.add(miniPlasma);

            this.miniTubes.push({ rbcMat: rbcMat, buffyMat: buffyMat, plasmaMat: plasmaMat });
        }
    };

    CentrifugeSim.prototype._buildHeroTube = function () {
        this.heroTubeGroup = new THREE.Group();
        this.heroTubeGroup.position.set(0, 0.65, 0);
        this.heroTubeGroup.scale.setScalar(0.001);
        this.heroTubeGroup.visible = false;
        this.scene.add(this.heroTubeGroup);

        // Glass Outer Tube (Cylindrical body + rounded hemisphere bottom)
        this.heroGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0xf0f9ff,
            transparent: true,
            opacity: 0.24,
            roughness: 0.05,
            metalness: 0.04,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            side: THREE.FrontSide,
            depthWrite: false
        });

        const tubeRadius = 0.72;
        const tubeHeight = 3.85;

        const glassWall = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeHeight, 44, 1, true),
            this.heroGlassMat
        );
        glassWall.position.y = 0.55;
        glassWall.renderOrder = 10;
        this.heroTubeGroup.add(glassWall);

        // Graduation tick marks overlay cylinder
        const gradOverlay = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeRadius + 0.006, tubeRadius + 0.006, tubeHeight - 0.1, 44, 1, true),
            new THREE.MeshBasicMaterial({
                map: createTubeGraduationTexture(),
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            })
        );
        gradOverlay.position.y = 0.55;
        gradOverlay.renderOrder = 12;
        this.heroTubeGroup.add(gradOverlay);

        // Rounded glass bottom dome
        const glassBottom = new THREE.Mesh(
            new THREE.SphereGeometry(tubeRadius, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
            this.heroGlassMat
        );
        glassBottom.position.y = 0.55 - tubeHeight / 2;
        glassBottom.renderOrder = 10;
        this.heroTubeGroup.add(glassBottom);

        // Glass rim flange at top
        const rimLip = new THREE.Mesh(
            new THREE.TorusGeometry(tubeRadius + 0.04, 0.06, 14, 40),
            this.heroGlassMat
        );
        rimLip.rotation.x = Math.PI / 2;
        rimLip.position.y = 0.55 + tubeHeight / 2;
        this.heroTubeGroup.add(rimLip);

        // Sterile Vacuum EDTA Medical Cap (Lavender/Biotech)
        this.heroCapGroup = new THREE.Group();
        this.heroCapGroup.position.y = 0.55 + tubeHeight / 2 + 0.25;
        this.heroTubeGroup.add(this.heroCapGroup);

        const capMain = new THREE.Mesh(
            new THREE.CylinderGeometry(0.80, 0.76, 0.55, 36),
            new THREE.MeshPhysicalMaterial({
                color: 0x6d28d9,
                roughness: 0.35,
                clearcoat: 0.5
            })
        );
        this.heroCapGroup.add(capMain);

        const capRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.82, 0.82, 0.1, 36),
            new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3, metalness: 0.2 })
        );
        capRing.position.y = -0.22;
        this.heroCapGroup.add(capRing);

        // Subtle stand shadow glow beneath tube
        const glowTex = BioSimUtils.createGlowTexture(
            'rgba(20, 184, 166, 0.38)',
            'rgba(56, 189, 248, 0.14)',
            'rgba(0,0,0,0)'
        );
        const underGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(3.4, 3.4),
            new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        underGlow.rotation.x = -Math.PI / 2;
        underGlow.position.y = -2.14;
        this.heroTubeGroup.add(underGlow);

        // ============================================================
        // LAYER 1 (BOTTOM ~45%): HEMÁCIAS (Concentrado de Eritrócitos)
        // ============================================================
        this.layerHemacias = new THREE.Group();
        this.layerHemacias.userData.baseY = 0;
        this.heroTubeGroup.add(this.layerHemacias);

        const innerR = tubeRadius - 0.055;
        this.hemaciasMat = new THREE.MeshPhysicalMaterial({
            color: 0x8f0619,
            emissive: 0x3b020a,
            emissiveIntensity: 0.32,
            roughness: 0.28,
            metalness: 0.04,
            clearcoat: 0.55,
            envMapIntensity: 0.42,
            transparent: true,
            opacity: 0.86
        });

        const rbcHeight = 1.48;
        const rbcCyl = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, rbcHeight, 36), this.hemaciasMat);
        rbcCyl.position.y = -1.35 + rbcHeight / 2;
        rbcCyl.userData.layerId = 'hemacias';
        this.layerHemacias.add(rbcCyl);
        this.clickableLayers.push(rbcCyl);

        const rbcBottom = new THREE.Mesh(
            new THREE.SphereGeometry(innerR, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
            this.hemaciasMat
        );
        rbcBottom.position.y = -1.35;
        rbcBottom.userData.layerId = 'hemacias';
        this.layerHemacias.add(rbcBottom);
        this.clickableLayers.push(rbcBottom);

        // Instanced 3D Biconcave RBCs packed densely inside bottom layer!
        const rbcGeom = BioSimUtils.createRBCGeometry(0.115, 20, 12);
        const rbcCellMat = new THREE.MeshPhysicalMaterial({
            color: 0xb90822,
            emissive: 0x4a020c,
            emissiveIntensity: 0.28,
            roughness: 0.30,
            clearcoat: 0.50,
            envMapIntensity: 0.40
        });
        const rbcCount = 105;
        this.rbcInstanced = new THREE.InstancedMesh(rbcGeom, rbcCellMat, rbcCount);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < rbcCount; i++) {
            const rad = Math.sqrt(Math.random()) * (innerR - 0.13);
            const ang = Math.random() * Math.PI * 2;
            const yPos = -1.55 + Math.random() * 1.62;
            // Clamp inside rounded bottom
            let finalR = rad;
            if (yPos < -1.35) {
                const dy = -1.35 - yPos;
                const maxR = Math.sqrt(Math.max(0.02, innerR * innerR - dy * dy)) - 0.11;
                finalR = Math.min(rad, Math.max(0.02, maxR));
            }
            dummy.position.set(Math.cos(ang) * finalR, yPos, Math.sin(ang) * finalR);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            const sc = 0.82 + Math.random() * 0.34;
            dummy.scale.setScalar(sc);
            dummy.updateMatrix();
            this.rbcInstanced.setMatrixAt(i, dummy.matrix);
        }
        this.rbcInstanced.instanceMatrix.needsUpdate = true;
        this.layerHemacias.add(this.rbcInstanced);

        // ============================================================
        // LAYER 2 (MIDDLE <1%): BUFFY COAT (Leucócitos + Plaquetas)
        // ============================================================
        this.layerBuffy = new THREE.Group();
        this.layerBuffy.userData.baseY = 0;
        this.heroTubeGroup.add(this.layerBuffy);

        this.buffyMat = new THREE.MeshPhysicalMaterial({
            color: 0xf1f5f9,
            emissive: 0x94a3b8,
            emissiveIntensity: 0.35,
            roughness: 0.22,
            clearcoat: 0.7,
            transparent: true,
            opacity: 0.78
        });

        const buffyHeight = 0.16;
        const buffyY = -1.35 + rbcHeight + buffyHeight / 2 + 0.01;
        const buffyCyl = new THREE.Mesh(new THREE.CylinderGeometry(innerR + 0.004, innerR + 0.004, buffyHeight, 36), this.buffyMat);
        buffyCyl.position.y = buffyY;
        buffyCyl.userData.layerId = 'buffy';
        this.layerBuffy.add(buffyCyl);
        this.clickableLayers.push(buffyCyl);

        // 3D Leukocytes (White Blood Cells) embedded in Buffy Coat
        const wbcGeom = BioSimUtils.createLeukocyteGeometry(0.068);
        const wbcMat = new THREE.MeshPhysicalMaterial({
            color: 0xe0f2fe,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.3,
            roughness: 0.32
        });
        this.buffyCells = [];
        for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
            const rad = 0.14 + Math.random() * (innerR - 0.22);
            const wbc = new THREE.Mesh(wbcGeom, wbcMat);
            wbc.position.set(Math.cos(ang) * rad, buffyY + (Math.random() - 0.5) * 0.06, Math.sin(ang) * rad);
            wbc.userData = { baseAngle: ang, rad: rad, baseY: wbc.position.y, speed: 0.4 + Math.random() * 0.5 };
            this.layerBuffy.add(wbc);
            this.buffyCells.push(wbc);
        }

        // 3D Platelets (Thrombocytes) embedded in Buffy Coat
        const pltGeom = BioSimUtils.createPlateletGeometry(0.048);
        const pltMat = new THREE.MeshPhysicalMaterial({
            color: 0xfde68a,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.35,
            roughness: 0.28
        });
        for (let i = 0; i < 24; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 0.08 + Math.random() * (innerR - 0.16);
            const plt = new THREE.Mesh(pltGeom, pltMat);
            plt.position.set(Math.cos(ang) * rad, buffyY + (Math.random() - 0.5) * 0.09, Math.sin(ang) * rad);
            plt.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            plt.userData = { baseAngle: ang, rad: rad, baseY: plt.position.y, speed: -0.5 - Math.random() * 0.4 };
            this.layerBuffy.add(plt);
            this.buffyCells.push(plt);
        }

        // ============================================================
        // LAYER 3 (TOP ~55%): PLASMA SANGUÍNEO
        // ============================================================
        this.layerPlasma = new THREE.Group();
        this.layerPlasma.userData.baseY = 0;
        this.heroTubeGroup.add(this.layerPlasma);

        this.plasmaMat = new THREE.MeshPhysicalMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.42,
            roughness: 0.14,
            metalness: 0.02,
            clearcoat: 0.75,
            envMapIntensity: 0.5,
            transparent: true,
            opacity: 0.68
        });

        const plasmaHeight = 1.88;
        const plasmaY = buffyY + buffyHeight / 2 + plasmaHeight / 2 + 0.01;
        const plasmaCyl = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, plasmaHeight, 36), this.plasmaMat);
        plasmaCyl.position.y = plasmaY;
        plasmaCyl.userData.layerId = 'plasma';
        this.layerPlasma.add(plasmaCyl);
        this.clickableLayers.push(plasmaCyl);

        // Glowing top meniscus ring
        const meniscus = new THREE.Mesh(
            new THREE.TorusGeometry(innerR - 0.01, 0.022, 12, 36),
            new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 })
        );
        meniscus.rotation.x = Math.PI / 2;
        meniscus.position.y = plasmaY + plasmaHeight / 2;
        this.layerPlasma.add(meniscus);

        // Floating golden protein/antibody shimmer particles inside Plasma
        const pCount = 55;
        const pPositions = new Float32Array(pCount * 3);
        this.plasmaParticleMeta = [];
        for (let i = 0; i < pCount; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.sqrt(Math.random()) * (innerR - 0.09);
            const py = plasmaY - plasmaHeight / 2 + 0.1 + Math.random() * (plasmaHeight - 0.2);
            pPositions[i * 3] = Math.cos(ang) * rad;
            pPositions[i * 3 + 1] = py;
            pPositions[i * 3 + 2] = Math.sin(ang) * rad;
            this.plasmaParticleMeta.push({ baseY: py, phase: Math.random() * Math.PI * 2, rad: rad, ang: ang });
        }
        const pGeom = new THREE.BufferGeometry();
        pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0xfef9c3,
            size: 0.09,
            map: BioSimUtils.createGlowTexture('rgba(255,253,220,1)', 'rgba(250,204,21,0.55)', 'rgba(0,0,0,0)'),
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.plasmaPoints = new THREE.Points(pGeom, pMat);
        this.layerPlasma.add(this.plasmaPoints);

        // Save anchor local heights for 3D pins
        this.pinAnchors = {
            plasma: new THREE.Vector3(0.82, plasmaY - 0.28, 0),
            buffy: new THREE.Vector3(-0.84, buffyY, 0),
            hemacias: new THREE.Vector3(0.82, -1.35 + rbcHeight * 0.48, 0)
        };
    };

    CentrifugeSim.prototype._buildPins = function () {
        if (!this.pinsContainer) return;
        this.pinsContainer.innerHTML = '';
        const defs = [
            { id: 'plasma', label: 'Plasma (~55%)', color: 'border-amber-400/80 bg-slate-900/90 text-amber-300', dot: 'bg-amber-400' },
            { id: 'buffy', label: 'Plaquetas e Leucócitos (<1%)', color: 'border-slate-200/80 bg-slate-900/90 text-slate-100', dot: 'bg-slate-100' },
            { id: 'hemacias', label: 'Hemácias (~45%)', color: 'border-hemo-500/90 bg-slate-900/90 text-rose-300', dot: 'bg-hemo-500' }
        ];
        const self = this;
        this.pins = defs.map(function (d) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sim-3d-pin pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-transform duration-150 hover:scale-105 cursor-pointer ' + d.color;
            btn.style.display = 'none';
            btn.innerHTML = '<span class="w-2 h-2 rounded-full ' + d.dot + ' shrink-0"></span><span>' + d.label + '</span>';
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                self.selectLayer(d.id);
            });
            self.pinsContainer.appendChild(btn);
            return { id: d.id, el: btn };
        });
    };

    CentrifugeSim.prototype._bindCanvasClick = function () {
        const self = this;
        const dom = this.renderer.domElement;
        dom.addEventListener('pointerup', function (e) {
            if (self.viewMode !== 'tube' && self.heroBlend < 0.7) return;
            const moved = Math.hypot(
                e.clientX - self.orbit.pointerDownPos.x,
                e.clientY - self.orbit.pointerDownPos.y
            );
            if (moved > 6) return; // was drag, not click

            const rect = dom.getBoundingClientRect();
            self.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            self.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            self.raycaster.setFromCamera(self.pointer, self.camera);
            const hits = self.raycaster.intersectObjects(self.clickableLayers, false);
            if (hits.length > 0 && hits[0].object.userData.layerId) {
                self.selectLayer(hits[0].object.userData.layerId);
            }
        });
    };

    CentrifugeSim.prototype._setupResize = function () {
        const self = this;
        const onResize = function () {
            const w = self.container.clientWidth;
            const h = self.container.clientHeight;
            if (!w || !h) return;
            self.camera.aspect = w / h;
            self.camera.updateProjectionMatrix();
            self.renderer.setSize(w, h);
        };
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(onResize);
            this._resizeObserver.observe(this.container);
        } else {
            window.addEventListener('resize', onResize);
        }
    };

    CentrifugeSim.prototype._updateDisplayCanvas = function () {
        const ctx = this.display.ctx;
        ctx.fillStyle = '#07131e';
        ctx.fillRect(0, 0, 256, 128);

        ctx.strokeStyle = this.state === 'spinning' ? '#14b8a6' : (this.state === 'complete' ? '#22c55e' : '#38bdf8');
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 120);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText('HEMOBIO CENTRIFUGE 4°C', 16, 26);

        ctx.fillStyle = this.state === 'spinning' ? '#2dd4bf' : (this.state === 'complete' ? '#4ade80' : '#f8fafc');
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText(Math.round(this.rpm) + ' RPM', 16, 72);

        const rcf = Math.round((this.rpm / 3500) * (this.rpm / 3500) * 2000);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(rcf + ' × g', 16, 104);

        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(this.progress * 100) + '%', 238, 104);
        ctx.textAlign = 'left';

        this.display.texture.needsUpdate = true;
    };

    CentrifugeSim.prototype.startSpin = function () {
        if (this.state === 'complete') {
            this.reset();
        }
        this.state = 'spinning';
        this.viewMode = 'centrifuge';
        this.isPaused = false;
        this.selectedLayer = null;
        this.exploded = false;
        this.targetLidAngle = 0; // Close protective lid
        this.orbit.flyTo(0.38, 1.02, 7.6, new THREE.Vector3(0, 0.75, 0));
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.togglePause = function () {
        if (this.state !== 'spinning') return;
        this.isPaused = !this.isPaused;
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.jumpToResult = function () {
        this.progress = 1.0;
        this.elapsedSpin = this.spinDuration;
        this.rpm = 0;
        this.bucketSwing = 0;
        this.state = 'complete';
        this.isPaused = false;
        this.viewMode = 'tube';
        this.targetLidAngle = 0.92;
        this._updateMiniTubeColors(1.0);
        this._updateDisplayCanvas();
        this.orbit.flyTo(0.32, 1.42, 6.2, new THREE.Vector3(0, 0.72, 0));
        this.selectLayer('plasma');
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.reset = function () {
        this.state = 'idle';
        this.viewMode = 'centrifuge';
        this.progress = 0;
        this.elapsedSpin = 0;
        this.rpm = 0;
        this.bucketSwing = 0;
        this.isPaused = false;
        this.exploded = false;
        this.selectedLayer = null;
        this.targetLidAngle = 0.82;
        this._updateMiniTubeColors(0);
        this._updateDisplayCanvas();
        this.orbit.flyTo(0.42, 1.12, 8.4, new THREE.Vector3(0, 0.7, 0));
        this.onLayerSelect(null);
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.setViewMode = function (mode) {
        if (mode === 'tube' && this.state !== 'complete') return;
        this.viewMode = mode;
        if (mode === 'tube') {
            this.orbit.flyTo(0.32, 1.42, 6.2, new THREE.Vector3(0, 0.72, 0));
        } else {
            this.orbit.flyTo(0.42, 1.08, 8.2, new THREE.Vector3(0, 0.72, 0));
        }
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.toggleExploded = function () {
        if (this.state !== 'complete') return;
        this.exploded = !this.exploded;
        if (this.viewMode !== 'tube') {
            this.viewMode = 'tube';
        }
        if (this.exploded) {
            this.orbit.flyTo(null, 1.42, Math.max(this.orbit.desiredRadius, 7.4), new THREE.Vector3(0, 0.72, 0));
        }
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.selectLayer = function (layerId) {
        this.selectedLayer = layerId;
        if (layerId && COMPONENT_DETAILS[layerId]) {
            if (this.state === 'complete' && this.viewMode !== 'tube') {
                this.viewMode = 'tube';
            }
            const cam = COMPONENT_DETAILS[layerId].camera;
            if (cam && this.state === 'complete') {
                this.orbit.flyTo(cam.theta, cam.phi, cam.radius, new THREE.Vector3(0, cam.targetY, 0));
            }
            this.onLayerSelect(COMPONENT_DETAILS[layerId]);
        } else {
            this.onLayerSelect(null);
        }
        this.onStateChange(this.getSnapshot());
    };

    CentrifugeSim.prototype.zoomBy = function (delta) {
        this.orbit.zoomBy(delta);
    };

    CentrifugeSim.prototype.resetCamera = function () {
        if (this.viewMode === 'tube') {
            this.orbit.flyTo(0.32, 1.42, 6.2, new THREE.Vector3(0, 0.72, 0));
        } else {
            this.orbit.flyTo(0.42, 1.12, 8.4, new THREE.Vector3(0, 0.7, 0));
        }
    };

    CentrifugeSim.prototype.setActive = function (active) {
        this.isActive = active;
        if (active) {
            this.clock.getDelta();
        }
    };

    CentrifugeSim.prototype.setVisible = function (visible) {
        this.isVisible = visible;
        if (visible) {
            this.clock.getDelta();
        }
    };

    CentrifugeSim.prototype.getSnapshot = function () {
        const rcf = Math.round((this.rpm / 3500) * (this.rpm / 3500) * 2000);
        let phaseLabel = 'Aguardando início — Sangue total homogêneo nos tubos';
        if (this.state === 'spinning') {
            if (this.progress < 0.14) phaseLabel = 'Fechando tampa refrigerada (4°C) e iniciando aceleração...';
            else if (this.progress < 0.45) phaseLabel = 'Acelerando a 3.500 RPM — força centrífuga empurra células mais densas para o fundo...';
            else if (this.progress < 0.78) phaseLabel = 'Estratificação por densidade: hemácias sedimentam, plasma sobe ao topo...';
            else phaseLabel = 'Desacelerando rotor suavemente — preparando tubo separado para análise 3D...';
        } else if (this.state === 'complete') {
            phaseLabel = 'Separação concluída! Clique nas camadas do tubo 3D para explorar cada componente.';
        }

        return {
            state: this.state,
            viewMode: this.viewMode,
            progress: this.progress,
            rpm: Math.round(this.rpm),
            rcf: rcf,
            isPaused: this.isPaused,
            exploded: this.exploded,
            selectedLayer: this.selectedLayer,
            phaseLabel: phaseLabel
        };
    };

    CentrifugeSim.prototype._updateMiniTubeColors = function (sep) {
        const wholeColor = new THREE.Color(0xb91c1c);
        const rbcTarget = new THREE.Color(0x88081a);
        const buffyTarget = new THREE.Color(0xf1f5f9);
        const plasmaTarget = new THREE.Color(0xfacc15);

        const cRbc = wholeColor.clone().lerp(rbcTarget, sep);
        const cBuffy = wholeColor.clone().lerp(buffyTarget, Math.max(0, (sep - 0.25) / 0.75));
        const cPlasma = wholeColor.clone().lerp(plasmaTarget, sep);

        this.miniTubes.forEach(function (t) {
            t.rbcMat.color.copy(cRbc);
            t.buffyMat.color.copy(cBuffy);
            t.plasmaMat.color.copy(cPlasma);
            t.plasmaMat.opacity = 0.96 - sep * 0.34;
        });
    };

    CentrifugeSim.prototype._updatePins = function () {
        const showPins = this.state === 'complete' && this.heroBlend > 0.75;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        const self = this;

        this.pins.forEach(function (pin) {
            if (!showPins) {
                pin.el.style.display = 'none';
                return;
            }
            const anchor = self.pinAnchors[pin.id].clone();
            // Adjust vertical offset during Exploded View
            if (pin.id === 'plasma') anchor.y += self.explodeBlend * 0.58;
            else if (pin.id === 'buffy') anchor.y += self.explodeBlend * 0.16;
            else if (pin.id === 'hemacias') anchor.y -= self.explodeBlend * 0.28;

            anchor.applyMatrix4(self.heroTubeGroup.matrixWorld);
            const p = BioSimUtils.projectToScreen(anchor, self.camera, w, h);
            if (p.visible && p.x > 16 && p.x < w - 16 && p.y > 16 && p.y < h - 16) {
                const safeX = Math.max(82, Math.min(w - 82, p.x));
                const safeY = Math.max(86, Math.min(h - 94, p.y));
                pin.el.style.display = 'flex';
                pin.el.style.left = safeX + 'px';
                pin.el.style.top = safeY + 'px';
                if (self.selectedLayer === pin.id) {
                    pin.el.classList.add('ring-2', 'ring-white', 'scale-105');
                } else {
                    pin.el.classList.remove('ring-2', 'ring-white', 'scale-105');
                }
            } else {
                pin.el.style.display = 'none';
            }
        });
    };

    CentrifugeSim.prototype._animate = function () {
        requestAnimationFrame(this._animate);
        if (!this.isActive || !this.isVisible) return;

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const now = this.clock.elapsedTime;

        // 1. Update Spin Choreography
        if (this.state === 'spinning' && !this.isPaused) {
            this.elapsedSpin += dt;
            const t = Math.min(1, this.elapsedSpin / this.spinDuration);
            this.progress = t;

            // Realistic RPM curve: close lid (0-0.1), ramp up (0.1-0.32), cruise 3500 RPM (0.32-0.78), decelerate (0.78-1.0)
            if (t < 0.10) {
                this.rpm = 0;
            } else if (t < 0.32) {
                const k = (t - 0.10) / 0.22;
                this.rpm = this.targetRpm * (k * k * (3 - 2 * k));
            } else if (t < 0.78) {
                this.rpm = this.targetRpm;
            } else {
                const k = 1 - (t - 0.78) / 0.22;
                this.rpm = this.targetRpm * (k * k * (3 - 2 * k));
            }

            // Stratification progresses primarily during high RPM
            const sep = Math.max(0, Math.min(1, (t - 0.18) / 0.68));
            this._updateMiniTubeColors(sep);
            this._updateDisplayCanvas();

            if (t >= 1.0) {
                this.state = 'complete';
                this.rpm = 0;
                this.viewMode = 'tube';
                this.targetLidAngle = 0.92;
                this.orbit.flyTo(0.32, 1.42, 6.2, new THREE.Vector3(0, 0.72, 0));
                this.selectLayer('plasma');
            }
            this.onStateChange(this.getSnapshot());
        }

        // 2. Smooth Lid, Rotor, Swinging Buckets & Force Glow
        this.lidAngle += (this.targetLidAngle - this.lidAngle) * Math.min(1, dt * 5.0);
        this.lidPivot.rotation.x = -this.lidAngle;

        const rpmNorm = this.rpm / this.targetRpm;
        // Visual angular velocity (scaled so rotor motion reads crisply at 60fps without strobing backwards)
        this.rotorAngle += (rpmNorm * 22.0) * dt;
        this.rotorGroup.rotation.y = this.rotorAngle;

        const targetSwing = rpmNorm * 1.28; // swings outward to ~73° under centrifugal force!
        this.bucketSwing += (targetSwing - this.bucketSwing) * Math.min(1, dt * 6.5);
        for (let i = 0; i < this.bucketPivots.length; i++) {
            this.bucketPivots[i].rotation.z = this.bucketSwing;
        }

        this.forceRingMat.opacity = rpmNorm * 0.42 * (0.85 + 0.15 * Math.sin(now * 14));
        this.forceRing.scale.setScalar(0.95 + rpmNorm * 0.12);

        // Status LED pulse
        if (this.state === 'spinning') {
            this.statusRingMat.color.setHex(0x38bdf8);
            this.statusRingMat.emissive.setHex(0x0284c7);
            this.statusRingMat.emissiveIntensity = 1.0 + 0.5 * Math.sin(now * 8);
        } else if (this.state === 'complete') {
            this.statusRingMat.color.setHex(0x22c55e);
            this.statusRingMat.emissive.setHex(0x16a34a);
            this.statusRingMat.emissiveIntensity = 0.85;
        } else {
            this.statusRingMat.color.setHex(0x14b8a6);
            this.statusRingMat.emissive.setHex(0x0d9488);
            this.statusRingMat.emissiveIntensity = 0.65;
        }

        // 3. Smooth transition between Centrifuge View and Macro Hero Tube View
        const targetHeroBlend = (this.state === 'complete' && this.viewMode === 'tube') ? 1.0 : 0.0;
        this.heroBlend += (targetHeroBlend - this.heroBlend) * Math.min(1, dt * 4.5);

        if (this.heroBlend > 0.01) {
            this.heroTubeGroup.visible = true;
            const eased = this.heroBlend * this.heroBlend * (3 - 2 * this.heroBlend);
            this.heroTubeGroup.scale.setScalar(0.2 + 0.8 * eased);
            this.heroTubeGroup.position.y = -0.3 + 0.95 * eased + Math.sin(now * 1.4) * 0.04 * eased;
            // Smoothly retract and hide centrifuge cleanly when macro tube takes center stage
            this.centrifugeGroup.visible = this.heroBlend < 0.94;
            this.centrifugeGroup.position.z = -5.2 * eased;
            this.centrifugeGroup.position.y = -1.52 - 3.6 * eased;
            this.centrifugeGroup.scale.setScalar(Math.max(0.01, 1.0 - 0.92 * eased));
        } else {
            this.heroTubeGroup.visible = false;
            this.centrifugeGroup.visible = true;
            this.centrifugeGroup.position.set(0, -1.52, 0);
            this.centrifugeGroup.scale.setScalar(1.0);
        }

        // 4. Exploded View & Layer Highlight Animation on Hero Tube
        const targetExplode = this.exploded ? 1.0 : 0.0;
        this.explodeBlend += (targetExplode - this.explodeBlend) * Math.min(1, dt * 5.5);

        this.layerPlasma.position.y = this.explodeBlend * 0.58;
        this.layerBuffy.position.y = this.explodeBlend * 0.16;
        this.layerHemacias.position.y = -this.explodeBlend * 0.28;
        this.heroCapGroup.position.y = 2.72 + this.explodeBlend * 0.68;
        this.heroGlassMat.opacity = 0.24 - this.explodeBlend * 0.11;

        // Emphasize selected layer
        const sel = this.selectedLayer;
        const highlightPlasma = !sel || sel === 'plasma' || sel === 'crio';
        const highlightBuffy = !sel || sel === 'buffy';
        const highlightHemacias = !sel || sel === 'hemacias';

        this.plasmaMat.opacity = highlightPlasma ? 0.72 : 0.25;
        this.plasmaMat.emissiveIntensity = (sel === 'plasma' || sel === 'crio') ? 0.56 + 0.12 * Math.sin(now * 4) : 0.36;

        this.buffyMat.opacity = highlightBuffy ? 0.85 : 0.28;
        this.buffyMat.emissiveIntensity = sel === 'buffy' ? 0.72 + 0.15 * Math.sin(now * 4) : 0.30;

        this.hemaciasMat.opacity = highlightHemacias ? 0.88 : 0.32;
        this.hemaciasMat.emissiveIntensity = sel === 'hemacias' ? 0.58 + 0.12 * Math.sin(now * 4) : 0.30;

        // Subtle organic motion of cells in Buffy Coat and Proteins in Plasma
        if (this.heroTubeGroup.visible) {
            for (let i = 0; i < this.buffyCells.length; i++) {
                const cell = this.buffyCells[i];
                const d = cell.userData;
                const a = d.baseAngle + now * d.speed * 0.25;
                cell.position.x = Math.cos(a) * d.rad;
                cell.position.z = Math.sin(a) * d.rad;
                cell.rotation.y += dt * 0.7;
            }
            const posAttr = this.plasmaPoints.geometry.attributes.position;
            for (let i = 0; i < this.plasmaParticleMeta.length; i++) {
                const pm = this.plasmaParticleMeta[i];
                const ang = pm.ang + now * 0.18;
                posAttr.setXYZ(
                    i,
                    Math.cos(ang) * pm.rad,
                    pm.baseY + Math.sin(now * 1.3 + pm.phase) * 0.06,
                    Math.sin(ang) * pm.rad
                );
            }
            posAttr.needsUpdate = true;
        }

        this.orbit.update(dt);
        this.renderer.render(this.scene, this.camera);
        this._updatePins();
    };

    CentrifugeSim.COMPONENT_DETAILS = COMPONENT_DETAILS;
    global.CentrifugeSim = CentrifugeSim;
})(window);
