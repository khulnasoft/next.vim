import test from "node:test";
import * as assert from "node:assert";
import { createActionTaken } from "./editor.js";
import { setNow } from "../utils.js";
import { Vector2D } from "../math/vector.js";

const WIDTH = 25
const HEIGHT = 50

/**
 * @returns {EditorLevelSet}
 */
function testLevel() {
    return {
        title: "foo",
        levels: [{
            letterMap: [],
            platforms: [],
            initialPosition: new Vector2D(0, 0)
        }],
        current: 0,
        difficulty: 0,
        initialLevel: 0,
    };
}

/**
 * @param {number} rows
 * @param {number} cols
 * @returns {ElementState[][]}
 */
function createElements(rows, cols) {
    const out = []
    for (let r = 0; r < rows; ++r) {
        const row = []
        for (let c = 0; c < rows; ++c) {
            // @ts-ignore
            row.push(/** @type {ElementState} */({
                el: {
                    gen: r * cols + c,
                    clientTop: r * HEIGHT,
                    clientLeft: c * WIDTH,
                    clientWidth: WIDTH,
                    clientHeight: HEIGHT,
                    offsetTop: r * HEIGHT,
                    offsetLeft: c * WIDTH,
                    offsetWidth: WIDTH,
                    offsetHeight: HEIGHT,
                },
                id: r * cols + c
            }));
        }
        out.push(row);
    }
    return out
}

/** @returns {EditorState} */
function createTestState() {
    // @ts-ignore
    return /** @type {EditorState} */({
        elements: createElements(24, 40),
        selectedElements: [],
        levelState: {
            levels: [testLevel()],
            current: 0,
        }
    })
}

/** @param {EditorState} state
/** @returns {EditorState} */
function withMouse(state) {
    state.mouse = {
        state: "invalid",
        startTime: 0,
        startingEl: null
    };
    return state
}

/**
 * @param {number} x
 * @param {number} y
* @returns {MouseEvent}
*/
function down(x, y) {
    return /** @type {MouseEvent} */({
        type: "mousedown",
        clientX: x,
        clientY: y,
    });
}

/**
 * @param {number} x
 * @param {number} y
* @returns {MouseEvent}
*/
function up(x, y) {
    return /** @type {MouseEvent} */({
        type: "mouseup",
        clientX: x,
        clientY: y,
    });
}

let now = 0
function setTime(n) {
    now = n
}
setNow(() => now)

test("should ensure mouse down", () => {
    const state = withMouse(createTestState());
    const actions = createActionTaken(state, false)

    const target = state.elements[Math.floor(420 / HEIGHT)][Math.floor(69 / WIDTH)]
    setTime(42069);
    actions(down(69, 420));
    assert.deepEqual(state.mouse, {
        state: "down",
        startTime: now,
        startingEl: target
    })

    actions(up(75, 450));
    assert.deepEqual(state.mouse, {
        state: "invalid",
        startTime: now,
        startingEl: target
    })
});


