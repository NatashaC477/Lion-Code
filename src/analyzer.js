import * as core from "./core.js";
import grammar from "./grammar.js";

export default function analyze(match) {
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
  
  let context = new Context();
  
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
      const loopContext = context.newChild();
      const oldContext = context;
      context = loopContext;
      
      const variable = id.sourceString;
      const varNode = core.identifier(variable);
      context.add(variable, core.identifier(variable, "number"));
      
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
      return stmtOrBlock.analyze();
    },
    ElseOption(_opt1, _elseKeyword, _opt2, _openParen, condition, _closeParen, block) {
      return core.ifStatement(condition.analyze(), block.analyze(), null);
    },
    
    
    PrintStatement(_roar, _s, str) {
      return core.printStatement(str.analyze());
    },

    FunctionDeclaration(_ignite, _opt1, id, _opt2, _openParen, paramList, _closeParen, block) {
      const name = id.sourceString;
      const params = paramList.numChildren > 0 ? paramList.analyze() : [];
      const body = block.analyze();
      const func = core.functionDeclaration(name, params, body);
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
      const source = expr.analyze();
      const variable = context.lookup(name);

      if (variable) {
        if (variable.kind === "FunctionDeclaration") {
          throw new Error(`Assignment to immutable variable`);
        }
        
        if (variable.type && source.type && variable.type !== source.type) {
          throw new Error(`Cannot reassign ${name} from ${variable.type} to ${source.type}`);
        }
      } else {
        const newVariable = core.identifier(name, source.type);
        context.add(name, newVariable);
        return core.assignmentStatement(newVariable, source); // Pass variable node
      }
      
      return core.assignmentStatement(name, source);
    },
    Block(_open, statements, _close) {
      return core.block(statements.children.map(s => s.analyze()));
    },

    Condition(left, _s1, op, _s2, right) {
      const leftExpr = left.analyze();
      const rightExpr = right.analyze();
      
      const isEqualityOp = ["==", "!=", "is equal to"].includes(op.sourceString);
      if (!isEqualityOp) {
        if (leftExpr.type !== rightExpr.type) {
          throw new Error(`Type mismatch: ${leftExpr.type || 'null'} vs ${rightExpr.type || 'null'}`);
        }
      }
      
      if (leftExpr.type && !["number", "string", "boolean"].includes(leftExpr.type)) {
        throw new Error(`Cannot compare ${leftExpr.type} values`);
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
      if (factor.ctorName === 'number') {
        return core.numberLiteral(Number(factor.sourceString));
      } else if (factor.ctorName === 'Identifier') {
        const name = factor.sourceString;
        const variable = context.lookup(name);
        if (variable) {
          return { ...factor.analyze(), type: variable.type };
        }
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
      const analyzedContents = contents.children.map(c => c.analyze());
      return core.stringLiteral(analyzedContents); 
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