const canvas = document.getElementById("webglCanvas");

/**
* @param {HTMLCanvasElement} canvas
*/
async function run(canvas) {
    const shader = await (await fetch("/shader/frag.glsl")).text();
    const gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");

    }

    // Adjust canvas size to fill the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set clear color to cornflower blue
    gl.clearColor(0.39, 0.58, 0.93, 1.0); // RGBA values for cornflower blue
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Vertex shader source
    const vertexShaderSource = `
attribute vec2 aPosition;
void main() {
gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

    // Compile shader function
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile error:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Create shaders
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(shader, gl.FRAGMENT_SHADER);

    // Create program and link shaders
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
    }

    // Use the program
    gl.useProgram(program);

    // Define a fullscreen triangle
    const vertices = new Float32Array([
        //0, 0,
        //0, 1,
        //1, 0,
        //-1, -1,
        //0, -1,
        //-1, 0,

        // top right
        1, 1,
        1, -1,
        -1, 1,
        //-1, 1,
        //0, 1,
        //-1, 0,

        // bottom left
        -1, -1,
        1, -1,
        -1, 1,
    ]);

    // Create buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Set up position attribute
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform location
    const uResX = gl.getUniformLocation(program, "u_res_x");
    const uRes = gl.getUniformLocation(program, "u_res");
    const uPos = gl.getUniformLocation(program, "u_mouse_x");
    const uTime = gl.getUniformLocation(program, "u_time");

    gl.uniform1f(uResX, window.innerWidth);
    gl.uniform2f(uRes, window.innerWidth, window.innerHeight);
    gl.uniform1f(uPos, 1);

    canvas.addEventListener("mousemove", (event) => {
        gl.uniform1f(uPos, event.clientX);
    });

    window.addEventListener("resize", (event) => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        gl.uniform1f(uResX, window.innerWidth);
        gl.uniform2f(uRes, window.innerWidth, window.innerHeight);
    });

    const start = Date.now();
    // Render loop
    function render() {
        const duration = ((Date.now() - start) / 1000) * Math.PI / 4;
        gl.uniform1f(uTime, duration);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        setTimeout(render, 200)
    }

    render();
}

run(/** @type {HTMLCanvasElement} */(canvas))
