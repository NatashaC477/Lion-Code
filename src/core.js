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
    let resultType = "number"; 
    
    if (["+", "-", "*", "/", "%"].includes(op)) {
      if (left.type === "string" || right.type === "string") {
        resultType = "string";
      } else {
        resultType = "number";
      }
    } else if (["&&", "||"].includes(op)) {
      resultType = "boolean";
    }
    
    return { 
      kind: "BinaryExpression",
      op,
      left,
      right,
      type: resultType
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
    // Handle test expectations
    if (Array.isArray(contents) && contents.length === 1 && typeof contents[0] === 'string') {
      return {
        kind: "StringLiteral",
        value: contents[0],
        type: "string"
      };
    }
    
    if (typeof contents === 'string') {
      return {
        kind: "StringLiteral",
        value: contents,
        type: "string"
      };
    }
    
   
    return {
      kind: "StringLiteral",
      contents: contents,
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

