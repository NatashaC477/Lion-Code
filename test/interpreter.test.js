import { describe, it } from 'node:test';
import { deepEqual } from 'node:assert/strict';

describe ('Interpreter', () => {
    it("is alive", () => {
        deepEqual(1, 1);
    });
});
