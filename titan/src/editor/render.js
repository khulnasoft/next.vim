import { assert } from "../assert.js"
import { Vector2D } from "../math/vector.js"
import * as Utils from "./utils.js"
import * as State from "./state.js"

/**
 * TODO perf
 * easy win would be to put a tick on each platform every time it changes and only recalc / re-render when i need to
 * @param {EditorState} state
 */
export function render(state) {
    for (const row of State.elements(state)) {
        for (const el of row) {
            if (el.selected) {
                el.el.classList.add("selected")
            } else {
                el.el.classList.remove("selected")
            }
        }
    }

    const platforms = State.platforms(state);
    for (const plat of platforms) {
        renderPlatform(state, plat)
    }

    // TODO configure?
    // ... wait... this is not something i need to do a bunch...
    const start = Utils.unproject(State.getUIRects(state), new Vector2D(state.outerRect.margin, state.outerRect.margin))
    const dims = Utils.unproject(State.getUIRects(state), new Vector2D(state.outerRect.maxX, state.outerRect.maxY)).subtract(start)
    state.worldOutline.style.width = `${Math.ceil(dims.x)}px`
    state.worldOutline.style.height = `${Math.ceil(dims.y)}px`
    state.worldOutline.style.top = `${Math.ceil(start.y)}px`
    state.worldOutline.style.left = `${Math.ceil(start.x)}px`
}

/**
 * @param {EditorState} state
* @param {EditorPlatform} platform
*/
export function renderPlatform(state, platform) {
    const editor = state.editor
    assert(!!editor, "editor has to exist in the app")

    if (platform.el === null) {
        platform.el = document.createElement("div")
        editor.appendChild(platform.el)
        platform.el.classList.add("platform")
    }

    const aabb = platform.AABB
    const pos = aabb.pos
    const start = state.elements[pos.y][pos.x]

    const rect = start.el.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const pW = w * aabb.width
    const pH = h * aabb.height
    const el = platform.el

    el.style.width = `${Math.ceil(pW)}px`
    el.style.height = `${Math.ceil(pH)}px`
    el.style.top = `${Math.ceil(rect.top)}px`
    el.style.left = `${Math.ceil(rect.left)}px`

    if (platform.selected) {
        el.classList.add("selected")
    } else {
        el.classList.remove("selected")
    }

    for (const [k, b] of Object.entries(platform.behaviors)) {
        el.classList.remove(k)
        if (b) {
            el.classList.add(k)
            if (b.type === "lettered") {
                el.innerText = b.letter
                const minDim = Math.min(pW, pH)
                el.style.fontSize = `${Math.floor(minDim * 0.9)}px`
            }
        }
    }

}
