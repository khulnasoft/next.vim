import { AABB } from "./aabb.js";
import { ZERO } from "./vector.js";

/**
 * @param {AABB} from
 * @returns {PhysicsBody}
*/
export function createPhysics(from) {
    return {
        acc: ZERO.clone(),
        vel: ZERO.clone(),
        vel2: ZERO.clone(),
        body: from.clone(),
    }
}
