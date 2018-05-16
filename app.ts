#!/usr/bin/env ts-node

import * as fs from "fs";

import { quicktype, InputData, JSONSchemaInput, CSharpTargetLanguage } from "quicktype-core";

async function main(program: string, args: string[]): Promise<void> {
    if (args.length !== 1) {
        console.error(`Usage: ${program} SCHEMA`);
        process.exit(1);
    }

    const inputData = new InputData();
    const source = { name: "Model", schema: fs.readFileSync(args[0], "utf8") };
    await inputData.addSource("schema", source, () => new JSONSchemaInput(undefined));

    const lang = new CSharpTargetLanguage("C#", ["csharp"], "cs");

    const { lines } = await quicktype({ lang, inputData });

    for (const line of lines) {
        console.log(line);
    }
}

main(process.argv[1], process.argv.slice(2));
