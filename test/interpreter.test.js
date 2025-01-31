import { describe, it } from 'node:test';
import { deepEqual } from 'node:assert/strict';
import { parse } from './lion-code.js';

describe ('Interpreter', () => {
    it("parses correctly", () => {
        deepEqual(parse(), "I don't work");
    });
});
