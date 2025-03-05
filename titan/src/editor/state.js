import { assert } from "../assert.js";
import { AABB } from "../math/aabb.js";
import { Vector2D } from "../math/vector.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../window.js";
import * as Mouse from "./mouse.js"
import * as Platform from "./platform.js"
import * as Utils from "./utils.js"
import * as Consts from "./consts.js"
import * as Level from "../objects/level/level.js"
import * as LevelUtils from "../objects/level/levels/utils.js"

export {Mouse}

/**
 * @param {EditorState} state
 */
export function change(state) {
    state.change++
}

/**
 * @param {EditorState} state
 * @returns {LevelSet}
 */
export function gameLevelSet(state) {
    const ls = levelSet(state);
    return LevelUtils.convertLevelSet(ls)
}

/**
 * @param {EditorState} state
 * @returns {EditorRects}
 */
export function getUIRects(state) {
    return {
        editorRect: state.editor.getBoundingClientRect(),
        elementRect: state.elements[0][0].el.getBoundingClientRect(),
    }
}

/**
 * @param {EditorState} state
 * @returns {EditorLevelSet}
 */
export function levelSet(state) {
    assert(!!state.levelSet, "levelSet called on malformed editor state")
    return state.levelSet
}

/**
 * @param {EditorState} state
 * @param {number} idx
 * @returns {EditorLevel}
 */
export function levelByIdx(state, idx) {
    const ls = levelSet(state)
    const level = ls.levels[idx]
    assert(!!level, "you selected a level that does not exist", "idx", idx, ls)
    return level
}

/**
 * @param {EditorState} state
 */
export function addNewLevel(state) {
    const ls = levelSet(state)
    ls.levels.push(createEmptyLevel())
}

/**
 * @param {EditorState} state
 * @param {number} idx
 */
export function selectLevelByIdx(state, idx) {
    levelByIdx(state, idx)
    state.levelSet.current = idx
}

/**
 * @param {EditorState} state
 * @returns {number}
 */
export function initialLevelIdx(state) {
    initialLevel(state)
    return state.levelSet.initialLevel
}

/**
 * @param {EditorState} state
 * @returns {EditorLevel}
 */
export function initialLevel(state) {
    const ls = levelSet(state)
    const l = ls.levels[ls.initialLevel]
    assert(!!l, "somehow you have requested a level that doesn't exist", ls)
    return l
}


/**
 * @param {EditorState} state
 * @returns {EditorLevel}
 */
export function level(state) {
    const ls = levelSet(state)
    const l = ls.levels[ls.current]
    assert(!!l, "somehow you have requested a level that doesn't exist", ls)
    return l
}

/**
 * @param {EditorState} state
 * @returns {ElementState[][]}
 */
export function elements(state) {
    assert(state.elements.length > 0, "calling elements on malformed objects")
    return state.elements
}

/**
 * @param {EditorState} state
 * @returns {EditorPlatform[]}
 */
export function platforms(state) {
    return level(state).platforms
}

/**
 * @param {EditorState} state
 * @param {(plat: EditorPlatform) => void} cb
 */
export function forEachAllPlatform(state, cb) {
    for (const level of state.levelSet.levels) {
        for (const p of level.platforms) {
            cb(p)
        }
    }
}

/**
 * @param {EditorState} state
 */
export function releasePlatform(state) {
    const p = activePlatform(state);
    p.selected = null;
    state.activePlatform = null;
}

/**
 * @param {EditorState} state
 * @param {MouseEvent} evt
 * @returns {EditorPlatform}
 */
export function selectPlatform(state, evt) {
    const found = Search.platform(state, evt)
    assert(found !== null, "select platform was called and unable to select platform")

    found.selected = {
        offset: Utils.toVec(evt),
        starting: found.AABB.pos,
        moving: false,
        tick: found.selected ? found.selected.tick : state.tick
    }
    state.activePlatform = found

    return found;
}

/**
 * @param {EditorState} state
 * @returns {EditorPlatform}
 */
export function deletePlatform(state) {
    const platform = activePlatform(state);
    const plats = platforms(state);
    const idx = plats.indexOf(platform)
    if (hasActivePlatform(state)) {
        clearActiveState(state);
    }

    assert(idx > -1, "platform that is being removed doesn't exist");

    const [p] = plats.splice(idx, 1);
    p.el.remove()
    p.el = null

    change(state);
    return p
}

/**
 * @param {EditorState} state
 * @returns {EditorPlatform}
 */
export function activePlatform(state) {
    const plat = state.activePlatform
    assert(!!plat, "expected active platform");
    return plat
}

/**
 * @param {EditorState} state
 */
export function unsetActivePlatform(state) {
    const ap = activePlatform(state)
    ap.selected = null
    state.activePlatform = null
}

/**
 * @param {EditorState} state
 * @param {ElementState} end
 * @param {ElementState} start
 */
export function createSelected(state, end, start = state.mouse.startingEl) {
    assert(start !== null, "you must call createBox after we have selected as starting element")
    clearSelectElements(state);

    const rStart = Math.min(start.pos.y, end.pos.y)
    const rEnd = Math.max(start.pos.y, end.pos.y)
    const cStart = Math.min(start.pos.x, end.pos.x)
    const cEnd = Math.max(start.pos.x, end.pos.x)

    for (let r = rStart; r <= rEnd; ++r) {
        for (let c = cStart; c <= cEnd; ++c) {
            const el = state.elements[r][c]
            el.selected = true
            state.selectedElements.push(el)
        }
    }
}

/**
 * @param {EditorState} state
 * @returns {boolean}
 */
export function hasActivePlatform(state) {
    const plat = state.activePlatform
    return !!plat
}

export function clearSelectElements(state) {
    for (const el of state.selectedElements) {
        el.selected = false
    }
    state.selectedElements.length = 0
}

/**
 * @param {EditorState} state
 */
export function hasSelected(state) {
    return state.selectedElements.length > 0
}

/**
 * @param {EditorState} state
 */
export function clearPlatformElements(state) {
    const ps = platforms(state)
    for (const p of ps) {
        p.el.remove()
        p.el = null
    }
}

/**
 * @param {EditorState} state
 */
export function clearActiveState(state) {
    clearSelectElements(state);
    Mouse.clearState(state);
    if (hasActivePlatform(state)) {
        releasePlatform(state);
    }
}

/**
 * @param {EditorState} state
 */
export function cleanPlatformSelectedState(state) {
    const ls = levelSet(state)
    for (const level of ls.levels) {
        for (const p of level.platforms) {
            p.selected = null
        }
    }
}


/**
 * @param {EditorState} state
 */
export function createPlatform(state) {
    if (state.selectedElements.length > 0) {
        const start = state.selectedElements[0]
        const end = state.selectedElements[state.selectedElements.length - 1]
        const p = Platform.createPlatform(state, start, end)
        platforms(state).push(p)
        change(state);
    }
    clearActiveState(state)
}

/**
 * @param {EditorState} state
 */
export function startRound(state) {
    state.change = 0
}

/**
 * @param {EditorState} state
 * @returns {boolean}
 */
export function endRound(state) {
    return state.change > 0
}

/**
 * @returns {EditorLevel}
 */
export function createEmptyLevel() {
    return {
        letterMap: [],
        platforms: [],
        initialPosition: new Vector2D(1, 1),
    };
}


/**
 * @returns {EditorLevelSet}
 */
export function createEmptyLevelSet() {

    return {
        levels: [createEmptyLevel()],
        title: "empty",
        difficulty: 0,
        initialLevel: 0,
        current: 0,
    };
}

/**
 * @returns {EditorState}
 */
export function createEmptyEditorState() {
    const margin = Consts.editor.margin
    return /** @type EditorState */({
        levelSet: createEmptyLevelSet(),

        debug: false,
        tick: 0,
        change: 0,
        mouse: {
            startTime: 0,
            startingEl: null,
            state: "invalid",
        },

        activePlatform: null,
        elements: [],
        outerRect: {
            margin,
            maxX: GAME_WIDTH + margin,
            maxY: GAME_HEIGHT + margin,
        },
        selectedElements: [],
    })
}

/**
 * @param {HTMLElement} editor
 * @param {HTMLElement} overlay
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} debug
 * @param {EditorState} remoteState
 * @returns {EditorState}
 * */
export function createEditorState(editor, overlay, canvas, debug, remoteState) {

    const worldOutline = /** @type HTMLElement */(editor.querySelector("#world-outline"));
    assert(!!worldOutline, "#world-outline not within editor")

    const platformControls = /** @type HTMLElement */(overlay.querySelector("platform-controls"));
    assert(!!platformControls, "platform-controls is not within overlay")

    const levelSetControls = /** @type HTMLElement */(overlay.querySelector("level-set-controls"));
    assert(!!levelSetControls, "level-set-controls is not within overlay")

    const levelSelectControls = /** @type HTMLElement */(overlay.querySelector("level-select-controls"));
    assert(!!levelSelectControls, "level-select-controls is not within overlay")

    const margin = Consts.editor.margin

    /** @type {EditorState} */
    const state = {
        ...remoteState,

        change: 0,
        outerRect: {
            margin,
            maxX: GAME_WIDTH + margin,
            maxY: GAME_HEIGHT + margin,
        },

        canvas,
        debug,
        editor,
        overlay,
        worldOutline,
        platformControls,
        levelSetControls,
        levelSelectControls,

        tick: 0,
        activePlatform: null,
        elements: [],
        selectedElements: [],
        mouse: {
            startTime: 0,
            startingEl: null,
            state: "invalid",
        }
    }

    return state
}


/**
 * @param {HTMLElement} el
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function within(el, x, y) {
    return el.offsetTop <= y && el.offsetTop + el.offsetHeight > y &&
        el.offsetLeft <= x && el.offsetLeft + el.offsetWidth > x;
}

export const Search = {
    /**
     * @param {EditorState} state
     * @param {Event} event
     * @returns {EditorPlatform | null}
     */
    platform(state, event) {
        if (!event.type.includes("mouse")) {
            return null
        }
        const evt = /** @type {MouseEvent} */(event)

        const x = evt.clientX
        const y = evt.clientY
        const plats = platforms(state)

        for (const platform of plats) {
            if (within(platform.el, x, y)) {
                return platform
            }
        }

        return null
    },

    /**
     * @param {EditorState} state
     * @param {Event} event
     * @returns {ElementState | null}
     */
    gridItem(state, event) {
        if (!event.type.includes("mouse")) {
            return null
        }
        const evt = /** @type {MouseEvent} */(event)

        const x = evt.clientX
        const y = evt.clientY

        // TODO technically i can binary search over this 2D array, once with Y and once with X
        // Since its 2D and square, i can do both the X and the Y at the same time
        /** @type {ElementState | null} */
        let found = null
        outer: for (const row of state.elements) {
            const first = row[0]
            if (first.el.offsetTop + first.el.offsetHeight < y) {
                continue
            }
            for (const el of row) {
                if (el.el.offsetLeft + el.el.offsetWidth < x) {
                    continue
                }
                found = el
                break outer
            }
        }

        return found
    }

}

