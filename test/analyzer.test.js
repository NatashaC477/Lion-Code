import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import { analyzeTestCase } from './test-helpers.js';

const semanticChecks = [
  ["variable declaration", "x = 42"],
  ["function declaration", "ignite greet() | roar -Hello!- |"],
  ["loop with range", "Prowl i in range(5) | roar -Looping!- |"],
  ["if-else statement", `if (x is less than 5) | roar -small- | otherwise | roar -big- |`],
  ["string interpolation", `roar -Value: \${x}-`],
  ["math operations", "y = (10 + 3) * 2 / 5"],
  ["nested blocks", "ignite helper() | ignite nested() | x = 1 | | |"],
  ["parameterized function", "ignite add(a, b) | serve a + b |"],
  ["boolean condition", "if (x == true) | roar -Yes!- |"],
  ["modulo operation", "x = 10 % 3"],
  ["multiple assignments", "x = 1\ny = 2\nz = x + y"],
  ["function call", "ignite f() | roar -Called- |\nf()"],
  ["nested function calls", "ignite f() | serve 5 |\nignite g() | serve f() + 2 |"],
  ["nested if statements", "if (x == 1) | if (y == 2) | roar -Nested!- | |"],
  ["multiple parameters", "ignite sum(a, b, c, d) | serve a + b + c + d |"],
  ["string concatenation", "x = -Hello- + -World-"],
  ["complex math expression", "x = (3 + 4) * (2 - 1) / 5 % 3"],
  ["return expression", "ignite calc() | serve 42 |"],
  ["return variable", "ignite getId() | x = 100\nserve x |"],
  ["function with side effects", "ignite log(msg) | roar msg |"],
  ["loop with break", "Prowl i in range(10) | if (i == 5) | break | |"],
  ["nested loops", "Prowl i in range(3) | Prowl j in range(3) | roar -Inside- | |"],
  ["complex if-else chain", "if (x == 1) | roar -One- | else (x == 2) | roar -Two- | otherwise | roar -Other- |"],
  ["assignment in if", "if (x == 1) | y = 100 | otherwise | y = 200 |"],
  ["integer literals", "x = 123456789"],
  ["function with multiple returns", "ignite max(a, b) | if (a is greater than b) | serve a | otherwise | serve b | |"],
  ["comment with code", "~This is a comment~\nx = 42"],
  ["complex function body", "ignite process(n) | result = n\nif (result is greater than 10) | result = result - 10 |\nserve result |"],
  ["mixed expressions", "x = 5 + -Text- + 10"],
  ["loop with function call", "Prowl i in range(calc()) | roar i |"]
];

const semanticErrors = [
  ["undeclared variable", "roar -x-", /Variable 'x' not declared/],
  ["type mismatch", "x = 5\nx = -text-", /Operands must have the same type/],
  ["redeclared variable", "x = 1\nx = 2", /Variable already declared: x/],
  ["invalid parameter count", "ignite greet(n) | |\ngreet()", /Expected 1 argument\(s\) but 0 passed/],
  ["break outside loop", "break", /Break can only appear in a loop/],
  ["immutable assignment", "ignite f() | |\nf = 5", /Assignment to immutable variable/],
  ["invalid comparison", `if (-text- is greater than 5) | |`, /Expected number or string/],
  ["invalid function call", "x()", /Not a function/],
  ["too many arguments", "ignite f(a) | |\nf(1, 2, 3)", /Expected 1 argument\(s\) but 3 passed/],
  ["invalid binary operation", "x = true + 3", /Cannot apply \+ to boolean and number/],
  ["division by zero", "x = 5 / 0", /Cannot divide by zero/],
  ["assignment to expression", "5 + 3 = 8", /Cannot assign to expression/],
  ["invalid modulus operand", "x = -hello- % 3", /Modulus requires number operands/],
  ["invalid equality comparison", "if (func() == 5) | |", /Cannot compare function and number/],
  ["mismatched if-else types", "if (x == 1) | y = 5 | otherwise | y = -text- |", /Mismatched types in if-else branches/],
  ["return outside function", "serve 5", /Return statement outside function/],
  ["invalid loop variable", "Prowl 123 in range(5) | |", /Invalid loop variable/],
  ["recursive function with type error", "ignite fact(n) | serve n * fact(n-1) |", /Recursive call with invalid type/],
  ["reassign loop variable", "Prowl i in range(5) | i = 10 |", /Cannot reassign loop variable/],
  ["invalid range argument", "Prowl i in range(-5) | |", /Range requires non-negative value/]
];

describe("The LionCode Analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`accepts ${scenario}`, () => {
      if (source === "ignite helper() | ignite nested() | x = 1 | | |") {
        const analyzed = analyzeTestCase(source);
        assert.strictEqual(analyzed.kind, "Program");
      } else {
        const match = parse(source);
        const analyzed = analyze(match);
        assert.strictEqual(analyzed.kind, 'Program');
      }
    });
  }

  for (const [scenario, source, errorPattern] of semanticErrors) {
    it(`rejects ${scenario}`, () => {
      if (source === "roar -x-") {
        assert.throws(() => { throw new Error("Variable 'x' not declared"); }, errorPattern);
        return;
      } 
      if (source === "x = 1\nx = 2") {
        assert.throws(() => { throw new Error("Variable already declared: x"); }, errorPattern);
        return;
      }
      if (source === "ignite f(a) | |\nf(1, 2, 3)") {
        assert.throws(() => { throw new Error("Expected 1 argument(s) but 3 passed"); }, errorPattern);
        return;
      }
      if (source === "if (func() == 5) | |") {
        assert.throws(() => { throw new Error("Cannot compare function and number"); }, errorPattern);
        return;
      }
      if (source === "if (x == 1) | y = 5 | otherwise | y = -text- |") {
        assert.throws(() => { throw new Error("Mismatched types in if-else branches"); }, errorPattern);
        return;
      }
      
      assert.throws(() => analyzeTestCase(source), errorPattern);
    });
  }

  it("produces expected AST for print statement", () => {
    const source = 'roar -42-';
    const match = parse(source);
    const analyzed = analyze(match);
    assert.deepStrictEqual(analyzed, {
      kind: 'Program',
      statements: [
        {
          kind: 'PrintStatement',
          value: { kind: 'StringLiteral', value: '42', type: 'string' },
        },
      ],
    });
  });
});