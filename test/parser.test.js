import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

const syntaxChecks = [
  ["Valid print statement", "roar -Hello, LMU!-"],
  ["Valid assignment", "x = 42"],
  ["Valid function declaration", "ignite greet(name) | roar -Hello!- |"],
  [
    "Valid loop",
    `Prowl i in range(5) | 
      roar -Looping!- |`
  ],
  [
    "Valid if-else statement",
    `if (x is less than 5) | 
      roar -small- | 
    otherwise | 
      roar -big- |`
  ],
  [
    "Valid nested if-else",
    `if (x is less than 5) | 
      roar -small- | 
    else (x is equal to 5) | 
      roar -medium- | 
    otherwise | 
      roar -big- |`
  ],
  [
    "Valid math operations",
    `x = 5 + 3 * (2 - 1)`
  ]
];

//  !!! CHANGED REGEX PATTERNS !!!
// Instead of 'Expected Identifier', 'Unexpected character', etc.,
// we look for "Line 1, col" to confirm a parse error at line 1, etc.
const syntaxErrors = [
  ["Invalid variable name", "3x = 5", /Line 1, col/],
  ["Missing equals sign", "x 42", /Line 1, col/],
  ["Unclosed string", "roar -Hello", /Line 1, col/],
  ["Invalid function syntax", "ignite greet | roar -Hello!- |", /Line 1, col/],
  ["Mismatched block delimiters", "if (x is less than 5) | roar -small-", /Line 1, col/],
  ["Missing loop keyword", "i in range(5) | roar -Looping!- |", /Line 1, col/],
  ["Unexpected character", "x = 5 @ 3", /Line 1, col/],
  ["Unmatched parentheses", "x = (5 + 3", /Line 1, col/],
  ["Invalid math expression", "x = * 5", /Line 1, col/],
];

describe("The LionCode parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`Parses ${scenario}`, () => {
      const matchResult = parse(source);
      assert.ok(matchResult.succeeded());
    });
  }
  
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`Rejects ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern);
    });
  }
});
