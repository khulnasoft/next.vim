import { GAME_HEIGHT, GAME_WIDTH } from "../../window.js";

/** @param {string} coord
 * @returns {number}
 * */
export function parseCoord(coord) {
    const parts = coord.split(" ")
    const processed = []
    for (let i = 0; i < parts.length; ++i) {
        if (parts[i].toLowerCase() === "w") {
            processed[i] = GAME_WIDTH
        } else if (parts[i].toLowerCase() === "h") {
            processed[i] = GAME_HEIGHT
        } else {
            processed[i] = parts[i]
        }
    }

    if (processed.length === 1) {
        return +processed[0]
    } else if (processed[1] === "-") {
        return +processed[0] - +processed[2]
    }
    return +processed[0] + +processed[2]
}


