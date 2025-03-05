import { assert, never } from "../../assert.js";
import * as Bus from "../../bus.js"
import { AABB } from "../../math/aabb.js";
import { Vector2D } from "../../math/vector.js";
import * as State from "../state.js"
import * as Utils from "./utils.js"

const dropKeys = [
    "activePlatform",
    "elements",
    "el",
    "state",

    "canvas",
    "editor",
    "overlay",
    "platformControls",
    "levelSetControls",
    "levelSelectControls",
    "worldOutline",
]

/** @param {EditorState} state
 * @param {string} path
 */
async function save(state, path) {
    // todo insane??
    /** @type {EditorSaveRequest} */
    const saveState = JSON.parse(JSON.stringify({
            path,
            editorState: state,
        }, (key, value) => {
            if (dropKeys.includes(key)) {
                return undefined
            }
            return value
        }));

    // TODO super cursed
    saveState.editorState.selectedElements = []
    State.clearActiveState(saveState.editorState)
    State.cleanPlatformSelectedState(saveState.editorState)
    saveState.editorState.selectedElements = undefined

    const res = await fetch("/save", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveState),
    })
    assert(res.ok, "unable to save the editor state")
}

/**
 * @param {EditorState | null} state
 * @returns {EditorState}
 */
export function readyLevelState(state) {
    if (!state) {
        return State.createEmptyEditorState()
    }

    const levelState = State.levelSet(state)
    for (const level of levelState.levels) {
        for (const p of level.platforms) {
            p.el = null
            const a = p.AABB
            p.AABB = new AABB(new Vector2D(a.pos.x, a.pos.y), a.width, a.height)

            const portal = p.behaviors.portal
            if (portal) {
                portal.normal = Vector2D.fromObject(portal.normal)
            }
        }

        level.initialPosition = new Vector2D(level.initialPosition.x, level.initialPosition.y)
    }


    return state
}

/**
 * @param {string} path
 * @returns {Promise<EditorState | null>}
 */
async function getState(path) {
    const url = `/get?path=${path}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const event = /** @type {EditorSaveRequest} */ (await response.json())
        readyLevelState(event.editorState)
        return event.editorState
    } catch (error) {
        console.error("unable to get data: " + error + "\n" + error.stack)
    }

    return readyLevelState(null)
}

export class LevelSetControls extends HTMLElement {
    /** @type {HTMLElement} */
    controls

    /** @type {string} */
    path

    /** @type {EditorState} state */
    state

    constructor() {
        super();
        let template = /** @type {HTMLTemplateElement} */(document.getElementById("level-set-controls"))
        assert(!!template, "unable to retrieve template")
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.controls = shadowRoot.querySelector(".level-set-controls");
        this.path = this.getAttribute('initial-path')
        this.#fetchState()
    }

    #save = () => {
        const controls = this.#controls()
        this.state.levelSet.difficulty = +controls.difficulty.value
        this.state.levelSet.title = controls.title.value
        this.state.levelSet.initialLevel = +controls.initial.value

        const initLevel = State.initialLevel(this.state)
        const x = Utils.parseCoord(controls.startX.value)
        const y = Utils.parseCoord(controls.startY.value)
        initLevel.initialPosition = new Vector2D(x, y)
        save(this.state, this.path)
    }

    #delete = () => {
        never("todo")
    }

    #load = () => {
        this.path = this.#controls().path.value
        this.#fetchState()
    }

    #fetchState() {
        getState(this.path).
            then(state => {
                this.state = state;
                Bus.emit("editor-state-loaded", {type: "editor-state-loaded", state})
                this.#hydrateFromState(state);
            });
    }

    /** @param {UpdatedEvent} updated */
    #editorUpdated = (updated) => {
        this.state = updated.state;
        this.#hydrateFromState(this.state)
        this.#save()
    }

    connectedCallback() {
        const controls = this.#controls()
        controls.save.addEventListener("click", this.#save);
        controls.load.addEventListener("click", this.#load);
        controls.delete.addEventListener("click", this.#delete);
        Bus.listen("editor-started", this.#hydrateFromState)
        Bus.listen("editor-updated", this.#editorUpdated)
    }

    disconnectedCallback() {
        const controls = this.#controls()
        controls.save.removeEventListener("click", this.#save);
        controls.load.removeEventListener("click", this.#load);
        controls.delete.removeEventListener("click", this.#delete);
        Bus.remove("editor-started", this.#hydrateFromState)
        Bus.remove("editor-updated", this.#editorUpdated)
    }

    /** @param {EditorState} state */
    #hydrateFromState = (state) => {
        const controls = this.#controls()
        controls.path.value = this.path

        const levelSet = State.levelSet(state)
        controls.title.value = levelSet.title
        controls.difficulty.value = "" + levelSet.difficulty

        const initial = State.initialLevel(state)
        controls.startX.value = String(initial.initialPosition.x)
        controls.startY.value = String(initial.initialPosition.y)
        controls.initial.value = String(levelSet.initialLevel)
    }

    /**
     * @returns {{
     * path: HTMLInputElement,
     * title: HTMLInputElement,
     * difficulty: HTMLInputElement,
     * startX: HTMLInputElement,
     * startY: HTMLInputElement,
     * initial: HTMLInputElement,
     * save: HTMLButtonElement,
     * load: HTMLButtonElement,
     * delete: HTMLButtonElement,
     * }}
     */
    #controls() {
        return {
            path: this.controls.querySelector("#level-path"),
            title: this.controls.querySelector("#level-set-title"),
            difficulty: this.controls.querySelector("#level-set-diff"),
            startX: this.controls.querySelector("#level-set-x"),
            startY: this.controls.querySelector("#level-set-y"),
            initial: this.controls.querySelector("#level-set-initial"),
            save: this.controls.querySelector("#save-level-set"),
            load: this.controls.querySelector("#load-level-set"),
            delete: this.controls.querySelector("#delete-level-set"),
        }
    }
}

export class LevelSelectControls extends HTMLElement {
    /** @type {HTMLElement} */
    controls

    /** @type {HTMLElement[]} */
    levels

    /** @type {EditorState} */
    state

    constructor() {
        super();
        let template = /** @type {HTMLTemplateElement} */(document.getElementById("level-select-controls"))
        assert(!!template, "unable to retrieve template")
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.controls = shadowRoot.querySelector(".level-select-controls");
        this.levels = []
    }

    connectedCallback() {
        const createLevel = this.#getCreateLevel()
        Bus.listen("editor-started", this.#hydrateFromState)
        Bus.listen("editor-state-loaded", this.#pluckState)
        createLevel.addEventListener("click", this.#createLevel);
    }

    disconnectedCallback() {
        const createLevel = this.#getCreateLevel()
        Bus.remove("editor-started", this.#hydrateFromState)
        Bus.remove("editor-state-loaded", this.#pluckState)
        createLevel.removeEventListener("click", this.#createLevel);
    }

    /** @param {EditorStateLoadedEvent} evt */
    #pluckState = (evt) => {
        this.#hydrateFromState(evt.state)
    }

    /**
     * @param {Event} evt
     */
    #createLevel = (evt) => {
        evt.stopImmediatePropagation()
        evt.preventDefault()

        const el = this.#createLevelElement(this.levels.length)
        this.levels.push(el)
        State.addNewLevel(this.state)
        this.#selectLevel(el)
        this.#levels().append(el)
        Bus.render()
    }

    /** @param {EditorState} state */
    #hydrateFromState = (state) => {
        this.state = state

        for (const level of this.levels) {
            level.removeEventListener("click", this.#handleSelectLevel)
            level.remove()
        }

        const levelSet = State.levelSet(state)
        const levels = []
        const levelEl = this.#levels()

        for (let i = 0; i < levelSet.levels.length; ++i) {
            const el = this.#createLevelElement(i)
            if (i === 0) {
                el.classList.add("selected")
            }
            levels.push(el)
            levelEl.append(el)
        }

        this.levels = levels
    }

    /** @param {Event} evt */
    #handleSelectLevel = (evt) => {
        const event = /** @type {MouseEvent} */(evt)
        this.#selectLevel(/** @type {HTMLElement} */(event.target))
    }

    /** @param {HTMLElement} el */
    #selectLevel = (el) => {
        for (const l of this.levels) {
            l.classList.remove("selected")
        }

        const next = +el.dataset.index
        el.classList.add("selected")
        Bus.emit("editor-change-level", { type: "editor-change-level", next})
    }

    #levels() {
        return this.controls.querySelector(".levels")
    }

    #getCreateLevel() {
        return this.controls.querySelector("#new-level")
    }

    /** @param {number} idx
     * @returns {HTMLElement}
     * */
    #createLevelElement(idx) {
        const el = document.createElement("div")
        el.dataset.index = String(idx)
        el.innerText = `Level ${idx}`
        el.addEventListener("click", this.#handleSelectLevel)
        el.classList.add("level")
        return el
    }

}

