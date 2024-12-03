uniform float pickerAlpha;
uniform float ringSize;
float PI = 3.14159;

varying float anim;
varying vec4 tint;

// plane in clip space
uniform mat4 wvpInv;
varying vec4 clip;

void main(void)
{
    // transform clip space point to world space
    vec4 t = wvpInv * clip;
    if (t.y / t.w < -1.0) {
        discard;
    }

    float A = dot(texCoord, texCoord);
    if (A > 4.0) {
        discard;
    }
    float B = exp(-A) * color.a;

    gl_FragColor = mix(vec4(color.xyz * 10.0, 1.0), vec4(color.xyz, B), anim) * tint;
}
