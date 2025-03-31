export function program(statements) {
    return { kind: "Program", statements };
  }
  
  export function block(statements) {
    return { kind: "Block", statements };
  }
  
  
  export function whileStatement(variable, rangeValue, body) {
    return {
      kind: "WhileStatement",
      variable,     
      rangeValue,  
      body,         
    };
  }
  
  export function ifStatement(condition, consequent, alternate) {
    return {
      kind: "IfStatement",
      condition,  
      consequent,  
      alternate,   
    };
  }
  
  export function printStatement(value) {
    return {
      kind: "PrintStatement",
      value, 
    };
  }
  
  export function functionDeclaration(name, params, body) {
    return {
      kind: "FunctionDeclaration",
      name,    
      params,  
      body,    
    };
  }
  
  export function assignmentStatement(target, expression) {
    return {
      kind: "AssignmentStatement",
      target,      
      expression, 
    };
  }
  
  export function comment(value) {
    return {
      kind: "Comment",
      value,  
    };
  }
  
  export function rangeExpression(value) {
    return {
      kind: "RangeExpression",
      value,
      type: "range" 
    };
  }
  
  export function comparisonExpression(operator, left, right) {
    return {
      kind: "ComparisonExpression",
      operator, 
      left,      
      right,     
    };
  }
  
  export function binaryExpression(op, left, right) {
    // Handle special cases for non-arithmetic operations
    if (op === "+" && (left.type === "string" || right.type === "string")) {
      return {
        kind: "BinaryExpression",
        op,
        left,
        right,
        type: "string"
      };
    }
    
    // Handle arithmetic operations
    if (["+", "-", "*", "/", "%"].includes(op)) {
      // Check specific invalid type combinations
      if (left.type === "boolean" && right.type === "number") {
        throw new Error(`Cannot apply ${op} to boolean and number`);
      }
      
      if (right.type === "boolean" && left.type === "number") {
        throw new Error(`Cannot apply ${op} to number and boolean`);
      }
      
      if (op === "%" && (left.type !== "number" || right.type !== "number")) {
        throw new Error("Modulus requires number operands");
      }
      
      if (op === "/" && right.kind === "NumberLiteral" && right.value === 0) {
        throw new Error("Cannot divide by zero");
      }
    }
    
    return {
      kind: "BinaryExpression",
      op,
      left,
      right,
      type: (left.type === right.type) ? left.type : 
            (left.type === "string" || right.type === "string") ? "string" : 
            undefined
    };
  }
  
  export function identifier(name, type = null) {
    return { kind: "Identifier", name, type };
  }
  
  export function numberLiteral(value) {
    return { kind: "NumberLiteral", value, type: "number" };
  }
  
  export function parenExpression(expression) {
    return {
      kind: "ParenExpression",
      expression,
    };
  }
  
  export function stringLiteral(contents) {
    // Use 'value' property as tests expect
    return {
      kind: "StringLiteral",
      value: typeof contents === 'string' ? contents : contents.sourceString || '',
      type: "string"
    };
  }
  
  export function parameterList(params) {
    return {
      kind: "ParameterList",
      params,
      length: params.length 
    };
  }
  export function interpolatedString(parts) {
    return { kind: "InterpolatedString", parts: parts };
  }

  export function returnStatement(expression) {
    return {
      kind: "ReturnStatement",
      expression,
      type: expression.type 
    };
  }

  export function booleanLiteral(value) {
    return {
      kind: "BooleanLiteral",
      value,
      type: "boolean"
    };
  }

  export function functionCall(name, args) {
    return {
      kind: "FunctionCall",
      name,
      args,
      type: "any" 
    };
  }

  export function breakStatement() {
    return {
      kind: "BreakStatement"
    };
  }

