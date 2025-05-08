import assert from "node:assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";
import { describe, it } from 'node:test';


describe("The optimizer", () => {
  it("removes self-assignments", () => {
    const original = core.assignmentStatement(
      core.identifier("x", "number"),
      core.identifier("x", "number")
    );
    const optimized = optimize(original);
    assert.deepStrictEqual(optimized, []);
  });

  it("folds binary expressions with number literals", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x", "number"),
        core.binaryExpression(
          "+",
          core.numberLiteral(5),
          core.numberLiteral(8)
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.value, 13);
  });

  it("optimizes addition with 0", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x", "number"),
        core.binaryExpression(
          "+",
          core.identifier("y", "number"),
          core.numberLiteral(0)
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.kind, "Identifier");
    assert.strictEqual(optimized.statements[0].expression.name, "y");
  });

  it("optimizes multiplication with 1", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x", "number"),
        core.binaryExpression(
          "*",
          core.identifier("y", "number"),
          core.numberLiteral(1)
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.kind, "Identifier");
    assert.strictEqual(optimized.statements[0].expression.name, "y");
  });

  it("optimizes multiplication with 0", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x", "number"),
        core.binaryExpression(
          "*",
          core.identifier("y", "number"),
          core.numberLiteral(0)
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.kind, "NumberLiteral");
    assert.strictEqual(optimized.statements[0].expression.value, 0);
  });

  it("folds comparison expressions with number literals", () => {
    const original = core.program([
      core.ifStatement(
        core.comparisonExpression(
          "<",
          core.numberLiteral(5),
          core.numberLiteral(8)
        ),
        core.block([
          core.printStatement(core.stringLiteral("True branch"))
        ]),
        core.block([
          core.printStatement(core.stringLiteral("False branch"))
        ])
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].kind, "Block");
    assert.strictEqual(optimized.statements[0].statements[0].kind, "PrintStatement");
  });

  it("optimizes if-statements with boolean literals", () => {
    const original = core.program([
      core.ifStatement(
        core.booleanLiteral(false),
        core.block([
          core.printStatement(core.stringLiteral("True branch"))
        ]),
        core.block([
          core.printStatement(core.stringLiteral("False branch"))
        ])
      )
    ]);
    const optimized = optimize(original);

    assert.strictEqual(optimized.statements[0].kind, "Block");
    assert.strictEqual(optimized.statements[0].statements[0].argument.value, "False branch");
  });

  it("optimizes function bodies", () => {
    const original = core.functionDeclaration(
      "test",
      [],
      core.block([
        core.assignmentStatement(
          core.identifier("x", "number"),
          core.binaryExpression(
            "+",
            core.numberLiteral(2),
            core.numberLiteral(3)
          )
        )
      ])
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.body.statements[0].expression.value, 5);
  });

  it("optimizes arguments in print statements", () => {
    const original = core.program([
      core.printStatement(
        core.binaryExpression("+", core.numberLiteral(3), core.numberLiteral(4))
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].kind, "PrintStatement");
    assert.strictEqual(optimized.statements[0].argument?.value || optimized.statements[0].value?.value, 7);
  });

  it("optimizes expressions in return statements", () => {
    const original = core.returnStatement(
      core.binaryExpression("+", core.numberLiteral(5), core.numberLiteral(8))
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "ReturnStatement");
    assert.strictEqual(optimized.expression.value, 13);
  });

  it("removes loops with zero iterations", () => {
    const original = core.program([
      core.whileStatement(
        core.identifier("i"),
        core.numberLiteral(0),
        core.block([
          core.printStatement(core.stringLiteral("This won't run"))
        ])
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements.length, 0);
  });

  it("removes loops with empty bodies", () => {
    const original = core.program([
      core.whileStatement(
        core.identifier("i"),
        core.numberLiteral(10),
        core.block([])
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements.length, 0);
  });

  it("preserves break statements", () => {
    const original = core.program([
      core.whileStatement(
        core.identifier("i"),
        core.numberLiteral(10),
        core.block([
          core.breakStatement()
        ])
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].body.statements[0].kind, "BreakStatement");
  });

  it("simplifies comparisons with identical operands", () => {
    const id = core.identifier("x", "number");
    const original = core.comparisonExpression("==", id, id);
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, true);
  });

  it("optimizes unary expressions with literals", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x"),
        { kind: "UnaryExpression", operator: "-", operand: core.numberLiteral(5) }
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.kind, "NumberLiteral");
    assert.strictEqual(optimized.statements[0].expression.value, -5);
  });

  it("eliminates double negation in boolean expressions", () => {
    const original = {
      kind: "UnaryExpression",
      operator: "!",
      operand: {
        kind: "UnaryExpression",
        operator: "!",
        operand: core.booleanLiteral(true)
      }
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, true);
  });

  it("applies strength reduction for multiplication by power of 2", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x"),
        core.binaryExpression(
          "*",
          core.identifier("y"),
          core.numberLiteral(8) 
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.operator, "<<");
    assert.strictEqual(optimized.statements[0].expression.right.value, 3); 
  });

  it("applies strength reduction for division by power of 2", () => {
    const original = core.program([
      core.assignmentStatement(
        core.identifier("x"),
        core.binaryExpression(
          "/",
          core.identifier("y"),
          core.numberLiteral(4) 
        )
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].expression.operator, ">>");
    assert.strictEqual(optimized.statements[0].expression.right.value, 2); 
  });

  it("combines like terms in addition", () => {
    const original = core.binaryExpression(
      "+",
      core.binaryExpression("+", core.identifier("x"), core.numberLiteral(5)),
      core.numberLiteral(3)
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.operator || optimized.op, "+");
    assert.strictEqual(optimized.right.value, 8);
  });

  it("optimizes boolean expressions with constants", () => {

    let original = core.binaryExpression("and", core.booleanLiteral(true), core.identifier("x"));
    let optimized = optimize(original);
    assert.strictEqual(optimized.kind, "Identifier");
    assert.strictEqual(optimized.name, "x");

    original = core.binaryExpression("and", core.booleanLiteral(false), core.identifier("x"));
    optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, false);

    original = core.binaryExpression("or", core.booleanLiteral(false), core.identifier("x"));
    optimized = optimize(original);
    assert.strictEqual(optimized.kind, "Identifier");
    assert.strictEqual(optimized.name, "x");

    original = core.binaryExpression("or", core.booleanLiteral(true), core.identifier("x"));
    optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, true);
  });

  it("optimizes built-in function calls with constant arguments", () => {
    const original = {
      kind: "FunctionCall",
      callee: "Math.sqrt",
      args: [core.numberLiteral(16)]
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "NumberLiteral");
    assert.strictEqual(optimized.value, 4);
  });

  it("removes empty if statements", () => {
    const original = core.program([
      core.ifStatement(
        core.booleanLiteral(true),
        core.block([]),
        null
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements.length, 0);
  });

  it("simplifies negated conditions", () => {
    const original = core.program([
      core.ifStatement(
        core.comparisonExpression("!=", core.identifier("x"), core.numberLiteral(5)),
        core.block([core.printStatement(core.stringLiteral("Not equal"))]),
        core.block([core.printStatement(core.stringLiteral("Equal"))])
      )
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.statements[0].condition.operator, "==");
    assert.strictEqual(optimized.statements[0].consequent.statements[0].value.value, "Equal");
  });

  it("handles undefined or null nodes", () => {
    const optimized = optimize(null);
    assert.strictEqual(optimized, null);
  });

  it("optimizes if-statements with constant conditions", () => {
    const original = core.ifStatement(
      core.booleanLiteral(true),
      core.block([core.printStatement(core.stringLiteral("True branch"))]),
      core.block([core.printStatement(core.stringLiteral("False branch"))])
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "Block");
    assert.strictEqual(optimized.statements[0].value.value, "True branch");
  });

  it("folds binary expressions with constants", () => {
    const original = core.binaryExpression(
      "+",
      core.numberLiteral(3),
      core.numberLiteral(4)
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.value, 7);
  });

  it("optimizes unary expressions with literals", () => {
    const original = core.unaryExpression("-", core.numberLiteral(5));
    const optimized = optimize(original);
    assert.strictEqual(optimized.value, -5);
  });

  it("optimizes function call arguments", () => {
    const original = core.functionCall("testFunc", [
      core.binaryExpression("+", core.numberLiteral(2), core.numberLiteral(3))
    ]);
    const optimized = optimize(original);
    assert.strictEqual(optimized.args[0].value, 5);
  });
});

describe("Additional optimizer coverage tests", () => {
  it("optimizes print statements with complex expressions", () => {
    const original = core.printStatement(
      core.binaryExpression("+", core.numberLiteral(3), core.numberLiteral(4))
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.value.value, 7);
  });

  it("optimizes return statements", () => {
    const original = core.returnStatement(
      core.binaryExpression("+", core.numberLiteral(5), core.numberLiteral(10))
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.expression.value, 15);
  });

  it("optimizes unary expressions", () => {
    const original = {
      kind: "UnaryExpression",
      operator: "-",
      operand: core.numberLiteral(42)
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.value, -42);
  });

  it("optimizes boolean negation", () => {
    const original = {
      kind: "UnaryExpression",
      operator: "!",
      operand: core.booleanLiteral(true)
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.value, false);
  });

  it("folds constant comparisons with booleans", () => {
    const original = core.comparisonExpression(
      "==", 
      core.booleanLiteral(true),
      core.booleanLiteral(true)
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, true);
  });

  it("folds constant comparisons with strings", () => {
    const original = core.comparisonExpression(
      "==",
      core.stringLiteral("hello"),
      core.stringLiteral("hello")
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "BooleanLiteral");
    assert.strictEqual(optimized.value, true);
  });

  it("folds constant inequality comparisons", () => {
    const original = core.comparisonExpression(
      "!=",
      core.numberLiteral(5),
      core.numberLiteral(10)
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.value, true);
  });

  it("folds various comparison operators", () => {
    const tests = [
      { op: "<", left: 5, right: 10, expected: true },
      { op: "<=", left: 5, right: 5, expected: true },
      { op: ">", left: 10, right: 5, expected: true },
      { op: ">=", left: 10, right: 10, expected: true },
    ];

    for (const test of tests) {
      const original = core.comparisonExpression(
        test.op,
        core.numberLiteral(test.left),
        core.numberLiteral(test.right)
      );
      const optimized = optimize(original);
      assert.strictEqual(optimized.value, test.expected);
    }
  });

  it("optimizes comparisons with identical operands", () => {
    const id = core.identifier("x");
    const tests = [
      { op: "==", expected: true },
      { op: "!=", expected: false },
      { op: "<=", expected: true },
      { op: ">=", expected: true },
      { op: "<", expected: false },
      { op: ">", expected: false }
    ];

    for (const test of tests) {
      const original = {
        kind: "ComparisonExpression",
        operator: test.op,
        left: id,
        right: JSON.parse(JSON.stringify(id)) 
      };
      const optimized = optimize(original);
      assert.strictEqual(optimized.value, test.expected);
    }
  });

  it("optimizes boolean AND expressions", () => {
    let expr = {
      kind: "BinaryExpression",
      operator: "and",
      left: core.booleanLiteral(true),
      right: core.identifier("x")
    };
    let result = optimize(expr);
    assert.strictEqual(result.kind, "Identifier");


    expr = {
      kind: "BinaryExpression",
      operator: "and",
      left: core.booleanLiteral(false),
      right: core.identifier("x")
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "BooleanLiteral");
    assert.strictEqual(result.value, false);

 
    expr = {
      kind: "BinaryExpression",
      operator: "and",
      left: core.identifier("x"),
      right: core.booleanLiteral(true)
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "Identifier");


    expr = {
      kind: "BinaryExpression",
      operator: "and",
      left: core.identifier("x"),
      right: core.booleanLiteral(false)
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "BooleanLiteral");
    assert.strictEqual(result.value, false);
  });

  it("optimizes boolean OR expressions", () => {

    let expr = {
      kind: "BinaryExpression",
      operator: "or",
      left: core.booleanLiteral(false),
      right: core.identifier("x")
    };
    let result = optimize(expr);
    assert.strictEqual(result.kind, "Identifier");

    expr = {
      kind: "BinaryExpression",
      operator: "or",
      left: core.booleanLiteral(true),
      right: core.identifier("x")
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "BooleanLiteral");
    assert.strictEqual(result.value, true);

    expr = {
      kind: "BinaryExpression",
      operator: "or",
      left: core.identifier("x"),
      right: core.booleanLiteral(false)
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "Identifier");

    expr = {
      kind: "BinaryExpression",
      operator: "or",
      left: core.identifier("x"),
      right: core.booleanLiteral(true)
    };
    result = optimize(expr);
    assert.strictEqual(result.kind, "BooleanLiteral");
    assert.strictEqual(result.value, true);
  });

  
  it("eliminates double negation", () => {
    const original = {
      kind: "UnaryExpression",
      operator: "!",
      operand: {
        kind: "UnaryExpression",
        operator: "!",
        operand: core.identifier("x")
      }
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "Identifier");
    assert.strictEqual(optimized.name, "x");
  });


  it("inlines Math.sqrt with constant argument", () => {
    const original = {
      kind: "FunctionCall",
      callee: "Math.sqrt",
      args: [core.numberLiteral(16)]
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.kind, "NumberLiteral");
    assert.strictEqual(optimized.value, 4);
  });


  it("combines like terms in nested additions", () => {
    const original = {
      kind: "BinaryExpression",
      operator: "+",
      left: {
        kind: "BinaryExpression",
        operator: "+",
        left: core.identifier("x"),
        right: core.numberLiteral(5)
      },
      right: core.numberLiteral(3)
    };
    const optimized = optimize(original);
    assert.strictEqual(optimized.left.kind, "Identifier");
    assert.strictEqual(optimized.right.value, 8);
  });

  it("optimizes if statements with boolean literal conditions", () => {

    const trueIf = core.ifStatement(
      core.booleanLiteral(true),
      core.block([core.printStatement(core.stringLiteral("yes"))]),
      core.block([core.printStatement(core.stringLiteral("no"))])
    );
    const optimizedTrue = optimize(trueIf);
    assert.strictEqual(optimizedTrue.kind, "Block");
    assert.strictEqual(optimizedTrue.statements[0].value.value, "yes");

    const falseIf = core.ifStatement(
      core.booleanLiteral(false),
      core.block([core.printStatement(core.stringLiteral("yes"))]),
      core.block([core.printStatement(core.stringLiteral("no"))])
    );
    const optimizedFalse = optimize(falseIf);
    assert.strictEqual(optimizedFalse.kind, "Block");
    assert.strictEqual(optimizedFalse.statements[0].value.value, "no");
  });

  it("removes if statements with empty blocks", () => {
    const emptyIf = core.ifStatement(
      core.identifier("x"),
      core.block([]),
      null
    );
    const optimized = optimize(emptyIf);
    assert.deepStrictEqual(optimized, []);
  });


  it("simplifies negated conditions in if statements", () => {
    const original = core.ifStatement(
      core.comparisonExpression("!=", core.identifier("x"), core.numberLiteral(5)),
      core.block([core.printStatement(core.stringLiteral("not equal"))]),
      core.block([core.printStatement(core.stringLiteral("equal"))])
    );
    const optimized = optimize(original);
    assert.strictEqual(optimized.condition.operator, "==");
    assert.strictEqual(optimized.consequent.statements[0].value.value, "equal");
    assert.strictEqual(optimized.alternate.statements[0].value.value, "not equal");
  });

  it("removes while loops with zero iterations", () => {
    const original = core.whileStatement(
      core.identifier("i"),
      core.numberLiteral(0),
      core.block([core.printStatement(core.stringLiteral("never runs"))])
    );
    const optimized = optimize(original);
    assert.deepStrictEqual(optimized, []);
  });

  it("removes while loops with empty bodies", () => {
    const original = core.whileStatement(
      core.identifier("i"),
      core.numberLiteral(10),
      core.block([])
    );
    const optimized = optimize(original);
    assert.deepStrictEqual(optimized, []);
  });
  
  it("passes through literal values unchanged", () => {
    const numLit = core.numberLiteral(42);
    assert.deepStrictEqual(optimize(numLit), numLit);
    
    const strLit = core.stringLiteral("hello");
    assert.deepStrictEqual(optimize(strLit), strLit);
    
    const boolLit = core.booleanLiteral(true);
    assert.deepStrictEqual(optimize(boolLit), boolLit);
    
    const idLit = core.identifier("x");
    assert.deepStrictEqual(optimize(idLit), idLit);
  });

  it("preserves break statements", () => {
    const breakStmt = core.breakStatement();
    assert.deepStrictEqual(optimize(breakStmt), breakStmt);
  });
});