import { AABB } from "../../math/aabb.js";
import { Vector2D } from "../../math/vector.js";
import * as Window from "../../window.js";
import { debugForCallCount, debugForTickCount } from "../../debug.js";
import * as TitanInput from "./input.js";
import {CALEB_HEIGHT as HEIGHT, CALEB_WIDTH as WIDTH} from "./utils.js";
import * as TitanPhysics from "./physics.js";
import * as Operations from "../../state/operations.js";
import { assert } from "../../assert.js";

const debugLog = debugForCallCount(100);

/** @param state {GameState}
/** @returns {Titan} */
export function createTitan(state) {
    return {
        opts: state.opts.titan,

        platform: {
            platform: null,
            tick: 0,
        },

        physics: {
            current: {
                vel2: new Vector2D(0, 0),
                acc: new Vector2D(0, 0),
                vel: new Vector2D(0, 0),
                body: new AABB(state.level.activeLevel.initialPosition.clone(), 0.5, 1),
            },
            next: {
                vel2: new Vector2D(0, 0),
                acc: new Vector2D(0, 0),
                vel: new Vector2D(0, 0),
                body: new AABB(state.level.activeLevel.initialPosition.clone(), 0.5, 1),
            }
        },

        dead: false,
        deadAt: 0,

        hodl: TitanInput.defaultHodlState(state.opts.titan),
        jump: TitanInput.defaultJumpState(),
        dash: TitanInput.defaultDashStat(),
        fFtT: TitanInput.defaultfFtT(),
        portal: TitanInput.defaultPortal(),
        changingLevels: false,

        renderWidth: 0,
        renderHeight: 0,
        renderX: 0,
        renderY: 0,

        // I don't know wghat the canvas coloring mechanism is yet
        renderColor: "#FFFFFF",
    };
}

/**
* @param state {GameState}
* @param delta {number}
* @returns {boolean}
*/
function updateJump(state, delta) {
    const deltaNorm = delta / 1000
    const titan = state.titan
    const next = state.titan.physics.next;
    const body = next.body
    const vel = next.vel
    const cJump = titan.jump;
    const jumpOpts = titan.opts.jump;
    const jumping = cJump.jumping

    if (jumping) {
        if (cJump.jumpStart === null) {
            cJump.jumpStart = body.pos.clone();
        }

        const dist = Math.abs(body.pos.y - cJump.jumpStart.y);
        const remaining = cJump.jumpDistance - dist;
        const easing = remaining <= jumpOpts.jumpEaseRange

        let jump = cJump.jumpDir * jumpOpts.jumpNormHeight;
        let jumpNormDist = jump * deltaNorm;
        if (!easing && remaining - Math.abs(jumpNormDist) <= jumpOpts.jumpEaseRange) {

            const correctedDist = remaining - jumpOpts.jumpEaseRange;
            const correctedJump = correctedDist / deltaNorm

            // 0.01 is a bonus to force into easing
            jump = cJump.jumpDir * (correctedJump + 0.01);
        } else if (easing) {
            jump = cJump.jumpDir * jumpOpts.jumpEaseRange * 2;
        }

        cJump.jumping = remaining > 0;
        vel.y = jump
    }

    cJump.noJumpTime -= delta
    return jumping
}

/**
* @param state {GameState}
* @param delta {number}
* @returns {boolean}
*/
function updateDash(state, delta) {
    const deltaNorm = delta / 1000
    const titan = state.titan
    const next = titan.physics.next;
    const body = next.body
    const vel = next.vel

    const dash = titan.dash;
    const opts = titan.opts.dash;

    const dashing = dash.dashing
    if (dashing) {
        if (dash.dashStart === null) {
            dash.dashStart = body.pos.clone();
        }

        const dist = Math.abs(body.pos.x - dash.dashStart.x);
        const remaining = dash.dashDistance - dist;
        const easing = remaining <= opts.dashEaseRange

        let dashDist = dash.dashDir * opts.dashNormWidth;
        let dashNormDist = dashDist * deltaNorm;

        if (!easing && remaining - Math.abs(dashNormDist) <= opts.dashEaseRange) {

            const correctedDist = remaining - opts.dashEaseRange;
            const correctedJump = correctedDist / deltaNorm

            // 0.01 is a bonus to force into easing
            dashDist = dash.dashDir * (correctedJump + 0.01);
        } else if (easing) {
            dashDist = dash.dashDir * opts.dashEaseRange * 2;
        }

        dash.dashing = remaining > 0;
        vel.x = dashDist
    }

    dash.noDashTime -= delta
    return dashing
}
/**
* @param {GameState} state
*/
function updatePortal(state) {
    const titan = state.titan
    if (!titan.portal.portaling || titan.portal.tick === state.tick) {
        return false
    }

    // TODO should i move all these data retrievals behind an interface?
    const aabb = titan.physics.current.body
    const level = state.level.activeLevel

    assert(!!level, "performing a titan portal and there is no active level...")
    let found = false
    for (const p of level.platforms) {
        const portal = p.behaviors.portal
        if (!!portal && p.physics.current.body.intersects(aabb)) {

            const vel = titan.physics.current.vel.clone()

            TitanInput.resetJumpState(state);
            TitanInput.resetDashState(state);
            TitanInput.resetPlatformHold(state)

            const {
                platform: next,
                level,
            } = Operations.findPlatformById(state, portal.to)
            titan.portal.to = level

            // TODO: ?? is this really the best option?  the only downfall would be portals of height 1
            // that would put titan into potentially an obstacle which is currently undefined behavior
            titan.physics.next.body.pos.set(next.physics.current.body.center())

            if (titan.physics.current.vel2) {
                vel.add(titan.physics.current.vel2)
            }

            titan.physics.next.vel2 = next.behaviors.portal.normal.clone().multiply(vel.magnitude())
            found = true
            break
        }
    }

    if (!found) {
        TitanInput.resetPortalState(state)
    }

    return true
}

/**
* @param state {GameState}
* @param delta {number}
*/
function forceRemainingOnMovingPlatform(state, delta) {
    const plat = state.titan.platform

    if (
        plat.platform && state.tick - 1 > plat.tick ||
        !plat.platform ||
        state.titan.dash.dashing || state.titan.jump.jumping
    ) {
        return
    }

    const pphys = plat.platform.physics.next
    const cphys = state.titan.physics.next
    if (pphys.body.intersects(cphys.body)) {
        return
    }

    const diff = pphys.body.pos.y - (cphys.body.pos.y + HEIGHT)
    cphys.body.pos.y += diff
}

/**
* @param state {GameState}
* @param delta {number}
*/
function updatePosition(state, delta) {
    const titan = state.titan;
    const next = titan.physics.next;
    const pos = next.body.pos
    const vel = next.vel

    let deltaNorm = delta / 1000;

    if (updatePortal(state)) {
    } else if (updateDash(state, delta)) {
    } else if (updateJump(state, delta)) {
    } else {
        vel.add(state.opts.gravity.multiplyCopy(deltaNorm));
        forceRemainingOnMovingPlatform(state, delta)
    }

    next.body.pos = pos.
        add(vel.clone().multiply(deltaNorm)).
        add(next.vel2.clone().multiply(deltaNorm));

    next.vel2.multiply(1 - (deltaNorm / 2.0)); // <-- delta norm rate?
}

/**
 * @param {GameState} state
 * @param {number} _
 */
export function check(state, _) {
    if (state.titan.changingLevels) {
        return
    }

    TitanPhysics.testCollisions(state);
}

/**
* @param state {GameState}
* @param _ {number}
*/
export function apply(state, _) {
    const titan = state.titan
    const next = titan.physics.next;
    const curr = titan.physics.current;

    curr.body.set(next.body)
    curr.vel.set(next.vel)
    curr.acc.set(next.acc)

    // techincally i could move this into the engine side not in each update
    Window.projectInto(state.getDim(), titan, next.body);

    if (titan.portal.portaling && titan.portal.tick !== state.tick) {
        Operations.setLevel(state, titan.portal.to, curr.body.pos)
        titan.portal.tick = state.tick
    }
}

/**
* @param {GameState} state
*/
export function render(state) {
    const ctx = state.getCtx();

    ctx.fillStyle = "black";
    const titan = state.titan
    ctx.fillRect(titan.renderX, titan.renderY, titan.renderWidth, titan.renderHeight);
}

/**
* @param gameState {GameState}
* @param delta {number}
*/
export function update(gameState, delta) {
    const titan = gameState.titan
    if (titan.dead || delta === 0 || titan.changingLevels) {
        return;
    }

    if (titan.hodl.hodlTime > 0) {
        titan.hodl.hodlTime -= delta
    } else {
        updatePosition(gameState, delta);
    }

}

/**
* @param state {GameState}
*/
export function tickClear(state) {
    const titan = state.titan
    if (!titan.dead && titan.physics.current.body.pos.y > Window.FULL_HEIGHT + 3) {
        titan.dead = true;
        titan.deadAt = state.now()
    }

    if (titan.portal.portaling) {
        TitanInput.resetPortalState(state);
    }
}
