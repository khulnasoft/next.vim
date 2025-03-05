precision mediump float;

#define PI 3.14159265359

uniform vec2 u_res;
uniform float u_res_x;
uniform float u_mouse_x;
uniform float u_time;

// Plot a line on Y using a value between 0.0-1.0
float plot(vec2 st, float pct) {
    return  smoothstep( pct-0.02, pct, st.y) -
          smoothstep( pct, pct+0.02, st.y);
}

void main() {
	vec2 st = gl_FragCoord.xy / u_res ;

    float mouse_pct = u_mouse_x / u_res_x;
    float y = smoothstep(mouse_pct - 0.3, mouse_pct, st.x) -
        smoothstep(mouse_pct, mouse_pct + 0.3, st.x);

    vec3 color = vec3(y);

    // Plot a line
    float pct = plot(st, y);
    color = (1.0 - pct) * color + pct * vec3(0.0, 1.0, 0.0);

	gl_FragColor = vec4(color, 1.0);
}

