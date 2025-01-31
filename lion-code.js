// An interpreter for the LionCode programming language.

import * as ohm from "ohm-js";

const grammar = ohm.grammar(` LionCode {
    Program = Statement+
    Statement = PrintStatement | AssignmentStatement
    PrintStatement = "print" Value
    AssignmentStatement = Variable "=" Value
    Value = Variable | Number
    Variable = letter (letter | digit)*
    Number = digit+
    space += " " | "\t"
    }`);

grammar.match("print x").succeeded(); // true
if (match.fialed()) {
    console.error(match.message);
}