/* ==========================================================
   VISUALIZER (Grafik Engine - Three.js + Bloom)
   ========================================================== */
const Visualizer = (() => {
    let scene, camera, renderer, composer;
    let particles = [];
    let trails = [];
    
    // Interaktion & Helper
    let gridGroup; 
    let raycaster, mouse;
    const tooltipEl = document.getElementById('tooltip');

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const params = {
        balance: 0, reverb: 0.4, timbre: 0.5, harmony: 0.5
    };

    return {
        init: () => {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 60;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ReinhardToneMapping;
            
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            // --- BLOOM POST-PROCESSING ---
            const renderScene = new THREE.RenderPass(scene, camera);
            
            // Prüfen ob BloomPass verfügbar ist (Fehlervermeidung)
            if (THREE.UnrealBloomPass) {
                const bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(window.innerWidth, window.innerHeight),
                    1.5, 0.4, 0.85
                );
                bloomPass.strength = 1.8;
                bloomPass.radius = 0.5;
                bloomPass.threshold = 0;

                composer = new THREE.EffectComposer(renderer);
                composer.addPass(renderScene);
                composer.addPass(bloomPass);
            } else {
                console.warn("UnrealBloomPass nicht geladen. Glow inaktiv.");
            }

            const ambientLight = new THREE.AmbientLight(0x404040);
            scene.add(ambientLight);
            
            const pointLight = new THREE.PointLight(0xffffff, 1, 100);
            pointLight.position.set(0, 0, 50);
            scene.add(pointLight);

            // Grid Group
            gridGroup = new THREE.Group();
            const createGrid = (rotX, rotY, rotZ) => {
                const g = new THREE.GridHelper(200, 20, 0x444444, 0x111111);
                g.rotation.set(rotX, rotY, rotZ);
                g.material.transparent = true;
                g.material.opacity = params.harmony * 0.3;
                return g;
            };
            gridGroup.add(createGrid(0, 0, 0));             
            gridGroup.add(createGrid(Math.PI/2, 0, 0));     
            gridGroup.add(createGrid(0, 0, Math.PI/2));     
            gridGroup.position.z = -10;
            scene.add(gridGroup);

            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();

            window.addEventListener('resize', onWindowResize, false);
            window.addEventListener('mousemove', onMouseMove, false);
            renderer.domElement.addEventListener('mousedown', onMouseDown, false);
            window.addEventListener('mouseup', onMouseUp, false);
            renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
            window.addEventListener('dblclick', onDoubleClick, false);
        },

        setBalance: (val) => { params.balance = parseFloat(val); },
        setReverb: (val) => { params.reverb = parseFloat(val); },
        setTimbre: (val) => { params.timbre = parseFloat(val); },
        setHarmony: (val) => { 
            params.harmony = parseFloat(val);
            if(gridGroup) gridGroup.children.forEach(grid => grid.material.opacity = params.harmony * 0.3);
        },

        addPoint: (x, y, colorCode, size, metaData) => {
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            
            const material = new THREE.MeshPhongMaterial({
                color: colorCode,
                emissive: colorCode,
                emissiveIntensity: 1.5,
                transparent: true,
                opacity: 1
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, (Math.random() - 0.5) * 10);
            
            sphere.userData = { 
                title: metaData.title,
                isBot: metaData.isBot,
                wiki: metaData.wiki || 'en', 
                baseScale: Math.min(size / 500 + 0.4, 3.0),
                color: colorCode
            };

            scene.add(sphere);
            updateParticleScale(sphere, params.balance);

            particles.push({
                mesh: sphere,
                life: 1.0,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02, 
                    (Math.random() - 0.5) * 0.02, 
                    0.1 + (Math.random() * 0.2) 
                )
            });
        },

        update: () => {
            if (!isDragging) {
                raycaster.setFromCamera(mouse, camera);
                const meshes = particles.map(p => p.mesh);
                const intersects = raycaster.intersectObjects(meshes);
                if (intersects.length > 0) {
                    const target = intersects[0].object;
                    tooltipEl.style.display = 'block';
                    tooltipEl.innerText = target.userData.title;
                } else {
                    tooltipEl.style.display = 'none';
                }
            } else { tooltipEl.style.display = 'none'; }

            const dynamicDecay = 0.015 - (params.reverb * 0.014);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life -= dynamicDecay;
                
                // Trail (Shadow) Logic
                if (Math.random() > 0.7 && p.life > 0.2) {
                    createTrail(p.mesh.position.clone(), p.mesh.scale.x, p.mesh.userData.color);
                }

                p.mesh.position.add(p.velocity);
                
                const maxOpacity = 0.2 + (params.timbre * 0.8);
                const visualLife = p.life * maxOpacity;
                p.mesh.material.opacity = Math.max(0, visualLife);
                p.mesh.material.emissiveIntensity = (0.5 + (params.timbre * 1.5)) * p.life;

                updateParticleScale(p.mesh, params.balance);

                if (p.life <= 0 || p.mesh.position.z > 80) {
                    scene.remove(p.mesh);
                    particles.splice(i, 1);
                }
            }

            for (let i = trails.length - 1; i >= 0; i--) {
                const t = trails[i];
                t.life -= 0.02;
                t.mesh.material.opacity = t.life * 0.4;
                t.mesh.scale.multiplyScalar(0.95);
                if (t.life <= 0) {
                    scene.remove(t.mesh);
                    trails.splice(i, 1);
                }
            }

            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }
    };

    function createTrail(pos, scale, color) {
        const geo = new THREE.SphereGeometry(1, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.scale.set(scale, scale, scale);
        scene.add(mesh);
        trails.push({ mesh: mesh, life: 1.0 });
    }

    function updateParticleScale(mesh, balance) {
        const isBot = mesh.userData.isBot;
        const base = mesh.userData.baseScale;
        let scaleFactor = 1.0;
        if (isBot) {
            scaleFactor = balance > 0 ? (1 + balance * 2.5) : (1 - Math.abs(balance) * 0.7);
        } else {
            scaleFactor = balance < 0 ? (1 + Math.abs(balance) * 2.5) : (1 - balance * 0.7);
        }
        mesh.scale.set(base * scaleFactor, base * scaleFactor, base * scaleFactor);
    }

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        tooltipEl.style.left = (event.clientX + 15) + 'px';
        tooltipEl.style.top = (event.clientY + 15) + 'px';
        if (isDragging) {
            const deltaX = event.clientX - previousMousePosition.x;
            const deltaY = event.clientY - previousMousePosition.y;
            camera.position.x -= deltaX * 0.05;
            camera.position.y += deltaY * 0.05;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }
    function onMouseDown(event) { isDragging = true; previousMousePosition = { x: event.clientX, y: event.clientY }; document.body.style.cursor = 'grabbing'; }
    function onMouseUp() { isDragging = false; document.body.style.cursor = 'default'; }
    function onMouseWheel(event) { event.preventDefault(); camera.position.z += event.deltaY * 0.05; camera.position.z = Math.max(10, Math.min(camera.position.z, 200)); }
    function onDoubleClick() {
        raycaster.setFromCamera(mouse, camera);
        const meshes = particles.map(p => p.mesh);
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const data = intersects[0].object.userData;
            let lang = data.wiki ? data.wiki.replace('wiki', '') : 'en';
            if (lang.length > 3 && lang !== 'commons') lang = 'en'; 
            window.open(`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title)}`, '_blank');
        }
    }
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if(composer) composer.setSize(window.innerWidth, window.innerHeight);
    }
})();