import { AABB } from "../../../math/aabb.js"
import { createPhysics } from "../../../math/utils.js"
import { Vector2D } from "../../../math/vector.js"
import * as Level from "../level.js"

// TODO stop it immediately, bad
import * as Const from "../../../editor/consts.js"
import { assert } from "../../../assert.js"

const margin = new Vector2D(Const.editor.margin, Const.editor.margin)
/**
 * @param {EditorLevelSet} levelSet
 * @returns {LevelSet}
*/
export function convertLevelSet(levelSet) {
    /** @type {LevelSet} */
    const out = {
        title: levelSet.title,
        difficulty: levelSet.difficulty,
        initialLevel: levelSet.initialLevel,
        levels: [],
        platforms: new Map()
    }

    for (const eLevel of levelSet.levels) {
        /** @type {Level} */
        const level = {
            platforms: [],
            initialPosition: Vector2D.fromObject(eLevel.initialPosition),
            letterMap: []
        }

        for (const p of eLevel.platforms) {
            const aabb = AABB.fromObject(p.AABB)
            aabb.pos.subtract(margin)

            const platform = {
                physics: {
                    next: createPhysics(aabb),
                    current: createPhysics(aabb),
                },
                id: p.id,
                behaviors: {
                    next: p.behaviors.next,
                    circuit: p.behaviors.circuit,
                    instagib: p.behaviors.instagib,
                    obstacle: p.behaviors.obstacle,
                    portal: p.behaviors.portal,
                    lettered: p.behaviors.lettered,
                    lazer: p.behaviors.lazer,
                    render: p.behaviors.render ? /** @type {Render} */({
                        type: "render",
                        renderX: 0,
                        renderY: 0,
                        renderWidth: 0,
                        renderHeight: 0,
                    }) : undefined
                },
            }

            if (platform.behaviors.portal) {
                platform.behaviors.portal.normal = Vector2D.fromObject(platform.behaviors.portal.normal)
            }

            level.platforms.push(platform)
            out.platforms.set(platform.id, platform)
        }

        level.letterMap = Level.createLetterMap(level.platforms);
        eLevel.initialPosition = Vector2D.fromObject(eLevel.initialPosition)
        out.levels.push(level)
    }

    validateLevel(out)
    return out
}

/**
 * @param {LevelSet} levelSet
 */
export function validateLevel(levelSet) {
    for (const level of levelSet.levels) {
        for (const platform of level.platforms) {
            const portal = platform.behaviors.portal
            const lazer = platform.behaviors.lazer
            const powerup = platform.behaviors.powerup

            if (!portal && !lazer && !powerup) {
                continue
            }

            if (portal) {
                assert(!platform.behaviors.obstacle, "platform cannot be an obstacle", portal)
                assert(!platform.behaviors.next, "platform cannot be a next", portal)
                assert(!platform.behaviors.instagib, "platform cannot be a instagib", portal)

                const other = levelSet.platforms.get(portal.to)
                assert(!!other, "the to in the portal does not exist", portal)
                assert(!!other.behaviors.portal, "the portal is pointing to a non portal", portal, other)

                const len = portal.normal.magnitude()
                assert(Math.abs(1 - len) <= 0.001, "expected the portal to have a magnitude 1 normal vec", portal)
            }

            if (lazer) {
                const body = platform.physics.current.body;
                assert(body.width === 1 && body.height === 1, "lazers must be 1x1")
            }

            if (powerup) {
                const body = platform.physics.current.body;
                assert(body.width === 2 && body.height === 1, "powerups should only be 2x1")
            }

        }
    }
}
