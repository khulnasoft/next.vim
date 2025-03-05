import * as Utils from "../utils.js"
import * as Window from "../window.js"
import * as Titan from "../objects/titan/titan.js"

/**
 * @param state {GameState}
 */
export function projectStaticObjects(state) {
    const ctx = state.getCtx();
    if (ctx === null) {
        return
    }

    for (const p of state.level.activeLevel.platforms) {
        const render = p.behaviors.render
        if (!render) {
            continue
        }

        Window.projectInto(ctx.canvas, render, p.physics.current.body);
    }
}

/**
 * @param state {GameState}
 */
export function reset(state) {
    if (!state.level.activeLevel) {
        state.level.activeLevel = state.level.levels[state.level.initialLevel]
    }

    state.titan = Titan.createTitan(state)
    state.gameOver = false;
    state.loopStartTime = Utils.now()
    state.loopDelta = 0;
    state.levelChanged = true
    state.titan.changingLevels = true
}

/**
 * @param {GameOptions} opts
 * @param {InputState} input
 * @param {() => Dimension} getDim
 * @param {() => CanvasRenderingContext2D | null} getCtx
 * @param {LevelSet} level
 * @returns {GameState}
 */
export function createGameState(opts, input, getDim, getCtx, level) {
    /** @type {GameState} */
    const state = {
        done: false,

        applyables: [],
        updateables: [],
        renderables: [],

        debug: {
            previous: {
                platforms: [],
                titan: null,
            },
        },
        opts,
        now: Utils.now,
        level,
        levelChanged: true,

        getDim,
        getCtx,

        tick: 0,

        titan: null,
        gameOver: false,
        loopStartTime: 0,
        loopDelta: 0,
        rn: {zero: 1},
        input,
    };

    return state
}
