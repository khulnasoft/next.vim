import * as State from "./state.js"
import * as Platform from "./platform.js"
import * as Consts from "./consts.js"
import { assert, never } from "../assert.js"

/** @param {Filter} fn
 * @returns {string}
 */
function filterString(fn) {
    if (fn.invert) {
        return `not(${fn.name})`
    }
    return fn.name
}

/**
 * @param {Filter} filter
 * @param {Event} event
 * @returns {boolean}
 */
function runFilter(filter, event) {
    const fns = filter.fn
    let results = true
    if (typeof fns === "function") {
        results = fns(event);
    } else {
        for (const fn of fns) {
            if (!results) {
                break;
            }

            let step = typeof fn === "function" ? fn(event) : runFilter(fn, event)

            if (filter.or) {
                results ||= step
            } else if (filter.and) {
                results &&= step
            } else {
                never("combination function with neither or / and set", filter)
            }
        }
    }

    return filter.invert ? !results : results
}

function hasParent(el, evt) {
    let curr = /** @type HTMLElement */(evt.target)
    if (curr == null) {
        return false
    }
    do {
        if (el === curr) {
            return true
        }
    } while ((curr = curr.parentElement))
    return false
}

/** @param {string} k
 * @returns {{key: string, ctrl: boolean}}
 */
function mapInput(k) {
    let ctrl = k.startsWith("C-")
    let key = ctrl ? k.split("-")[1] : k
    return { ctrl, key };
}

export class Transforms {
    /** @type {EditorState} */
    state

    /** @type {Filter[]} */
    cbs

    /** @type {boolean} */
    #not

    /** @type {Action} */
    action

    /** @type {string} */
    name

    /** @type {boolean} */
    #debug

    /** @type {boolean} */
    #break

    /** @type {boolean} */
    #or

    /** @type {boolean} */
    #and

    /** @param {EditorState} state
    /** @param {Action} action */
    constructor(state, action) {
        this.state = state
        this.#debug = false
        this.cbs = []
        this.#not = false
        this.#or = false
        this.action = action
        this.name = action.name;
    }

    /**
     * @returns {this}
     */
    get debug() {
        this.#debug = true
        return this
    }

    /**
     * @returns {this}
     */
    get break() {
        this.#break = true
        return this
    }

    /**
     * @param {EventCB} f
     * @returns {this}
     */
    chain(f) {
        /** @type {Filter} */
        let filter = {
            name: f.name,
            fn: f,
            or: false,
            and: false,
            invert: this.#not,
        };

        if (this.#or) {
            const last = this.cbs.pop()
            filter = {
                or: true,
                and: false,
                invert: false, // cannot not(or(...)) under this logic (i am ok with that)
                name: `or(${f.name}, ${last.name})`,
                fn: [
                    f,
                    last,
                ]
            }
        } else if (this.#and) {
            const last = this.cbs.pop()
            filter = {
                or: false,
                and: true,
                invert: false, // cannot not(or(...)) under this logic (i am ok with that)
                name: `and(${f.name}, ${last.name})`,
                fn: [
                    f,
                    last,
                ]
            }
        }

        this.cbs.push(filter);
        this.#not = false
        this.#or = false
        this.#and = false
        return this;
    }

    /**
     * @param {string} t
     * @returns {this}
     */
    type(t) {
        return this.chain(function type(evt) {
            return evt.type === t
        })
    }

    get or() {
        assert(this.cbs.length >= 1, "there must be at least one call on the stack")
        assert(this.#and, "you cannot and an and harry")
        this.#or = true
        return this;
    }

    get and() {
        assert(this.cbs.length >= 1, "there must be at least one call on the stack")
        assert(this.#or, "you cannot and an or lloyd")
        this.#and = true
        return this;
    }

    get not() {
        this.#not = true
        return this;
    }

    /**
     * @param {string | string[]} k
     * @returns {this}
     */
    key(k) {
        const processedKeys = Array.isArray(k) ?
            k.map(mapInput) : [mapInput(k)];

        return this.chain(function key(event) {
            const evt = /** @type {KeyboardEvent} */(event)
            for (const p of processedKeys) {
                if (evt.key === p.key && evt.ctrlKey === p.ctrl) {
                    return true
                }
            }
        })
    }

    /**
     * @returns {this}
     */
    stateMouseDown() {
        let that = this
        return this.chain(function stateMouseDown() {
            return State.Mouse.isDown(that.state)
        });
    }

    /**
     * @returns {this}
     */
    selected() {
        let that = this
        return this.chain(function selected() {
            return State.hasSelected(that.state)
        })
    }

    /**
     * @returns {this}
     */
    inPlatform() {
        let that = this
        return this.chain(function fromPlatform(evt) {
            const platform = State.Search.platform(that.state, evt)
            return platform !== null
        })
    }

    /**
     * @param {number} within
     * @returns {this}
     */
    platformSelectedThisTick(within = 1) {
        let that = this
        return this.chain(function platformSelectedThisTick() {
            return State.activePlatform(that.state).selected.tick >= that.state.tick - within
        })
    }

    /**
     * @returns {this}
     */
    platformMoving() {
        let that = this
        return this.chain(function platformMoving() {
            if (!State.hasActivePlatform(that.state)) {
                return false
            }
            return Platform.isMoving(State.activePlatform(that.state))
        })
    }

    /**
     * @returns {this}
     */
    inActivePlatform() {
        let that = this;
        return this.chain(function fromPlatform(evt) {
            if (!State.hasActivePlatform(that.state)) {
                return false
            }
            const ap = State.activePlatform(that.state)
            const platform = State.Search.platform(that.state, evt)
            return platform !== null && platform === ap
        })
    }


    /**
     * @returns {this}
     */
    fastClick() {
        let that = this
        return this.chain(function fastClick() {
            return State.Mouse.duration(that.state) < Consts.behaviors.toBeMovingPxs
        })
    }

    /**
     * @returns {this}
     */
    moving() {
        let that = this
        return this.chain(function moving() {
            return State.hasActivePlatform(that.state) &&
                State.activePlatform(that.state).selected.moving
        })
    }


    /**
     * @returns {this}
     */
    stateHasSelected() {
        let that = this
        return this.chain(function stateHasSelected() {
            return State.hasSelected(that.state)
        })
    }

    /**
     * @returns {this}
     */
    activePlatform() {
        let that = this
        return this.chain(function activePlatform() {
            return State.hasActivePlatform(that.state)
        })
    }

    /**
     * @returns {this}
     */
    controls() {
        let that = this

        return this.chain(function controls(evt) {
            return hasParent(that.state.platformControls, evt)
        })
    }

    /**
     * @returns {this}
     */
    isGridItem() {
        return this.chain(function isGridItem(evt) {
            let curr = /** @type HTMLElement */(evt.target)
            return curr?.classList?.contains("grid-item")
        })
    }

    /**
     * @returns {this}
     */
    fromEditor() {
        let that = this
        return this.chain(function fromEditor(evt) {
            return hasParent(that.state.editor, evt)
        })
    }

    /**
    * @param {Event | BusEvent} evt
    */
    run(evt) {
        const ran = [];
        let i = 0
        for (; i < this.cbs.length; ++i) {
            const c = this.cbs[i]
            if (this.#debug) {
                ran.push(c)
            }

            if (this.#break) {
                const i = 5; // allows for conditional debugger statements
            }

            // @ts-ignore
            // TODO probably will consider a better T type but i don't want to go through all that typing until i am needing to extend this editor far enough that it makes sense
            if (!runFilter(c, evt)) {
                break;
            }
        }

        if (i < this.cbs.length) {
            if (this.#debug) {
                console.log(`${this.name}(failed): ${ran.map(filterString).join(".")}`)
            }
            return false
        }

        const es = State.Search.gridItem(this.state, evt)
        if (this.#debug) {
            console.log(`${this.name}(success): ${ran.map(filterString).join(".")}`, es)
        }

        try {
            this.action(this.state, evt, es)
        } catch (e) {
            console.log(`${this.name}(error): ${ran.map(filterString).join(".")}`, es)
            throw new Error("transformer failed", {
                cause: e
            })
        }
        return true
    }

    /** @param {EditorState} state */
    updateState(state) {
        this.state = state
    }

    toString() {
        return `${this.name}: ${this.cbs.map(filterString)}`
    }
}

/**
 * @param {EditorState} state
 * @returns {(a: Action) => Transforms}
 */
export function createTransform(state) {
    return function(action) {
        return new Transforms(state, action);
    }
}
