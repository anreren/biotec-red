/**
 * HEMOBIO UFPA — Controlador do Laboratório 3D Interativo
 * Conecta as abas, controles, telemetria, cards científicos, IntersectionObserver
 * e atalhos das outras seções do site às simulações Three.js.
 */
(function (global) {
    'use strict';

    function initLab3D() {
        const labSection = document.getElementById('simulacoes-3d');
        if (!labSection) return;

        // Check WebGL availability
        if (!global.THREE || !global.BioSimUtils || !BioSimUtils.isWebGLAvailable()) {
            const fallback = document.getElementById('lab3d-webgl-fallback');
            const stage = document.getElementById('lab3d-main-stage');
            if (fallback) fallback.classList.remove('hidden');
            if (stage) stage.classList.add('hidden');
            return;
        }

        let activeTab = 'centrifuga'; // 'centrifuga' | 'compatibilidade'
        let centrifugeSim = null;
        let compatSim = null;
        let isSectionVisible = true;

        // ============================================================
        // 1. TAB SWITCHER
        // ============================================================
        const tabCentrifuga = document.getElementById('tab-btn-centrifuga');
        const tabCompat = document.getElementById('tab-btn-compatibilidade');
        const panelCentrifuga = document.getElementById('panel-centrifuga');
        const panelCompat = document.getElementById('panel-compatibilidade');

        function switchLabTab(tabName) {
            activeTab = tabName;
            const isCent = tabName === 'centrifuga';

            panelCentrifuga.classList.toggle('hidden', !isCent);
            panelCompat.classList.toggle('hidden', isCent);

            if (isCent) {
                tabCentrifuga.className = 'lab-tab-btn flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-biotech-500 bg-biotech-500/15 text-white shadow-glow-teal transition-all text-left cursor-pointer';
                tabCompat.className = 'lab-tab-btn flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-left cursor-pointer';
            } else {
                tabCompat.className = 'lab-tab-btn flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-hemo-500 bg-hemo-500/15 text-white shadow-glow-red transition-all text-left cursor-pointer';
                tabCentrifuga.className = 'lab-tab-btn flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-left cursor-pointer';
            }

            if (centrifugeSim) centrifugeSim.setActive(isCent);
            if (compatSim) {
                compatSim.setActive(!isCent);
                // Force resize check once panel becomes visible
                if (!isCent) {
                    setTimeout(function () {
                        const c = document.getElementById('compat-canvas-container');
                        if (c && c.clientWidth && c.clientHeight) {
                            compatSim.camera.aspect = c.clientWidth / c.clientHeight;
                            compatSim.camera.updateProjectionMatrix();
                            compatSim.renderer.setSize(c.clientWidth, c.clientHeight);
                        }
                    }, 30);
                }
            }
        }

        tabCentrifuga.addEventListener('click', function () { switchLabTab('centrifuga'); });
        tabCompat.addEventListener('click', function () { switchLabTab('compatibilidade'); });

        // ============================================================
        // 2. INIT SIMULATION 1: CENTRIFUGAÇÃO 3D
        // ============================================================
        const centRpmEl = document.getElementById('cent-hud-rpm');
        const centRcfEl = document.getElementById('cent-hud-rcf');
        const centStatusDot = document.getElementById('cent-hud-dot');
        const centProgressBar = document.getElementById('cent-progress-bar');
        const centProgressPct = document.getElementById('cent-progress-pct');
        const centPhaseText = document.getElementById('cent-phase-text');

        const btnCentStart = document.getElementById('btn-cent-start');
        const btnCentFast = document.getElementById('btn-cent-fast');
        const btnCentReset = document.getElementById('btn-cent-reset');
        const btnCentViewMach = document.getElementById('btn-cent-view-machine');
        const btnCentViewTube = document.getElementById('btn-cent-view-tube');
        const btnCentExplode = document.getElementById('btn-cent-explode');

        const centPreCard = document.getElementById('cent-pre-card');
        const centResultsPanel = document.getElementById('cent-results-panel');
        const centLayerDetail = document.getElementById('cent-layer-detail');
        const centLayerBtns = document.querySelectorAll('.cent-layer-btn');

        function renderCentrifugeLayerDetail(info) {
            if (!info) return;
            const utilitiesHtml = info.utilities.map(function (u) {
                return '<li class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">' +
                    '<span class="mt-0.5 w-4 h-4 rounded-full bg-biotech-500/20 text-biotech-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>' +
                    '<span>' + u + '</span>' +
                    '</li>';
            }).join('');

            centLayerDetail.innerHTML =
                '<div class="space-y-4">' +
                    '<div>' +
                        '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ' + info.badgeClass + '">' +
                            '<span class="w-2 h-2 rounded-full" style="background:' + info.dotColor + '"></span>' +
                            info.badge +
                        '</span>' +
                        '<h4 class="font-display font-extrabold text-xl text-white mt-2.5">' + info.title + '</h4>' +
                        '<p class="text-xs text-slate-400 mt-0.5">' + info.subtitle + '</p>' +
                    '</div>' +
                    '<div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/70">' +
                        '<div class="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-1">🔬 Composição Biológica</div>' +
                        '<p class="text-xs sm:text-sm text-slate-300 leading-relaxed">' + info.composition + '</p>' +
                    '</div>' +
                    '<div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/70">' +
                        '<div class="text-[11px] font-bold uppercase tracking-wider text-biotech-400 mb-2">🏥 Utilidade Clínica (Para Que Serve)</div>' +
                        '<ul class="space-y-2">' + utilitiesHtml + '</ul>' +
                    '</div>' +
                    '<div class="flex items-center gap-2.5 p-3 rounded-xl bg-biotech-500/10 border border-biotech-500/25 text-xs text-biotech-200">' +
                        '<span class="text-base shrink-0">❄️</span>' +
                        '<span><strong>Conservação:</strong> ' + info.storage + '</span>' +
                    '</div>' +
                '</div>';

            centLayerBtns.forEach(function (btn) {
                const isSel = btn.dataset.layer === info.id;
                if (isSel) {
                    btn.classList.add('ring-2', 'ring-white', 'bg-slate-700/90', 'border-white/60');
                    btn.classList.remove('bg-slate-900/70', 'border-slate-700/80');
                } else {
                    btn.classList.remove('ring-2', 'ring-white', 'bg-slate-700/90', 'border-white/60');
                    btn.classList.add('bg-slate-900/70', 'border-slate-700/80');
                }
            });
        }

        function updateCentrifugeUI(snap) {
            centRpmEl.textContent = snap.rpm.toLocaleString('pt-BR') + ' RPM';
            centRcfEl.textContent = snap.rcf.toLocaleString('pt-BR') + ' × g';
            const pct = Math.round(snap.progress * 100);
            centProgressBar.style.width = pct + '%';
            centProgressPct.textContent = pct + '%';
            centPhaseText.textContent = snap.phaseLabel;

            if (snap.state === 'spinning') {
                centStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping';
                btnCentStart.innerHTML = snap.isPaused ? '<span>▶ Continuar Centrifugação</span>' : '<span>⏸ Pausar Rotação</span>';
            } else if (snap.state === 'complete') {
                centStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
                btnCentStart.innerHTML = '<span>↻ Centrifugar Novamente</span>';
            } else {
                centStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-biotech-400 animate-pulse';
                btnCentStart.innerHTML = '<span>▶ Iniciar Centrifugação</span>';
            }

            // Enable/disable view toggle buttons
            const done = snap.state === 'complete';
            btnCentViewTube.disabled = !done;
            btnCentExplode.disabled = !done;
            btnCentViewTube.classList.toggle('opacity-40', !done);
            btnCentExplode.classList.toggle('opacity-40', !done);
            btnCentViewTube.classList.toggle('cursor-not-allowed', !done);
            btnCentExplode.classList.toggle('cursor-not-allowed', !done);

            if (snap.viewMode === 'tube' && done) {
                btnCentViewTube.classList.add('bg-biotech-600', 'text-white');
                btnCentViewTube.classList.remove('bg-slate-800/80', 'text-slate-300');
                btnCentViewMach.classList.remove('bg-biotech-600', 'text-white');
                btnCentViewMach.classList.add('bg-slate-800/80', 'text-slate-300');
            } else {
                btnCentViewMach.classList.add('bg-biotech-600', 'text-white');
                btnCentViewMach.classList.remove('bg-slate-800/80', 'text-slate-300');
                btnCentViewTube.classList.remove('bg-biotech-600', 'text-white');
                btnCentViewTube.classList.add('bg-slate-800/80', 'text-slate-300');
            }

            if (snap.exploded) {
                btnCentExplode.classList.add('bg-amber-500', 'text-slate-950');
                btnCentExplode.classList.remove('bg-slate-800/80', 'text-slate-200');
                btnCentExplode.textContent = '⊟ Unir Camadas';
            } else {
                btnCentExplode.classList.remove('bg-amber-500', 'text-slate-950');
                btnCentExplode.classList.add('bg-slate-800/80', 'text-slate-200');
                btnCentExplode.textContent = '⊞ Expandir Camadas';
            }

            // Show rich component details panel upon completion!
            centPreCard.classList.toggle('hidden', done);
            centResultsPanel.classList.toggle('hidden', !done);
        }

        centrifugeSim = new CentrifugeSim({
            container: document.getElementById('centrifuge-canvas-container'),
            pinsContainer: document.getElementById('centrifuge-pins'),
            onStateChange: updateCentrifugeUI,
            onLayerSelect: renderCentrifugeLayerDetail
        });
        updateCentrifugeUI(centrifugeSim.getSnapshot());

        btnCentStart.addEventListener('click', function () {
            if (centrifugeSim.state === 'spinning') {
                centrifugeSim.togglePause();
            } else {
                centrifugeSim.startSpin();
            }
        });
        btnCentFast.addEventListener('click', function () { centrifugeSim.jumpToResult(); });
        btnCentReset.addEventListener('click', function () { centrifugeSim.reset(); });
        btnCentViewMach.addEventListener('click', function () { centrifugeSim.setViewMode('centrifuge'); });
        btnCentViewTube.addEventListener('click', function () { centrifugeSim.setViewMode('tube'); });
        btnCentExplode.addEventListener('click', function () { centrifugeSim.toggleExploded(); });

        document.getElementById('cent-zoom-in').addEventListener('click', function () { centrifugeSim.zoomBy(-0.9); });
        document.getElementById('cent-zoom-out').addEventListener('click', function () { centrifugeSim.zoomBy(0.9); });
        document.getElementById('cent-zoom-reset').addEventListener('click', function () { centrifugeSim.resetCamera(); });

        centLayerBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (centrifugeSim.state !== 'complete') {
                    centrifugeSim.jumpToResult();
                }
                centrifugeSim.selectLayer(btn.dataset.layer);
            });
        });

        // ============================================================
        // 3. INIT SIMULATION 2: COMPATIBILIDADE SANGUÍNEA 3D
        // ============================================================
        const donorBtns = document.querySelectorAll('.compat-donor-btn');
        const recipientBtns = document.querySelectorAll('.compat-recipient-btn');
        const donorChipsEl = document.getElementById('compat-donor-chips');
        const recipientChipsEl = document.getElementById('compat-recipient-chips');
        const compatMatchLabel = document.getElementById('compat-hud-match');
        const compatStatusPill = document.getElementById('compat-hud-status');
        const compatStageText = document.getElementById('compat-stage-text');
        const compatResultBox = document.getElementById('compat-result-box');

        const btnCompatMix = document.getElementById('btn-compat-mix');
        const btnCompatReset = document.getElementById('btn-compat-reset');
        const btnCompatOverview = document.getElementById('btn-compat-view-overview');
        const btnCompatMacro = document.getElementById('btn-compat-view-macro');
        const btnCompatLabels = document.getElementById('btn-compat-labels');

        function renderChips(items, emptyText) {
            if (!items || items.length === 0) {
                return '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">' + emptyText + '</span>';
            }
            return items.map(function (it) {
                return '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-100">' +
                    '<span class="w-2 h-2 rounded-full" style="background:' + it.color + '"></span>' +
                    it.label +
                '</span>';
            }).join('');
        }

        function updateCompatUI(snap) {
            const a = snap.analysis;
            compatMatchLabel.innerHTML =
                '<span class="text-rose-300">Doador ' + snap.donorType + '</span>' +
                '<span class="text-slate-400 mx-1.5">➔</span>' +
                '<span class="text-sky-300">Receptor ' + snap.recipientType + '</span>';

            compatStageText.textContent = snap.stageText;
            donorChipsEl.innerHTML = renderChips(a.donorAntigens, 'Nenhum antígeno A, B ou Rh (superfície lisa)');
            recipientChipsEl.innerHTML = renderChips(a.recipientAntibodies, 'Nenhum anticorpo Anti-A, Anti-B ou Anti-Rh');

            // Update blood type buttons active styling
            donorBtns.forEach(function (btn) {
                const active = btn.dataset.blood === snap.donorType;
                btn.className = active
                    ? 'compat-donor-btn py-2 rounded-xl font-display font-extrabold text-xs sm:text-sm border-2 border-hemo-500 bg-hemo-600 text-white shadow-glow-red transition-all cursor-pointer'
                    : 'compat-donor-btn py-2 rounded-xl font-display font-bold text-xs sm:text-sm border border-slate-700 bg-slate-900/80 text-slate-300 hover:border-hemo-500/70 hover:text-white transition-all cursor-pointer';
            });
            recipientBtns.forEach(function (btn) {
                const active = btn.dataset.blood === snap.recipientType;
                btn.className = active
                    ? 'compat-recipient-btn py-2 rounded-xl font-display font-extrabold text-xs sm:text-sm border-2 border-sky-400 bg-sky-600 text-white shadow-lg transition-all cursor-pointer'
                    : 'compat-recipient-btn py-2 rounded-xl font-display font-bold text-xs sm:text-sm border border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-400/70 hover:text-white transition-all cursor-pointer';
            });

            btnCompatLabels.textContent = snap.showLabels ? '🏷️ Rótulos: ON' : '🏷️ Rótulos: OFF';

            // HUD status pill & outcome detail card
            if (snap.phase === 'ready') {
                compatStatusPill.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-600';
                compatStatusPill.textContent = 'Pronto para misturar';
                btnCompatMix.innerHTML = '<span>🧪 Misturar Sangues em 3D</span>';

                compatResultBox.className = 'p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 transition-all';
                compatResultBox.innerHTML =
                    '<div class="flex items-start gap-3">' +
                        '<span class="text-2xl">🔬</span>' +
                        '<div>' +
                            '<h4 class="font-display font-bold text-sm text-white">Pronto para Simular (' + snap.donorType + ' ➔ ' + snap.recipientType + ')</h4>' +
                            '<p class="text-xs text-slate-300 mt-1 leading-relaxed">Clique em <strong>"Misturar Sangues em 3D"</strong> para observar em tempo real se os anticorpos do receptor aceitam ou atacam as hemácias do doador.</p>' +
                        '</div>' +
                    '</div>';
            } else if (a.isCompatible) {
                compatStatusPill.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/50';
                compatStatusPill.textContent = '✅ Compatível (Seguro)';
                btnCompatMix.innerHTML = '<span>↻ Repetir Mistura</span>';

                compatResultBox.className = 'p-4 rounded-2xl bg-emerald-950/50 border-2 border-emerald-500/50 transition-all';
                compatResultBox.innerHTML = buildOutcomeHTML(a, true);
            } else {
                compatStatusPill.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-hemo-600/30 text-rose-200 border border-hemo-500 animate-pulse';
                compatStatusPill.textContent = '⚠️ Incompatível (Perigo)';
                btnCompatMix.innerHTML = '<span>↻ Repetir Mistura</span>';

                compatResultBox.className = 'p-4 rounded-2xl bg-rose-950/60 border-2 border-hemo-500/70 transition-all';
                compatResultBox.innerHTML = buildOutcomeHTML(a, false);
            }
        }

        function buildOutcomeHTML(analysis, isGood) {
            const titleColor = isGood ? 'text-emerald-300' : 'text-rose-300';
            const badgeBg = isGood ? 'bg-emerald-500/20 text-emerald-200' : 'bg-hemo-600/30 text-rose-200';
            const effectsHtml = analysis.effects.map(function (ef) {
                return '<div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-white/5">' +
                    '<span class="text-base leading-none mt-0.5">' + ef.icon + '</span>' +
                    '<div>' +
                        '<div class="font-bold text-xs text-white">' + ef.title + '</div>' +
                        '<div class="text-[11px] text-slate-300 leading-relaxed mt-0.5">' + ef.text + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');

            return '<div class="space-y-3">' +
                '<div class="flex items-center justify-between gap-2">' +
                    '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ' + badgeBg + '">' +
                        (isGood ? 'Efeito Benéfico' : 'Reação Adversa Aguda') +
                    '</span>' +
                    '<span class="text-[11px] font-bold text-slate-300">' + analysis.donor.type + ' ➔ ' + analysis.recipient.type + '</span>' +
                '</div>' +
                '<h4 class="font-display font-extrabold text-sm sm:text-base ' + titleColor + '">' + analysis.headline + '</h4>' +
                '<p class="text-xs text-slate-200 leading-relaxed">' + analysis.summary + '</p>' +
                '<div class="space-y-2 pt-1">' + effectsHtml + '</div>' +
            '</div>';
        }

        compatSim = new CompatibilitySim({
            container: document.getElementById('compat-canvas-container'),
            pinsContainer: document.getElementById('compat-pins'),
            initialDonor: 'A+',
            initialRecipient: 'B+',
            onStateChange: updateCompatUI
        });
        updateCompatUI(compatSim.getSnapshot());

        donorBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                compatSim.setTypes(btn.dataset.blood, null, false);
            });
        });
        recipientBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                compatSim.setTypes(null, btn.dataset.blood, false);
            });
        });

        btnCompatMix.addEventListener('click', function () { compatSim.startMix(); });
        btnCompatReset.addEventListener('click', function () { compatSim.reset(); });
        btnCompatOverview.addEventListener('click', function () { compatSim.setCameraView('overview'); });
        btnCompatMacro.addEventListener('click', function () { compatSim.setCameraView('macro'); });
        btnCompatLabels.addEventListener('click', function () { compatSim.toggleLabels(); });

        document.getElementById('compat-zoom-in').addEventListener('click', function () { compatSim.zoomBy(-0.9); });
        document.getElementById('compat-zoom-out').addEventListener('click', function () { compatSim.zoomBy(0.9); });
        document.getElementById('compat-zoom-reset').addEventListener('click', function () { compatSim.resetCamera(); });

        // Quick demo preset buttons
        document.querySelectorAll('.compat-preset-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                compatSim.setTypes(btn.dataset.donor, btn.dataset.recipient, true);
            });
        });

        // ============================================================
        // 4. INTERSECTION OBSERVER (PAUSE 3D LOOP OFF-SCREEN)
        // ============================================================
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    isSectionVisible = entry.isIntersecting;
                    if (centrifugeSim) centrifugeSim.setVisible(isSectionVisible);
                    if (compatSim) compatSim.setVisible(isSectionVisible);
                });
            }, { rootMargin: '120px' });
            io.observe(labSection);
        }

        // ============================================================
        // 5. GLOBAL HELPER FOR DEEP LINKS FROM OTHER SECTIONS
        // ============================================================
        global.openLab3D = function (tabName, opts) {
            opts = opts || {};
            switchLabTab(tabName || 'centrifuga');
            if (tabName === 'compatibilidade' && opts.donor && compatSim) {
                compatSim.setTypes(opts.donor, opts.recipient || 'A+', !!opts.autoStart);
            }
            labSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        // Start on Tab 1
        switchLabTab('centrifuga');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLab3D);
    } else {
        initLab3D();
    }
})(window);
