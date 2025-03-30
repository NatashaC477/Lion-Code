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
      return core.ifStatement(condition.analyze(), block.analyze(), null); // Example adjustment
    },
    
    PrintStatement(_roar, _s, str) {
      const value = str.sourceString.slice(1, -1);
      return core.printStatement(core.stringLiteral(value));
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
        const param = part.children[3].sourceString; // Correct index for Identifier
        params.push(param);
        context.add(param, core.identifier(param));
      }
      
      return core.parameterList(params);
    },
    

    AssignmentStatement(id, _s1, _eq, _s2, expr) {
      const name = id.sourceString;
      let variable = context.lookup(name);
      
      // If variable doesn't exist, create it (automatic declaration)
      if (!variable) {
        variable = core.identifier(name);
        context.add(name, variable);
      } else {
        // Check if this is attempting to reassign a function or constant
        if (variable.kind === "FunctionDeclaration") {
          throw new Error(`Assignment to immutable variable`);
        }
      }
      
      const source = expr.analyze();
      return core.assignmentStatement(name, source);
    },

    Block(_open, statements, _close) {
      return core.block(statements.children.map(s => s.analyze()));
    },

    Condition(left, _s1, op, _s2, right) {
      const leftExpr = left.analyze();
      const rightExpr = right.analyze();
      return core.comparisonExpression(op.sourceString, leftExpr, rightExpr);
    },

    ComparisonOp(op) {
      return op.sourceString;
    },

    Expression(term, operations, operands) {
      let result = term.analyze();
      for (const opNode of operations.children) {
        const op = opNode.children[0].sourceString;
        const right = opNode.children[1].analyze();
        result = core.binaryExpression(op, result, right);
      }
      return result;
    },

    Term(factor, operations, operands) {
      let result = factor.analyze();
      for (const opNode of operations.children) {
        const op = opNode.children[0].sourceString;
        const right = opNode.children[1].analyze();
        result = core.binaryExpression(op, result, right);
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
    Interpolation(_dollar, expr, _close) {
      return expr.analyze(); // Now uses 3 parameters
    },

    StringLiteral(_open, contents, _close) {
      const parts = [];
      for (const part of contents.children) {
        if (part.ctorName === 'Interpolation') {
          parts.push(part.analyze());
        } else {
          parts.push(core.stringLiteral(part.sourceString));
        }
      }
      return core.interpolatedString(parts);
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
      // Check if function exists
      const func = context.lookup(name);
      if (!func) {
        throw new Error(`Function ${name} not declared`);
      }
      return core.functionCall(name, args);
    },

    ArgumentList(firstExpr, _grouping, repeatedPart, _closeParen, _fullMatch) {
      const args = [firstExpr.analyze()];
      // Process any additional arguments from the repeated part
      for (const element of repeatedPart.children) {
        // The Expression is the 4th child (index 3) after comma and spaces
        args.push(element.children[3].analyze());
      }
      return args;
    },
  });

  try {
    return analyzer(match).analyze();
  } catch (error) {
    console.error("Analysis error:", error.message);
    throw error;
  }
}