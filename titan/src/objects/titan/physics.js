import * as TitanInput from "./input.js";
import { assert } from "../../assert.js";
import * as Operations from "../../state/operations.js"
import { DO_NOT_USE_FOR_INITIAL_POS_OR_YOU_WILL_BE_FIRED } from "../level/level.js";

/**
 * @param {GameState} state
 */
export function testCollisions(state) {
    if (state.titan.hodl.hodlTime > 0) {
        return
    }

    const platforms = findCollisions(state)

    for (const p of platforms) {
        if (p.behaviors.obstacle) {
            collidePlatform(state, p)
        } else if (p.behaviors.next) {
            collideLevelChange(state, p)
        } else if (p.behaviors.instagib) {
            collideInstagib(state)
        }
    }
}

/**
 * @param {GameState} state
 * @returns {BasedPlatform[]}
 */
function findCollisions(state) {
    const nextAABB = state.titan.physics.next.body;
    const out = []
    for (const platform of state.level.activeLevel.platforms) {
        const platformAABB = platform.physics.next.body;
        if (nextAABB.intersects(platformAABB)) {
            out.push(platform)
        }
    }
    return out
}

/**
 * @param {GameState} state
 * @param {BasedPlatform} platform
 */
function collidePlatform(state, platform) {
    const prev = state.titan.physics.current;
    const next = state.titan.physics.next;
    const body = next.body;
    const dash = state.titan.dash;
    const jump = state.titan.jump;
    const opts = state.opts;
    const tolerance = opts.tolerance

    const platformAABB = platform.physics.next.body

    const left = prev.body.leftOf(platform.physics.current.body)
    const right = prev.body.rightOf(platform.physics.current.body)
    const top = prev.body.topOf(platform.physics.current.body)
    const bottom = prev.body.bottomOf(platform.physics.current.body)

    if (left || right) {
        if (dash.dashing && body.topOverlapBy(platformAABB, tolerance.topBy)) {
            body.pos.y = platformAABB.pos.y - body.height
        } else if (dash.dashing && body.bottomOverlapBy(platformAABB, tolerance.bottomBy)) {
            body.pos.y = platformAABB.pos.y + platformAABB.pos.y
        } else {
            next.vel.x = 0;
            next.vel2.x = 0;
            if (left) {
                body.pos.x = platformAABB.pos.x - body.width;
            } else {
                body.pos.x = platformAABB.pos.x + platformAABB.width
            }

            TitanInput.resetDashState(state);
        }
    } else if (top || bottom) {
        next.vel.y = 0;

        if (top) {
            body.pos.y = platformAABB.pos.y - body.height
            if (!dash.dashing && !jump.jumping) {
                const x = platform.physics.next.body.pos.x - platform.physics.current.body.pos.x
                next.body.pos.x += x
                state.titan.platform.platform = platform
                state.titan.platform.tick = state.tick
                TitanInput.resetVel2(state)
            } else {
                state.titan.platform.platform = null
                state.titan.platform.tick = state.tick
            }
        } else {
            body.pos.y = platformAABB.pos.y + platformAABB.height
        }

        TitanInput.resetJumpState(state);
    } else {
        // TODO Figure out how this happens and how to prevent it...
    }
}

/**
 * @param {GameState} state
 * @param {BasedPlatform} p
 */
function collideLevelChange(state, p) {
    const platform = p.behaviors.next
    const next = state.titan.physics.next;
    const body = next.body;

    if (platform.toLevelPosition.x !== DO_NOT_USE_FOR_INITIAL_POS_OR_YOU_WILL_BE_FIRED) {
        body.pos.x = platform.toLevelPosition.x
    } else if (platform.toLevelPosition.y !== DO_NOT_USE_FOR_INITIAL_POS_OR_YOU_WILL_BE_FIRED) {
        body.pos.y = platform.toLevelPosition.y
    }

    console.log(state.tick, "setLevel", platform.toLevel)
    Operations.setLevel(state, platform.toLevel, body.pos)
}

/**
 * @param {GameState} state
 */
function collideInstagib(state) {
    if (!state.titan.dead) {
        state.titan.deadAt = state.now()
    }
    state.titan.dead = true
}
