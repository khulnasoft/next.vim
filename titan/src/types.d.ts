import { AABB } from "./math/aabb";
import { Vector2D } from "./math/vector";

export {};

declare global {

    type GameOptions = {
        debug: boolean,
        titan: TitanOpts,
        gravity: Vector2D,
        frameTimeMS: number,
        tickTimeMS: number,

        tolerance: {
            topBy: number,
            bottomBy: number,
        }

    }

    type TitanJumpEaseCB = (percent: number) => number
    type TitanJumpOpts = {
        jumpEaseRange: number,
        jumpNormHeight: number,
        noJumpBase: number,
        noJumpMultiplier: number,
    }

    type TitanDashOpts = {
        dashNormWidth: number,
        distance: number,
        dashEaseRange: number,
    }

    type TitanOpts = {
        hodlTime: number,
        normWidthsPerSecond: number,
        jump: TitanJumpOpts,
        dash: TitanDashOpts,
    }

    type TitanJump = {
        jumping: boolean,
        jumpDistance: number,
        jumpStart: Vector2D | null,
        jumpDir: 1 | -1,
        noJumpTime: number,
    }

    type TitanHodl = {
        hodlTime: number,
    }


    type fFtTKey = "f" | "F" | "t" | "T"
    type fFtT = {
        type: fFtTKey
        startTick: number,
    }

    type TitanDash = {
        dashing: boolean,
        dashDistance: number,
        dashStart: Vector2D | null,
        dashDir: 1 | -1,
        noDashTime: number,
    }

    type TitanPortal = {
        portaling: boolean
        to: number
        tick: number
    }

    type Titan = Collidable & CanvasProjectable & {
        opts: TitanOpts,
        renderColor: string,
        dead: boolean,
        platform: {
            tick: number,
            platform: BasedPlatform | null,
        },
        deadAt: number,

        hodl: TitanHodl
        jump: TitanJump
        dash: TitanDash
        fFtT: fFtT
        portal: TitanPortal
        changingLevels: boolean

        // i don't want "proper" jumping mechanics.  i want linear jump
        // slow top (for f/F/t/T or w)
    }

    type InputMessage = {
        time: number,
        type: "down" | "up",
        key: string,
    }

    type PlatformBehaviors = "obstacle" | "next-level" | "instagib" | "circuit" | "render"
    type Circuit = {
        type: "circuit"
        startPos: Vector2D
        endPos: Vector2D
        time: number
        currentTime: number
        currentDir: -1 | 1
    }

    type NextLevelBehavior = {
        type: "next-level",
        toLevel: number,
        toLevelPosition: Vector2D
    }
    type ObstacleBehavior = { type: "obstacle" }
    type InstaGib = { type: "instagib" }
    type Render = CanvasProjectable & { type: "render" }
    type PortalBehavior = { type: "portal", to: number, normal: Vector2D }
    type Lettered = { type: "lettered", letter: string }
    type Lazer = { type: "lazer" }
    type PowerUp = {
        type: "powerup",
        letter: string,
        startRange: number,
        endRange: number,
        rangeSpeed: number,
        actionList: string,
        actionSpeed: number,
    }

    type Behavior = {
        next?: NextLevelBehavior
        obstacle?: ObstacleBehavior
        instagib?: InstaGib
        circuit?: Circuit
        render?: Render
        portal?: PortalBehavior
        powerup?: PowerUp
        lettered?: Lettered
        lazer?: Lazer
    }

    type BasedPlatform = Collidable & {
        id: number,
        behaviors: Behavior
    }

    type LevelSet = {
        title: string,
        difficulty: number,
        levels: Level[]
        activeLevel?: Level
        initialLevel: number
        platforms: Map<number, BasedPlatform>
    }

    type Level = {
        platforms: BasedPlatform[]
        initialPosition: Vector2D
        letterMap: (string | null)[][]
    }

    type Dimension = {
        width: number
        height: number
    }

    type GameState = {
        done: boolean

        updateables: UpdateableModule[]
        renderables: RenderableModule[]
        applyables: UpdateAndApplyModule[]

        opts: GameOptions
        debug: {
            previous: {
                titan: Collidable,
                platforms: BasedPlatform[],
            }
        },

        now: () => number,
        titan: Titan
        getCtx(): CanvasRenderingContext2D | null
        getDim(): Dimension
        level: LevelSet,
        levelChanged: boolean

        tick: number,

        rn: {
            zero: number
        }

        gameOver: boolean,
        input: InputState,
        loopStartTime: number,
        loopDelta: number,
    }

    type CanvasProjectable = {
        renderX: number,
        renderY: number,
        renderWidth: number,
        renderHeight: number,
    }

    type PhysicsBody = {
        vel2: Vector2D,
        vel: Vector2D,
        acc: Vector2D,
        body: AABB,
    }

    type Collidable = {
        physics: {
            current: PhysicsBody
            next: PhysicsBody
        }
    }

    type InputTiming = {
        timestamp: number,
        tickHoldDuration: number,
        initial: boolean,
        done: boolean
    }

    type Input = {type: "down-up" | "down" | "hold" | "up", key: string, tick: number}
    type InputHandler = (state: GameState, input: Input) => boolean
    type InputState = {
        hasInput: boolean
        inputs: Input[]
        tick: number
        numericModifier: number
        listener?: (e: KeyboardEvent) => void
        anykey: ((state: GameState) => void) | null
    }

    type GameLoop = (cb: () => void) => void;
    type GameTick = (state: GameState) => void

    type UpdateableModule = {
        update(gameState: GameState, delta: number): void
        tickClear(gameState: GameState): void
    }

    type UpdateAndApplyModule = {
        update(gameState: GameState, delta: number): void
        check(gameState: GameState, delta: number): void
        apply(gameState: GameState, delta: number): void
        tickClear(gameState: GameState): void
    }


    type RenderableModule = {
        render(gameState: GameState): void
    }

    type BehaviorNode = {
        enter(state: GameState): boolean
        run(state: GameState): void
        exit(state: GameState): void
    }

    type RenderEvent = Event & {type: "render"}
    type ResizeEvent = Event & {type: "resize"}
    type UpdatedEvent = {type: "editor-updated", state: EditorState}
    type ChangeEvent = {type: "editor-change"}
    type EditorStateLoadedEvent = {type: "editor-state-loaded", state: EditorState}
    type SizeChangeEvent = {type: "editor-size-change"} & EditorRects
    type EditorChangeLevel = {type: "editor-change-level", next: number}
    type BusEvent = EditorChangeLevel | RenderEvent | ResizeEvent | UpdatedEvent | ChangeEvent | EditorStateLoadedEvent

    type BusType = "editor-change-level" | "editor-size-change" | "hide-platform" | "show-platform" | "move-platform" | "release-platform" | "render" | "editor-change" | "delete-platform" | "editor-started" | "editor-state-loaded" | "editor-updated"
    type BusArgMap = {
        "editor-started": EditorState;
        "resize": ResizeEvent;
        "move-platform": EditorPlatform;
        "hide-platform": EditorPlatform;
        "show-platform": EditorPlatform;
        "release-platform": EditorPlatform;
        "delete-platform": EditorPlatform;
        "render": RenderEvent
        "editor-change": ChangeEvent
        "editor-state-loaded": EditorStateLoadedEvent
        "editor-updated": UpdatedEvent
        "editor-size-change": SizeChangeEvent
        "editor-change-level": EditorChangeLevel
    };

    type BusArg = EditorPlatform
    type BusCB<K extends BusType> = (args: BusArgMap[K]) => void;
    type BusListeners = {
        [K in BusType]?: BusCB<K>[];
    };

    type SimRand = {
        randInt: () =>  number,
        randRange: (max: number, min?: number) =>  number,
        randRangeR: (r: SimRange) =>  number,
        rand: () => number
    }

    type SimState = {
        opts: SimOptions
        rand: SimRand
        state: GameState
        action: {
            actions: SimKeyAction[]
            idx: number
            start: number
        } | null
    }

    type SimKeyAction = {
        key: string
        held: number
        wait: number
        downPerformed: boolean
        upPerformed: boolean
    }

    type SimRange = {start: number, stop: number}
    type SimOptions = {
        holdRange: SimRange
        waitRange: SimRange
        maxJump: number
    }

    type KeyEvent = {
        type: "keydown" | "keyup"
        key: string
        repeat: boolean
    }
}

