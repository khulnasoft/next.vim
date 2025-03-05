import { assert, never } from "../assert.js";
import { Vector2D } from "./vector.js";

/**
 * @param {AABB} a
 * @param {AABB} b
 */

export class AABB {
    /**
     * @param {any} obj
     * @returns {AABB}
     */
    static fromObject(obj) {
        assert(typeof obj.width === "number", "expected property width to be a number")
        assert(typeof obj.height === "number", "expected property height to be a number")

        const pos = Vector2D.fromObject(obj.pos)
        return new AABB(pos, obj.width, obj.height)
    }

    /**
   * @constructor
   * @param {Vector2D} pos
   * @param {number} width
   * @param {number} height
   */
    constructor(pos = new Vector2D(0, 0), width = 0, height = 0) {
        this.pos = pos;
        this.width = width;
        this.height = height;
    }

    /**
   * @param {AABB} other
   * @returns {AABB}
   */
    set(other) {
        this.pos.set(other.pos)
        this.width = other.width;
        this.height = other.height;
        return this;
    }

    /**
     * @returns {Vector2D}
     */
    center() {
        return new Vector2D(
            this.pos.x + (this.width / 2),
            this.pos.y + (this.height / 2),
        );
    }

    /**
   * @param {AABB} other
   * @returns {boolean}
   */
    intersects(other) {
        return (
            this.pos.x < other.pos.x + other.width &&
                this.pos.x + this.width > other.pos.x &&
                this.pos.y < other.pos.y + other.height &&
                this.pos.y + this.height > other.pos.y
        );
    }

    /**
   * @param {Vector2D} point
   * @returns {boolean}
   */
    contains(point) {
        return (
            point.x >= this.pos.x &&
                point.x <= this.pos.x + this.width &&
                point.y >= this.pos.y &&
                point.y <= this.pos.y + this.height
        );
    }

    /**
     * ASSUMES THERE IS ALREADY AN INTERSECTION
     * @param {AABB} other
     * @returns {Vector2D}
     */
    firstInsidePoint(other) {
        const tl = other.pos.clone()
        const tr = other.pos.clone().addComponents(other.width, 0)
        const bl = other.pos.clone().addComponents(0, other.height)
        const br = other.pos.clone().addComponents(other.width, other.height)

        if (this.contains(tl)) {
            return tl
        }

        if (this.contains(tr)) {
            return tr
        }

        if (this.contains(br)) {
            return br
        }

        if (this.contains(bl)) {
            return bl
        }

        never("cannot have this condition", "this", this, "other", other)
        return null
    }

    /**
     * @param {Vector2D} point
     * @returns {Vector2D}
     */
    closestPoint(point) {
        let tl = this.pos.clone()
        const tr = this.pos.clone().addComponents(this.width, 0)
        const bl = this.pos.clone().addComponents(0, this.height)
        const br = this.pos.clone().addComponents(this.width, this.height)

        let min = tl.clone().subtract(point)
        let minPoint = tl
        if (min.magnituteSquared() > tr.magnituteSquared()) {
            min = tr.clone().subtract(point)
            minPoint = tr
        }

        if (min.magnituteSquared() > br.magnituteSquared()) {
            min = br.clone().subtract(point)
            minPoint = br
        }

        if (min.magnituteSquared() > bl.magnituteSquared()) {
            min = bl.clone().subtract(point)
            minPoint = bl
        }

        return min
    }

    /**
   * @returns {Vector2D}
   */
    getCenter() {
        return new Vector2D(
            this.pos.x + this.width / 2,
            this.pos.y + this.height / 2
        );
    }

    /**
   * @param other {AABB}
   * @returns {boolean}
   */
    rightOf(other) {
        return this.pos.x >= other.pos.x + other.width;
    }

    /**
   * @param other {AABB}
   * @returns {boolean}
   */
    topOf(other) {
        return this.pos.y + this.height <= other.pos.y;
    }

    /**
   * @param other {AABB}
   * @returns {boolean}
   */
    leftOf(other) {
        return this.pos.x + this.width <= other.pos.x
    }

    /**
   * @param other {AABB}
   * @returns {boolean}
   */
    bottomOf(other) {
        return this.pos.y >= other.pos.y + other.height;
    }

    /**
     * @param other {AABB}
     * @param amount {number}
     * @returns {boolean}
     */
    leftOverlapBy(other, amount) {
        const leftOverlap = this.pos.x - (other.pos.x + other.width);
        return leftOverlap <= amount && leftOverlap >= 0
    }

    /**
     * @param other {AABB}
     * @param amount {number}
     * @returns {boolean}
     */
    rightOverlapBy(other, amount) {
        const rightOverlap = other.pos.x - (this.pos.x + this.width);
        return rightOverlap <= amount && rightOverlap >= 0
    }

    /**
     * @param other {AABB}
     * @param amount {number}
     * @returns {boolean}
     */
    topOverlapBy(other, amount) {
        const topOverlap = (this.pos.y + this.height) - other.pos.y
        return topOverlap <= amount && topOverlap >= 0
    }

    /**
     * @param other {AABB}
     * @param amount {number}
     * @returns {boolean}
     */
    bottomOverlapBy(other, amount) {
        const bottomOverlap = this.pos.y - (other.pos.y + other.height);
        return bottomOverlap <= amount && bottomOverlap >= 0
    }

    /**
   * @returns {AABB}
   */
    clone() {
        return new AABB(this.pos.clone(), this.width, this.height);
    }

    /**
   * @returns {string}
   */
    toString() {
        return `AABB(pos: ${this.pos}, width: ${this.width}, height: ${this.height})`;
    }
}

/**
 * @param {Vector2D} start
 * @param {Vector2D} end
 * @returns {AABB}
 */
export function from2Vecs(start, end) {
    const width = (end.x - start.x) + 1
    const height = (end.y - start.y) + 1

    assert(width > 0, "cannot have negative width")
    assert(height > 0, "cannot have negative height")

    return new AABB(start.clone(), width, height)
}

/**
 * Determines if a line segment intersects with this AABB
 * @param {Vector2D} start - Start point of line segment
 * @param {Vector2D} end - End point of line segment
 * @param {AABB} aabb - The AABB to check intersection with
 * @returns {boolean} - True if line segment intersects AABB
 */
export function lineIntersectsAABB(start, end, aabb) {
    const dir = end.clone().subtract(start);

    if (dir.magnituteSquared() === 0) {
        return aabb.contains(start);
    }

    const tMin = new Vector2D(
        (aabb.pos.x - start.x) / dir.x,
        (aabb.pos.y - start.y) / dir.y
    );
    const tMax = new Vector2D(
        (aabb.pos.x + aabb.width - start.x) / dir.x,
        (aabb.pos.y + aabb.height - start.y) / dir.y
    );

    if (dir.x < 0) {
        [tMin.x, tMax.x] = [tMax.x, tMin.x];
    }
    if (dir.y < 0) {
        [tMin.y, tMax.y] = [tMax.y, tMin.y];
    }

    if (tMin.x > tMax.y || tMin.y > tMax.x) {
        return false;
    }

    const tEnter = Math.max(tMin.x, tMin.y);
    const tExit = Math.min(tMax.x, tMax.y);

    return tEnter <= 1 && tExit >= 0;
}
