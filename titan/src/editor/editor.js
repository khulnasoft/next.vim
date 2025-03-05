import { assert } from "../assert.js";
import * as Runner from "../game-runner.js";
import * as Input from "../input/input.js"
import * as Config from "../game-config.js"
import * as Utils from "./utils.js"
import { createTransform } from "./transforms.js"
import * as Bus from "../bus.js"
import * as Renderer from "./render.js"
import * as Window from "../window.js"
import * as State from "./state.js"
import * as Platform from "./platform.js"
import * as Consts from "./consts.js"

const windowEvents = [
    "mousedown",
    "mouseup",
    "mouseover",
    "mouseout",
    "mousemove",
    "click",
    "blur",
    "keydown",
]

/** @type {(e: Event | BusEvent) => void} */
let currentTakeAction = null
/** @type {EditorState} */
let currentEditorState = null

/**
 * @param {ResizeEvent} e
 */
function actionResize(e) {
    assert(!!currentTakeAction, "expected take action to be defined")
    currentTakeAction(e)
    Bus.emit("resize", /** @type {ResizeEvent} */(e))
}

function handleEditorChange() {
    assert(!!currentEditorState, "expected editor state to be set")
    currentEditorState.change++
}

function addListeners() {
    assert(!!currentTakeAction, "expected take action to be defined")
    assert(!!currentEditorState, "expected editor state to be set")

    for (const e of windowEvents) {
        window.addEventListener(e, currentTakeAction)
    }
    window.addEventListener("resize", actionResize)

    // @ts-ignore SHIT I HAVE TO FIX THESE TYPES
    Bus.listenAll(currentTakeAction)
    Bus.render()
}

function removeListeners() {
    assert(!!currentTakeAction, "expected take action to be defined")
    assert(!!currentEditorState, "expected editor state to be set")

    for (const e of windowEvents) {
        window.removeEventListener(e, currentTakeAction)
    }
    window.removeEventListener("resize", actionResize)

    // @ts-ignore I NEED TO FIX THESE DAMN TYPES
    Bus.removeAll(currentTakeAction)
}

/**
 * @param {EditorState} state
 */
export function start(state) {
    const takeAction = createActionTaken(state)
    currentTakeAction = takeAction
    currentEditorState = state
    addListeners()

    // @ts-ignore this is reasonable thing to do
    window.state = state

    Bus.emit("editor-started", state)
}

/**
 * @param {EditorState} state
 * @param {Event} _
 * @param {ElementState?} es
 */
export function handleEditorDown(state, _, es) {
    assert(!!es, "handle editor down must happen on grid element")
    State.createSelected(state, es)
}

/**
 * @param {EditorState} state
 * @param {Event} _
 * @param {ElementState?} es
 */
export function handleMouseDown(state, _, es) {
    State.Mouse.down(state, es)
}

/**
 * @param {EditorState} state
 */
export function handleMouseUp(state, _, es) {
    State.Mouse.up(state)
}

/**
 * @param {EditorState} state
 * @param {Event} _
 * @param {ElementState?} es
 */
export function handleEditorOver(state, _, es) {
    assert(!!es, "handle editor down must happen on grid element")
    State.createSelected(state, es)
}

/**
 * @param {EditorState} state
 * @param {Event} _
 * @param {ElementState} es
 */
export function handleCellClick(state, _, es) {
    State.createSelected(state, es, es)
}

/**
 * @param {EditorState} state
 * @param {Event} event
 */
export function handleSelectPlatform(state, event) {
    if (State.hasActivePlatform(state)) {
        Bus.emit("hide-platform", State.activePlatform(state))
        State.releasePlatform(state);
    }

    const evt = /** @type {MouseEvent} */(event)
    assert(evt instanceof MouseEvent, "selection of platform without mouse event")

    const found = State.selectPlatform(state, evt)

    Bus.emit("show-platform", found)
}

/**
 * @param {EditorState} state
 */
export function handleUpPlatform(state) {
    const platform = State.activePlatform(state)
    const duration = Platform.selectedDuration(state, platform)
    const moving = Platform.isMoving(platform)

    if (moving || duration < Consts.behaviors.fastClickTimeMS) {
        Bus.emit("show-platform", platform)
    }
}

/**
 * @param {EditorState} state
 */
export function handleDeletePlatform(state) {
    const platform = State.deletePlatform(state);
    Bus.emit("delete-platform", platform)
}

/**
 * @param {EditorState} state
 * @param {Event} event
 */
export function handleMovePlatform(state, event) {
    const evt = /** @type {MouseEvent} */(event)
    assert(evt instanceof MouseEvent, "selection of platform without mouse event")

    const platform = State.activePlatform(state)
    const eventPos = Utils.toVec(evt)
    const offset = Platform.offset(platform);
    const start = Platform.start(platform);

    const projected = Utils.project(state, eventPos.subtract(offset), Math.round)
    const moved = projected.add(start)
    const startedMoving = Platform.moveTo(platform, Utils.bound(state, moved));

    if (startedMoving) {
        Bus.emit("move-platform", platform)
    }
}

/**
 * @param {EditorState} state
 */
export function handlePlayListeners(state) {
    window.addEventListener("resize", function() {
        Window.resize(state.canvas)
    });
    Window.resize(state.canvas)
}

/**
 * @param {EditorState} state
 */
export function handlePlay(state) {
    state.canvas.classList.add("show")
    removeListeners();
    handlePlayListeners(state)

    const ticks = [Runner.tickWithRender]
    const levelSet = State.gameLevelSet(state)
    const config = Config.getGameConfig(false)
    const gstate = Config.createCanvasGame(state.canvas, config, levelSet)
    const loop = Runner.createGameLoop(gstate)
    Runner.clear(gstate)
    Runner.addStandardBehaviors(gstate)

    Input.addListenersTo(gstate, state.canvas)
    Runner.run(
        gstate,
        loop,
        ticks,
        (e) => {
            console.log("game finished", e)
            state.canvas.classList.remove("show")
            Input.removeListenersFrom(gstate, state.canvas)
            addListeners();
        });
}

/**
 * @param {EditorState} state
 */
export function handleShowPlatform(state) {
    Bus.emit("show-platform", State.activePlatform(state));
}

/**
 * @param {EditorState} state
 * @param {any} e - yes i did an any... eat your hearts out typescript andies
 */
export function handleChangeLevel(state, e) {
    const evt = /** @type {EditorChangeLevel} */(e)
    State.clearActiveState(state);
    State.clearPlatformElements(state);
    State.selectLevelByIdx(this.state, evt.next)
}

/**
 * @param {EditorState} state
 */
export function handleReleasePlatform(state) {
    Bus.emit("release-platform", State.activePlatform(state))
    handleClearAllState(state)
}

/**
 * @param {EditorState} state
 */
export function handleClearAllState(state) {
    if (State.hasActivePlatform(state)) {
        const plat = State.activePlatform(state)
        Bus.emit("hide-platform", plat)
    }

    State.clearActiveState(state)
    State.change(state)
}

/** @param {EditorState} state
 * @param {boolean} render - i need ot remove this and have take action emit renders
 *
 * @returns {(e: Event | BusEvent) => void}
 */
export function createActionTaken(state, render = true) {
    const T = createTransform(state);

    const createPlatform = T(State.createPlatform).type("keydown").key("a");
    const selectPlatform = T(handleSelectPlatform).type("mousedown").not.controls().inPlatform()

    const releasePlatformByMouse = T(handleReleasePlatform).
        type("mouseup").activePlatform().
        not.platformSelectedThisTick(5).inActivePlatform().fastClick()

    const releasePlatformByOutsideClick = T(handleReleasePlatform).
        type("mouseup").activePlatform().
        not.inActivePlatform().
        fastClick().not.controls()

    const releasePlatformByKey = T(handleReleasePlatform).
        type("keydown").key(["o", "Escape"]).activePlatform()

    const showPlatformControls = T(handleShowPlatform).
        type("mouseup").platformMoving()

    const movePlatform = T(handleMovePlatform).
        type("mousemove").activePlatform().not.controls().stateMouseDown()

    const delPlatform = T(handleDeletePlatform).type("keydown").key("Backspace").activePlatform().not.controls()

    const eMove = T(handleEditorOver).
        type("mousemove").not.activePlatform().
        stateMouseDown().not.inPlatform().fromEditor()

    const eMoveSelectInPlatform = T(handleEditorOver).
        type("mousemove").not.activePlatform().
        stateMouseDown().inPlatform().selected().fromEditor()

    const eCell = T(handleCellClick).
        type("mouseup").not.inPlatform().fastClick().isGridItem()

    const play = T(handlePlay).type("keydown").key("p").not.stateHasSelected().not.activePlatform()
    const mousedown = T(handleMouseDown).type("mousedown")
    const mouseup = T(handleMouseUp).type("mouseup")
    const levelChanged = T(handleChangeLevel).type("editor-change-level")
    const change = T(handleEditorChange).type("editor-change")
    const clear = T(handleClearAllState).type("keydown").key("Escape")

    const prehandlers = [
        mousedown,
        levelChanged,
        change,
    ]

    const posthandlers = [
        mouseup,
        clear,
    ]

    const handlers = [
        play,
        eCell,
        eMove,
        eMoveSelectInPlatform,

        createPlatform,
        selectPlatform,
        releasePlatformByMouse,
        releasePlatformByOutsideClick,
        releasePlatformByKey,
        movePlatform,
        showPlatformControls,
        delPlatform,
    ]

    const newState = T((_, event) => {
        // TODO probably will consider a better T type but i don't want to go through all that typing until i am needing to extend this editor far enough that it makes sense
        // @ts-ignore
        const evt = /** @type {EditorStateLoadedEvent} */(event)

        State.forEachAllPlatform(state, p => {
            if (p.el !== null) {
                p.el.remove();
                p.el = null
            }
        });

        // @ts-ignore PREEMPTIVE IGNORE... THIS IS BAD BUT STFU
        // the reason is simple.   I am about to overwrite the data from the server but i want the state of the elements on the board still within the editor state.
        state.levelSet = null

        // TODO yikes
        // also, don't cause a state change that way fetches don't result in an immediate save
        state = {
            ...state,
            ...evt.state,

            // use active elements
            elements: state.elements,
        }

        let highestId = 0
        State.forEachAllPlatform(state, p => {
            if (p.id > highestId) {
                highestId = p.id
            }
        });

        Platform.setPlatformNextId(highestId + 1)
        prehandlers.forEach(x => x.updateState(state));
        posthandlers.forEach(x => x.updateState(state));
        handlers.forEach(x => x.updateState(state));

        Bus.emit("editor-size-change", {
            type: "editor-size-change",
            ...State.getUIRects(state),
        });

        // @ts-ignore
        window.state = state

    }).type("editor-state-loaded")

    // TODO: The Event | BusEvent thing is real but again i don't want to
    // refactor the types until i really want the need to... :(
    const ran = []
    return function(event) {
        const startChange = state.change
        state.tick++

        newState.run(event);

        for (const h of prehandlers) {
            h.run(event)
        }

        ran.length = 0
        for (const h of handlers) {
            if (h.run(event)) {
                ran.push(h)
            }
        }

        for (const h of posthandlers) {
            h.run(event)
        }

        if (ran.length >= 2) {
            console.log("ambiguous event", ran.map(x => x.toString()))
        }

        if (render) {
            Renderer.render(state)
        }

        if (startChange < state.change) {
            Bus.emit("editor-updated", {
                type: "editor-updated",
                state: state,
            })
        }
    }
}



