import * as TitanUtils from "../objects/titan/utils.js"
import * as Level from "../objects/level/level.js"
import * as Input from "../input/input.js"

/**
 * @param {GameState} state
 * @param {SimOptions} opts
 * @param {SimRand} rand
 * @returns {SimState}
 */
export function createSimState(state, opts, rand) {
    return {
        opts,
        rand,
        state,
        action: null,
    };
}

/**
 * @param {{key: string}} act
 * @returns {boolean}
 */
function isfFtT(act) {
    return act.key === "f" ||
        act.key === "F" ||
        act.key === "t" ||
        act.key === "T"
}

/**
 * @param {{key: string}} act
 * @returns {boolean}
 */
function isJump(act) {
    return act.key === "k" ||
        act.key === "j"
}

const randomLetters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+[{(&=)}]*"
const possibleActions = [
    {key: "f"},
    {key: "F"},
    {key: "t"},
    {key: "T"},
    {key: "w"},
    {key: "b"},
    {key: "j"},
    {key: "k"},
    {key: "h"},
    {key: "l"},
    {key: ""},
]

/**
 * @param {SimState} state
 * @param {string} key
 * @returns {SimKeyAction}
 */
function createRandomAction(state, key) {
    return {
        key,
        held: state.rand.randRangeR(state.opts.holdRange),
        wait: state.rand.randRangeR(state.opts.waitRange),
        downPerformed: false,
        upPerformed: false,
    };
}

/**
 * @param {GameState} gstate
 * @param {SimState} state
 * @returns {SimKeyAction[]}
 */
function getNextAction(gstate, state) {
    const nextAction = possibleActions[state.rand.randRange(possibleActions.length)]

    if (isfFtT(nextAction)) {
        const letters = Level.getLettersByRow(gstate, TitanUtils.getRow(gstate.titan)).filter(x => x)
        let randLet = letters.length > 0 ?
            letters[state.rand.randRange(letters.length)] :
            randomLetters[state.rand.randRange(randomLetters.length)];

        return [
            createRandomAction(state, nextAction.key),
            createRandomAction(state, randLet),
        ]
    } else if (isJump(nextAction)) {
        const modifier = state.rand.randRange(state.opts.maxJump)
        return [
            createRandomAction(state, String(modifier)),
            createRandomAction(state, nextAction.key),
        ]
    }

    return [createRandomAction(state, nextAction.key)]
}

/**
 * @param {SimKeyAction} action
 * @returns {number}
 */
function remaining(action) {
    return action.held + action.wait
}

/**
 * @param {SimState} state
 * @returns {GameTick}
 */
export function createSimulationTick(state) {
    return function tick(gstate) {
        const delta = gstate.loopDelta
        if (state.action === null) {
            state.action = {
                actions: getNextAction(gstate, state),
                idx: 0,
                start: gstate.loopStartTime,
            }
        }


        const a = state.action
        if (a.idx >= a.actions.length) {
            state.action = null
            return
        }

        const curr = a.actions[a.idx]
        if (remaining(curr) < 0) {
            a.idx++
            return
        }

        /** @type {KeyEvent} */
        const keyEvent = {
            key: curr.key,
            type: "keydown",
            repeat: !curr.downPerformed,
        }

        if (curr.held > 0) {
            if (!curr.downPerformed) {
                curr.downPerformed = true
            }

            curr.held -= delta
            Input.processKey(gstate.input, keyEvent)
        } else {
            if (!curr.upPerformed) {
                curr.upPerformed = true
                keyEvent.key = "keyup"
                keyEvent.repeat = false
                Input.processKey(gstate.input, keyEvent)
            }
            curr.wait -= delta
        }
    }
}
