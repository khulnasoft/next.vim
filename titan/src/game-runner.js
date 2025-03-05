import * as Input from "./input/input.js";
import * as Titan from "./objects/titan/titan.js";
import * as TitanInput from "./objects/titan/input.js";
import * as Debugger from "./debug.js";
import * as DebugRender from "./debug-render.js";
import * as Level from "./objects/level/level.js"
import * as RN from "./objects/relative_numbers.js";
import * as State from "./state/state.js";
import * as Operations from "./state/operations.js";

/**
 * @param {GameState} state
 * @param {GameLoop} loop
 * @param {GameTick[]} ticks
 * @param {(e: Error) => void} done
 * @param {number} until
 */
export function run(
    state,
    loop,
    ticks,
    done,
    until = 0,
) {
    let stackOverflowPrevention = 0
    function onLoop() {
        if (state.done) {
            done(null)
            return
        }

        stackOverflowPrevention++
        if (stackOverflowPrevention > 500) {
            stackOverflowPrevention = 0
            setTimeout(onLoop)
            return
        }

        try {
            for (const tick of ticks) {
                tick(state)
            }
        } catch (e) {
            done(e)
            return
        }

        if (until === 0 || state.tick <= until) {
            loop(onLoop)
        } else {
            done(null)
        }
    }

    loop(onLoop)
}

/**
 * @param {GameState} state
 */
export function clear(state) {
    state.applyables.length = 0
    state.renderables.length = 0
    state.updateables.length = 0
}


/**
 * @param {GameState} state
 */
export function addStandardBehaviors(state) {
    state.updateables.push(Input, TitanInput, Debugger, RN)
    state.applyables.push(Level, Titan, DebugRender)
    state.renderables.push(Titan, Level, RN, DebugRender)
}

/**
 * @param {GameState} state
 * @param {UpdateableModule} update
 * */
export function addUpdater(state, update) {
    state.updateables.push(update)
}

/**
 * @param {GameState} state
 * @param {UpdateAndApplyModule} apply */
export function addApplyer(state, apply) {
    state.applyables.push(apply)
}

/**
 * @param {GameState} state
 * @param {RenderableModule} render
 * */
export function addRenderer(state, render) {
    state.renderables.push(render)
}

/**
 * @param {GameState} state
 */
export function tickWithRender(state) {
    const delta = state.loopDelta
    state.tick++

    // TODO probably need opts?
    if (state.titan.dead && state.loopStartTime - state.titan.deadAt > 1000) {
        State.reset(state);
        return;
    }

    if (state.levelChanged) {
        Operations.clearLevelChange(state);
        State.projectStaticObjects(state)
    }

    for (const input of state.updateables) {
        input.update(state, delta);
    }

    let deltaRemaining = delta
    while (deltaRemaining > 0) {
        const time = Math.min(state.opts.tickTimeMS, deltaRemaining)
        for (const u of state.applyables) {
            u.update(state, time);
        }
        for (const u of state.applyables) {
            u.check(state, time);
        }
        for (const u of state.applyables) {
            u.apply(state, time);
        }
        deltaRemaining -= time
    }

    const ctx = state.getCtx()
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const r of state.renderables) {
        r.render(state);
    }

    for (const input of state.updateables) {
        input.tickClear(state);
    }

    for (const u of state.applyables) {
        u.tickClear(state);
    }
}

/**
 * @param {GameState} state
 */
export function tickWithoutRender(state) {
    const delta = state.loopDelta

    state.tick++

    // TODO probably need opts?
    if (state.titan.dead && state.loopStartTime - state.titan.deadAt > 1000) {
        State.reset(state);
        return;
    }

    if (state.levelChanged) {
        Operations.clearLevelChange(state);
    }

    for (const input of state.updateables) {
        input.update(state, delta);
    }

    let deltaRemaining = delta
    while (deltaRemaining > 0) {
        const time = Math.min(state.opts.tickTimeMS, deltaRemaining)
        for (const u of state.applyables) {
            u.update(state, time);
        }
        for (const u of state.applyables) {
            u.check(state, time);
        }
        for (const u of state.applyables) {
            u.apply(state, time);
        }
        deltaRemaining -= time
    }

    for (const input of state.updateables) {
        input.tickClear(state);
    }

    for (const u of state.applyables) {
        u.tickClear(state);
    }
}

/**
 * @param {GameState} state
 * @returns {GameLoop}
 */
export function createGameLoop(state) {

    /**
    * @param {() => void} cb
    */
    function runCb(cb) {
        const delta = state.now() - state.loopStartTime
        state.loopStartTime = state.now();
        state.loopDelta = delta;
        cb()
    }

    return function(cb) {
        const start = state.now()
        const goal = state.loopStartTime + state.opts.frameTimeMS

        if (start > goal) {
            requestAnimationFrame(() => runCb(cb))
        } else {
            setTimeout(() => runCb(cb), goal - start);
        }
    }
}

/**
 * @param {GameState} state
 * @param {(time: number) => void} setTime
 * @returns {GameLoop}
 */
export function createSimulatedGameLoop(state, setTime) {
    return function(cb) {
        setTime(state.loopStartTime + state.opts.frameTimeMS)
        state.loopStartTime = state.now();
        state.loopDelta = state.opts.frameTimeMS
        cb()
    }
}
