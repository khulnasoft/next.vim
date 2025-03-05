import { assert } from "../../assert.js";
import * as Bus from "../../bus.js"
import { Vector2D } from "../../math/vector.js";
import * as Utils from "../utils.js"
import * as HTMLUtils from "./utils.js"

const coordValues = [
    "-x",
    "-y",
    "-sx",
    "-sy",
    "-ex",
    "-ey",
]

const textValue = [
    "letter",
    "pu-letter",
    "pu-action",
]

export class PlatformControls extends HTMLElement {
    /** @type {HTMLElement} */
    controls = null

    /** @type {SizeChangeEvent} */
    rects = null

    /**
     * @param {Event} evt
     */
    #change = (evt) => {
        if (evt.type === "resize" && this.lastPlatform) {
            this.moveControls(this.lastPlatform);
            return
        }
        this.setInputState()
    }

    showing = false

    setInputState = () => {
        const {
            obstacle,
            instagib,
            circuit,
            circuitStartX,
            circuitStartY,
            circuitEndX,
            circuitEndY,
            nextLevel,
            nextLevelLevel,
            nextLevelX,
            nextLevelY,
            lazer,
        } = this.getControls()

        instagib.disabled = obstacle.checked
        obstacle.disabled = instagib.checked
        circuitStartX.disabled = !circuit.checked
        circuitStartY.disabled = !circuit.checked
        circuitEndX.disabled = !circuit.checked
        circuitEndY.disabled = !circuit.checked
        nextLevelLevel.disabled = !nextLevel.checked
        nextLevelX.disabled = !nextLevel.checked
        nextLevelY.disabled = !nextLevel.checked
        lazer.disabled = nextLevel.checked || obstacle.checked || instagib.checked || circuit.checked
    }

    /**
     * @type {EditorPlatform | null}
     */
    lastPlatform = null

    /**
     * @param {SizeChangeEvent} change
     */
    #sizeChanged = (change) => {
        this.rects = change;
    }

    constructor() {
        super();
        // TODO can i have multiple of these??
        Bus.listen("show-platform", (platform) => this.revealControls(platform))
        Bus.listen("hide-platform", () => this.hideControls())
        Bus.listen("move-platform", () => this.hideControls())
        Bus.listen("release-platform", (platform) => this.save(platform))
        Bus.listen("delete-platform", () => this.hideControls())
        Bus.listen("resize", this.#change);
        Bus.listen("editor-size-change", this.#sizeChanged);

        let template = /** @type {HTMLTemplateElement} */(document.getElementById("platform-controls"))
        assert(!!template, "unable to retrieve template")
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "closed" });
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.controls = shadowRoot.querySelector(".platform-controls");
    }

    /** @param {EditorPlatform} platform */
    revealControls(platform) {
        if (this.showing) {
            return
        }

        this.showing = true
        this.lastPlatform = platform
        this.controls.classList.add("show")
        this.hydrateState(platform)
        this.setInputState()
        this.moveControls(platform)
        for (const [_, v] of Object.entries(this.getControls())) {
            v.addEventListener("change", this.#change)
        }
    }

    hideControls() {
        this.showing = false
        this.lastPlatform = null
        this.controls.classList.remove("show")
        for (const [_, v] of Object.entries(this.getControls())) {
            v.removeEventListener("change", this.#change)
        }
    }

    /** @param {EditorPlatform} platform */
    moveControls(platform) {
        assert(!!this.rects, "somehow rects were not set")

        const rect = this.controls.getBoundingClientRect()
        let pos = Utils.unproject(this.rects, platform.AABB.pos).subtract(new Vector2D(0, rect.height))

        if (pos.y < 0) {
            const topPos = platform.AABB.pos.clone().add(new Vector2D(0, platform.AABB.height + 0.5))
            pos = Utils.unproject(this.rects, topPos)
        }

        pos.x = Math.max(0, Math.min(window.innerWidth - rect.width, pos.x))
        pos.y = Math.max(0, Math.min(window.innerHeight - rect.height, pos.y))

        this.controls.style.top = `${pos.y}px`
        this.controls.style.left = `${pos.x}px`

    }

    /** @param {EditorPlatform} platform */
    save(platform) {
        this.hideControls()
        const {
            obstacle,
            instagib,
            circuit,
            circuitStartX,
            circuitStartY,
            circuitEndX,
            circuitEndY,
            nextLevel,
            nextLevelLevel,
            nextLevelX,
            nextLevelY,
            render,
            portal,
            portalX,
            portalY,
            portalTo,
            lettered,
            letter,
            lazer,
            powerUp,
            powerUpLetter,
            powerUpStartRange,
            powerUpEndRange,
            powerUpRangeSpeed,
            powerUpAction,
            powerUpActionSpeed,
        } = this.values()

        if (platform.behaviors.powerup) {
            platform.AABB.width = 2
            platform.AABB.height = 1
        }

        platform.behaviors.obstacle = !nextLevel && obstacle ? {type: "obstacle"} : undefined
        platform.behaviors.instagib = !nextLevel && instagib ? {type: "instagib"} : undefined
        platform.behaviors.circuit = !nextLevel && circuit ? {
            type: "circuit",
            startPos: new Vector2D(circuitStartX, circuitStartY),
            endPos: new Vector2D(circuitEndX, circuitEndY),

            // TODO: time?
            time: 1000,
            currentDir: 1,
            currentTime: 0,
        } : undefined
        platform.behaviors.render = !nextLevel && render || lazer ? {
            type: "render",
            renderX: 0, renderY: 0, renderHeight: 0, renderWidth: 0,
        } : undefined
        platform.behaviors.next = nextLevel ? {
            type: "next-level",
            toLevel: nextLevelLevel,
            toLevelPosition: new Vector2D(nextLevelX, nextLevelY),
        } : undefined
        platform.behaviors.portal = portal ? {
            to: portalTo,
            normal: new Vector2D(portalX, portalY).normalize(),
            type: "portal"
        } : undefined
        platform.behaviors.lettered = lettered ? {
            type: "lettered",
            letter,
        } : undefined

        platform.behaviors.lazer = lazer ? {
            type: "lazer",
        } : undefined

        platform.behaviors.powerup = powerUp ? {
            type: "powerup",
            letter: powerUpLetter,
            rangeSpeed: +powerUpRangeSpeed,
            startRange: +powerUpStartRange,
            endRange: +powerUpEndRange,

            actionSpeed: +powerUpActionSpeed,
            actionList: powerUpAction,
        } : undefined

        Bus.editorChange()
    }

    clearControls() {
        const controls = this.getControls()
        for (const [k, v] of Object.entries(controls)) {
            if (v instanceof HTMLInputElement) {
                if (v.type === "checkbox") {
                    v.checked = false
                } else {
                    v.value = ""
                }
            } else {
                v.innerText = ""
            }
        }

    }

    /** @param {EditorPlatform} platform */
    hydrateState(platform) {
        this.clearControls()
        const {
            obstacle,
            instagib,
            circuit,
            circuitStartX,
            circuitStartY,
            circuitEndX,
            circuitEndY,
            nextLevel,
            nextLevelLevel,
            render,
            nextLevelX,
            nextLevelY,
            portal,
            portalX,
            portalY,
            portalTo,
            id,
            lettered,
            letter,
            lazer,
            powerUp,
            powerUpLetter,
            powerUpStartRange,
            powerUpEndRange,
            powerUpRangeSpeed,
            powerUpAction,
            powerUpActionSpeed,
        } = this.getControls()

        id.innerText = String(platform.id)

        const behaviors = platform.behaviors
        obstacle.checked = !!behaviors.obstacle
        instagib.checked = !!behaviors.instagib
        render.checked = !!behaviors.render || !!behaviors.lazer

        const next = behaviors.next;
        if (next) {
            nextLevel.checked = true
            nextLevelLevel.value = String(next.toLevel)
            nextLevelX.value = String(next.toLevelPosition.x)
            nextLevelY.value = String(next.toLevelPosition.y)
        }

        if (behaviors.circuit) {
            circuit.checked = true
            circuitStartX.value = String(behaviors.circuit.startPos.x)
            circuitStartY.value = String(behaviors.circuit.startPos.y)
            circuitEndX.value = String(behaviors.circuit.endPos.x)
            circuitEndY.value = String(behaviors.circuit.endPos.y)
        }

        if (behaviors.portal) {
            portal.checked = true
            portalX.value = String(behaviors.portal.normal.x)
            portalY.value = String(behaviors.portal.normal.y)
            portalTo.value = String(behaviors.portal.to)
        }

        if (behaviors.lettered) {
            lettered.checked = true
            letter.value = behaviors.lettered.letter
        }

        if (behaviors.lazer) {
            lazer.checked = true
        }

        const pu = behaviors.powerup
        if (pu) {
            powerUp.checked = true
            powerUpLetter.value = pu.letter
            powerUpAction.value = pu.actionList
            powerUpActionSpeed.value = "" + pu.actionSpeed
            powerUpStartRange.value = "" + pu.startRange
            powerUpEndRange.value = "" + pu.endRange
            powerUpRangeSpeed.value = "" + pu.rangeSpeed
        }
    }

    values() {
        const controls = this.getControls()
        const out = {}
        for (const [k, v] of Object.entries(controls)) {
            if (v instanceof HTMLInputElement) {
                if (v.type === "checkbox") {
                    out[k] = v.checked
                } else if (coordValues.some(x => v.id.includes(x))) {
                    out[k] = HTMLUtils.parseCoord(v.value)
                } else if (textValue.some(x => x === v.name)) {
                    out[k] = v.value
                } else {
                    out[k] = +v.value
                }
            } else {
                out[k] = +v.innerText;
            }
        }

        return out
    }

    /**
     * @returns {{
            id: HTMLElement
            obstacle: HTMLInputElement
            instagib: HTMLInputElement
            circuit: HTMLInputElement
            circuitStartX: HTMLInputElement
            circuitStartY: HTMLInputElement
            circuitEndX: HTMLInputElement
            circuitEndY: HTMLInputElement
            nextLevel: HTMLInputElement
            nextLevelLevel: HTMLInputElement
            nextLevelX: HTMLInputElement
            nextLevelY: HTMLInputElement
            render: HTMLInputElement
            portal: HTMLInputElement
            portalX: HTMLInputElement
            portalY: HTMLInputElement
            portalTo: HTMLInputElement
            lettered: HTMLInputElement
            letter: HTMLInputElement
            lazer: HTMLInputElement
            powerUp: HTMLInputElement
            powerUpLetter: HTMLInputElement
            powerUpStartRange: HTMLInputElement
            powerUpEndRange: HTMLInputElement
            powerUpRangeSpeed: HTMLInputElement
            powerUpAction: HTMLInputElement
            powerUpActionSpeed: HTMLInputElement
        }}
     */
    getControls() {
        return {
            id: this.controls.querySelector(".id"),
            obstacle: this.controls.querySelector("#obstacle"),
            instagib: this.controls.querySelector("#instagib"),
            circuit: this.controls.querySelector("#circuit"),
            circuitStartX: this.controls.querySelector("#circuit-sx"),
            circuitStartY: this.controls.querySelector("#circuit-sy"),
            circuitEndX: this.controls.querySelector("#circuit-ex"),
            circuitEndY: this.controls.querySelector("#circuit-ey"),
            nextLevel: this.controls.querySelector("#next-level"),
            nextLevelLevel: this.controls.querySelector("#nl-id"),
            nextLevelX: this.controls.querySelector("#next-x"),
            nextLevelY: this.controls.querySelector("#next-y"),
            render: this.controls.querySelector("#render"),
            portal: this.controls.querySelector("#portal"),
            portalX: this.controls.querySelector("#portal-x"),
            portalY: this.controls.querySelector("#portal-y"),
            portalTo: this.controls.querySelector("#portal-to"),
            lettered: this.controls.querySelector("#lettered"),
            letter: this.controls.querySelector("#letter"),
            lazer: this.controls.querySelector("#lazer"),

            powerUp: this.controls.querySelector("#powerUp"),
            powerUpLetter: this.controls.querySelector("#pu-letter"),
            powerUpStartRange: this.controls.querySelector("#pu-startr"),
            powerUpEndRange: this.controls.querySelector("#pu-endr"),
            powerUpRangeSpeed: this.controls.querySelector("#pu-rspeed"),
            powerUpAction: this.controls.querySelector("#pu-action"),
            powerUpActionSpeed: this.controls.querySelector("#pu-aspeed"),
        };
    }
}


