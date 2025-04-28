import { describe, it } from "node:test";
import assert from "node:assert/strict";
import generate from "../src/generator.js";

describe("The LionCode Generator", () => {
  it("generates code for variable declarations", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "AssignmentStatement",
        target: { kind: "Identifier", name: "x" },
        expression: { kind: "NumberLiteral", value: 5 }
      }]
    };
    const result = generate(mockAST);
    assert.strictEqual(result, "let x = 5;");
  });

  it("generates code for print statements", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "PrintStatement",
        value: { kind: "StringLiteral", value: "Hello, world!" }
      }]
    };
    const result = generate(mockAST);
    assert.strictEqual(result, 'console.log("Hello, world!");');
  });

  it("generates code for function declarations", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "FunctionDeclaration",
        name: "add",
        params: [
          { kind: "Identifier", name: "a" },
          { kind: "Identifier", name: "b" }
        ],
        body: {
          kind: "Block",
          statements: [{
            kind: "ReturnStatement",
            expression: {
              kind: "BinaryExpression",
              op: "+",
              left: { kind: "Identifier", name: "a" },
              right: { kind: "Identifier", name: "b" }
            }
          }]
        }
      }]
    };
    const result = generate(mockAST);
    
    assert.match(result, /function add\(a, b.*\) {/);
    assert.match(result, /return \(a \+ b.*\);/);
  });

  it("generates code for if statements", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "IfStatement",
        condition: {
          kind: "ComparisonExpression",
          op: "is less than",
          left: { kind: "Identifier", name: "x" },
          right: { kind: "NumberLiteral", value: 5 }
        },
        consequent: {
          kind: "Block",
          statements: [{
            kind: "AssignmentStatement",
            target: { kind: "Identifier", name: "y" },
            expression: { kind: "NumberLiteral", value: 10 }
          }]
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /if \(\(x < 5\)\) {/);
    assert.match(result, /let y = 10;/);
  });

  it("generates code for if-else statements", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "IfStatement",
        condition: {
          kind: "ComparisonExpression",
          op: "is less than",
          left: { kind: "Identifier", name: "x" },
          right: { kind: "NumberLiteral", value: 5 }
        },
        consequent: {
          kind: "Block",
          statements: [{
            kind: "AssignmentStatement", 
            target: { kind: "Identifier", name: "y" },
            expression: { kind: "NumberLiteral", value: 10 }
          }]
        },
        alternate: {
          kind: "Block",
          statements: [{
            kind: "AssignmentStatement",
            target: { kind: "Identifier", name: "y" },
            expression: { kind: "NumberLiteral", value: 20 }
          }]
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /if \(\(x < 5\)\) {/);
    assert.match(result, /} else {/);
    assert.match(result, /let y = 20;/);
  });

  it("generates code for loops", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "WhileStatement",
        variable: { kind: "Identifier", name: "i" },
        range: { kind: "NumberLiteral", value: 5 },
        body: {
          kind: "Block",
          statements: [{
            kind: "PrintStatement",
            value: { kind: "Identifier", name: "i" }
          }]
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /for \(let i = 0; i < 5; i\+\+\) {/);
    assert.match(result, /console\.log\(i\);/);
  });

  it("generates code for break statements", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "BreakStatement"
      }]
    };
    const result = generate(mockAST);
    assert.strictEqual(result, "break;");
  });

  it("handles output type validation", () => {
    const mockAST = {
      kind: "Program",
      statements: []
    };
    assert.throws(() => generate(mockAST, ""), /Output type required/);
    assert.throws(() => generate(mockAST, "c"), /Unknown output type/);
  });

  it("generates code for binary expressions", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "AssignmentStatement",
        target: { kind: "Identifier", name: "z" },
        expression: {
          kind: "BinaryExpression",
          op: "*",
          left: { kind: "NumberLiteral", value: 5 },
          right: { kind: "NumberLiteral", value: 10 }
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /let z = \(5 \* 10\);/);
  });
});