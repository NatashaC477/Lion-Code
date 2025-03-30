import * as ohm from "ohm-js";
import * as fs from "node:fs/promises";

// Load the grammar once
const grammar = ohm.grammar(await fs.readFile("./src/lion-code.ohm", "utf-8"));
export default grammar;