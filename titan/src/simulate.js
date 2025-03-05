import * as Utils from "./utils.js";
import * as Levels from "./objects/level/levels/levels.js";
import * as Config from "./game-config.js";
import * as Runner from "./game-runner.js";
import * as Simulation from "./simulation/state.js";

let now = 0
Utils.setNow(() => now);

/** @param {number} next */
function setTime(next) { now = next }

const seed = +process.argv[2]
const until = +process.argv[3]
const rand = Utils.createSimRand(Utils.mulberry32(seed))
const {
    state,
    sim,
} = Config.createSimGame(rand, Config.getSimGameConfig(rand), Levels.levels()[0])

const ticks = [
    Simulation.createSimulationTick(sim),
    Runner.tickWithoutRender,
]
const loop = Runner.createSimulatedGameLoop(state, setTime)

Runner.clear(state)
Runner.addStandardBehaviors(state)
Runner.run(
    state,
    loop,
    ticks,
    (error) => {
        console.log("game finished", state.tick, error)
    },
    until
);
