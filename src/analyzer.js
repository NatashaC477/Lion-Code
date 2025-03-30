import * as core from "./core.js";
import grammar from "./grammar.js";

export default function analyze(match) {
  // Define Context class for symbol management
  class Context {
    constructor(parent = null) {
      this.locals = new Map();
      this.parent = parent;
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
  }
  
  // Initialize context for the program
  let context = new Context();
  
  // Helper function for semantic errors
  function check(condition, message, node) {
    if (!condition) {
      throw new Error(message);
    }
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
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
      const loopContext = context.newChild();
      const oldContext = context;
      context = loopContext;
      
      const variable = id.sourceString;
      const varNode = core.identifier(variable);
      context.add(variable, varNode);
      
      const rangeExpr = range.analyze();
      
      const body = block.analyze();
      
      context = oldContext;
      
      return core.whileStatement(variable, rangeExpr, body);
    },
    rangeExpr(_range, _lp, num, _rp) {
      const value = Number(num.sourceString);
      return core.rangeExpression(value);
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
      return stmtOrBlock.analyze(); // Handles 'otherwise'
    },
    ElseOption(_opt1, _elseKeyword, _opt2, _openParen, condition, _closeParen, block) {
      return core.ifStatement(condition.analyze(), block.analyze(), null);
    },
    
    
    PrintStatement(_roar, _s, str) {
      // Extract content between the hyphens (remove the first and last character)
      return core.printStatement(str.analyze());
    },

    FunctionDeclaration(_ignite, _opt1, id, _opt2, _openParen, paramList, _closeParen, block) {
      const name = id.sourceString;
      const params = paramList.numChildren > 0 ? paramList.analyze() : [];
      const body = block.analyze();
      return core.functionDeclaration(name, params, body);
    },
    

    ParameterList(first, rest) {
      const params = [first.sourceString];
      context.add(first.sourceString, core.identifier(first.sourceString));
      
      for (const part of rest.children) {
        // Each part is: optSpace, ",", optSpace, Identifier
        const param = part.children[3].sourceString; // Verify index matches grammar
        params.push(param);
        context.add(param, core.identifier(param));
      }
      return core.parameterList(params);
    },
    

    AssignmentStatement(id, _s1, _eq, _s2, expr) {
      const name = id.sourceString;
      let variable = context.lookup(name);
      const source = expr.analyze();
      
      // If variable doesn't exist yet, create it (automatic declaration)
      if (!variable) {
        variable = core.identifier(name);
        context.add(name, variable);
      } else if (variable.kind === "FunctionDeclaration") {
        // Check immutability for functions
        throw new Error(`Assignment to immutable variable`);
      } else if (context.locals.has(name)) {
        // Check redeclaration in same scope
        throw new Error(`Variable already declared: ${name}`);
      }
      
      return core.assignmentStatement(name, source);
    },
    Block(_open, statements, _close) {
      return core.block(statements.children.map(s => s.analyze()));
    },

    Condition(left, _s1, op, _s2, right) {
      const leftExpr = left.analyze();
      const rightExpr = right.analyze();
      // Check types are compatible
      check(
        leftExpr.type === rightExpr.type,
        `Operands must have the same type`,
        this
      );
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
      if (factor.ctorName === 'number') {
        return core.numberLiteral(Number(factor.sourceString));
      }
      return factor.analyze();
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
      const text = this.sourceString.slice(1, -1); // Remove the hyphens
      return core.stringLiteral(text);
    },

    ReturnStatement(_serve, _space, expr) {
      const expression = expr.analyze();
      return core.returnStatement(expression);
    },

    BooleanLiteral(value) {
      return core.booleanLiteral(value.sourceString === "true");
    },

    FunctionCall(id, _open, argList, _close) {
      const name = id.sourceString;
      const args = argList.numChildren > 0 ? argList.analyze() : [];
      return core.functionCall(name, args);
    },

    ArgumentList(first, _comma, _space1, _space2, rest) {
      // For the case with a single argument
      if (!first || first.numChildren === 0) {
        return [];
      }
      
      const args = [first.analyze()];
      
      // Process any additional arguments
      if (rest && rest.numChildren > 0) {
        for (const part of rest.children) {
          args.push(part.analyze());
        }
      }
      
      return args;
    },
    
    BreakStatement(_) {
      throw new Error("Break can only appear in a loop");
    },
    
  });

  try {
    return analyzer(match).analyze();
  } catch (error) {
    console.error("Analysis error:", error.message);
    throw error;
  }
}