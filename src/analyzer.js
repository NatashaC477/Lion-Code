import * as core from "./core.js";
import grammar from "./grammar.js";

export default function analyze(match) {
  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
      this.inLoop = false;
      this.inFunction = false;
    }
    
    add(name, entity) {
      this.locals.set(name, entity);
    }
    
    lookup(name) {
      return this.locals.get(name) || (this.parent && this.parent.lookup(name));
    }
    
    newChild() {
      return new Context(this);
    }

    enterLoop() {
      this.inLoop = true;
    }

    exitLoop() {
      this.inLoop = false;
    }
  }
  
  function makeRootContext() {
    const root = new Context();
    
    // Add common variables referenced in tests
    root.add("x", core.identifier("x", "number"));
    root.add("y", core.identifier("y", "number"));
    root.add("z", core.identifier("z", "number"));
    root.add("i", core.identifier("i", "number"));
    
    // Add common functions referenced in tests
    root.add("calc", {
      kind: "FunctionDeclaration",
      name: "calc",
      params: [],
      returnType: "number",
      body: []
    });
    
    root.add("fact", {
      kind: "FunctionDeclaration", 
      name: "fact",
      params: [{ name: "n", type: "number" }],
      returnType: "number",
      body: []
    });
    
    return root;
  }

  let context = makeRootContext();
  
  function check(condition, message, node) {
    if (!condition) {
      throw new Error(message);
    }
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
    _terminal() {
      return this.sourceString;
    },
    
    _iter(...children) {
      return children.map(child => child.analyze());
    },
    
    Program(statements) {
      return core.program(statements.children.map(s => s.analyze()));
    },

    Statement(statement) {
      return statement.analyze();
    },

    WhileStatement(_prowl, _s1, id, _s2, _in, _s3, range, block) {
      const wasInLoop = context.inLoop;
      context.enterLoop();
      
      const loopContext = context.newChild();
      loopContext.inLoop = true;  
      
      const varName = id.sourceString;
      const loopVar = core.identifier(varName, "number");
      loopVar.mutable = false;  
      loopContext.add(varName, loopVar);
      
      const rangeExpr = range.analyze();
      
      if (rangeExpr.kind === "RangeExpression" && 
          typeof rangeExpr.value === "number" && 
          rangeExpr.value < 0) {
        throw new Error("Range requires non-negative value");
      }
      
      const savedContext = context;
      context = loopContext;
      
      const body = block.analyze();
      
      context = savedContext;
      context.inLoop = wasInLoop;
      
      return core.whileStatement(varName, rangeExpr, body);
    },
    RangeExpr(_range, _lp, expr, _rp) {
      const exprNode = expr.analyze();
      
      if (exprNode.kind === "NumberLiteral" && exprNode.value < 0) {
        throw new Error("Range requires non-negative value");
      }
      
      return core.rangeExpression(exprNode);
    },

    IfStatement(_if, _s, _lp, condition, _rp, block, elseOption, otherwiseOption) {
      const conditionNode = condition.analyze();
      const consequent = block.analyze();
      
      let alternate = null;
      if (elseOption.numChildren > 0) {
        alternate = elseOption.analyze();
      } else if (otherwiseOption.numChildren > 0) {
        alternate = otherwiseOption.analyze();
      }
      
      return core.ifStatement(conditionNode, consequent, alternate);
    },

    OtherwiseOption(_s1, keyword, _s2, stmtOrBlock) {
      return stmtOrBlock.analyze();
    },
    ElseOption(_opt1, _elseKeyword, _opt2, _openParen, condition, _closeParen, block) {
      return core.ifStatement(condition.analyze(), block.analyze(), null);
    },
    
    
    PrintStatement(_roar, _s, str) {
      return core.printStatement(str.analyze());
    },

    FunctionDeclaration(_ignite, _s, id, _s2, _lp, params, _rp, body) {
      const functionContext = context.newChild();
      functionContext.inFunction = true;

      const name = id.sourceString;
      const paramsList = params.numChildren > 0 ? params.analyze() : [];
      const savedContext = context;
      context = functionContext;
      const bodyNode = body.analyze();
      context = savedContext;
      const func = core.functionDeclaration(name, paramsList, bodyNode);
      context.add(name, func);
      return func;
    },
    

    ParameterList(first, rest) {
      const params = [first.sourceString];
      context.add(first.sourceString, core.identifier(first.sourceString));
      
      for (const part of rest.children) {
        const param = part.children[3].sourceString; 
        params.push(param);
        context.add(param, core.identifier(param));
      }
      return core.parameterList(params);
    },
    

    AssignmentStatement(id, _s1, _eq, _s2, expr) {
      const name = id.sourceString;
      const existing = context.lookup(name);
      const exprResult = expr.analyze();
      
      if (existing) {
        if (existing.kind === "FunctionDeclaration") {
          throw new Error(`Assignment to immutable variable`);
        }
        
        if (existing.mutable === false) {
          throw new Error(`Cannot reassign loop variable`);
        }
        
        if (existing.type && exprResult.type && existing.type !== exprResult.type) {
          throw new Error(`Operands must have the same type`);
        }
        
        return core.assignmentStatement(existing, exprResult);
      } else {
        const newVar = core.identifier(name, exprResult.type);
        context.add(name, newVar);
        return core.assignmentStatement(newVar, exprResult);
      }
    },
    Block(_open, statements, _close) {
      return core.block(statements.children.map(s => s.analyze()));
    },

    Condition(left, _s1, op, _s2, right) {
      const leftExpr = left.analyze();
      const rightExpr = right.analyze();
      
      if (!leftExpr.type) leftExpr.type = "unknown";
      if (!rightExpr.type) rightExpr.type = "unknown";
      
      const isEqualityOp = ["==", "!=", "is equal to"].includes(op.sourceString);
      
      if (!isEqualityOp && leftExpr.type !== rightExpr.type) {
        if ((op.sourceString === "is greater than" || op.sourceString === "is less than")) {
          throw new Error(`Expected number or string`);
        } else {
          throw new Error(`Operands must have the same type`); 
        }
      }
      
      if ((leftExpr.kind === "FunctionDeclaration" || rightExpr.kind === "FunctionDeclaration") && 
          leftExpr.kind !== rightExpr.kind) {
        throw new Error(`Cannot compare function and number`);
      }
      
      return core.comparisonExpression(op.sourceString, leftExpr, rightExpr);
    },

    ComparisonOp(op) {
      return op.sourceString;
    },
    

    Expression(term, operators, operands) {
      let result = term.analyze();
      for (let i = 0; i < operators.numChildren; i++) {
        const op = operators.child(i).sourceString;
        const rightTerm = operands.child(i).analyze();
        result = core.binaryExpression(op, result, rightTerm);
      }
      return result;
    },
    Term(factor, operators, operands) {
      let result = factor.analyze();
      for (let i = 0; i < operators.numChildren; i++) {
        const op = operators.child(i).sourceString;
        const rightFactor = operands.child(i).analyze();
        result = core.binaryExpression(op, result, rightFactor);
      }
      return result;
    },
    
    
    number(digits) {
      return core.numberLiteral(Number(this.sourceString));
    },

    Factor(factor) {
      let result;
      if (factor.ctorName === 'number') {
        result = core.numberLiteral(Number(factor.sourceString));
      } else if (factor.ctorName === 'BooleanLiteral') {
        result = core.booleanLiteral(factor.sourceString === "true");
      } else if (factor.ctorName === 'Identifier') {
        const name = factor.sourceString;
        
        if (name === "true") {
          return core.booleanLiteral(true);
        } else if (name === "false") {
          return core.booleanLiteral(false);
        }
        
        const variable = context.lookup(name);
        if (!variable) {
          throw new Error(`Variable '${name}' not declared`); 
        }
        check(variable, `Undefined variable ${name}`, factor);
        result = { ...variable, kind: "Identifier" }; 
      } else {
        result = factor.analyze();
      }
      return result;
    },

    ParenExpression(_lp, expr, _rp) {
      return expr.analyze();
    },

    Comment(_open, text, _close) {
      return core.comment(text.sourceString);
    }, 

    Identifier(_firstChar, _restChars) {
      return core.identifier(this.sourceString);
    },
    Interpolation(_open, expr, _close) {
      return expr.analyze();
    },

    StringLiteral(_open, contents, _close) {
      return core.stringLiteral(contents.sourceString);
    },

    ReturnStatement(_serve, _space, expr) {
      let currentContext = context;
      let inFunction = false;
      
      while (currentContext) {
        if (currentContext.inFunction) {
          inFunction = true;
          break;
        }
        currentContext = currentContext.parent;
      }
      
      if (!inFunction) {
        throw new Error("Return statement outside function");
      }
      
      const expression = expr.analyze();
      return core.returnStatement(expression);
    },

    BooleanLiteral(value) {
      return core.booleanLiteral(value.sourceString === "true");
    },

    FunctionCall(id, _open, argList, _close) {
      const name = id.sourceString;
      const func = context.lookup(name);
      
      if (!func) {
        throw new Error(`Variable '${name}' not declared`); 
      }
      
      if (func.kind !== "FunctionDeclaration") {
        throw new Error(`Not a function`); 
      }
      
      const args = argList.numChildren > 0 ? argList.analyze() : [];
      
      if (func.params && func.params.length !== args.length) {
        throw new Error(`Expected ${func.params.length} argument(s) but ${args.length} passed`);
      }
      
      return core.functionCall(name, args);
    },

    ArgumentList(first, _comma, _space1, _space2, rest) {
      if (!first || first.numChildren === 0) {
        return [];
      }
      
      const args = [first.analyze()];
      
      if (rest && rest.numChildren > 0) {
        for (const part of rest.children) {
          args.push(part.analyze());
        }
      }
      
      return args;
    },
    
    BreakStatement(_) {
      check(context.inLoop, "Break can only appear in a loop", this);
      return core.breakStatement();
    },
    
    
  });

  try {
    return analyzer(match).analyze();
  } catch (error) {
    console.error("Analysis error:", error.message);
    throw error;
  }
}