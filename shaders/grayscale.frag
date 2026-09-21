#version 300 es
// Drains the desktop of color while the day is over its limit. Applied
// as Hyprland's decoration:screen_shader, so it paints at composite
// time: screenshots and screen shares stay in color, only the glass
// goes gray.
//
// ESSL 3.00 on purpose. Hyprland's vertex shader is #version 300 es,
// and GLES refuses to link a program whose stages disagree on the
// language version — a 1.00 fragment shader (varying / gl_FragColor)
// fails with "all shaders must use same shading language version".
precision highp float;

in vec2 v_texcoord;
uniform sampler2D tex;
out vec4 fragColor;

void main() {
    vec4 pixel = texture(tex, v_texcoord);
    // Rec. 709 luma: a perceptual gray, not a flat channel average.
    float gray = dot(pixel.rgb, vec3(0.2126, 0.7152, 0.0722));
    fragColor = vec4(vec3(gray), pixel.a);
}
