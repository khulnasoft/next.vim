export const CALEB_HEIGHT = 1
export const CALEB_WIDTH = 0.5

/**
 * @param titan {Titan}
 * @returns {number}
 */
export function getRow(titan) {
    const body = titan.physics.current.body;
    return Math.floor(body.pos.y + body.height / 2)
}

/**
 * @param {Titan} titan
 * @returns {number}
 */
export function getNextRow(titan) {
    const body = titan.physics.next.body;
    return Math.floor(body.pos.y + body.height / 2)
}

/**
 * @param titan {Titan}
 * @returns {number}
 */
export function getCol(titan) {
    return Math.floor(titan.physics.current.body.pos.x)
}

/**
 * @param titan {Titan}
 * @returns {number}
 */
export function getNextCol(titan) {
    return Math.floor(titan.physics.next.body.pos.x)
}

/**
 * @param titan {Titan}
 * @returns {number}
 */
export function getNextX(titan) {
    return titan.physics.next.body.pos.x
}

