// TODO: Make this objectively better than it is now

/** @param msg {string}
/** @param data {any[]}
 */
function runAssert(msg, data) {
    console.error(msg, ...data)
    throw new Error(msg)
}

/** @param msg {string}
/** @param data {any[]}
 */
export function never(msg, ...data) {
    runAssert(msg, data);
}

/** @param truthy {boolean}
/** @param msg {string}
/** @param data {any[]}
 * */
export function assert(truthy, msg, ...data) {
    if (!truthy) {
        runAssert(msg, data);
    }
}

