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

    float chromaSpread = 0.5; // higher values means smaller focusarea
    float chromaIntensity = 1.0; // higher values means less focus

    void main() {
        // get color of current pixel
        vec4 color = texture2D(tDiffuse, vUv);

        // calculate center of screen
        vec2 centerPoint = vec2(resolution.x/2.0, resolution.y/2.0);

        // vignette multiplier based on max distance. idk how it works anymore
        float multiplier = chromaSpread / sqrt(pow(centerPoint.x, 2.0) + pow(centerPoint.y, 2.0));

        // calculate current position distance from center
        float fragX = abs(centerPoint.x - gl_FragCoord.x);
        float fragY = abs(centerPoint.y - gl_FragCoord.y);
        float distanceFromCenter = sqrt(pow(fragX,2.0) + pow(fragY,2.0));

        // calculate adjusted offset of color channel using the vignette calculation
        float adjustedAmount = 0.02 * chromaIntensity * (distanceFromCenter * multiplier);

        color.r = texture2D(tDiffuse, vec2(vUv.x + adjustedAmount, vUv.y)).r;
        color.g = texture2D(tDiffuse, vUv).g;
        color.b = texture2D(tDiffuse, vec2(vUv.x - adjustedAmount, vUv.y)).b;

        gl_FragColor = color;
    }
`;

// unused
export const vignetteFS = /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;

    varying vec2 vUv;

    // basically reverse vignette
    float vignetteSpread = 1.0;
    float vignetteIntensity = 5.0;

    void main() {
        vec4 textureColor = texture2D(tDiffuse, vUv);

        vec2 centerPoint = vec2(resolution.x / 2.0, resolution.y / 2.0);
        float fragX = abs(centerPoint.x - gl_FragCoord.x);
        float fragY = abs(centerPoint.y - gl_FragCoord.y);

        float multiplier = vignetteSpread / sqrt(pow(centerPoint.x, 2.0) + pow(centerPoint.y, 2.0));

        float distanceFromCenter = sqrt(pow(fragX,2.0) + pow(fragY,2.0));

        gl_FragColor = vec4(textureColor.rgb * vignetteIntensity * (distanceFromCenter * multiplier), 1.0);
    }
`;

export const basicVS = /*glsl */ `
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const grainFS = /*glsl*/ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform int frame;

    varying vec2 vUv;

    // calculations from Kerdek
    // https://www.shadertoy.com/view/lfjSDD

    uint seed;

    vec3 unitrand() {
        return vec3(pow(2.0, -32.0) * float((seed *= 594156893u) >> 1));
    }
    void main() {
        uvec3 p = uvec3(37769685u, 26757677u, 20501397u) * uvec3(gl_FragCoord.xy, frame);
        seed = p.x ^ p.y ^ p.z;
        
        vec4 color = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4((color.rgb + (unitrand().r / 10.0)), 1.0);

        // tv lines from https://www.shadertoy.com/view/ltXfWl
        gl_FragColor -= clamp(mod(floor(gl_FragCoord.y + float(frame)*1.5), 0.99), 0.0, 0.05);

        //gl_FragColor = color;
    }
`;

export const lensDistortionFS = /*glsl*/ `
    uniform vec2 resolution;
    uniform sampler2D tDiffuse;

    void main() {
        vec2 distortedUV = gl_FragCoord.xy / resolution.xy;

        float distortAmount = distance(vec2(0.5), distortedUV);
        distortedUV -= vec2(0.5);
        distortedUV *= 1.0 + ((0.5 - distortAmount) / 0.5) * -0.17;
        distortedUV += vec2(0.5);

        gl_FragColor = texture2D(tDiffuse, distortedUV);
    }
`;

export const convoMatrixFS = /*glsl*/ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;


    float getFragLuma(vec2 offsetUV) {

        // get luma for each point in the matrix
        vec4 targetColor = texture2D(tDiffuse, offsetUV);

        float fragLuma = targetColor.r*0.2126 + targetColor.g*0.7152 + targetColor.b*0.0722;
        return fragLuma;
    }
    
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 color = texture2D(tDiffuse, uv);

        // normalized pixel offset
        float stepx = 1.0 / resolution.x;
        float stepy = 1.0 / resolution.y;

        // Convolution matrix; indices go left to right, row by row
        float horizontalSobelMatrix[9] = float[](
            -1.0, 0.0, 1.0,
            -1.2, 0.0, 1.2,
            -1.0, 0.0, 1.0
        );

        float verticalSobelMatrix[9] = float[](
            1.0, 1.2, 1.0,
            0.0, 0.0, 0.0,
            -1.0, -1.2, -1.0
        );

        // offset matrix in array (same structure as above)
        vec2 offsets[9] = vec2[9](
            vec2(uv.x - stepx, uv.y + stepy), // 1
            vec2(uv.x, uv.y + stepy),
            vec2(uv.x + stepx, uv.y + stepy), // 3
            vec2(uv.x - stepx, uv.y),
            vec2(uv.x, uv.y), // 5
            vec2(uv.x, uv.y), 
            vec2(uv.x - stepx, uv.y - stepy), // 7
            vec2(uv.x, uv.y - stepy),
            vec2(uv.x + stepx, uv.y - stepy) // 9
        );

        float gx = 0.0;
        gx += horizontalSobelMatrix[0] * getFragLuma(offsets[0]);
        gx += horizontalSobelMatrix[1] * getFragLuma(offsets[1]);
        gx += horizontalSobelMatrix[2] * getFragLuma(offsets[2]);
        gx += horizontalSobelMatrix[3] * getFragLuma(offsets[3]);
        gx += horizontalSobelMatrix[4] * getFragLuma(offsets[4]);
        gx += horizontalSobelMatrix[5] * getFragLuma(offsets[5]);
        gx += horizontalSobelMatrix[6] * getFragLuma(offsets[6]);
        gx += horizontalSobelMatrix[7] * getFragLuma(offsets[7]);
        gx += horizontalSobelMatrix[8] * getFragLuma(offsets[8]);
        gx = gx * -1.0;

        float gy = 0.0;
        gy += verticalSobelMatrix[0] * getFragLuma(offsets[0]);
        gy += verticalSobelMatrix[1] * getFragLuma(offsets[1]);
        gy += verticalSobelMatrix[2] * getFragLuma(offsets[2]);
        gy += verticalSobelMatrix[3] * getFragLuma(offsets[3]);
        gy += verticalSobelMatrix[4] * getFragLuma(offsets[4]);
        gy += verticalSobelMatrix[5] * getFragLuma(offsets[5]);
        gy += verticalSobelMatrix[6] * getFragLuma(offsets[6]);
        gy += verticalSobelMatrix[7] * getFragLuma(offsets[7]);
        gy += verticalSobelMatrix[8] * getFragLuma(offsets[8]);
        gy = gy * -1.0;

        float g = (gx + gy) * 1.0;
        color += vec4(g, g, g, 1.0);

        gl_FragColor = color;
    }
`;
