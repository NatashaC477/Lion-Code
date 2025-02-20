import * as fs from "node:fs";
import * as ohm from "ohm-js";

const grammar = ohm.grammar(fs.readFileSync("src/lion-code.ohm", "utf8"));

/**
 * @param {string} sourceCode 
 * @returns {ohm.MatchResult} 
 * @throws {Error} 
 */
export default function parse(sourceCode) {
    const match = grammar.match(sourceCode);
    if (!match.succeeded()) throw new Error(match.message);
    return match;
}
