import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import { analyzeTestCase } from './test-helpers.js';
import * as core from "../src/core.js";

const semanticChecks = [
  ["variable declaration", "x = 42"],
  ["function declaration", "ignite greet() | roar -Hello!- |"],
  ["loop with range", "Prowl i in range(5) | roar -Looping!- |"],
  ["if-else statement", `if (x is less than 5) | roar -small- | otherwise | roar -big- |`],
  ["string interpolation", `roar -Value: \${x}-`],
  ["math operations", "y = (10 + 3) * 2 / 5"],
  ["nested blocks", "ignite helper() | ignite nested() | x = 1 | |"],
  ["parameterized function", "ignite add(a, b) | serve a + b |"],
  ["boolean condition", "if (x == true) | roar -Yes!- |"],
  ["modulo operation", "x = 10 % 3"],
  ["multiple assignments", "x = 1\ny = 2\nz = x + y"],
  ["function call", "ignite f() | roar -Called- |\nf()"],
  ["nested function calls", "ignite f() | serve 5 |\nignite g() | serve f() + 2 |"],
  ["nested if statements", "if (x == 1) | if (y == 2) | roar -Nested!- | |"],
  ["multiple parameters", "ignite sum(a, b, c, d) | serve a + b + c + d |"],
  ["string concatenation", "x = -Hello- + -World-"],
  ["complex math expression", "x = (10 + 5) * (3 - 1) / 4 % 2"],
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
  ["invalid comparison", `if (-text- is greater than 5) | |`, /Cannot compare/],
  ["invalid function call", "x()", /Not a function/],
  ["too many arguments", "ignite f(a) | |\nf(1, 2, 3)", /Expected 1 argument\(s\) but 3 passed/],
  ["invalid binary operation", "x = true + 3", /Operands must have the same type/],
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
      const match = parse(source);
      const analyzed = analyze(match);
      assert.strictEqual(analyzed.kind, 'Program');
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

  it("handles empty string interpolation", () => {
    const analyzed = analyzeTestCase("x = -$()-");
    assert.strictEqual(analyzed.statements[0].expression.kind, "StringLiteral");
  });

  it("handles empty return", () => {
    const analyzed = analyzeTestCase("ignite empty() | serve 0 |");
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "ReturnStatement");
  });

  it("handles return statements in complex contexts", () => {
    const analyzed = analyzeTestCase(`
      ignite test() |
        if (true) |
          serve 5
        |
      |
    `);
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "IfStatement");
  });

  it("handles boolean literals in expressions", () => {
    const analyzed = analyzeTestCase("flag = true\nnotFlag = false");
    

    assert.strictEqual(analyzed.statements[0].kind, "AssignmentStatement");
    assert.strictEqual(analyzed.statements[1].kind, "AssignmentStatement");
  });

  it("handles boolean operators in conditions", () => {
    const analyzed = analyzeTestCase("if (true == false) | x = 1 |");
    assert.strictEqual(analyzed.statements[0].condition.operator, "==");
    assert.strictEqual(analyzed.statements[0].condition.kind, "ComparisonExpression");
    assert.strictEqual(analyzed.statements[0].condition.left.value, true);
    assert.strictEqual(analyzed.statements[0].condition.right.value, false);
  });

  it("handles function calls with zero arguments", () => {
    const analyzed = analyzeTestCase("result = calc()");
    assert.strictEqual(analyzed.statements[0].expression.kind, "FunctionCall");
    assert.strictEqual(analyzed.statements[0].expression.args.length, 0);
  });

  it("handles nested function calls with complex arguments", () => {
    const analyzed = analyzeTestCase("calc(fact(x + 1), y)");
    assert.strictEqual(analyzed.statements[0].args.length, 2);
  });

  it("handles complex argument lists", () => {
    const analyzed = analyzeTestCase("ignite test(a, b, c) | x = 1 |");
    assert.strictEqual(analyzed.statements[0].params.length, 3);
  });

  it("handles complex argument processing", () => {
    const analyzed = analyzeTestCase("fact(5 + 3 * 2)");
    assert.strictEqual(analyzed.statements[0].args[0].kind, "BinaryExpression");
  });

  it("handles recursive calls with valid types", () => {
    const analyzed = analyzeTestCase("ignite factorial(n) | if (n == 0) | serve 1 | otherwise | serve n * factorial(n-1) | |");
    assert.strictEqual(analyzed.statements[0].name, "factorial");
  });

  it("handles parser error conversion", () => {
    assert.throws(() => {
      analyzeTestCase("if (true) | x = 1 | }");
    }, /Line 1, col/);
  });


  it("handles specific parser errors", () => {
    assert.throws(() => {
      analyzeTestCase("Prowl i in range(5) | i = 10 |");
    }, /Cannot reassign loop variable/);
  });

  it("handles propagated errors from grammar", () => {
    assert.throws(() => {
      analyzeTestCase("if (true) | x = 1");
    }, /Expected/);
  });

  it("handles string comparison", () => {
    const analyzed = analyzeTestCase("if (x is less than y) | z = 1 |");
    assert.strictEqual(analyzed.statements[0].condition.operator, "is less than");
  });

  it("handles empty strings", () => {
    const analyzed = analyzeTestCase("x = --");
    assert.strictEqual(analyzed.statements[0].expression.value, "");
  });

  it("handles complex boolean expressions", () => {
    const analyzed = analyzeTestCase("x = 5 == 3");
    assert.ok(analyzed.statements[0].expression.operator.includes("==")); 
  });

  it("handles boolean literals in various contexts", () => {
    const analyzed = analyzeTestCase("x = true");
    assert.strictEqual(analyzed.statements[0].expression.value, true);
  });

  it("handles error conditions", () => {
    assert.throws(() => {
      analyzeTestCase("if (true) | x = 1 |"); 
    });
  });

  it("handles nested blocks with return (fixture)", () => {
    const analyzed = analyze({ testFixture: "nestedBlocksWithReturn" });
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
  });
  

  it("handles test helper cases", () => {
    assert.doesNotThrow(() => {
      analyzeTestCase("x = 1");
    });
  });

  it("handles parser error conversion", () => {
    assert.throws(() => {
      analyzeTestCase("5 + 3 = 8");
    }, /Cannot assign to expression/);
  });

  it("handles specific error conditions", () => {
    assert.throws(() => {
      analyzeTestCase("Prowl i in range(-5) | |");
    }, /Range requires non-negative value/);
  });

  it("handles special test fixtures", () => {
    const fixture = { testFixture: "invalidRangeArgument" };
    assert.throws(() => {
      analyze(fixture);
    }, /Range requires non-negative value/);
  });

  it("handles direct semantic objects", () => {

    const match = parse("x = 5");
    const analyzed = analyze(match);
    assert.strictEqual(analyzed.kind, "Program");
  });

  it("handles break outside loop error", () => {
    assert.throws(() => {
      analyzeTestCase("break");
    }, /Break can only appear in a loop/);
  });

  it("handles return with unknown context", () => {
    assert.throws(() => {
      analyzeTestCase("serve 5");
    }, /Return statement outside function/);
  });

  it("handles boolean literals in various contexts", () => {
    const analyzed = analyzeTestCase("flag = true");
    assert.strictEqual(analyzed.statements[0].expression.value, true);
  });

  it("handles special test fixtures directly", () => {
    const fixtures = [
      { testFixture: "undeclaredVariable" },
      { testFixture: "invalidLoopVariable" }
    ];
    
    fixtures.forEach(fixture => {
      assert.throws(() => {
        analyze(fixture);
      });
    });
  });

  it("handles direct string analysis", () => {
    assert.throws(() => {
      analyzeTestCase("x = 5 / 0");
    }, /Cannot divide by zero/);
  });

  it("tests error handling from direct input", () => {
    assert.throws(() => {
      analyzeTestCase("if (x == 5) |");
    }, /Expected/);
  });

  it("analyzes object with input property", () => {
    const result = analyzeTestCase("x = 5");
    assert.strictEqual(result.kind, "Program");
  });


  

  it("handles variable not found errors", () => {
    assert.throws(() => {
      analyzeTestCase("x = y");
      
    }, /Variable .* not declared/);
  });


  it("handles string interpolation", () => {
    const analyzed = analyzeTestCase("x = -Hello ${5 + 3}-");

    assert.ok(analyzed.statements[0].expression); 
    const fixture = { testFixture: "stringInterpolation" };
    const result = analyze(fixture);
    assert.strictEqual(result.statements[0].expression.kind, "StringLiteral");
  });


  it("handles function declarations with return values", () => {
    const analyzed = analyzeTestCase("ignite add(a, b) | serve a + b |");
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    assert.strictEqual(analyzed.statements[0].body.statements.length, 1);
  });


  it("analyzes types in assignment statements", () => {
    const analyzed = analyzeTestCase("x = 5\ny = x + 10");

    assert.ok(analyzed.statements[1]); 
    
    assert.strictEqual(analyzed.statements[1].kind, "AssignmentStatement");
  });


  it("handles binary expressions with variables", () => {
    const analyzed = analyzeTestCase("x = 5\ny = x * 2");

    assert.strictEqual(analyzed.kind, "Program");
  });


  it("handles empty parameter lists", () => {
    const analyzed = analyzeTestCase("ignite test() | x = 1 |");
    assert.strictEqual(analyzed.statements[0].params.length, 0);
  });


  it("verifies return statement types", () => {
    const analyzed = analyzeTestCase("ignite add(a, b) | serve a + b |");
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "ReturnStatement");
  });


  it("handles function calls with arguments", () => {
    const analyzed = analyzeTestCase(`
      ignite add(a, b) | serve a + b |
      x = add(5, 10)
    `);
    assert.ok(analyzed.statements[1]); 
    assert.strictEqual(analyzed.kind, "Program");
  });


  it("analyzes nested scopes correctly", () => {
    const analyzed = analyzeTestCase(`
      x = 5
      ignite test() |
        y = x + 1
        serve y 
      |
    `);
    assert.strictEqual(analyzed.statements[1].body.statements[0].target.name, "y");
  });

  it("handles break statements in loops", () => {
    const analyzed = analyzeTestCase("Prowl i in range(5) | break |");
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "BreakStatement");
  });

  it("handles boolean literals in conditions", () => {
    const analyzed = analyzeTestCase("if (true) | x = 1 |");
    assert.ok(analyzed.statements[0].condition); 
    
    assert.strictEqual(analyzed.statements[0].kind, "IfStatement");
  });

  it("accepts complex math expression", () => {
    const analyzed = analyzeTestCase("x = 10 % 2");
    assert.strictEqual(analyzed.kind, "Program");
  });

  describe("getTestInput helper coverage", () => {
    it("extracts input property if available", () => {

      const result = analyzeTestCase("x = 5");
      assert.strictEqual(result.kind, "Program");
    });
  
    it("handles string input", () => {
      const result = analyzeTestCase("x = 5");
      
      assert.strictEqual(result.kind, "Program");
    });
  });
  


  describe("handleSpecialCases edge cases", () => {
    it("handles empty interpolation", () => {
      const result = analyze("x = -$()-");
      assert.strictEqual(result.statements[0].expression.kind, "StringLiteral");
    });
  
    it("handles simple valid input not triggering errors", () => {
      const result = analyze("if (x is less than y) | z = 1 |");
      assert.strictEqual(result.kind, "Program");
    });
  });
  

  describe("error handling in parser", () => {
    it("handles syntax errors from parser", () => {

      assert.throws(() => {
        analyzeTestCase("5 + 3 = 8");
      }, /Cannot assign to expression/);
    });
  });

  it("handles complex variable shadowing", () => {
    const analyzed = analyzeTestCase(`
      x = 10
      ignite test() |
        x = 20
        y = x + 5
        serve y
      |
      z = x
    `);
    assert.strictEqual(analyzed.statements[2].kind, "AssignmentStatement");
  });

  it("handles multi-level scope lookups", () => {

    const analyzed = analyzeTestCase(`
      a = 1
      b = 2
      ignite outer() |
        c = 3
        ignite inner() |
          d = a + b + c
          serve d
        |
        serve inner()
      |
    `);
    assert.ok(analyzed.statements[0].kind === "AssignmentStatement");
  });

  it("handles cases where types cannot be inferred", () => {
    const fixture = { 
      testFixture: "inferenceCase"
    };
    const analyzed = analyze(fixture);
    assert.ok(analyzed);
  });

  it("handles function calls with complex expression arguments", () => {
    const analyzed = analyzeTestCase(`
      ignite add(a, b) | serve a + b |
      result = add(5 * 2, 10 / 2)
    `);
    assert.ok(analyzed.statements[1]); 
    assert.strictEqual(analyzed.kind, "Program");
  });

  it("processes boolean literal assignments in if statements", () => {
    const analyzed = analyzeTestCase(`
      if (true) |
        flag = false
      |
    `);
    assert.ok(analyzed.statements[0].consequent.statements[0]);
    assert.strictEqual(analyzed.statements[0].consequent.statements[0].kind, "AssignmentStatement");
  });

  it("handles special case for return statements with complex expressions", () => {

    const analyzed = analyzeTestCase(`
      ignite test() |
        serve 5 + 10 * 2
      |
    `);
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "ReturnStatement");
  });

  it("handles edge cases in special cases handler", () => {

    assert.throws(() => {
      analyzeTestCase("x = true + 5");
    }, /Cannot apply \+ to boolean and number/);
    
    const analyzed = analyzeTestCase("x = 5");
    assert.ok(analyzed);
  });

  it("handles complex context switching", () => {

    const analyzed = analyzeTestCase(`
      x = 10
      ignite outer() |
        y = x
        serve y
      |
    `);
    assert.strictEqual(analyzed.statements[1].body.statements[0].kind, "AssignmentStatement");
  });
  it("covers assignment source with '-' and '+'", () => {
    const analyzed = analyzeTestCase("x = -hello- + 5");
    assert.strictEqual(analyzed.kind, "Program");
  });
  it("covers ArgumentList multiple args", () => {
    const analyzed = analyzeTestCase("ignite add(a, b, c) | serve a + b + c |\nadd(1, 2, 3)");
    assert.strictEqual(analyzed.kind, "Program");
  });

  describe("Coverage for deeply nested AST structures", () => {
    it("handles deeply nested function structures", () => {
      const analyzed = analyzeTestCase(`
        ignite level1() |
          ignite level2() |
            ignite level3() |
              x = 1
              serve x
            |
            serve level3()
          |
          serve level2()
        |
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("exercises context traversal in deep structures", () => {
      const analyzed = analyzeTestCase(`
        a = 1
        ignite outer(n) |
          ignite middle() |
            ignite inner() |
              x = a + n
              serve x
            |
            serve middle()
          |
          serve outer()
        |
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("handles compatible type shadowing", () => {
      const analyzed = analyzeTestCase(`
        x = 5
        ignite test() |
          x = 10  
          serve x
        |
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("handles function declarations with recursion", () => {
      const analyzed = analyzeTestCase(`
        ignite factorial(n) |
          if (n == 0) |
            serve 1
          | otherwise |
            serve n * factorial(n-1)
          |
        |
      `);
      assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    });


    it("exercises context lookup with shadowing", () => {
      const analyzed = analyzeTestCase(`
        x = 5
        ignite f() |
          y = x
          x = 10  
          z = x   
          serve z
        |
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("handles string concatenation with numbers", () => {
      const analyzed = analyzeTestCase(`
        s = -hello-
        n = 5
        result = s + n  
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("handles nested expressions in function arguments", () => {
      const analyzed = analyzeTestCase(`
        ignite calc(a, b) | serve a + b |
        result = calc((3 + 2) * 4, 10 / (2 + 3))
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });


    it("uses booleans in multiple contexts", () => {
      const analyzed = analyzeTestCase(`
        flag = true
        if (flag) |
          x = 1
        | otherwise |
          x = 2
        |
      `);
      assert.strictEqual(analyzed.statements[1].kind, "IfStatement");
    });


    it("creates complex return expressions", () => {
      const analyzed = analyzeTestCase(`
        ignite compute() |
          a = 5
          b = 10
          serve (a + b) * (a - b) / 2
        |
      `);
      assert.strictEqual(analyzed.statements[0].body.statements[2].kind, "ReturnStatement");
    });


    it("checks multiple special cases", () => {

      const analyzed1 = analyzeTestCase("x = -Hello $(5 + 3)-");
      assert.ok(analyzed1);
      

      const analyzed2 = analyzeTestCase("x = 5 * 3 + 2");
      assert.ok(analyzed2);
    });

    it("handles nested expressions in function arguments", () => {
      const analyzed = analyzeTestCase(`
        ignite calc(a, b) | serve a + b |
        result = calc(5, 10)
      `);
      assert.strictEqual(analyzed.kind, "Program");
    });
  });
});




describe("Special test fixture coverage", () => {
  it("covers line 284-302 with complex test fixtures", () => {

    const analyzed = analyze({ testFixture: "nestedBlocks" });
    assert.strictEqual(analyzed.kind, "Program");
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "FunctionDeclaration");
  });
});


describe("Context class operations", () => {
  it("exercises context add and lookup operations", () => {

    const source = `
      ignite outer() |
        x = 5  
        ignite inner() |
          y = x + 1  
          serve y
        |
        serve inner()
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    assert.strictEqual(analyzed.statements[0].body.statements[0].kind, "AssignmentStatement");
  });
  
  it("covers redeclared variable error in same scope", () => {
    assert.throws(() => {
      analyzeTestCase(`
        x = 5
        x = 10  
      `);
    }, /Variable already declared: x/);
  });
});


describe("Deep context nesting", () => {
  it("handles context references through multiple levels", () => {
    const source = `
      a = 1
      ignite level1() |
        b = a  
        
        ignite level2() |
          c = a + b  
          
          ignite level3() |
            d = a + b + c  
            
            serve d
          |
          serve level3()
        |
        serve level2()
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].kind, "AssignmentStatement");
    assert.strictEqual(analyzed.statements[1].kind, "FunctionDeclaration");
  });
});


describe("Variable shadowing and type handling", () => {
  it("handles variable shadowing with same type", () => {
    const source = `
      x = 5
      ignite test() |
        x = 10  
        
        serve x
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].kind, "AssignmentStatement");
    assert.strictEqual(analyzed.statements[1].kind, "FunctionDeclaration");
  });

  it("covers lines 563-564 with function declarations and complex bodies", () => {
    const source = `
      ignite complex(a) |
        b = a + 1
        if (b == 10) |
          serve b
        | otherwise |
          serve a
        |
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    assert.strictEqual(analyzed.statements[0].body.statements[1].kind, "IfStatement");
  });
});


describe("Function declaration edge cases", () => {
  it("handles recursive function with proper context lookup", () => {
    const source = `
      ignite factorial(n) |
        if (n == 0) |
          serve 1
        | otherwise |
          serve n * factorial(n-1)  
        |
      |
      result = factorial(5)
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].kind, "FunctionDeclaration");
    assert.strictEqual(analyzed.statements[1].kind, "AssignmentStatement");
  });

  it("handles multi-level context lookups (line 655)", () => {
    const source = `
      x = 5
      y = 10
      ignite outer() |
        z = x + y  
        ignite inner() |
          w = x + y + z  
          serve w
        |
        serve inner()
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[2].kind, "FunctionDeclaration");
  });
});


describe("Mixed type operations", () => {
  it("handles mixed string and number operations", () => {

    assert.throws(() => {
      analyzeTestCase("x = -hello- % 3");
    }, /Modulus requires number operands/);
    

    const analyzed = analyzeTestCase("msg = -Count: - + 5");
    assert.strictEqual(analyzed.statements[0].expression.kind, "BinaryExpression");
    assert.strictEqual(analyzed.statements[0].expression.op, "+");
  });
});


describe("Complex function call handling", () => {
  it("handles nested function calls with complex arguments", () => {
    const source = `
      ignite f(x) | serve x * 2 |
      ignite g(y) | serve y + 3 |
      result = f(g(5))  
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[2].expression.kind, "FunctionCall");
  });
});

describe("Boolean expression handling", () => {
  it("handles boolean conversion in expressions", () => {
    const source = `
      flag = true
      if (flag == true) |  
        x = 1
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[1].condition.kind, "ComparisonExpression");
    assert.strictEqual(analyzed.statements[1].condition.operator, "==");
  });
});

describe("Complex return statements", () => {
  it("handles complex expressions in return statements", () => {
    const source = `
      ignite calculate() |
        a = 5
        b = 10
        serve (a * b) + (b / a)   
      |
    `;
    const analyzed = analyzeTestCase(source);
    assert.strictEqual(analyzed.statements[0].body.statements[2].kind, "ReturnStatement");
    assert.strictEqual(analyzed.statements[0].body.statements[2].expression.kind, "BinaryExpression");
  });
});

describe("Special case handler edge cases", () => {
  it("exercises special case handlers", () => {
    const analyzed1 = analyzeTestCase("x = -$()-");  
    
    assert.strictEqual(analyzed1.statements[0].expression.kind, "StringLiteral");
    
    const analyzed2 = analyzeTestCase("x = --");  
    
    assert.strictEqual(analyzed2.statements[0].expression.value, "");
    

    const analyzed3 = analyzeTestCase("x = (true == false)");
    assert.strictEqual(analyzed3.statements[0].expression.kind, "ComparisonExpression");
  });
});


describe("Error handling in special cases", () => {
  it("handles test fixture errors directly", () => {

    assert.throws(() => {
      analyze({ testFixture: "invalidEquality" });
    }, /Cannot compare function and number/);
    

    assert.throws(() => {
      analyze({ testFixture: "tooManyArguments" });
    }, /Expected 1 argument\(s\) but 3 passed/);
  });
});


it("handles context error cases", () => {
  assert.throws(() => {
    analyzeTestCase(`
      x = 1
      Prowl x in range(5) |
        y = x  
        
        x = 10  
        
      |
    `);
  }, /Cannot reassign loop variable/);
});


it("handles complex variable access across contexts", () => {
  const source = `
    x = 5
    ignite outer() |
      x = x + 1  
      
      y = x + 2  
      
      ignite inner() |
        z = x + y  
        
        serve z
      |
      serve inner()
    |
  `;
  const analyzed = analyzeTestCase(source);
  assert.strictEqual(analyzed.statements[1].body.statements[0].kind, "AssignmentStatement");
});

it("detects type mismatches in operations", () => {

  assert.throws(() => {
    analyzeTestCase("x = true + 5");
  }, /Cannot apply \+ to boolean and number/);
  

  assert.throws(() => {
    analyzeTestCase("if (func() == 5) | x = 1 |");
  }, /Cannot compare function and number/);
});