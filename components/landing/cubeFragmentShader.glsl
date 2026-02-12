precision highp float;

uniform vec3 ucolor1;
uniform vec3 ucolor2;
uniform vec3 ucolor3;
uniform vec3 ucolor4;
uniform vec3 ucolor5;
uniform vec3 ucolor6;
uniform float asciicode;
uniform float texture;
uniform float brightness;
uniform float asciiu;
uniform vec2 resolution;
uniform float time;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

// Barrel distortion
vec2 barrelDistortion(vec2 uv, float strength) {
    vec2 center = vec2(0.5, 0.5);
    vec2 coord = uv - center;
    float dist = length(coord);
    float factor = 1.0 + strength * dist * dist;
    return center + coord * factor;
}

// Simple ASCII-like pattern
float asciiPattern(vec2 uv, float code) {
    vec2 grid = floor(uv * code);
    vec2 cell = fract(uv * code);
    float pattern = step(0.5, cell.x) * step(0.5, cell.y);
    return pattern;
}

void main() {
    // Position math
    vec2 uv = vUv;
    vec2 pos = vPosition.xy;
    
    // Barrel distortion
    vec2 distortedUV = barrelDistortion(uv, 0.1);
    
    // ASCII texture effect
    float asciiValue = asciiPattern(distortedUV, asciicode);
    float asciiBrightness = asciiu * asciiValue;
    
    // Texture effect
    float texValue = texture;
    
    // Combine colors based on position and normal
    vec3 color1 = ucolor1;
    vec3 color2 = ucolor2;
    vec3 color3 = ucolor3;
    vec3 color4 = ucolor4;
    vec3 color5 = ucolor5;
    vec3 color6 = ucolor6;

    // Mix colors based on position
    float mixFactor = (vNormal.x + vNormal.y + vNormal.z) * 0.33 + 0.5;
    vec3 baseColor = mix(color1, color2, mixFactor);
    baseColor = mix(baseColor, color3, vPosition.z * 0.5 + 0.5);
    baseColor = mix(baseColor, color6, vPosition.y * 0.5 + 0.5);
    baseColor = mix(baseColor, color4, distortedUV.x);
    baseColor = mix(baseColor, color5, distortedUV.y);
    
    // Apply texture
    baseColor *= (1.0 + texValue * 0.3);
    
    // Apply ASCII brightness and depth
    baseColor *= (brightness + asciiBrightness);
    
    // Final color with depth
    vec3 finalColor = baseColor * (1.0 + asciiu * 0.2);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
