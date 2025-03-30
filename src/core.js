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
  
  // ~ any text ~
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
  
  export function binaryExpression(operator, left, right) {
    return {
      kind: "BinaryExpression",
      operator, 
      left,     
      right,    
    };
  }
  
  export function identifier(name) {
    return {
      kind: "Identifier",
      name, 
    };
  }
  
  export function numberLiteral(value) {
    return {
      kind: "NumberLiteral",
      value, 
    };
  }
  
  export function parenExpression(expression) {
    return {
      kind: "ParenExpression",
      expression,
    };
  }
  
  export function stringLiteral(value) {
    return { kind: "StringLiteral", value: value };
  }
  
  export function parameterList(params) {
    return {
      kind: "ParameterList",
      params,
    };
  }
  export function interpolatedString(parts) {
    return { kind: "InterpolatedString", parts: parts };
  }
  
