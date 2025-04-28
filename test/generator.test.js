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

  it("generates code for function calls", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "FunctionCall",
        name: "calculate",
        args: [
          { kind: "NumberLiteral", value: 5 },
          { 
            kind: "BinaryExpression", 
            op: "+", 
            left: { kind: "Identifier", name: "x" },
            right: { kind: "NumberLiteral", value: 3 }
          }
        ]
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /calculate\(5, \(x \+ 3\)\)/);
  });

  it("generates code for string literals with interpolation", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "AssignmentStatement",
        target: { kind: "Identifier", name: "message" },
        expression: { 
          kind: "StringLiteral", 
          value: "Hello, ${name}!",
          hasInterpolation: true
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /let message = "Hello, \${name}!";/);
  });

  it("generates code for string literals with escaped quotes", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "AssignmentStatement",
        target: { kind: "Identifier", name: "message" },
        expression: { 
          kind: "StringLiteral", 
          value: 'She said "Hello!"' // String with quotes that need escaping
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /let message = "She said \\"Hello!\\"";/);
  });

  it("generates code for boolean literals", () => {
    const mockAST = {
      kind: "Program",
      statements: [
        {
          kind: "AssignmentStatement",
          target: { kind: "Identifier", name: "trueFlag" },
          expression: { kind: "BooleanLiteral", value: true }
        },
        {
          kind: "AssignmentStatement",
          target: { kind: "Identifier", name: "falseFlag" },
          expression: { kind: "BooleanLiteral", value: false }
        }
      ]
    };
    const result = generate(mockAST);
    assert.match(result, /let trueFlag = true;/);
    assert.match(result, /let falseFlag(_\d+)? = false;/);
  });

  it("handles range expressions", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "WhileStatement",
        variable: { kind: "Identifier", name: "i" },
        range: { 
          kind: "RangeExpression", 
          value: { kind: "NumberLiteral", value: 10 }
        },
        body: {
          kind: "Block",
          statements: []
        }
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /for \(let i = 0; i < 10; i\+\+\) {/);
  });

  it("generates code for comment statements", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "Comment",
        text: "This is a comment",
        value: "This is a comment"
      }]
    };
    const result = generate(mockAST);
    assert.match(result, /\/\/ This is a comment/);
  });

  it("handles unknown statement kinds", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "SomeUnknownKind"
      }]
    };
    const result = generate(mockAST);
    assert.strictEqual(typeof result, "string");
  });

  it("generates code for return statements without expression", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "ReturnStatement"
      }]
    };
    const result = generate(mockAST);
    assert.strictEqual(result, "return ;");
  });

  it("generates code for comparison expressions with different operators", () => {
    const operators = [
      ["is less than", "<"],
      ["is greater than", ">"],
      ["is equal to", "==="],
      ["==", "==="],
      ["!=", "!=="],
      [">=", ">="],
      ["<=", "<="]
    ];
    
    for (const [lionOp, jsOp] of operators) {
      const mockAST = {
        kind: "Program",
        statements: [{
          kind: "IfStatement",
          condition: {
            kind: "ComparisonExpression",
            op: lionOp,
            left: { kind: "Identifier", name: "x" },
            right: { kind: "NumberLiteral", value: 10 }
          },
          consequent: {
            kind: "Block",
            statements: []
          }
        }]
      };
      
      const result = generate(mockAST);
      assert.match(result, new RegExp(`if \\(\\(x ${jsOp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} 10\\)\\) \\{`));
    }
  });

  it("handles null output type", () => {
    const mockAST = {
      kind: "Program",
      statements: []
    };
    assert.throws(() => generate(mockAST, null), /Output type required/);
  });

  it("handles custom comparison operators", () => {
    const mockAST = {
      kind: "Program",
      statements: [{
        kind: "IfStatement",
        condition: {
          kind: "ComparisonExpression",
          op: "custom operator", // This is an operator not explicitly handled
          left: { kind: "Identifier", name: "x" },
          right: { kind: "NumberLiteral", value: 10 }
        },
        consequent: {
          kind: "Block",
          statements: []
        }
      }]
    };
    
    const result = generate(mockAST);
    // The operator should be passed through unchanged
    assert.match(result, /if \(\(x custom operator 10\)\) \{/);
  });
  
});