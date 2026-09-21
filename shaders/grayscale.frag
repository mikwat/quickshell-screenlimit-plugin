// Drains the desktop of color while the day is over its limit. Applied
// as Hyprland's decoration:screen_shader, so it paints at composite
// time: screenshots and screen shares stay in color, only the glass
// goes gray.
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D tex;

void main() {
    vec4 pixel = texture2D(tex, v_texcoord);
    // Rec. 709 luma: a perceptual gray, not a flat channel average.
    float gray = dot(pixel.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(vec3(gray), pixel.a);
}
