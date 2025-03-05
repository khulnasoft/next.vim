import * as Input from "../../input/input.js"
import { ZERO } from "../../math/vector.js";
import * as Level from "../level/level.js"
import * as TitanUtils from "./utils.js";

/**
 * @param {-1 | 1} dir
 * @returns {InputHandler}
 */
function moveWB(dir) {
    return function(state) {
        if (state.titan.dash.dashing) {
            return false;
        }

        const titan = state.titan;
        const dash = titan.dash;

        const row = TitanUtils.getNextRow(state.titan)
        const col = TitanUtils.getNextCol(state.titan)
        const letters = Level.getLetters(state, row)

        let destination = -1
        for (const {idx} of letters) {
            if (dir === -1 && idx < col) {
                destination = idx
            } else if (dir === 1 && idx > col) {
                destination = idx
            }
        }

        if (destination === -1) {
            return
        }

        resetJumpState(state);
        resetDashState(state);
        resetVel2(state);

        const distance = destination - state.titan.physics.next.body.pos.x + TitanUtils.CALEB_WIDTH
        dash.dashing = true;
        dash.dashDistance = Math.abs(distance)
        dash.dashStart = null
        dash.dashDir = distance > 0 ? 1 : -1
        if (dash.dashDir === 1) {
            dash.dashDistance -= TitanUtils.CALEB_WIDTH
        }

        return true;
    }
}

/**
 * @param {GameState} state
 */
function movePortal(state) {
    const titan = state.titan;
    titan.portal.portaling = true
    titan.portal.tick = 0
    return true
}

/**
 * @param {-1 | 1} dir
 * @returns {InputHandler}
 */
function moveKJ(dir) {

    return function(state) {
        if (state.titan.jump.noJumpTime > 0) {
            return false;
        }

        const input = state.input;
        const titan = state.titan;
        const jump = titan.jump;
        const opts = titan.opts.jump;
        const number = Math.min(Math.max(state.input.numericModifier, 1), 15)

        input.numericModifier = 0
        jump.jumping = true;
        jump.jumpDistance = number
        jump.jumpStart = null
        jump.noJumpTime = (number * opts.noJumpMultiplier) + opts.noJumpBase;
        jump.jumpDir = dir

        if (dir === 1) {
            jump.jumpDistance -= TitanUtils.CALEB_HEIGHT
        }

        resetDashState(state);
        resetVel2(state);

        return true;
    }
}

/**
 * @param dir {number}
 * @returns {InputHandler}
 */
function moveHL(dir) {
    return function(state) {
        resetVel2(state);
        state.titan.physics.next.vel.x = state.opts.titan.normWidthsPerSecond * dir
        return true;
    }
}

/**
 * @param {fFtTKey} key
 * @returns {InputHandler}
 */
function movefFtT(key) {
    return function(state) {
        state.titan.fFtT.type = key
        state.titan.fFtT.startTick = state.tick
        state.input.anykey = completefFtT;

        // modifies a structure while iterating it...
        state.input.inputs.length = 0

        return true;
    }
}

/**
 * @param {GameState} state
 */
function completeCommand(state) {
    const input = state.input.inputs[0]
    if (!input) {
        return
    }

    state.input.inputs.length = 0
    state.input.anykey = null
    if (input.key === "q") {
        state.done = true
    }
}

/**
 * @param {GameState} state
 * @returns {boolean}
 */
function command(state) {
    state.input.anykey = completeCommand;
    state.input.inputs.length = 0
    return true;
}

/**
 * @param {GameState} state
 */
function completefFtT(state) {
    const titan = state.titan;
    const fFtT = titan.fFtT;
    const dash = titan.dash;
    const input = state.input.inputs[0];
    if (!input) {
        return;
    }

    state.input.inputs.length = 0;
    state.input.anykey = null;

    const row = TitanUtils.getNextRow(state.titan);
    const col = TitanUtils.getNextCol(state.titan);
    const letters = Level.getLetters(state, row);
    let destination = -1;
    for (const {key, idx} of letters) {
        if (input.key === key) {
            if ((fFtT.type === "f" || fFtT.type === "t") && idx > col ||
                (fFtT.type === "F" || fFtT.type === "T") && idx < col) {
                destination = idx;
                break;
            }
        }
    }

    if (destination === -1) {
        return;
    }

    resetJumpState(state);
    resetDashState(state);
    resetVel2(state);

    // Adjust destination based on motion type (f/F/t/T)
    if (fFtT.type === "t") {
        destination -= TitanUtils.CALEB_WIDTH - 0.01; // Move before character
    } else if (fFtT.type === "T") {
        destination += 1.01; // Move after character
    }

    const distance = destination - TitanUtils.getNextX(titan);
    dash.dashing = true;
    dash.dashDistance = Math.abs(distance);
    dash.dashStart = null;
    dash.dashDir = distance > 0 ? 1 : -1;

    titan.physics.next.acc.x = 0;
    titan.physics.next.acc.y = 0;
}

/**
* @param {string} key
* @param {InputHandler} next
* @returns {InputHandler}
*/
function filter(key, next) {
    return function(state, input) {
        if (key !== input.key) {
            return false;
        }
        return next(state, input);
    }
}

function onDown(next) {
    return function(state, input) {
        if (input.type !== "down" && input.type !== "down-up") {
            return false;
        }
        return next(state, input);
    }
}

const _0 = "0".charCodeAt(0)
const _9 = "9".charCodeAt(0)

/**
 * @param {InputHandler} next
 * @returns {InputHandler}
 */
function isNumeric(next) {
    return function(state, input) {
        const code = input.key.charCodeAt(0)
        if (code < _0 || code > _9) {
            return false;
        }
        return next(state, input);
    }
}

/**
 * @param {GameState} state
 * @param {Input} input
 * @returns boolean
 */
function numericModifier(state, input) {
    state.input.numericModifier *= 10
    state.input.numericModifier += +input.key
    return true;
}

const h = filter("h", moveHL(-1));
const l = filter("l", moveHL(1));
const j = onDown(filter("j", moveKJ(1)));
const k = onDown(filter("k", moveKJ(-1)));
const w = onDown(filter("w", moveWB(1)));
const b = onDown(filter("b", moveWB(-1)));
const f = onDown(filter("f", movefFtT("f")));
const t = onDown(filter("t", movefFtT("t")));
const F = onDown(filter("F", movefFtT("F")));
const T = onDown(filter("T", movefFtT("T")));
const quit = onDown(filter(":", command));
const numeric = onDown(isNumeric(numericModifier))
const portal = onDown(filter("%", movePortal));

/**
 * @param {GameState} state
 */
function handleHL(state) {
    if (state.input.anykey) {
        state.titan.physics.next.vel.x = 0
        return
    }

    const hInput = Input.get(state.input, "h")
    const lInput = Input.get(state.input, "l")

    if (hInput && !lInput) {
        h(state, hInput)
    } else if (!hInput && lInput) {
        l(state, lInput)
    } else if (!state.titan.dash.dashing) {
        state.titan.physics.next.vel.x = 0
    }
}

/**
 * @param {GameState} state
 * @param {number} _
 */
export function apply(state, _) { }

/**
 * @param {GameState} state
 * @param {number} _
 */
export function update(state, _) {
    handleHL(state);
    if (state.input.anykey) {
        state.input.anykey(state)
        return
    }

    for (const i of state.input.inputs) {
        numeric(state, i)
        j(state, i)
        k(state, i)
        w(state, i)
        b(state, i)
        f(state, i)
        F(state, i)
        t(state, i)
        T(state, i)
        quit(state, i)
        portal(state, i)
    }
}

/**
 */
export function tickClear() { }

/** @returns {TitanJump} */
export function defaultJumpState() {
    return {
        jumping: false,
        jumpDistance: 0,
        noJumpTime: 0,
        jumpDir: /** @type {-1 | 1} */(1),
        jumpStart: null,
    }
}

/** @param {TitanOpts} opts
/** @returns {TitanHodl} */
export function defaultHodlState(opts) {
    return {
        hodlTime: opts.hodlTime
    }
}


/** @returns {TitanDash} */
export function defaultDashStat() {
    return {
        dashing: false,
        dashDir: 1,
        dashStart: null,
        dashDistance: 0,
        noDashTime: 0,
    }
}

/** @returns {fFtT} */
export function defaultfFtT() {
    return {
        type: "f",
        startTick: 0,
    }
}

/** @returns {TitanPortal} */
export function defaultPortal() {
    return {
        portaling: false,
        to: 0,
    }
}


/**
 * @param state {GameState}
 */
export function resetPlatformHold(state) {
    state.titan.platform.platform = null
}

/**
 * @param state {GameState}
 */
export function resetVel2(state) {
    state.titan.physics.current.vel2.set(ZERO);
    state.titan.physics.next.vel2.set(ZERO);
}

/**
 * @param state {GameState}
 */
export function resetJumpState(state) {
    const jump = state.titan.jump
    state.titan.physics.next.vel.y = 0
    jump.jumping = false;
    jump.jumpDistance = 0;
    jump.noJumpTime = 0;
    jump.jumpDir = 1
    jump.jumpStart = null
}

/**
 * @param state {GameState}
 */
export function resetDashState(state) {
    const dash = state.titan.dash
    dash.dashing = false;
    dash.dashDistance = 0;
    dash.dashDir = 1;
    dash.noDashTime = 0;
}

/**
 * @param {GameState} state
 */
export function resetPortalState(state) {
    state.titan.portal.portaling = false
    state.titan.portal.tick = 0
}

