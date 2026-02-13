export const cubeFragmentShader = `precision highp float;

uniform vec3 ucolor1;
uniform vec3 ucolor2;
uniform vec3 ucolor3;
uniform vec3 ucolor4;
uniform vec3 ucolor5;
uniform vec3 ucolor6;
uniform float asciicode;
uniform sampler2D utexture;
uniform sampler2D uAsciiImageTexture;
uniform vec3 uBackgroundColor;
uniform float brightness;
uniform float asciiu;
uniform vec2 resolution;
uniform float time;

varying vec2 vUv;
varying vec2 aPixelUV;
varying vec3 vPosition;
varying vec3 vNormal;

// Barrel distortion - enhanced fisheye effect
vec2 barrelDistortion(vec2 uv, float strength) {
    vec2 center = vec2(0.5, 0.5);
    vec2 coord = uv - center;
    float dist = length(coord);
    
    // Enhanced barrel distortion formula for more realistic fisheye effect
    // Uses polynomial distortion for smoother, more natural curve
    float distSquared = dist * dist;
    float distFourth = distSquared * distSquared;
    float factor = 1.0 + strength * distSquared + strength * 0.5 * distFourth;
    
    return center + coord * factor;
}

// Create star pattern (✦) - 4-pointed star
float starPattern(vec2 uv, float size) {
    vec2 p = uv - 0.5;
    float angle = atan(p.y, p.x);
    float radius = length(p) * 2.0;
    
    // Create 4-pointed star shape using polar coordinates
    // Rotate angle by 45 degrees to align points
    float rotatedAngle = angle + 3.14159 * 0.25;
    float starShape = abs(cos(rotatedAngle * 2.0));
    
    // Create star outline - inner radius smaller for star effect
    float innerRadius = size * 0.4;
    float outerRadius = size;
    float dist = radius / mix(innerRadius, outerRadius, starShape);
    
    // Threshold for star visibility - make stars fill most of cell
    return step(dist, 1.0);
}

// Sample image and create pixelated ASCII star pattern (screen-space)
vec3 asciiPatternScreenSpace(vec2 screenUV, sampler2D imageTexture, float code, out float mask) {
    // Apply barrel distortion to screen coordinates - increased strength for more pronounced effect
    vec2 distortedUV = barrelDistortion(screenUV, 1.2);
    
    // Create grid for ASCII characters (lower code = bigger cells = bigger stars)
    vec2 grid = floor(distortedUV * code);
    vec2 cell = fract(distortedUV * code);
    
    // Sample image at the center of each ASCII cell (pixelated)
    vec2 cellCenter = (grid + 0.5) / code;
    vec4 imageColor = texture2D(imageTexture, cellCenter);
    
    // Get brightness to determine star size
    float brightness = dot(imageColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // Create star pattern - larger stars that fill most of the cell (tighter spacing)
    float starSize = mix(0.45, 0.50, brightness); // Bigger stars, tighter spacing
    mask = starPattern(cell, starSize);
    
    // Return the image color (pixelated based on ASCII grid)
    return imageColor.rgb;
}

void main() {
    // Position math
    vec2 uv = vUv;
    vec2 pos = vPosition.xy;
    
    // Sample texture
    vec4 textureColor = texture2D(utexture, aPixelUV);
    
    // 6 colors for 6 faces
    vec3 color1 = ucolor1; // Primary: #5168FF
    vec3 color2 = ucolor2; // Secondary: #62BE8F
    vec3 color3 = ucolor3; // Green variant
    vec3 color4 = ucolor4; // White
    vec3 color5 = ucolor5; // Dark purple: #1E0C39
    vec3 color6 = ucolor6; // Yellowish green: #BDE22E

    // Determine which face we're on based on the dominant normal component
    vec3 absNormal = abs(vNormal);
    vec3 baseColor;

    // Find the dominant axis (x, y, or z) - 6 colors for 6 faces
    if (absNormal.x > absNormal.y && absNormal.x > absNormal.z) {
        // X-axis faces
        baseColor = vNormal.x > 0.0 ? color1 : color2; // +X = blue, -X = green
    } else if (absNormal.y > absNormal.z) {
        // Y-axis faces
        baseColor = vNormal.y > 0.0 ? color3 : color4; // +Y = green variant, -Y = white
    } else {
        // Z-axis faces
        baseColor = vNormal.z > 0.0 ? color5 : color6; // +Z = dark purple, -Z = yellowish green
    }
    
    // Don't apply texture color overlay - use solid face colors only
    // baseColor stays as the solid face color
    
    // Apply brightness
    baseColor *= brightness;
    
    // Add emissive glow to boost color density and make colors pop
    // Calculate view direction for rim lighting effect
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    
    // Emissive glow - boost the base color intensity
    vec3 emissiveGlow = baseColor * 0.4; // Base emissive intensity
    
    // Add edge glow for extra pop (stronger on edges)
    float edgeGlow = pow(fresnel, 2.0) * 0.3;
    vec3 edgeGlowColor = baseColor * edgeGlow;
    
    // Combine base color with glow effects
    vec3 glowingColor = baseColor + emissiveGlow + edgeGlowColor;
    
    // Get screen-space coordinates for ASCII mask
    vec2 screenUV = gl_FragCoord.xy / resolution;
    
    // Create pixelated ASCII star pattern from image (screen-space)
    float asciiMask;
    vec3 asciiColor = asciiPatternScreenSpace(screenUV, uAsciiImageTexture, asciicode, asciiMask);
    
    // Use background color for non-star areas, blend cube colors into star areas
    vec3 bgColor = uBackgroundColor;
    vec3 starColor = glowingColor * 0.5 + asciiColor * 0.5;
    vec3 finalColor = mix(bgColor, starColor, asciiMask);

    gl_FragColor = vec4(finalColor, 1.0);
}`;

export const cubeVertexShader = `precision highp float;

uniform float time;
uniform vec3 rotationSpeed;
uniform float horizontalOnly; // 1.0 for horizontal-only rotation, 0.0 for full rotation

varying vec2 vUv;
varying vec2 aPixelUV;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    vUv = uv;
    aPixelUV = uv;
    
    vec3 pos = position;
    
    // Apply rotation - if horizontalOnly, only rotate around Y axis
    float rotX = horizontalOnly > 0.5 ? 0.0 : time * rotationSpeed.x;
    float rotY = time * rotationSpeed.y;
    float rotZ = horizontalOnly > 0.5 ? 0.0 : time * rotationSpeed.z;
    
    // Rotate around X axis
    float cosX = cos(rotX);
    float sinX = sin(rotX);
    float y1 = pos.y * cosX - pos.z * sinX;
    float z1 = pos.y * sinX + pos.z * cosX;
    
    // Rotate around Y axis (horizontal rotation)
    float cosY = cos(rotY);
    float sinY = sin(rotY);
    float x2 = pos.x * cosY + z1 * sinY;
    float z2 = -pos.x * sinY + z1 * cosY;
    
    // Rotate around Z axis
    float cosZ = cos(rotZ);
    float sinZ = sin(rotZ);
    float x3 = x2 * cosZ - y1 * sinZ;
    float y3 = x2 * sinZ + y1 * cosZ;
    
    vec3 rotatedPos = vec3(x3, y3, z2);
    
    vec4 modelPosition = modelMatrix * vec4(rotatedPos, 1.0);
    vPosition = modelPosition.xyz;
    
    // Transform normal
    vec3 transformedNormal = normalMatrix * normal;
    vNormal = normalize(transformedNormal);
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
}`;
