import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

const syntaxChecks = [
  ["✅ Valid print statement", "roar -Hello, LMU!-"],
  ["✅ Valid assignment", "x = 42"],
  ["✅ Valid function declaration", "ignite greet(name) | roar -Hello!- |"],
  [
    "✅ Valid loop",
    `Prowl i in range(5) | 
      roar -Looping!- |`
  ],
  [
    "✅ Valid if-else statement",
    `if (x is less than 5) | 
      roar -small- | 
    otherwise | 
      roar -big- |`
  ],
  [
    "✅ Valid nested if-else",
    `if (x is less than 5) | 
      roar -small- | 
    else if (x is equal to 5) | 
      roar -medium- | 
    otherwise | 
      roar -big- |`
  ],
  [
    "✅ Valid math operations",
    `x = 5 + 3 * (2 - 1)`
  ]
];

const syntaxErrors = [
  ["❌ Invalid variable name", "3x = 5", /Expected Identifier/],
  ["❌ Missing equals sign", "x 42", /Expected "="/],
  ["❌ Unclosed string", "roar -Hello", /Expected "-"/],
  ["❌ Invalid function syntax", "ignite greet | roar -Hello!- |", /Expected "\("/],
  ["❌ Mismatched block delimiters", "if (x is less than 5) | roar -small-", /Expected "\|"/],
  ["❌ Missing loop keyword", "i in range(5) | roar -Looping!- |", /Expected "Prowl"/],
  ["❌ Unexpected character", "x = 5 @ 3", /Unexpected character/],
  ["❌ Unmatched parentheses", "x = (5 + 3", /Expected "\)"/],
  ["❌ Invalid math expression", "x = * 5", /Unexpected token/]
];

describe("The LionCode parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`✅ Parses ${scenario}`, () => {
      assert.ok(parse(source).succeeded());
    });
  }
  
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`❌ Rejects ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern);
    });
  }
});
