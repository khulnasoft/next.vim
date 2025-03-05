import { AABB } from "./math/aabb.js";
import { Vector2D } from "./math/vector.js";

export {};

declare global {
    type EditorSaveRequest = {
        editorState: EditorState,
        path: string
    }

    type ElementState = {
        id: number
        pos: Vector2D
        el: HTMLDivElement
        selected: boolean
    }

    type EditorLevelSet = {
        title: string,
        difficulty: number,
        levels: EditorLevel[]
        initialLevel: number
        current: number
    }

    type EditorRects = {
        editorRect: DOMRect
        elementRect: DOMRect
    }

    type EditorLevel = {
        platforms: EditorPlatform[]
        initialPosition: Vector2D
        letterMap: (string | null)[][]
    }

    type EditorState = {
        // TODO opts?
        debug: boolean,
        outerRect: {
            margin: number,
            maxX: number,
            maxY: number,
        },
        tick: number
        change: number

        // TODO elements
        canvas: HTMLCanvasElement
        editor: HTMLElement
        overlay: HTMLElement
        platformControls: HTMLElement
        levelSetControls: HTMLElement
        levelSelectControls: HTMLElement
        worldOutline: HTMLElement

        levelSet: EditorLevelSet

        // TODO state
        activePlatform: null | EditorPlatform
        mouse: {
            startTime: number
            startingEl: ElementState | null
            state: "invalid" | "down"
        },
        elements: ElementState[][]
        selectedElements: ElementState[]

    }

    type EventCB = (event: Event) => (boolean | undefined)
    type StateCB = (s: EditorState, evt: Event) => void
    type PlatformCB = (s: EditorState, p: EditorPlatform, evt: Event) => void
    type Filter = {
        name: string,
        fn: EventCB | (Filter | EventCB)[],
        invert: boolean
        or: boolean
        and: boolean
    }
    type Action = (s: EditorState, evt: Event, es?: ElementState) => void

    type EditorPlatform = {
        id: number,

        AABB: AABB,
        selected: {
            offset: Vector2D,
            starting: Vector2D,
            moving: boolean,
            tick: number,
        } | null
        behaviors: Behavior
        el: HTMLElement | null
    }
}
