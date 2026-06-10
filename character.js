function createToonMaterial(texture, colorHex) {
    if (texture) {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
    }
    return new THREE.ShaderMaterial({
        uniforms: {
            map: { value: texture },
            color: { value: new THREE.Color(colorHex) },
            opacity: { value: 1.0 },
            isGreyscale: { value: 0.0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewDir = normalize(-mvPosition.xyz);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D map;
            uniform vec3 color;
            uniform float opacity;
            uniform float isGreyscale;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vec4 texColor = texture2D(map, vUv);
                if (texColor.a < 0.05) discard;
                vec3 baseColor = texColor.rgb * color;
                if (isGreyscale > 0.5) {
                    float grey = dot(baseColor, vec3(0.299, 0.587, 0.114));
                    baseColor = vec3(grey);
                }
                vec3 lightDir = normalize(vec3(12.0, 24.0, 12.0));
                vec3 viewLightDir = normalize((viewMatrix * vec4(lightDir, 0.0)).xyz);
                float dotNL = dot(normalize(vNormal), viewLightDir);
                float shade = 0.45;
                if (dotNL > 0.5) {
                    shade = 1.0;
                } else if (dotNL > 0.0) {
                    shade = 0.75;
                }
                vec3 finalColor = baseColor * shade;
                gl_FragColor = vec4(finalColor, opacity);
            }
        `,
        transparent: false,
        side: THREE.DoubleSide
    });
}

function updatePlayerVisuals(p) {
    if (!p || !p.mesh) return;
    const firstPersonMode = (typeof isFirstPerson !== 'undefined') ? isFirstPerson : false;
    const localId = (typeof localPlayerId !== 'undefined') ? localPlayerId : 1;
    p.mesh.visible = !p.isCustomizing && (!firstPersonMode || p.id !== localId);
    p.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.uniforms) {
            child.material.uniforms.color.value.setStyle(p.color);
            const isCustomizing = !!p.isCustomizing;
            child.material.uniforms.opacity.value = isCustomizing ? 0.4 : 1.0;
            child.material.uniforms.isGreyscale.value = isCustomizing ? 1.0 : 0.0;
            child.material.transparent = isCustomizing;
            child.material.depthWrite = !isCustomizing;
        }
    });
}

function applyColorToPlayer(playerId, colorHex) {
    if (typeof players === 'undefined') return;
    const p = players[playerId - 1];
    if (p) {
        p.color = colorHex;
        updatePlayerVisuals(p);
    }
}
