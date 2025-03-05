import { Vector2D } from "./math/vector.js";
import { AABB } from "./math/aabb.js";
import * as TitanUtils from "./objects/titan/utils.js"
import * as Window from "./window.js"
import { clonePlatform } from "./objects/level/level.js";
import { clonePhysics } from "./utils.js";

/**
 * @param {GameState} state
 * @param {Vector2D} pos
 * @param {number} w
 * @param {number} h
 */
function stroke(state, pos, w, h) {
    const aabb = new AABB(pos, w, h);
    state.getCtx().strokeRect(...Window.projectAABB(state.getCtx().canvas, aabb))
}

/**
 * @param {GameState} state
 */
export function render(state) {
    if (!state.opts.debug) {
        return
    }

    const ctx = state.getCtx()
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;

    const dash = state.titan.dash
    const jump = state.titan.jump
    if (dash.dashing) {
        stroke(state, dash.dashStart, dash.dashDir * dash.dashDistance, TitanUtils.CALEB_HEIGHT)
    } else if (jump.jumping) {
        stroke(state, jump.jumpStart, TitanUtils.CALEB_WIDTH, jump.jumpDir * jump.jumpDistance)
    }

    ctx.strokeStyle = "green";

    for (const p of state.level.activeLevel.platforms) {
        const next = p.behaviors.next
        const body = p.physics.current.body
        if (next) {
            const body = p.physics.current.body
            stroke(state, body.pos, body.width, body.height)
        }

        renderText(state, "" + p.id, body.pos)
    }
}

/**
 * @param {GameState} state
 * @param {string} text
 * @param {Vector2D} body
 */
function renderText(state, text, body) {
    const ctx = state.getCtx()
    const {x, y} = body
    const [_x, _y] = Window.projectCoords(ctx.canvas, x + 0.25, y + 0.5)

    ctx.fillStyle = "white";
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(text, _x, _y)
}

/**
 * @param {GameState} state
 * @param {number} _
*/
export function check(state, _) { }


/**
 * @param {GameState} state
 * @param {number} _
*/
export function update(state, _) { }

/**
 * @param {GameState} state
*/
export function tickClear(state) { }

/**
 * @param {GameState} state
 * @param {number} _
*/
export function apply(state, _) {
    if (state.opts.debug) {
        const prev = state.debug.previous.platforms
        state.debug.previous.platforms.length = 0
        const platforms = state.level.activeLevel.platforms
        for (const p of platforms) {
            prev.push(clonePlatform(p))
        }

        state.debug.previous.titan = clonePhysics(state.titan)
    }
}
