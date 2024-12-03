uniform float scaleFactor;
uniform float time;
uniform float mode;

varying float anim;
varying vec4 tint;

varying vec4 clip;

float PI = 3.14159;

void getTransformCustom() {
    vec4 tA = texelFetch(transformA, splatUV, 0);
    vec4 tB = texelFetch(transformB, splatUV, 0);
    vec4 tC = texelFetch(transformC, splatUV, 0);

    if (mode == 0.0) {
        // fade in effect

        // anim = smoothstep(0.0, 1.0, min(1.0, scaleFactor * 3.0 / (tA.y + 1.0)));
        anim = smoothstep(0.0, 1.0, time * 2.0 / (abs(tA.y) + 1.0));

        float mt = fract(anim * 2.0 + fract(tA.x * 10000.0) + fract(tA.y * 10000.0) + fract(tA.z * 10000.0)) * PI * 2.0;

        center = tA.xyz + vec3(sin(mt) * sin(mt), cos(mt) * sin(mt), sin(mt)) * smoothstep(0.0, 1.0, 1.0 - anim) * 0.2;

        float scale = 0.0000005 + smoothstep(0.0, 0.5, anim) * 0.000005;

        vec3 a = tB.xyz;
        vec3 b = vec3(tA.w, tB.w, tC.x);

        covA = mix(normalize(a) * scale, a, smoothstep(0.0, 1.0, (anim - 0.5) * 2.0));
        covB = mix(normalize(b) * scale, b, smoothstep(0.0, 1.0, (anim - 0.5) * 2.0));

        anim = smoothstep(0.25, 0.75, anim);
        tint = vec4(1.0);
    } else {
        // fade out effect

        // float fade = clamp(tA.y - (2.0 - time * 6.0), 0.0, 1.0);
        float fade = smoothstep(0.0, 1.0, abs(tA.y) - (2.0 - time * 6.0));

        vec3 a = tB.xyz;
        vec3 b = vec3(tA.w, tB.w, tC.x);

        center = tA.xyz;
        covA = a;
        covB = b;

        anim = 1.0;
        // tint = vec4(vec3(1.0 + fade), 1.0 - fade);
        tint = vec4(vec3(1.0), 1.0 - fade);
    }
}

vec3 evalCenterCustom() {
    evalSplatUV();

    // get data
    getTransformCustom();

    return center;
}

void main(void)
{
    vec3 centerLocal = evalCenterCustom();
    vec4 centerWorld = matrix_model * vec4(centerLocal, 1.0);

    gl_Position = evalSplat(centerWorld);
    clip = gl_Position;
}
