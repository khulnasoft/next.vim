import { now } from "../utils.js"

/**
 * @param {EditorState} state
 * @param {ElementState} es
*/
export function down(state, es) {
    state.mouse.state = "down"
    state.mouse.startingEl = es
    state.mouse.startTime = now()
}

/**
 * @param {EditorState} state
*/
export function clearState(state) {
    state.mouse.startingEl = null
    state.mouse.state = "invalid"
}

/**
 * maintains startingEl for selection purposes
 * @param {EditorState} state
*/
export function up(state) {
    state.mouse.state = "invalid"
}

/**
 * @param {EditorState} state
 * @returns {boolean}
*/
export function isDown(state) {
    return state.mouse.state === "down"
}

/**
 * @param {EditorState} state
 * @returns {number}
*/
export function duration(state) {
    return isDown(state) && now() - state.mouse.startTime || 0
}
