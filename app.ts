#!/usr/bin/env ts-node

import * as fs from "fs";

import {
    quicktype,
    InputData,
    JSONSchemaInput,
    CSharpTargetLanguage,
    cSharpOptions,
    CSharpRenderer,
    RenderContext,
    getOptionValues,
    Sourcelike,
    ClassType,
    Type
} from "quicktype-core";

class GameCSharpTargetLanguage extends CSharpTargetLanguage {
    constructor() {
        super("C#", ["csharp"], "cs");
    }

    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: { [name: string]: any }): CSharpRenderer {
        return new GameCSharpRenderer(this, renderContext, getOptionValues(cSharpOptions, untypedOptionValues));
    }
}

class GameCSharpRenderer extends CSharpRenderer {
    protected superclassForType(t: Type): Sourcelike | undefined {
        if (t instanceof ClassType) {
            return "GameObject";
        }
        return undefined;
    }
}

async function main(program: string, args: string[]): Promise<void> {
    if (args.length !== 1) {
        console.error(`Usage: ${program} SCHEMA`);
        process.exit(1);
    }

    const inputData = new InputData();
    const source = { name: "Model", schema: fs.readFileSync(args[0], "utf8") };
    await inputData.addSource("schema", source, () => new JSONSchemaInput(undefined));

    const lang = new GameCSharpTargetLanguage();

    const { lines } = await quicktype({ lang, inputData });

    for (const line of lines) {
        console.log(line);
    }
}

main(process.argv[1], process.argv.slice(2));
