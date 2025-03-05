import { assert } from "../assert.js";
import * as Bus from "../bus.js"
import * as Utils from "./utils.js"
import { from2Vecs } from "../math/aabb.js";
import { Vector2D } from "../math/vector.js";
import * as Consts from "./consts.js"
import * as Level from "../objects/level/level.js"

/**
 * @param {EditorPlatform} platform
 */
function assertSelected(platform) {
    assert(!!platform.selected, "expected platform to be selected")
}

let _id = 0

/** @param {number} id */
export function setPlatformNextId(id) {
    _id = id
}

/**
 * @param {EditorState} state
 * @param {ElementState} start
 * @param {ElementState} end
 * @returns {EditorPlatform}
 */
export function createPlatform(state, start, end) {
    return {
        id: ++_id,
        selected: null,
        AABB: from2Vecs(start.pos, end.pos),
        behaviors: {},
        el: null,
    }
}

/**
 * @param {EditorState} state
 * @param {EditorPlatform} platform
 * @returns {number}
 */
export function selectedDuration(state, platform) {
    assertSelected(platform)
    return state.tick - platform.selected.tick
}

/**
 * @param {EditorState} state
 * @param {EditorPlatform} platform
 * @returns {BasedPlatform}
 */
export function toPlatform(state, platform) {
    const aabb = platform.AABB.clone()
    const m = state.outerRect.margin
    aabb.pos.subtract(new Vector2D(m, m))
    const plat = Level.createPlatform(aabb)

    plat.behaviors.circuit = platform.behaviors.circuit
    plat.behaviors.next = platform.behaviors.next
    plat.behaviors.instagib = platform.behaviors.instagib
    plat.behaviors.obstacle = platform.behaviors.obstacle
    plat.behaviors.portal = platform.behaviors.portal

    if (platform.behaviors.render) {
        plat.behaviors.render = {
            type: "render",
            renderX: 0,
            renderY: 0,
            renderWidth: 0,
            renderHeight: 0,
        }
    }

    return plat
}


/**
 * @param {EditorPlatform} platform
 * @returns {boolean}
 */
export function isMoving(platform) {
    assertSelected(platform)
    return platform.selected.moving
}

/**
 * @param {EditorPlatform} platform
 * @param {Vector2D} pos
 */
export function moveTo(platform, pos) {
    assertSelected(platform)

    platform.AABB.pos = pos.clone()
    const wasMoving = isMoving(platform)
    if (wasMoving) {
        return false;
    }

    const dist = platform.selected.starting.clone().subtract(pos).magnituteSquared()
    return orInMoving(platform, dist > Consts.platform.sqDistForMoving);
}

/**
 * @param {EditorPlatform} platform
 * @param {boolean} moving
 * @returns {boolean}
 */
export function orInMoving(platform, moving) {
    assertSelected(platform)
    platform.selected.moving ||= moving
    return platform.selected.moving
}

/**
 * @param {EditorPlatform} platform
 * @returns {Vector2D}
 */
export function offset(platform) {
    assertSelected(platform)
    return platform.selected.offset
}

/**
 * @param {EditorPlatform} platform
 * @returns {Vector2D}
 */
export function start(platform) {
    assertSelected(platform)
    return platform.selected.starting
}
