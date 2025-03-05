import test from "node:test";
import * as assert from "node:assert";

import * as Level from "./level.js";
import * as Window from "../../window.js";
import { AABB } from "../../math/aabb.js";
import { Vector2D } from "../../math/vector.js";

test("should return an empty map when no platforms are provided", () => {
    const platforms = [];
    const result = Level.createLetterMap(platforms);
    assert.deepEqual(result, Array(Window.GAME_HEIGHT).fill(Array(Window.GAME_WIDTH).fill(null)));
});

test("should place letters correctly for a single platform", () => {
    const platforms = [
        Level.withLetters(Level.createPlatform(new AABB(new Vector2D(2, 1), 1, 3)), "ABC"),
    ];
    const result = Level.createLetterMap(platforms);

    const expected = Array(Window.GAME_HEIGHT).fill(null).map(() => Array(Window.GAME_WIDTH).fill(null));
    expected[1][2] = "A";
    expected[2][2] = "B";
    expected[3][2] = "C";

    assert.deepEqual(result, expected);
});

test("should handle platforms without letters by skipping them", () => {
    const platforms = [
        Level.createPlatform(new AABB(new Vector2D(3, 2), 2, 2)),
    ];
    const result = Level.createLetterMap(platforms);
    const expected = Array(Window.GAME_HEIGHT).fill(null).map(() => Array(Window.GAME_WIDTH).fill(null));

    assert.deepEqual(result, expected);
});

test("should handle multiple platforms with letters", () => {
    const platforms = [
        Level.withLetters(Level.createPlatform(new AABB(new Vector2D(1, 1), 1, 2)), "XY"),
        Level.withLetters(Level.createPlatform(new AABB(new Vector2D(3, 2), 1, 3)), "ABC"),
    ];
    const result = Level.createLetterMap(platforms);

    const expected = Array(Window.GAME_HEIGHT).fill(null).map(() => Array(Window.GAME_WIDTH).fill(null));
    expected[1][1] = "X";
    expected[2][1] = "Y";
    expected[2][3] = "A";
    expected[3][3] = "B";
    expected[4][3] = "C";

    assert.deepEqual(result, expected);
});

test("should correctly handle platforms that exceed game boundaries", () => {
    const platforms = [
        Level.withLetters(Level.createPlatform(new AABB(new Vector2D(8, Window.GAME_HEIGHT - 1), 1, 4)), "WXYZ"),
    ];
    const result = Level.createLetterMap(platforms);

    const expected = Array(Window.GAME_HEIGHT).fill(null).map(() => Array(Window.GAME_WIDTH).fill(null));
    expected[Window.GAME_HEIGHT - 1][8] = "W";

    assert.deepEqual(result, expected)
});

