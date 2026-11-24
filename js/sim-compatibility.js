/**
 * HEMOBIO UFPA — Simulação 3D de Compatibilidade Sanguínea (Sistema ABO e Fator Rh)
 * Mostra em tempo real 3D o encontro molecular entre hemácias doadoras (com antígenos A, B e Rh)
 * e anticorpos do plasma receptor (Anti-A, Anti-B, Anti-Rh):
 *  - COMPATÍVEL (Bom): fluxo laminar saudável, anticorpos não se ligam às hemácias.
 *  - INCOMPATÍVEL (Ruim): reconhecimento imune, ligação antígeno-anticorpo, aglutinação (grumos)
 *    e hemólise (rompimento celular com liberação de hemoglobina).
 */
(function (global) {
    'use strict';

    const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

    function parseBloodType(type) {
        const rh = type.endsWith('+') ? '+' : '-';
        const abo = type.slice(0, -1);
        return {
            type: type,
            abo: abo,
            rh: rh,
            hasA: abo === 'A' || abo === 'AB',
            hasB: abo === 'B' || abo === 'AB',
            hasRh: rh === '+',
            hasAntiA: abo === 'O' || abo === 'B',
            hasAntiB: abo === 'O' || abo === 'A'
        };
    }

    function analyzeTransfusion(donorStr, recipientStr) {
        const donor = parseBloodType(donorStr);
        const recipient = parseBloodType(recipientStr);

        const conflicts = [];
        if (donor.hasA && recipient.hasAntiA) {
            conflicts.push({
                kind: 'A',
                antibody: 'Anti-A',
                antigen: 'Antígeno A',
                color: '#38BDF8',
                desc: 'Anticorpos Anti-A do receptor atacam o Antígeno A presente nas hemácias do doador.'
            });
        }
        if (donor.hasB && recipient.hasAntiB) {
            conflicts.push({
                kind: 'B',
                antibody: 'Anti-B',
                antigen: 'Antígeno B',
                color: '#FBBF24',
                desc: 'Anticorpos Anti-B do receptor atacam o Antígeno B presente nas hemácias do doador.'
            });
        }
        if (donor.hasRh && !recipient.hasRh) {
            conflicts.push({
                kind: 'Rh',
                antibody: 'Anti-Rh (Anti-D)',
                antigen: 'Fator Rh (Antígeno D)',
                color: '#E879F9',
                desc: 'Receptor Rh negativo reconhece o Antígeno D (Rh+) do doador como corpo estranho, desencadeando reação Anti-Rh / aloimunização.'
            });
        }

        const isCompatible = conflicts.length === 0;

        const donorAntigens = [];
        if (donor.hasA) donorAntigens.push({ id: 'A', label: 'Antígeno A', color: '#38BDF8' });
        if (donor.hasB) donorAntigens.push({ id: 'B', label: 'Antígeno B', color: '#FBBF24' });
        if (donor.hasRh) donorAntigens.push({ id: 'Rh', label: 'Fator Rh (D)', color: '#E879F9' });

        const recipientAntibodies = [];
        if (recipient.hasAntiA) recipientAntibodies.push({ id: 'A', label: 'Anti-A', color: '#38BDF8' });
        if (recipient.hasAntiB) recipientAntibodies.push({ id: 'B', label: 'Anti-B', color: '#FBBF24' });
        if (!recipient.hasRh) recipientAntibodies.push({ id: 'Rh', label: 'Anti-Rh (em exposição Rh+)', color: '#E879F9', conditional: true });

        let headline, summary, effects;
        if (isCompatible) {
            headline = 'TRANSFUSÃO COMPATÍVEL — EFEITO POSITIVO';
            if (donorStr === 'O-') {
                summary = 'O sangue O- é o Doador Universal de hemácias! Como suas células não possuem antígenos A, B nem Rh, os anticorpos do receptor ' + recipientStr + ' não encontram nenhum alvo para atacar.';
            } else if (recipientStr === 'AB+') {
                summary = 'O receptor AB+ é o Receptor Universal! Seu organismo não produz anticorpos Anti-A, Anti-B nem Anti-Rh, aceitando as hemácias do doador ' + donorStr + ' com segurança.';
            } else {
                summary = 'Nenhum anticorpo do plasma receptor (' + recipientStr + ') reage contra os antígenos das hemácias do doador (' + donorStr + '). As células circulam livres e funcionais!';
            }
            effects = [
                { icon: '✅', title: 'Sem Aglutinação', text: 'As hemácias permanecem separadas e deslizam em fluxo laminar saudável.' },
                { icon: '🫁', title: 'Oxigenação Restaurada', text: 'A hemoglobina doada transporta oxigênio (O₂) normalmente para órgãos e tecidos.' },
                { icon: '🛡️', title: 'Segurança Imunológica', text: 'Os anticorpos presentes no plasma passam livremente sem desencadear resposta inflamatória.' }
            ];
        } else {
            headline = 'INCOMPATÍVEL — REAÇÃO TRANSFUSIONAL GRAVE!';
            summary = conflicts.map(function (c) { return c.desc; }).join(' ');
            effects = [
                { icon: '⚠️', title: 'Aglutinação (Formação de Grumos)', text: 'Os anticorpos em forma de "Y" ligam várias hemácias entre si, formando aglomerados que podem entupir pequenos vasos sanguíneos.' },
                { icon: '💥', title: 'Hemólise (Rompimento Celular)', text: 'O sistema complemento destrói as hemácias aglutinadas, liberando hemoglobina livre tóxica na corrente sanguínea.' },
                { icon: '🚨', title: 'Consequências Clínicas Graves', text: 'Pode causar febre súbita, queda grave de pressão (choque), insuficiência renal aguda e risco de morte — por isso a tipagem e a prova cruzada são obrigatórias!' }
            ];
        }

        return {
            donor: donor,
            recipient: recipient,
            isCompatible: isCompatible,
            conflicts: conflicts,
            donorAntigens: donorAntigens,
            recipientAntibodies: recipientAntibodies,
            headline: headline,
            summary: summary,
            effects: effects
        };
    }

    /**
     * CompatibilitySim class
     */
    function CompatibilitySim(options) {
        this.container = options.container;
        this.pinsContainer = options.pinsContainer;
        this.onStateChange = options.onStateChange || function () {};

        this.donorType = options.initialDonor || 'A+';
        this.recipientType = options.initialRecipient || 'B+';
        this.analysis = analyzeTransfusion(this.donorType, this.recipientType);

        this.phase = 'ready'; // 'ready' | 'mixing' | 'reacting' | 'settled'
        this.phaseTime = 0;
        this.showLabels = true;
        this.isActive = false;
        this.isVisible = true;

        this.donorCells = [];
        this.antibodies = [];
        this.neutralProteins = [];
        this.lysisFragments = [];
        this.hemoglobinClouds = [];
        this.sparkRings = [];
        this.pins = [];

        this.clumpCenters = [
            new THREE.Vector3(-1.35, 0.35, 0.25),
            new THREE.Vector3(0.45, -0.35, -0.2),
            new THREE.Vector3(1.85, 0.28, 0.15)
        ];

        this._initScene();
        this._buildVesselChamber();
        this._buildSharedAssets();
        this._rebuildEntities();
        this._buildPins();
        this._setupResize();

        this.clock = new THREE.Clock();
        this._animate = this._animate.bind(this);
        this._animate();
    }

    CompatibilitySim.prototype._initScene = function () {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0b0d17, 0.042);

        const w = this.container.clientWidth || 640;
        const h = this.container.clientHeight || 480;
        this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 80);

        this.renderer = BioSimUtils.createRenderer(this.container);
        this.scene.environment = BioSimUtils.createLabEnvMap(this.renderer);

        // Dynamic Lighting Rig (shifts color temperature depending on good vs bad outcome)
        this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e0914, 0.85);
        this.scene.add(this.hemiLight);

        this.keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
        this.keyLight.position.set(4, 7, 7);
        this.scene.add(this.keyLight);

        this.moodLightLeft = new THREE.PointLight(0xef233c, 2.2, 20);
        this.moodLightLeft.position.set(-5.5, 2.2, 3.5);
        this.scene.add(this.moodLightLeft);

        this.moodLightRight = new THREE.PointLight(0x14b8a6, 2.2, 20);
        this.moodLightRight.position.set(5.5, 2.2, 3.5);
        this.scene.add(this.moodLightRight);

        this.orbit = new BioSimUtils.OrbitRig(this.camera, this.renderer.domElement, {
            theta: 0.12,
            phi: 1.44,
            radius: 8.6,
            minRadius: 2.6,
            maxRadius: 13.5,
            target: new THREE.Vector3(0, 0, 0),
            autoRotate: true,
            autoRotateSpeed: 0.08
        });
    };

    CompatibilitySim.prototype._buildVesselChamber = function () {
        this.vesselGroup = new THREE.Group();
        this.scene.add(this.vesselGroup);

        // Translucent scientific hematology vessel cylinder (open ends, subtle wall reflections)
        this.vesselWallMat = new THREE.MeshPhysicalMaterial({
            color: 0x3b1826,
            emissive: 0x240710,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.22,
            roughness: 0.22,
            side: THREE.BackSide,
            depthWrite: false
        });
        const vesselTube = new THREE.Mesh(
            new THREE.CylinderGeometry(3.25, 3.25, 13.5, 42, 1, true),
            this.vesselWallMat
        );
        vesselTube.rotation.z = Math.PI / 2;
        this.vesselGroup.add(vesselTube);

        // Subtle glowing circular structural rings inside the vessel for 3D depth perception
        this.vesselRings = [];
        for (let i = -2; i <= 2; i++) {
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.16
            });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.02, 10, 48), ringMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.x = i * 2.4;
            this.vesselGroup.add(ring);
            this.vesselRings.push(ringMat);
        }

        // Translucent center divider plane shown in 'ready' phase before mixing
        this.dividerMat = new THREE.MeshBasicMaterial({
            color: 0x2dd4bf,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.dividerDisc = new THREE.Mesh(new THREE.CircleGeometry(3.05, 40), this.dividerMat);
        this.dividerDisc.rotation.y = Math.PI / 2;
        this.vesselGroup.add(this.dividerDisc);

        // Ambient plasma dust / micro-nutrients flowing continuously in bloodstream
        const dustCount = 130;
        const pos = new Float32Array(dustCount * 3);
        this.dustMeta = [];
        for (let i = 0; i < dustCount; i++) {
            const x = (Math.random() - 0.5) * 12;
            const r = Math.sqrt(Math.random()) * 2.75;
            const a = Math.random() * Math.PI * 2;
            pos[i * 3] = x;
            pos[i * 3 + 1] = Math.cos(a) * r;
            pos[i * 3 + 2] = Math.sin(a) * r;
            this.dustMeta.push({ speed: 0.5 + Math.random() * 0.9, r: r, a: a });
        }
        const dustGeom = new THREE.BufferGeometry();
        dustGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.dustMat = new THREE.PointsMaterial({
            color: 0xfef3c7,
            size: 0.12,
            map: BioSimUtils.createGlowTexture('rgba(255,255,255,0.9)', 'rgba(251,191,36,0.35)', 'rgba(0,0,0,0)'),
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.plasmaDust = new THREE.Points(dustGeom, this.dustMat);
        this.vesselGroup.add(this.plasmaDust);
    };

    CompatibilitySim.prototype._buildSharedAssets = function () {
        this.rbcGeom = BioSimUtils.createRBCGeometry(0.46, 26, 14);
        this.fragGeom = new THREE.IcosahedronGeometry(0.11, 0);
        this.hemoGlowTex = BioSimUtils.createGlowTexture(
            'rgba(255, 110, 125, 0.9)',
            'rgba(217, 4, 41, 0.45)',
            'rgba(100, 0, 15, 0)'
        );
        this.sparkGlowTex = BioSimUtils.createGlowTexture(
            'rgba(255, 255, 255, 1)',
            'rgba(251, 146, 60, 0.7)',
            'rgba(239, 35, 60, 0)'
        );
        this.entityRoot = new THREE.Group();
        this.scene.add(this.entityRoot);
    };

    CompatibilitySim.prototype._clearEntities = function () {
        while (this.entityRoot.children.length > 0) {
            this.entityRoot.remove(this.entityRoot.children[0]);
        }
        this.donorCells = [];
        this.antibodies = [];
        this.neutralProteins = [];
        this.lysisFragments = [];
        this.hemoglobinClouds = [];
        this.sparkRings = [];
    };

    CompatibilitySim.prototype._createDonorRBC = function (index) {
        const donor = this.analysis.donor;
        const cellGroup = new THREE.Group();

        const rbcMat = new THREE.MeshPhysicalMaterial({
            color: 0xa80519,
            emissive: 0x3b0109,
            emissiveIntensity: 0.26,
            roughness: 0.30,
            metalness: 0.04,
            clearcoat: 0.50,
            clearcoatRoughness: 0.22,
            envMapIntensity: 0.42
        });
        const body = new THREE.Mesh(this.rbcGeom, rbcMat);
        cellGroup.add(body);

        // Attach surface antigens according to donor blood type
        const antigenTypes = [];
        if (donor.hasA) antigenTypes.push('A');
        if (donor.hasB) antigenTypes.push('B');
        if (donor.hasRh) antigenTypes.push('Rh');

        const antigenAnchors = [];
        if (antigenTypes.length > 0) {
            const totalMarkers = Math.min(18, antigenTypes.length * 6);
            for (let m = 0; m < totalMarkers; m++) {
                const kind = antigenTypes[m % antigenTypes.length];
                const marker = BioSimUtils.createAntigenMesh(kind, 1.12);
                // Place evenly around the outer rim and slightly upper/lower faces
                const ringAngle = (m / totalMarkers) * Math.PI * 2 + (index * 0.4);
                const elevation = ((m % 3) - 1) * 0.48;
                const nx = Math.cos(ringAngle) * Math.cos(elevation);
                const ny = Math.sin(elevation);
                const nz = Math.sin(ringAngle) * Math.cos(elevation);

                // Approximate surface radius on biconcave disc
                const surfR = Math.abs(elevation) > 0.2 ? 0.34 : 0.45;
                const px = nx * surfR;
                const py = ny * (Math.abs(elevation) > 0.2 ? 0.22 : 0.14);
                const pz = nz * surfR;

                marker.position.set(px, py, pz);
                const dir = new THREE.Vector3(nx, ny * 1.4, nz).normalize();
                marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                cellGroup.add(marker);
                antigenAnchors.push({ kind: kind, localPos: marker.position.clone(), dir: dir });
            }
        }

        // Initial left-side ready position (Donor side)
        const angle = (index / 12) * Math.PI * 2 + (index % 2) * 0.45;
        const rad = 0.45 + (index % 3) * 0.72;
        const startX = -3.8 + (index % 4) * 0.85 + (Math.random() - 0.5) * 0.35;
        const startY = Math.cos(angle) * rad;
        const startZ = Math.sin(angle) * rad;

        cellGroup.position.set(startX, startY, startZ);
        cellGroup.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.entityRoot.add(cellGroup);

        // Assign clump target for incompatible agglutination
        const clumpIdx = index % this.clumpCenters.length;
        const clumpOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 1.15,
            (Math.random() - 0.5) * 1.15,
            (Math.random() - 0.5) * 1.15
        );
        if (clumpOffset.length() > 0.92) clumpOffset.setLength(0.92);

        return {
            group: cellGroup,
            bodyMesh: body,
            mat: rbcMat,
            index: index,
            startPos: new THREE.Vector3(startX, startY, startZ),
            flowBaseY: startY,
            flowBaseZ: startZ,
            flowSpeed: 0.95 + Math.random() * 0.55,
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.9,
                (Math.random() - 0.5) * 0.9,
                (Math.random() - 0.5) * 0.9
            ),
            phaseOffset: Math.random() * Math.PI * 2,
            antigenAnchors: antigenAnchors,
            clumpIdx: clumpIdx,
            clumpOffset: clumpOffset,
            willLyse: index % 3 === 0, // ~1/3 of clumped cells visibly burst into hemolysis fragments!
            lysed: false,
            lysisTimer: 5.8 + (index % 5) * 0.65
        };
    };

    CompatibilitySim.prototype._rebuildEntities = function () {
        this._clearEntities();

        const analysis = this.analysis;
        const donorCount = 12;
        for (let i = 0; i < donorCount; i++) {
            this.donorCells.push(this._createDonorRBC(i));
        }

        // Determine antibodies to spawn in Recipient Plasma (Right side)
        const abSpecs = [];
        if (analysis.recipient.hasAntiA) {
            abSpecs.push({ kind: 'A', color: 0x38bdf8, emissive: 0x0284c7, isAttacking: analysis.donor.hasA });
        }
        if (analysis.recipient.hasAntiB) {
            abSpecs.push({ kind: 'B', color: 0xfbbf24, emissive: 0xd97706, isAttacking: analysis.donor.hasB });
        }
        if (!analysis.recipient.hasRh && analysis.donor.hasRh) {
            // Rh- recipient encountering Rh+ blood triggers Anti-Rh (Anti-D) reaction!
            abSpecs.push({ kind: 'Rh', color: 0xe879f9, emissive: 0xa21caf, isAttacking: true });
        }

        if (abSpecs.length > 0) {
            const totalAb = 18;
            for (let i = 0; i < totalAb; i++) {
                const spec = abSpecs[i % abSpecs.length];
                const mesh = BioSimUtils.createAntibodyMesh(spec.color, spec.emissive, 1.05);

                const ang = (i / totalAb) * Math.PI * 2;
                const rad = 0.5 + (i % 3) * 0.72;
                const startX = 1.45 + (i % 4) * 0.88 + (Math.random() - 0.5) * 0.35;
                const startY = Math.cos(ang) * rad;
                const startZ = Math.sin(ang) * rad;

                mesh.position.set(startX, startY, startZ);
                mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
                this.entityRoot.add(mesh);

                // Assign a target donor cell if this antibody matches a donor antigen
                let targetCell = null;
                let targetAnchor = null;
                if (spec.isAttacking && this.donorCells.length > 0) {
                    targetCell = this.donorCells[i % this.donorCells.length];
                    const matchingAnchors = targetCell.antigenAnchors.filter(function (a) { return a.kind === spec.kind; });
                    if (matchingAnchors.length > 0) {
                        targetAnchor = matchingAnchors[i % matchingAnchors.length];
                    }
                }

                this.antibodies.push({
                    mesh: mesh,
                    kind: spec.kind,
                    color: spec.color,
                    isAttacking: spec.isAttacking,
                    startPos: new THREE.Vector3(startX, startY, startZ),
                    driftSpeed: 0.7 + Math.random() * 0.55,
                    phase: Math.random() * Math.PI * 2,
                    targetCell: targetCell,
                    targetAnchor: targetAnchor,
                    locked: false,
                    sparkSpawned: false
                });
            }
        } else {
            // AB+ (Receptor Universal) has NO attacking ABO/Rh antibodies!
            // Spawn peaceful translucent albumin plasma spheres so the recipient side looks alive & clear.
            const protMat = new THREE.MeshPhysicalMaterial({
                color: 0x5eead4,
                emissive: 0x0d9488,
                emissiveIntensity: 0.25,
                roughness: 0.15,
                transparent: true,
                opacity: 0.65
            });
            const protGeom = new THREE.SphereGeometry(0.14, 14, 14);
            for (let i = 0; i < 14; i++) {
                const p = new THREE.Mesh(protGeom, protMat);
                const ang = (i / 14) * Math.PI * 2;
                const rad = 0.6 + (i % 3) * 0.68;
                p.position.set(1.5 + (i % 4) * 0.85, Math.cos(ang) * rad, Math.sin(ang) * rad);
                p.userData = { startPos: p.position.clone(), phase: Math.random() * 6.28, speed: 0.65 + Math.random() * 0.4 };
                this.entityRoot.add(p);
                this.neutralProteins.push(p);
            }
        }
    };

    CompatibilitySim.prototype._spawnBindingSpark = function (worldPos, colorHex) {
        const spriteMat = new THREE.SpriteMaterial({
            map: this.sparkGlowTex,
            color: colorHex || 0xff9f43,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.copy(worldPos);
        sprite.scale.setScalar(0.35);
        this.entityRoot.add(sprite);
        this.sparkRings.push({ sprite: sprite, age: 0, maxAge: 1.1 });
    };

    CompatibilitySim.prototype._triggerCellHemolysis = function (cell) {
        if (cell.lysed) return;
        cell.lysed = true;
        cell.group.visible = false;

        const origin = cell.group.position.clone();

        // Spawn 10 tumbling ruptured erythrocyte membrane fragments
        const fragMat = new THREE.MeshPhysicalMaterial({
            color: 0x991b1b,
            emissive: 0xef4444,
            emissiveIntensity: 0.45,
            roughness: 0.35
        });
        for (let i = 0; i < 10; i++) {
            const frag = new THREE.Mesh(this.fragGeom, fragMat);
            frag.position.copy(origin);
            frag.scale.set(0.8 + Math.random() * 0.9, 0.35 + Math.random() * 0.4, 0.7 + Math.random() * 0.8);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2.4,
                (Math.random() - 0.5) * 2.4,
                (Math.random() - 0.5) * 2.4
            );
            this.entityRoot.add(frag);
            this.lysisFragments.push({
                mesh: frag,
                vel: vel,
                rot: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
                age: 0
            });
        }

        // Spawn free Hemoglobin release cloud (glowing crimson mist)
        for (let j = 0; j < 4; j++) {
            const cloudMat = new THREE.SpriteMaterial({
                map: this.hemoGlowTex,
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const cloud = new THREE.Sprite(cloudMat);
            cloud.position.copy(origin).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            ));
            cloud.scale.setScalar(0.55);
            this.entityRoot.add(cloud);
            this.hemoglobinClouds.push({
                sprite: cloud,
                vel: new THREE.Vector3((Math.random() - 0.3) * 0.5, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35),
                age: 0
            });
        }
    };

    CompatibilitySim.prototype._buildPins = function () {
        if (!this.pinsContainer) return;
        this.pinsContainer.innerHTML = '';

        const makePin = function (cls) {
            const div = document.createElement('div');
            div.className = 'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-lg backdrop-blur-md whitespace-nowrap transition-opacity duration-200 ' + cls;
            div.style.display = 'none';
            return div;
        };

        this.pinDonor = makePin('border-hemo-500/80 bg-slate-900/90 text-rose-200');
        this.pinRecipient = makePin('border-sky-400/80 bg-slate-900/90 text-sky-200');
        this.pinReaction = makePin('border-amber-400/90 bg-slate-900/95 text-amber-200');

        this.pinsContainer.appendChild(this.pinDonor);
        this.pinsContainer.appendChild(this.pinRecipient);
        this.pinsContainer.appendChild(this.pinReaction);
    };

    CompatibilitySim.prototype._updatePins = function () {
        if (!this.showLabels) {
            this.pinDonor.style.display = 'none';
            this.pinRecipient.style.display = 'none';
            this.pinReaction.style.display = 'none';
            return;
        }

        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        const place = function (el, worldPos, text) {
            if (!worldPos) { el.style.display = 'none'; return; }
            const p = BioSimUtils.projectToScreen(worldPos, this.camera, w, h);
            if (p.visible && p.x > 20 && p.x < w - 20 && p.y > 20 && p.y < h - 20) {
                const safeX = Math.max(96, Math.min(w - 96, p.x));
                const safeY = Math.max(106, Math.min(h - 102, p.y));
                el.style.display = 'block';
                el.style.left = safeX + 'px';
                el.style.top = safeY + 'px';
                el.textContent = text;
            } else {
                el.style.display = 'none';
            }
        }.bind(this);

        if (this.phase === 'ready') {
            const firstCell = this.donorCells[0];
            place(this.pinDonor, firstCell ? firstCell.group.position.clone().add(new THREE.Vector3(0, 0.72, 0)) : null, '🩸 Hemácia Doadora (' + this.donorType + ')');

            const firstAb = this.antibodies[0];
            if (firstAb) {
                place(this.pinRecipient, firstAb.mesh.position.clone().add(new THREE.Vector3(0, 0.55, 0)), '🧬 Anticorpo ' + (firstAb.kind === 'Rh' ? 'Anti-Rh' : 'Anti-' + firstAb.kind) + ' (' + this.recipientType + ')');
            } else if (this.neutralProteins[0]) {
                place(this.pinRecipient, this.neutralProteins[0].position.clone().add(new THREE.Vector3(0, 0.5, 0)), '✨ Plasma ' + this.recipientType + ' (Sem anticorpos anti-ABO/Rh)');
            } else {
                this.pinRecipient.style.display = 'none';
            }
            this.pinReaction.style.display = 'none';
        } else if (this.analysis.isCompatible) {
            const cell = this.donorCells[1];
            place(this.pinDonor, cell ? cell.group.position.clone().add(new THREE.Vector3(0, 0.7, 0)) : null, '✅ Fluxo Saudável (' + this.donorType + ' ➔ ' + this.recipientType + ')');
            const ab = this.antibodies[0];
            if (ab) {
                place(this.pinRecipient, ab.mesh.position.clone().add(new THREE.Vector3(0, 0.52, 0)), 'Anticorpo passa livre (sem encaixe)');
            } else {
                this.pinRecipient.style.display = 'none';
            }
            this.pinReaction.style.display = 'none';
        } else {
            // Incompatible: highlight agglutination clump + hemolysis!
            this.pinDonor.style.display = 'none';
            if (this.phaseTime > 1.8) {
                place(this.pinReaction, this.clumpCenters[0].clone().add(new THREE.Vector3(0, 1.15, 0)), '⚠️ Aglutinação (Grumo de Hemácias)');
            } else {
                this.pinReaction.style.display = 'none';
            }
            if (this.phaseTime > 5.8) {
                place(this.pinRecipient, this.clumpCenters[2].clone().add(new THREE.Vector3(0, 1.05, 0)), '💥 Hemólise (Rompimento Celular)');
            } else if (this.phaseTime > 1.2) {
                place(this.pinRecipient, this.clumpCenters[1].clone().add(new THREE.Vector3(0, -1.0, 0)), '🔗 Ligação Antígeno–Anticorpo!');
            } else {
                this.pinRecipient.style.display = 'none';
            }
        }
    };

    CompatibilitySim.prototype._setupResize = function () {
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

    CompatibilitySim.prototype.setTypes = function (donorType, recipientType, autoStart) {
        if (donorType) this.donorType = donorType;
        if (recipientType) this.recipientType = recipientType;
        this.analysis = analyzeTransfusion(this.donorType, this.recipientType);
        this.phase = 'ready';
        this.phaseTime = 0;
        this._rebuildEntities();
        this._resetLighting();
        if (autoStart) {
            this.startMix();
        } else {
            this.orbit.flyTo(0.12, 1.44, 8.6, new THREE.Vector3(0, 0, 0));
            this.onStateChange(this.getSnapshot());
        }
    };

    CompatibilitySim.prototype.startMix = function () {
        if (this.phase !== 'ready') {
            this._rebuildEntities();
        }
        this.phase = 'mixing';
        this.phaseTime = 0;
        this.orbit.flyTo(0.24, 1.38, 7.8, new THREE.Vector3(0.2, 0, 0));
        this.onStateChange(this.getSnapshot());
    };

    CompatibilitySim.prototype.reset = function () {
        this.phase = 'ready';
        this.phaseTime = 0;
        this._rebuildEntities();
        this._resetLighting();
        this.orbit.flyTo(0.12, 1.44, 8.6, new THREE.Vector3(0, 0, 0));
        this.onStateChange(this.getSnapshot());
    };

    CompatibilitySim.prototype.setCameraView = function (preset) {
        if (preset === 'macro') {
            const focusCell = this.donorCells.find(function (c) { return !c.lysed; }) || this.donorCells[0];
            const target = focusCell ? focusCell.group.position.clone() : new THREE.Vector3(0, 0, 0);
            this.orbit.flyTo(0.5, 1.25, 3.1, target);
        } else {
            this.orbit.flyTo(0.16, 1.42, 8.4, new THREE.Vector3(0, 0, 0));
        }
    };

    CompatibilitySim.prototype.toggleLabels = function () {
        this.showLabels = !this.showLabels;
        this.onStateChange(this.getSnapshot());
    };

    CompatibilitySim.prototype.zoomBy = function (delta) {
        this.orbit.zoomBy(delta);
    };

    CompatibilitySim.prototype.resetCamera = function () {
        this.setCameraView('overview');
    };

    CompatibilitySim.prototype.setActive = function (active) {
        this.isActive = active;
        if (active) {
            this.clock.getDelta();
        }
    };

    CompatibilitySim.prototype.setVisible = function (visible) {
        this.isVisible = visible;
        if (visible) {
            this.clock.getDelta();
        }
    };

    CompatibilitySim.prototype._resetLighting = function () {
        this.moodLightLeft.color.setHex(0xef233c);
        this.moodLightRight.color.setHex(0x14b8a6);
        this.vesselWallMat.color.setHex(0x3b1826);
        this.vesselWallMat.emissive.setHex(0x240710);
        this.vesselRings.forEach(function (m) { m.color.setHex(0x38bdf8); m.opacity = 0.16; });
    };

    CompatibilitySim.prototype.getSnapshot = function () {
        let stageText = 'Pronto para misturar: observe os antígenos na hemácia doadora (esq.) e os anticorpos no plasma receptor (dir.).';
        if (this.phase !== 'ready') {
            if (this.analysis.isCompatible) {
                if (this.phaseTime < 1.8) stageText = 'Infundindo hemácias ' + this.donorType + ' na corrente sanguínea do receptor ' + this.recipientType + '...';
                else stageText = 'Compatível! As hemácias circulam perfeitamente sem ataque dos anticorpos.';
            } else {
                if (this.phaseTime < 1.8) stageText = 'Misturando sangues... Anticorpos do receptor detectam antígenos estranhos!';
                else if (this.phaseTime < 5.6) stageText = 'ALERTA: Ligação Antígeno–Anticorpo em curso! Hemácias estão se aglutinando em grumos!';
                else stageText = 'REAÇÃO GRAVE: Aglutinação intensa + Hemólise (rompimento celular com liberação de hemoglobina)!';
            }
        }

        return {
            donorType: this.donorType,
            recipientType: this.recipientType,
            phase: this.phase,
            phaseTime: this.phaseTime,
            showLabels: this.showLabels,
            stageText: stageText,
            analysis: this.analysis
        };
    };

    CompatibilitySim.prototype._animate = function () {
        requestAnimationFrame(this._animate);
        if (!this.isActive || !this.isVisible) return;

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const now = this.clock.elapsedTime;

        // Ambient plasma dust flows rightwards
        const dustPos = this.plasmaDust.geometry.attributes.position;
        const dustRate = (this.phase !== 'ready' && !this.analysis.isCompatible && this.phaseTime > 3.5) ? 0.25 : 1.0;
        for (let i = 0; i < this.dustMeta.length; i++) {
            let x = dustPos.getX(i) + this.dustMeta[i].speed * dt * dustRate;
            if (x > 6.2) x = -6.2;
            dustPos.setX(i, x);
        }
        dustPos.needsUpdate = true;

        if (this.phase === 'ready') {
            this.dividerDisc.visible = true;
            this.dividerMat.opacity = 0.16 + 0.08 * Math.sin(now * 2.5);

            // Gentle floating on Donor (left) and Recipient (right) sides
            for (let i = 0; i < this.donorCells.length; i++) {
                const c = this.donorCells[i];
                c.group.position.y = c.startPos.y + Math.sin(now * 1.4 + c.phaseOffset) * 0.12;
                c.group.rotation.x += c.rotSpeed.x * dt * 0.5;
                c.group.rotation.y += c.rotSpeed.y * dt * 0.6;
            }
            for (let i = 0; i < this.antibodies.length; i++) {
                const ab = this.antibodies[i];
                ab.mesh.position.y = ab.startPos.y + Math.sin(now * 1.6 + ab.phase) * 0.14;
                ab.mesh.rotation.y += dt * 0.65;
                ab.mesh.rotation.z += dt * 0.35;
            }
            for (let i = 0; i < this.neutralProteins.length; i++) {
                const p = this.neutralProteins[i];
                p.position.y = p.userData.startPos.y + Math.sin(now * 1.5 + p.userData.phase) * 0.14;
            }
        } else {
            const prevTime = this.phaseTime;
            this.phaseTime += dt;
            this.dividerDisc.visible = false;

            // Fire UI state updates at key reaction milestones
            if (
                (prevTime < 1.8 && this.phaseTime >= 1.8) ||
                (prevTime < 5.6 && this.phaseTime >= 5.6)
            ) {
                this.onStateChange(this.getSnapshot());
            }

            if (this.analysis.isCompatible) {
                // ======================================================
                // COMPATIBLE ("BOM"): Healthy, smooth laminar flow!
                // ======================================================
                this.moodLightLeft.color.lerp(new THREE.Color(0x14b8a6), dt * 2.2);
                this.moodLightRight.color.lerp(new THREE.Color(0x22c55e), dt * 2.2);
                this.vesselRings.forEach(function (m) {
                    m.color.lerp(new THREE.Color(0x2dd4bf), dt * 2.5);
                    m.opacity = 0.24;
                });

                for (let i = 0; i < this.donorCells.length; i++) {
                    const c = this.donorCells[i];
                    c.group.position.x += c.flowSpeed * dt * 1.35;
                    if (c.group.position.x > 5.4) c.group.position.x = -5.4;
                    c.group.position.y = c.flowBaseY + Math.sin(now * 1.6 + c.phaseOffset) * 0.22;
                    c.group.position.z = c.flowBaseZ + Math.cos(now * 1.3 + c.phaseOffset) * 0.18;
                    c.group.rotation.x += c.rotSpeed.x * dt * 0.7;
                    c.group.rotation.y += c.rotSpeed.y * dt * 0.85;
                    // Vibrant healthy oxygenated ruby glow
                    c.mat.color.lerp(new THREE.Color(0xb80820), dt * 2.0);
                    c.mat.emissiveIntensity = 0.28 + 0.07 * Math.sin(now * 3 + c.phaseOffset);
                }

                // Non-matching antibodies drift peacefully without binding
                for (let i = 0; i < this.antibodies.length; i++) {
                    const ab = this.antibodies[i];
                    ab.mesh.position.x -= ab.driftSpeed * dt * 0.85;
                    if (ab.mesh.position.x < -5.2) ab.mesh.position.x = 5.2;
                    ab.mesh.position.y += Math.sin(now * 1.8 + ab.phase) * dt * 0.28;
                    ab.mesh.rotation.y += dt * 0.8;
                    ab.mesh.rotation.x += dt * 0.4;
                }

                for (let i = 0; i < this.neutralProteins.length; i++) {
                    const p = this.neutralProteins[i];
                    p.position.x -= p.userData.speed * dt * 0.7;
                    if (p.position.x < -5.0) p.position.x = 5.0;
                }
            } else {
                // ======================================================
                // INCOMPATIBLE ("RUIM"): Binding -> Agglutination -> Hemolysis!
                // ======================================================
                const pulse = 0.5 + 0.5 * Math.sin(now * 5.0);
                this.moodLightLeft.color.lerp(new THREE.Color(0xdc2626), dt * 2.5);
                this.moodLightRight.color.lerp(new THREE.Color(0xf97316), dt * 2.5);
                this.vesselWallMat.color.lerp(new THREE.Color(0x590d22), dt * 1.8);
                this.vesselRings.forEach(function (m) {
                    m.color.lerp(new THREE.Color(0xef233c), dt * 3.0);
                    m.opacity = 0.22 + pulse * 0.2;
                });

                const t = this.phaseTime;
                const agglStrength = Math.max(0, Math.min(1, (t - 1.4) / 2.6));

                // Update Donor Cells: move into clump centers, darken/bruise, tremble, and lyse!
                for (let i = 0; i < this.donorCells.length; i++) {
                    const c = this.donorCells[i];
                    if (c.lysed) continue;

                    const center = this.clumpCenters[c.clumpIdx];
                    // Slowly tumble clump offsets as a whole cluster
                    const rotAng = now * 0.35 * (c.clumpIdx % 2 === 0 ? 1 : -1);
                    const rx = c.clumpOffset.x * Math.cos(rotAng) - c.clumpOffset.z * Math.sin(rotAng);
                    const rz = c.clumpOffset.x * Math.sin(rotAng) + c.clumpOffset.z * Math.cos(rotAng);
                    const targetPos = new THREE.Vector3(
                        center.x + rx * (1.25 - agglStrength * 0.48),
                        center.y + c.clumpOffset.y * (1.25 - agglStrength * 0.48),
                        center.z + rz * (1.25 - agglStrength * 0.48)
                    );

                    const lerpRate = t < 1.4 ? dt * 1.3 : dt * (2.2 + agglStrength * 2.0);
                    c.group.position.lerp(targetPos, Math.min(1, lerpRate));

                    // Agitated vibration once antibodies attack
                    if (t > 1.8) {
                        const shake = 0.025 * agglStrength;
                        c.group.position.x += (Math.random() - 0.5) * shake;
                        c.group.position.y += (Math.random() - 0.5) * shake;
                    }

                    c.group.rotation.x += c.rotSpeed.x * dt * (1 - agglStrength * 0.65);
                    c.group.rotation.y += c.rotSpeed.y * dt * (1 - agglStrength * 0.65);

                    // Darken color into damaged/agglutinated venous burgundy & swell before lysis
                    c.mat.color.lerp(new THREE.Color(0x6b0214), dt * 0.9);
                    if (c.willLyse && t > c.lysisTimer - 1.1) {
                        const pre = Math.max(0, 1 - (c.lysisTimer - t) / 1.1);
                        c.group.scale.setScalar(1.0 + pre * 0.34);
                        c.mat.emissive.setHex(0xff3b30);
                        c.mat.emissiveIntensity = 0.4 + pre * 1.5;
                    }
                    if (c.willLyse && t >= c.lysisTimer) {
                        this._triggerCellHemolysis(c);
                    }
                }

                // Update Antibodies: attacking ones lock onto donor RBC antigens & cross-link clumps!
                for (let i = 0; i < this.antibodies.length; i++) {
                    const ab = this.antibodies[i];
                    if (ab.isAttacking && ab.targetCell && !ab.targetCell.lysed && ab.targetAnchor) {
                        const cell = ab.targetCell;
                        const worldAnchor = ab.targetAnchor.localPos.clone().applyMatrix4(cell.group.matrixWorld);
                        const worldNormal = ab.targetAnchor.dir.clone().transformDirection(cell.group.matrixWorld).normalize();
                        const dockPos = worldAnchor.clone().addScaledVector(worldNormal, 0.24);

                        ab.mesh.position.lerp(dockPos, Math.min(1, dt * (2.2 + agglStrength * 4.5)));
                        // Orient Y-arms pointing inward onto the antigen!
                        const targetQuat = new THREE.Quaternion().setFromUnitVectors(
                            new THREE.Vector3(0, 1, 0),
                            worldNormal.clone().negate()
                        );
                        ab.mesh.quaternion.slerp(targetQuat, Math.min(1, dt * 5.0));

                        if (!ab.sparkSpawned && ab.mesh.position.distanceTo(dockPos) < 0.45) {
                            ab.sparkSpawned = true;
                            this._spawnBindingSpark(worldAnchor, ab.color);
                        }
                    } else {
                        // Non-matching bystander antibody or after its target cell lysed
                        ab.mesh.position.x -= ab.driftSpeed * dt * 0.45;
                        if (ab.mesh.position.x < -5.2) ab.mesh.position.x = 5.2;
                        ab.mesh.rotation.y += dt * 0.7;
                    }
                }
            }

            // Update binding sparks
            for (let i = this.sparkRings.length - 1; i >= 0; i--) {
                const sp = this.sparkRings[i];
                sp.age += dt;
                const k = sp.age / sp.maxAge;
                if (k >= 1) {
                    this.entityRoot.remove(sp.sprite);
                    this.sparkRings.splice(i, 1);
                } else {
                    sp.sprite.scale.setScalar(0.35 + k * 1.1);
                    sp.sprite.material.opacity = (1 - k) * 0.95;
                }
            }

            // Update hemolysis ruptured fragments
            for (let i = 0; i < this.lysisFragments.length; i++) {
                const f = this.lysisFragments[i];
                f.age += dt;
                f.mesh.position.addScaledVector(f.vel, dt);
                f.vel.multiplyScalar(0.975);
                f.mesh.rotation.x += f.rot.x * dt;
                f.mesh.rotation.y += f.rot.y * dt;
            }

            // Update free hemoglobin clouds
            for (let i = 0; i < this.hemoglobinClouds.length; i++) {
                const hc = this.hemoglobinClouds[i];
                hc.age += dt;
                hc.sprite.position.addScaledVector(hc.vel, dt);
                const s = 0.55 + Math.min(2.6, hc.age * 0.55);
                hc.sprite.scale.setScalar(s);
                hc.sprite.material.opacity = Math.max(0.14, 0.72 - hc.age * 0.08);
            }
        }

        this.orbit.update(dt);
        this.renderer.render(this.scene, this.camera);
        this._updatePins();
    };

    CompatibilitySim.BLOOD_TYPES = BLOOD_TYPES;
    CompatibilitySim.analyzeTransfusion = analyzeTransfusion;
    global.CompatibilitySim = CompatibilitySim;
})(window);
