import * as Window from "../window.js";
import { getNextRow } from "./titan/utils.js";

/**
 * @param state {GameState}
 */
export function update(state) {
    state.rn.zero = getNextRow(state.titan);
}

/**
 * @param state {GameState}
 */
export function tickClear(state) {
}

/**
 * @param ctx {CanvasRenderingContext2D}
 * @param text {string}
 * @param x {number}
 * @param y {number}
 */
function renderText(ctx, text, x, y) {
    const [_x, _y] = Window.projectAbsoluteCoords(ctx.canvas, x, y)
    ctx.fillStyle = "white";
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.fillText(text, _x, _y)
}

/**
 * @param state {GameState}
*/
export function render(state) {
    const ctx = state.getCtx();
    ctx.font = `${Window.getFontSize(ctx.canvas)}px Consolas, "Courier New", monospace`;

    const x = 1.9
    const zero = state.rn.zero;
    for (let i = 0; i < Window.GAME_HEIGHT; ++i) {
        const y = Window.GAME_INFO_HEIGHT + i + 0.5
        renderText(ctx, String(Math.abs(i - zero)), x, y);
    }

    const pos = state.titan.physics.current.body.pos;
    renderText(ctx, `C(${pos})`, 10, 1);
}
