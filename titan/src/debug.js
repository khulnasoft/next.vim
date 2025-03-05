/** @typedef {() => void} DebuggerCounter */

/** @type DebuggerCounter[] */
const debuggers = [];

/**
 * @param _ {GameState}
 * @param _d {number}
 */
export function update(_, _d) { }

/**
 * @param _ {GameState}
 */
export function tickClear(_) {
    for (const d of debuggers) {
        d();
    }
}

/**
 * @param count {number}
 * @return (...args: any) => void
 * */
export function debugForCallCount(count) {
    let internalCount = 0;

    /**
     * @param args {any[]}
     * */
    return function(...args) {
        if (internalCount < count) {
            console.log(...args);
            internalCount++;
        }
    }
}

/**
 * @param count {number}
 * @return (...args: any) => void
 * */
export function debugForTickCount(count) {
    let internalCount = 0;

    function counter() {
        internalCount++;
    }

    debuggers.push(counter);

    /**
     * @param args {any[]}
     * */
    return function(...args) {
        if (internalCount < count) {
            console.log(...args);
        }
    }
}
