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

  AssignmentStatement(s) {
    s.expression = optimize(s.expression);
    s.target = optimize(s.target);

    if (s.target.kind === 'Identifier' && s.expression.kind === 'Identifier' && s.target.name === s.expression.name) {
      return [];
    }
    return s;
  },

  PrintStatement(s) {
    if (s.value) {
      s.value = optimize(s.value);
    } else if (s.argument) {
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

  BinaryExpression(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);

    if (e.left?.kind === 'NumberLiteral' && e.right?.kind === 'NumberLiteral') {
      const left = e.left.value;
      const right = e.right.value;

      if (e.operator === '+') return core.numberLiteral(left + right);
      if (e.operator === '-') return core.numberLiteral(left - right);
      if (e.operator === '*') return core.numberLiteral(left * right);
      if (e.operator === '/' && right !== 0) return core.numberLiteral(left / right);
    }

    return e;
  },

  UnaryExpression(e) {
    e.operand = optimize(e.operand);

    if (e.operand?.kind === 'NumberLiteral') {
      if (e.operator === '-') return core.numberLiteral(-e.operand.value);
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
    return c;
  }
};