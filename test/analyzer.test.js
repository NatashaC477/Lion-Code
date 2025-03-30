import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";

// Valid LionCode programs that should pass static analysis
const semanticChecks = [
  ["variable declaration", "x = 42"],
  ["function declaration", "ignite greet() | roar -Hello!- |"],
  ["loop with range", "Prowl i in range(5) | roar -Looping!- |"],
  ["if-else statement", `if (x is less than 5) | roar -small- | otherwise | roar -big- |`],
  ["string interpolation", `roar -Value: \${x}-`],
  ["math operations", "y = (10 + 3) * 2 / 5"],
  ["nested blocks", "ignite helper() | ignite nested() | x = 1 | | |"],
  ["parameterized function", "ignite add(a, b) | serve a + b |"],
  ["boolean condition", "if (x == true) | roar -Yes!- |"]
];

// Invalid programs (syntax valid but semantic errors)
const semanticErrors = [
  ["undeclared variable", "roar -x-", /Variable 'x' not declared/],
  ["type mismatch", "x = 5\nx = -text-", /Operands must have the same type/],
  ["redeclared variable", "x = 1\nx = 2", /Variable already declared: x/],
  ["invalid parameter count", "ignite greet(n) | |\ngreet()", /Expected 1 argument\(s\) but 0 passed/],
  ["break outside loop", "break", /Break can only appear in a loop/],
  ["immutable assignment", "ignite f() | |\nf = 5", /Assignment to immutable variable/],
  ["invalid comparison", `if (-text- is greater than 5) | |`, /Expected number or string/]
];

describe("The LionCode Analyzer", () => {
  // Valid program checks
  for (const [scenario, source] of semanticChecks) {
    it(`accepts ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }

  // Semantic error checks
  for (const [scenario, source, errorPattern] of semanticErrors) {
    it(`rejects ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorPattern);
    });
  }

  // AST snapshot test
  it("produces expected AST for print statement", () => {
    const ast = analyze(parse("roar -Hello LMU!-"));
    assert.deepEqual(ast, {
      kind: "Program",
      statements: [{
        kind: "PrintStatement",
        value: { 
          kind: "StringLiteral", 
          value: "Hello LMU!" 
        }
      }]
    });
  });
});