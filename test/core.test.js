import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as core from "../src/core.js";

describe("Core AST nodes", () => {
  it("creates program nodes", () => {
    const stmt = core.assignmentStatement(core.identifier("x"), core.numberLiteral(5));
    const program = core.program([stmt]);
    assert.strictEqual(program.kind, "Program");
    assert.strictEqual(program.statements.length, 1);
  });

  it("creates block nodes", () => {
    const stmt = core.printStatement(core.stringLiteral("Hello"));
    const block = core.block([stmt]);
    assert.strictEqual(block.kind, "Block");
    assert.strictEqual(block.statements.length, 1);
  });

  it("creates while statement nodes", () => {
    const variable = core.identifier("i");
    const range = core.rangeExpression(core.numberLiteral(10));
    const body = core.block([]);
    const whileStmt = core.whileStatement(variable, range, body);
    assert.strictEqual(whileStmt.kind, "WhileStatement");
    assert.strictEqual(whileStmt.variable.name, "i");
  });

  it("creates if statement nodes", () => {
    const condition = core.booleanLiteral(true);
    const consequent = core.block([]);
    const alternate = core.block([]);
    const ifStmt = core.ifStatement(condition, consequent, alternate);
    assert.strictEqual(ifStmt.kind, "IfStatement");
    assert.strictEqual(ifStmt.condition.value, true);
  });

  it("creates print statement nodes", () => {
    const value = core.stringLiteral("Hello, world!");
    const printStmt = core.printStatement(value);
    assert.strictEqual(printStmt.kind, "PrintStatement");
    assert.strictEqual(printStmt.value.value, "Hello, world!");
  });

  it("creates function declaration nodes", () => {
    const name = "add";
    const params = core.parameterList([core.identifier("a"), core.identifier("b")]);
    const body = core.block([
      core.returnStatement(
        core.binaryExpression("+", core.identifier("a"), core.identifier("b"))
      )
    ]);
    const funcDecl = core.functionDeclaration(name, params, body);
    assert.strictEqual(funcDecl.kind, "FunctionDeclaration");
    assert.strictEqual(funcDecl.name, "add");
  });

  it("creates assignment statement nodes", () => {
    const target = core.identifier("x");
    const expression = core.numberLiteral(10);
    const assignment = core.assignmentStatement(target, expression);
    assert.strictEqual(assignment.kind, "AssignmentStatement");
    assert.strictEqual(assignment.target.name, "x");
    assert.strictEqual(assignment.expression.value, 10);
  });

  it("creates comment nodes", () => {
    const comment = core.comment("This is a comment");
    assert.strictEqual(comment.kind, "Comment");
    assert.strictEqual(comment.value, "This is a comment");
  });

  it("creates range expression nodes", () => {
    const value = core.numberLiteral(5);
    const range = core.rangeExpression(value);
    assert.strictEqual(range.kind, "RangeExpression");
    assert.strictEqual(range.value.value, 5);
  });

  it("creates comparison expression nodes", () => {
    const left = core.identifier("x");
    const right = core.numberLiteral(5);
    const comparison = core.comparisonExpression("==", left, right);
    assert.strictEqual(comparison.kind, "ComparisonExpression");
    assert.strictEqual(comparison.operator, "==");
  });

  it("creates binary expression nodes", () => {
    const left = core.numberLiteral(5);
    const right = core.numberLiteral(10);
    const binary = core.binaryExpression("+", left, right);
    assert.strictEqual(binary.kind, "BinaryExpression");
    assert.strictEqual(binary.op, "+");
    assert.strictEqual(binary.type, "number");
  });

  it("creates identifier nodes", () => {
    const id = core.identifier("x", "number");
    assert.strictEqual(id.kind, "Identifier");
    assert.strictEqual(id.name, "x");
    assert.strictEqual(id.type, "number");
  });

  it("creates number literal nodes", () => {
    const num = core.numberLiteral(42);
    assert.strictEqual(num.kind, "NumberLiteral");
    assert.strictEqual(num.value, 42);
    assert.strictEqual(num.type, "number");
  });

  it("creates parenthesized expression nodes", () => {
    const expr = core.numberLiteral(5);
    const paren = core.parenExpression(expr);
    assert.strictEqual(paren.kind, "ParenExpression");
    assert.deepStrictEqual(paren.expression, expr);
  });

  it("creates string literal nodes", () => {
    const str = core.stringLiteral("Hello");
    assert.strictEqual(str.kind, "StringLiteral");
    assert.strictEqual(str.value, "Hello");
    assert.strictEqual(str.type, "string");

    // Test with source string property
    const objWithSource = { sourceString: "World" };
    const str2 = core.stringLiteral(objWithSource);
    assert.strictEqual(str2.value, "World");
  });

  it("creates parameter list nodes", () => {
    const params = [core.identifier("a"), core.identifier("b")];
    const list = core.parameterList(params);
    assert.strictEqual(list.kind, "ParameterList");
    assert.strictEqual(list.params.length, 2);
    assert.strictEqual(list.length, 2);
  });

  it("creates interpolated string nodes", () => {
    const parts = ["Hello, ", core.identifier("name"), "!"];
    const interp = core.interpolatedString(parts);
    assert.strictEqual(interp.kind, "InterpolatedString");
    assert.deepStrictEqual(interp.parts, parts);
  });

  it("creates return statement nodes", () => {
    const expr = core.numberLiteral(5);
    const returnStmt = core.returnStatement(expr);
    assert.strictEqual(returnStmt.kind, "ReturnStatement");
    assert.deepStrictEqual(returnStmt.expression, expr);
    assert.strictEqual(returnStmt.type, "number");
  });

  it("creates boolean literal nodes", () => {
    const trueLit = core.booleanLiteral(true);
    const falseLit = core.booleanLiteral(false);
    assert.strictEqual(trueLit.kind, "BooleanLiteral");
    assert.strictEqual(trueLit.value, true);
    assert.strictEqual(trueLit.type, "boolean");
    assert.strictEqual(falseLit.value, false);
  });

  it("creates function call nodes", () => {
    const name = "print";
    const args = [core.stringLiteral("Hello")];
    const call = core.functionCall(name, args);
    assert.strictEqual(call.kind, "FunctionCall");
    assert.strictEqual(call.name, "print");
    assert.strictEqual(call.args.length, 1);
  });

  it("creates break statement nodes", () => {
    const breakStmt = core.breakStatement();
    assert.strictEqual(breakStmt.kind, "BreakStatement");
  });

  // Tests for error cases
  it("handles type validation in binary expressions", () => {
    // Boolean + number should throw
    assert.throws(() => {
      core.binaryExpression("+", 
        core.booleanLiteral(true), 
        core.numberLiteral(5)
      );
    }, /Cannot apply \+ to boolean and number/);
    
    // Number + boolean should throw
    assert.throws(() => {
      core.binaryExpression("-", 
        core.numberLiteral(10), 
        core.booleanLiteral(false)
      );
    }, /Cannot apply - to number and boolean/);
    
    // Modulus with non-numbers
    assert.throws(() => {
      core.binaryExpression("%", 
        core.stringLiteral("hello"), 
        core.numberLiteral(3)
      );
    }, /Modulus requires number operands/);
    
    // Division by zero
    assert.throws(() => {
      core.binaryExpression("/", 
        core.numberLiteral(10), 
        core.numberLiteral(0)
      );
    }, /Cannot divide by zero/);
  });

  it("handles string concatenation", () => {
    // String + anything should become string
    const expr1 = core.binaryExpression("+",
      core.stringLiteral("Hello, "),
      core.identifier("name", "string")
    );
    assert.strictEqual(expr1.type, "string");
    
    // Anything + string should become string
    const expr2 = core.binaryExpression("+",
      core.numberLiteral(5),
      core.stringLiteral(" items")
    );
    assert.strictEqual(expr2.type, "string");
  });

  it("handles unknown operand types in binary expressions", () => {
    // Create nodes with undefined types
    const left = { kind: "CustomNode", value: 10 }; // no type property
    const right = { kind: "AnotherCustomNode", value: 20 }; // no type property
    
    // This should exercise lines 114-115 in core.js
    const expr = core.binaryExpression("+", left, right);
    assert.strictEqual(expr.type, undefined);
  });
  
});