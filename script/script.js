/** @type {HTMLCanvasElement} */
const canvas = window.canvas
const gl = canvas.getContext("webgl2")
const dpr = Math.max(1, window.devicePixelRatio)

const vertexSource = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec2 position;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
}
`
const fragmentSource = `#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

out vec4 fragColor;

uniform vec2 resolution;
uniform float time;

const float TAU = radians(360.);

#define T time
#define S smoothstep

vec3 pattern(vec2 uv) {
	float fa = 1., fb = 1., fc = 1., fd = .0;

	for (int i = 0; i < 10; i++) {
		vec2 p = vec2(
			cos(uv.y * fa - fd + T / fb),
			sin(uv.x * fa - fd + T / fb)
		) / fc;
		p += vec2(-p.y, p.x) * .25;
		uv.xy += p;

		fa *= 2.;
		fb *= 1.5;
		fc *= 1.75;

		fd += .025 + .125 * T * fb;
	}
	float
	r = sin(uv.x - T) * .5 + .5,
	g = sin(uv.y + T) * .5 + .5,
	b = sin((uv.x + uv.y + sin(T * .5)) * .5) * .5 + .5;

	return vec3(r, g, b);
}

void main(void) {
	vec2 uv = (
		gl_FragCoord.xy - .5 * resolution.xy
	) / min(resolution.x, resolution.y);

	vec3 col = vec3(1);

	// angle of each pixel to the center of the screen
	float a = atan(uv.x, uv.y) * 10.;

	// modified distance metric
	float k = 1.;
	float r =
		pow(
			pow(uv.x * uv.x, k) +
			pow(uv.y * uv.y, k),
			1. / (2. * k)
		);

	// index texture by (animated inverse) radius and angle
	vec2 p = vec2(1. / r + .2 * T, a);

	// pattern: cosines
	float f = cos(12. * p.x) * cos(6. * p.y);

	col += mix(
		S(.25, .5, sin(TAU * f + 10.)*.5+.5),
		S(.25, .5, sin(f)*.5+.5),
		S(.0, 1., sin(T*.123)*.5+.5)
	);

	// pattern
	vec3 tint = pattern(p);
	
	// combine with pattern
	col = mix(
		col*tint.gbb,
		tint.gbb,
		S(.0, 1., sin(T*.323)*.5+.5));

	fragColor = vec4(col, 1.0);
}
`
let time
let buffer
let program
let resolution
let vertices = []

function resize() {
  const { innerWidth: width, innerHeight: height } = window

  canvas.width = width * dpr
  canvas.height = height * dpr

  gl.viewport(0, 0, width * dpr, height * dpr)
}

function compile(shader, source) {
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
  }
}

function setup() {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)

  program = gl.createProgram()

  compile(vs, vertexSource)
  compile(fs, fragmentSource)

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
  }

  vertices = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]

  buffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, "position")

  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  time = gl.getUniformLocation(program, "time")
  resolution = gl.getUniformLocation(program, "resolution")
}

function draw(now) {
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

  gl.uniform1f(time, now * 0.001)
  gl.uniform2f(resolution, canvas.width, canvas.height)
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length * 0.5)
}

function loop(now) {
  draw(now)
  requestAnimationFrame(loop)
}

function init() {
  setup()
  resize()
  loop(0)
}

document.body.onload = init
window.onresize = resize