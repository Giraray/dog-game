export const dogVS = /* glsl */`
    attribute vec4 color;
    flat varying vec2 vUv;
    varying vec4 vColor;

    void main() {
        vColor = color;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const dogFS = /* glsl */ `
    flat varying vec2 vUv;
    varying vec4 vColor;

    void main() {
        vec4 color = vColor;
        gl_FragColor = vec4(vUv, 1.0, 1.0);
    }
`;

export const chromaVS = /* glsl */`
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const chromaFS = /* glsl */ `
    // chromatic aberration
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;

    varying vec2 vUv;

    float vignetteSpread = 0.8; // higher values means smaller focusarea
    float vignetteIntensity = 0.5; // higher values means less focus

    void main() {
        // get color of current pixel
        vec4 textureColor = texture2D(tDiffuse, vUv);
        vec4 color = textureColor;

        // calculate center of screen
        vec2 centerPoint = vec2(resolution.x/2.0, resolution.y/2.0);

        // vignette multiplier based on max distance. idk how it works anymore
        float multiplier = vignetteSpread / sqrt(pow(centerPoint.x, 2.0) + pow(centerPoint.y, 2.0));

        // calculate current position distance from center
        float fragX = abs(centerPoint.x - gl_FragCoord.x);
        float fragY = abs(centerPoint.y - gl_FragCoord.y);
        float distanceFromCenter = sqrt(pow(fragX,2.0) + pow(fragY,2.0));

        // calculate adjusted offset of color channel using the vignette calculation
        float adjustedAmount = 0.02 * vignetteIntensity * (distanceFromCenter * multiplier);

        color.r = texture2D(tDiffuse, vec2(vUv.x + adjustedAmount, vUv.y)).r;
        color.g = texture2D(tDiffuse, vUv).g;
        color.b = texture2D(tDiffuse, vec2(vUv.x - adjustedAmount, vUv.y)).b;

        gl_FragColor = color;
    }
`;

export const vignetteFS = /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;

    varying vec2 vUv;

    // basically reverse vignette
    float vignetteSpread = 2.0;
    float vignetteIntensity = 1.0;

    void main() {
        vec4 textureColor = texture2D(tDiffuse, vUv);

        vec2 centerPoint = vec2(resolution.x/2.0, resolution.y/2.0);
        float fragX = abs(centerPoint.x - gl_FragCoord.x);
        float fragY = abs(centerPoint.y - gl_FragCoord.y);

        float multiplier = vignetteSpread / sqrt(pow(centerPoint.x, 2.0) + pow(centerPoint.y, 2.0));

        float distanceFromCenter = sqrt(pow(fragX,2.0) + pow(fragY,2.0));

        gl_FragColor = vec4(textureColor.rgb * vignetteIntensity * (distanceFromCenter * multiplier), 1.0);
    }
`;