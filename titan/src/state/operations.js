import { assert } from "../assert.js";
import { Vector2D } from "../math/vector.js";

/**
 * @param {GameState} state
 * @param {number} id
 * @returns {{platform: BasedPlatform, level: number} | null}
 */
export function findPlatformById(state, id) {
    const platform = state.level.platforms.get(id)
    assert(!!platform, "could not find platform's id", id, state.level.platforms)

    const levels = state.level.levels;
    let found = null
    for (let i = 0; i < levels.length; ++i) {
        const level = levels[i]
        if (level.platforms.includes(platform)) {
            found = {
                platform,
                level: i,
            };
        }
    }

    return found
}


/**
 * @param {GameState} state
 * @param {number} to
 * @param {Vector2D} pos
 */
export function setLevel(state, to, pos) {
    const level = state.level.levels[to]
    assert(!!level, "the to level of set level was undefined", "to", to, "levels", state.level.levels)

    state.levelChanged = true
    state.level.activeLevel = level
    state.level.activeLevel.initialPosition = pos.clone()
    state.titan.changingLevels = true

    state.titan.physics.next.body.pos = pos.clone();
    state.titan.physics.current.body.pos = pos.clone();
    state.titan.platform.platform = null
}

/**
 * @param {GameState} state
 */
export function clearLevelChange(state) {
    state.levelChanged = false
    state.titan.changingLevels = false
    state.titan.platform.platform = null
}
