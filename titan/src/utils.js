import { Vector2D } from "./math/vector.js";
import * as Ease from "./math/ease.js"

let nowFn = Date.now;

/** @param fn {() => number} */
export function setNow(fn) {
    nowFn = fn;
}

export function now() {
    return nowFn();
}

/**
 * @param {Collidable} coll
 * @returns {Collidable}
 */
export function clonePhysics(coll) {
    const physics = coll.physics;

    return {
        physics: {
            current: {
                vel2: new Vector2D(0, 0),
                body: physics.current.body.clone(),
                acc: physics.current.acc.clone(),
                vel: physics.current.vel.clone(),
            },
            next: {
                vel2: new Vector2D(0, 0),
                body: physics.next.body.clone(),
                acc: physics.next.acc.clone(),
                vel: physics.next.vel.clone(),
            }
        }
    }
}

/**
 * @param {() => number} rand
 * @returns {SimRand}
 */
export function createSimRand(rand) {
    return {
        rand,
        randRange: randRange(rand),
        randInt: randInt(rand),
        randRangeR: randRangR(rand),
    }
}

/**
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * @param {() => number} rand
 * @returns {(max: number, min?: number) => number}
 */
export function randRange(rand) {
    return function(max, min = 0) {
        const r = rand()
        return Math.floor(min + r * (max - min))
    }
}

/**
 * @param {() => number} rand
 * @returns {(range: SimRange) => number}
 */
export function randRangR(rand) {
    return function(range) {
        const r = rand()
        return Math.floor(range.start + r * (range.stop - range.start))
    }
}


/**
 * @param {() => number} rand
 * @returns {() => number}
 */
export function randInt(rand) {
    return function() {
        return Math.floor(rand() * 4294967296)
    }
}
