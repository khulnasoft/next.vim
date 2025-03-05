import * as Utils from "./utils.js";
import * as Input from "./input/input.js";
import * as State from "./state/state.js";
import * as Simulation from "./simulation/state.js";
import * as Window from "./window.js";
import { Vector2D } from "./math/vector.js";
import * as Ease from "./math/ease.js";
import { GAME_HEIGHT, GAME_WIDTH } from "./window.js";
import { assert } from "./assert.js";

/**
 * @param canvas {HTMLCanvasElement}
 */
function configureCanvas(canvas) {
    canvas.getContext("2d").imageSmoothingEnabled = false;
    canvas.tabIndex = 0;
    canvas.focus();
    canvas.addEventListener('blur', () => {
        canvas.focus();
    });
    // TODO: this will probably need to fixed
    window.addEventListener('click', () => {
        canvas.focus();
    });

    window.addEventListener("resize", function() {
        Window.resize(canvas);
    });
    Window.resize(canvas);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {GameOptions} gameopts
 * @param {LevelSet} levelSet
 * @returns {GameState}
 */
export function createCanvasGame(canvas, gameopts, levelSet) {
    configureCanvas(canvas)

    const ctx = canvas.getContext("2d")
    assert(!!ctx, "unable to get context from the canvas")

    const inputState = Input.createInputState();
    const state = State.createGameState(
        gameopts,
        inputState,
        () => canvas,
        () => ctx,
    levelSet);
    State.reset(state);

    // @ts-ignore
    window.state = state

    return state
}

/**
 * @param {GameState} state
 */
export function addBrowserListeners(state) {
    window.addEventListener("resize", function() {
        State.projectStaticObjects(state);
    });
}

/**
 * @param {SimRand} rand
 * @param {GameOptions} opts
 * @param {LevelSet} levelSet
 *
 * @returns {{
 *     state: GameState,
 *     sim: SimState,
 * }}
 */
export function createSimGame(rand, opts, levelSet) {
    const inputState = Input.createInputState();

    /** @type {Dimension} */
    const dim = {width: GAME_WIDTH * 100, height: GAME_HEIGHT * 100}
    function getDim() { return dim }
    function getCtx() { return null }

    const state = State.createGameState(
        opts,
        inputState,
        getDim,
        getCtx,
        levelSet
    );
    State.reset(state);

    const sim = Simulation.createSimState(state, {
        maxJump: 15,
        waitRange: {start: 100, stop: 500},
        holdRange: {start: 100, stop: 1500},
    }, rand);

    return {
        sim,
        state,
    }
}

/**
 * @param {boolean} debug
 * @returns {GameOptions}
 */
export function getGameConfig(debug) {
    return {
        debug,

        frameTimeMS: 16,
        tickTimeMS: 8,

        titan: {
            hodlTime: 500,
            normWidthsPerSecond: 16,
            dash: {
                dashNormWidth: 70,
                distance: 5,
                dashEaseRange: 0.10
            },

            jump: {
                jumpEaseRange: 0.10,
                jumpNormHeight: 70,
                noJumpBase: 450,
                noJumpMultiplier: 350,
            }
        },

        tolerance: {
            topBy: 0.15,
            bottomBy: 0.15,
        },

        gravity: new Vector2D(0, 28),
    }
}

/**
 * @param {SimRand} rand
 * @returns {GameOptions}
 */
export function getSimGameConfig(rand) {
    return {
        debug: false,

        frameTimeMS: rand.randRange(50, 2),
        tickTimeMS: rand.randRange(50, 2),

        titan: {
            hodlTime: rand.randRange(1000),
            normWidthsPerSecond: rand.randRange(20),
            dash: {
                dashNormWidth: rand.randRange(50),
                distance: rand.randRange(15),
                dashEaseRange: rand.rand() * 5
            },

            jump: {
                jumpEaseRange: rand.rand() * 5,
                jumpNormHeight: rand.randRange(50),
                noJumpBase: rand.randRange(1000),
                noJumpMultiplier: rand.randRange(1000),
            }
        },

        tolerance: {
            topBy: rand.randRange(0.45),
            bottomBy: rand.randRange(0.45),
        },

        gravity: new Vector2D(0, rand.randRange(48, 2)),
    }
}
