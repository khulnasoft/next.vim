import { Vector2D } from "../math/vector.js";
import { GAME_WIDTH, GAME_HEIGHT } from "../window.js";
import * as Editor from "./editor.js";
import * as EditorState from "./state.js";
import { PlatformControls } from "./html/platform.js";
import { assert, never } from "../assert.js";
import * as Bus from "../bus.js"
import { LevelSelectControls, LevelSetControls } from "./html/level-set.js";

async function run() {
    const data = EditorState.createEmptyEditorState();

    /** @type {HTMLElement} */
    const editor = document.querySelector("#editor")
    /** @type {HTMLElement} */
    const overlay = document.querySelector("#overlay")
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("canvas")

    assert(!!editor, "expected editor to exist")
    assert(!!canvas, "expected canvas to exist")
    assert(!!overlay, "expected overlay to exist")

    /** @type {HTMLElement} */
    const loading = document.querySelector("#loading")
    if (loading) {
        overlay.removeChild(loading)
    }

    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get("debug") === "1";
    const state = EditorState.createEditorState(editor, overlay, canvas, debug, data)

    let id = 0
    for (let r = 0; r < GAME_HEIGHT + 10; ++r) {
        /** @type {ElementState[]} */
        const row = []
        for (let c = 0; c < GAME_WIDTH + 10; ++c) {
            const el = document.createElement("div")
            editor.appendChild(el)
            el.id = `gi${id++}`;
            el.classList.add("grid-item")

            el.dataset.row = String(r)
            el.dataset.col = String(c)

            row.push({
                selected: false,
                pos: new Vector2D(c, r),
                el,
                id,
            });
        }
        state.elements.push(row);
    }

    customElements.define("platform-controls", PlatformControls);
    customElements.define("level-set-controls", LevelSetControls);
    customElements.define("level-select-controls", LevelSelectControls);

    Editor.start(state)

}

run()
