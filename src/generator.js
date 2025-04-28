export default function generate(program, outputType = "js") {
  if (!outputType) {
    throw new Error("Output type required");
  }
  
  if (outputType !== "js") {
    throw new Error(`Unknown output type: ${outputType}`);
  }
  
  const output = [];
  
  const targetName = (() => {
    const mapping = new Map();
    return entity => {
      if (!entity || !entity.name) return entity;
      if (!mapping.has(entity.name)) {
        mapping.set(entity.name, mapping.size + 1);
      }
      const suffix = mapping.get(entity.name);
      return suffix > 1 ? `${entity.name}_${suffix}` : entity.name;
    };
  })();
  
  const gen = node => {
    if (!node) return "";
    return generators[node.kind] ? generators[node.kind](node) : node;
  };

  const generators = {
    Program(program) {
      program.statements.forEach(statement => {
        const line = gen(statement);
        if (line) output.push(line);
      });
      return output.join("\n");
    },
    
    Block(block) {
      if (block.statements && block.statements.length > 0) {
        return block.statements.map(s => gen(s)).join("\n");
      }
      return "";
    },
    
    AssignmentStatement(node) {
      const target = targetName(node.target);
      const expression = gen(node.expression);
      return `let ${target} = ${expression};`;
    },
    
    PrintStatement(node) {
      const value = gen(node.value);
      return `console.log(${value});`;
    },
    
    FunctionDeclaration(node) {
      const name = node.name;
      let params = "";
      
      if (node.params && Array.isArray(node.params)) {
        params = node.params.map(p => targetName(p)).join(", ");
      }
      
      output.push(`function ${name}(${params}) {`);
      
      if (node.body) {
        const bodyLines = gen(node.body);
        if (bodyLines) {
          bodyLines.split("\n").forEach(line => {
            output.push(`  ${line}`);
          });
        }
      }
      
      output.push("}");
      return "";
    },
    
    ReturnStatement(node) {
      return `return ${gen(node.expression)};`;
    },
    
    IfStatement(node) {
      const condition = gen(node.condition);
      output.push(`if (${condition}) {`);
      
      if (node.consequent) {
        const consequentLines = gen(node.consequent);
        if (consequentLines) {
          consequentLines.split("\n").forEach(line => {
            output.push(`  ${line}`);
          });
        }
      }
      
      if (node.alternate) {
        output.push("} else {");
        const alternateLines = gen(node.alternate);
        if (alternateLines) {
          alternateLines.split("\n").forEach(line => {
            output.push(`  ${line}`);
          });
        }
      }
      
      output.push("}");
      return "";
    },
    
    WhileStatement(node) {
      const variable = targetName(node.variable);
      const range = gen(node.range);
      
      output.push(`for (let ${variable} = 0; ${variable} < ${range}; ${variable}++) {`);
      
      if (node.body) {
        const bodyLines = gen(node.body);
        if (bodyLines) {
          bodyLines.split("\n").forEach(line => {
            output.push(`  ${line}`);
          });
        }
      }
      
      output.push("}");
      return "";
    },
    
    BreakStatement() {
      return "break;";
    },
    
    Comment(node) {
      return `// ${node.value}`;
    },
    
    FunctionCall(node) {
      const name = node.name;
      const args = node.args ? node.args.map(arg => gen(arg)).join(", ") : "";
      return `${name}(${args})`;
    },
    
    BinaryExpression(node) {
      const left = gen(node.left);
      const right = gen(node.right);
      
      let op = node.op;
      return `(${left} ${op} ${right})`;
    },
    
    ComparisonExpression(node) {
      const left = gen(node.left);
      const right = gen(node.right);
      
      let op = node.op;
      if (op === "==") op = "===";
      if (op === "!=") op = "!==";
      if (op === "is equal to") op = "===";
      if (op === "is less than") op = "<";
      if (op === "is greater than") op = ">";
      
      return `(${left} ${op} ${right})`;
    },
    
    NumberLiteral(node) {
      return node.value;
    },
    
    StringLiteral(node) {
      return `"${node.value.replace(/"/g, '\\"')}"`;
    },
    
    BooleanLiteral(node) {
      return node.value;
    },
    
    Identifier(node) {
      return node.name;
    },
    
    RangeExpression(node) {
      return gen(node.value);
    }
  };

  return gen(program);
}