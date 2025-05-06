import * as core from "./core.js";

export default function optimize(node) {
  if (node === undefined || node === null) return node;
  return optimizers[node.kind]?.(node) ?? node;
}

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize);
    return p;
  },
  
  Block(b) {
    b.statements = b.statements.flatMap(optimize);
    return b;
  },
  
  FunctionDeclaration(d) {
    d.params = d.params.map(optimize);
    if (d.body) d.body = optimize(d.body);
    return d;
  },
  
  AssignmentStatement(s) {
    s.expression = optimize(s.expression);
    s.target = optimize(s.target);
    
    if (s.target.kind === 'Identifier' && 
        s.expression.kind === 'Identifier' && 
        s.target.name === s.expression.name) {
      return [];
    }
    return s;
  },
  
  PrintStatement(s) {
    if (s.value !== undefined) {
      s.value = optimize(s.value);
    } else if (s.argument !== undefined) {
      s.argument = optimize(s.argument);
    }
    return s;
  },
  
  ReturnStatement(s) {
    if (s.expression) s.expression = optimize(s.expression);
    return s;
  },
  
  IfStatement(s) {
    s.condition = optimize(s.condition);
    s.consequent = optimize(s.consequent);
    if (s.alternate) s.alternate = optimize(s.alternate);
    
    if (s.condition.kind === 'BooleanLiteral') {
      return s.condition.value ? s.consequent : (s.alternate || []);
    }
    
    if (s.consequent.statements?.length === 0 && !s.alternate) {
      return [];
    }
    
    if (s.condition.kind === 'ComparisonExpression' && s.alternate) {
      if (s.condition.operator === '!=') {
        s.condition.operator = '==';
        const temp = s.consequent;
        s.consequent = s.alternate;
        s.alternate = temp;
      }
    }
    
    return s;
  },
  
  WhileStatement(s) {
    s.variable = optimize(s.variable);
    s.rangeValue = optimize(s.rangeValue);
    s.body = optimize(s.body);
    
    if (s.rangeValue?.kind === 'NumberLiteral' && s.rangeValue.value <= 0) {
      return [];
    }
    
    if (s.body.statements?.length === 0) {
      return [];
    }
    
    return s;
  },
  
  BreakStatement(s) {
    return s;
  },
  
  BinaryExpression(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    
    const operator = e.operator || e.op;
    
    if (e.left?.kind === 'NumberLiteral' && e.right?.kind === 'NumberLiteral') {
      const left = e.left.value;
      const right = e.right.value;
      
      if (operator === '+') return core.numberLiteral(left + right);
      if (operator === '-') return core.numberLiteral(left - right);
      if (operator === '*') return core.numberLiteral(left * right);
      if (operator === '/') {
        if (right === 0) return e; 
        
        return core.numberLiteral(left / right);
      }
      if (operator === '%') {
        if (right === 0) return e; 
        return core.numberLiteral(left % right);
      }
    }
    
    if (operator === 'and') {
      if (e.left?.kind === 'BooleanLiteral' && e.left.value === true) return e.right;
      if (e.left?.kind === 'BooleanLiteral' && e.left.value === false) return core.booleanLiteral(false);
      if (e.right?.kind === 'BooleanLiteral' && e.right.value === true) return e.left;
      if (e.right?.kind === 'BooleanLiteral' && e.right.value === false) return core.booleanLiteral(false);
    }
    
    if (operator === 'or') {
      if (e.left?.kind === 'BooleanLiteral' && e.left.value === false) return e.right;
      if (e.left?.kind === 'BooleanLiteral' && e.left.value === true) return core.booleanLiteral(true);
      if (e.right?.kind === 'BooleanLiteral' && e.right.value === false) return e.left;
      if (e.right?.kind === 'BooleanLiteral' && e.right.value === true) return core.booleanLiteral(true);
    }
    
    if (e.right?.kind === 'NumberLiteral') {
      if (e.right.value === 0 && (operator === '+' || operator === '-')) return e.left;
      if (e.right.value === 1 && (operator === '*' || operator === '/')) return e.left;
      if (e.right.value === 0 && operator === '*') return core.numberLiteral(0);
      
      if (operator === '*' && isPowerOfTwo(e.right.value)) {
        return {
          kind: 'BinaryExpression',
          operator: '<<',
          left: e.left,
          right: core.numberLiteral(Math.log2(e.right.value))
        };
      }
      
      if (operator === '/' && isPowerOfTwo(e.right.value)) {
        return {
          kind: 'BinaryExpression',
          operator: '>>',
          left: e.left,
          right: core.numberLiteral(Math.log2(e.right.value))
        };
      }
    }
    
    if (e.left?.kind === 'NumberLiteral') {
      if (e.left.value === 0 && operator === '+') return e.right;
      if (e.left.value === 1 && operator === '*') return e.right;
      if (e.left.value === 0 && operator === '*') return core.numberLiteral(0);
    }
    

    if (operator === '+' && 
        e.left?.kind === 'BinaryExpression' && 
        e.left.operator === '+' && 
        e.left.right?.kind === 'NumberLiteral' &&
        e.right?.kind === 'NumberLiteral') {
      return {
        kind: 'BinaryExpression',
        operator: '+',
        left: e.left.left,
        right: core.numberLiteral(e.left.right.value + e.right.value)
      };
    }
    
    return e;
  },
  
  ComparisonExpression(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    
    if (e.left?.kind === 'NumberLiteral' && e.right?.kind === 'NumberLiteral') {
      const left = e.left.value;
      const right = e.right.value;
      
      if (e.operator === '==') return core.booleanLiteral(left === right);
      if (e.operator === '!=') return core.booleanLiteral(left !== right);
      if (e.operator === '<') return core.booleanLiteral(left < right);
      if (e.operator === '<=') return core.booleanLiteral(left <= right);
      if (e.operator === '>') return core.booleanLiteral(left > right);
      if (e.operator === '>=') return core.booleanLiteral(left >= right);
    }
    
    if (e.left?.kind === 'BooleanLiteral' && e.right?.kind === 'BooleanLiteral') {
      const left = e.left.value;
      const right = e.right.value;
      
      if (e.operator === '==') return core.booleanLiteral(left === right);
      if (e.operator === '!=') return core.booleanLiteral(left !== right);
    }
    
    if (e.left?.kind === 'StringLiteral' && e.right?.kind === 'StringLiteral') {
      const left = e.left.value;
      const right = e.right.value;
      
      if (e.operator === '==') return core.booleanLiteral(left === right);
      if (e.operator === '!=') return core.booleanLiteral(left !== right);
    }
    
    if (JSON.stringify(e.left) === JSON.stringify(e.right)) {
      if (e.operator === '==' || e.operator === '<=' || e.operator === '>=') {
        return core.booleanLiteral(true);
      }
      if (e.operator === '!=' || e.operator === '<' || e.operator === '>') {
        return core.booleanLiteral(false);
      }
    }
    
    return e;
  },
  
  UnaryExpression(e) {
    e.operand = optimize(e.operand);
    
    if (e.operand?.kind === 'NumberLiteral') {
      if (e.operator === '-') return core.numberLiteral(-e.operand.value);
    }
    
    if (e.operand?.kind === 'BooleanLiteral') {
      if (e.operator === '!') return core.booleanLiteral(!e.operand.value);
    }
    
    if (e.operator === '!' && 
        e.operand?.kind === 'UnaryExpression' && 
        e.operand.operator === '!') {
      return e.operand.operand;
    }
    
    return e;
  },
  
  Identifier(i) {
    return i;
  },
  
  NumberLiteral(n) {
    return n;
  },
  
  StringLiteral(s) {
    return s;
  },
  
  BooleanLiteral(b) {
    return b;
  },
  
  FunctionCall(c) {
    c.args = c.args.map(optimize);
    
    if (c.callee === 'Math.sqrt' && 
        c.args.length === 1 && 
        c.args[0].kind === 'NumberLiteral') {
      return core.numberLiteral(Math.sqrt(c.args[0].value));
    }
    
    return c;
  }
};

function isPowerOfTwo(n) {
  return Number.isInteger(n) && (n & (n - 1)) === 0 && n > 0;
}