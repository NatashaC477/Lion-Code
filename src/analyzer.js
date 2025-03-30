import * as ohm from "ohm-js";
import * as fs from "node:fs/promises";
import * as core from "./core.js";

const grammar = ohm.grammar(await fs.readFile("./src/lion-code.ohm", "utf-8"));

export default function analyze(match) {
  class Context {
    constructor(parent = null) {
      this.parent = parent;
      this.locals = new Map();
    }

    add(name, entity) {
      this.locals.set(name, entity);
      return entity;
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
      throw new Error(`${node.source.getLineAndColumnMessage()} ${message}`);
    }
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
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
      const variable = context.lookup(name);
      check(variable, `Variable '${name}' not declared`, id);
      
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
  });

  try {
    const result = analyzer(match).analyze();
    console.log("Analysis result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Analysis error:", error.message);
    throw error;
  }
}