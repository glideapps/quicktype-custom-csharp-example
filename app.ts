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
    Type,
    TypeAttributeKind,
    JSONSchema,
    Ref,
    JSONSchemaType,
    JSONSchemaAttributes
} from "quicktype-core";

/**
 * This type attribute stores information on types related to our game object domain.
 * Right now the only piece of information we store is whether a class must be a
 * subclass of GameObject, for which we only need a boolean.
 */
class GameObjectTypeAttributeKind extends TypeAttributeKind<boolean> {
    constructor() {
        // This name is used only for debugging purposes.
        super("gameObject");
    }

    // When two classes are combined, such as in a `oneOf` schema, the resulting
    // class is a game object if at least one of the constituent classes is a game
    // object.
    combine(attrs: boolean[]): boolean {
        return attrs.some(x => x);
    }

    // Type attributes are made inferred in cases where the given type
    // participates in a union with other non-class types, for examples.  In
    // those cases, the union type does not get the attribute at all.
    makeInferred(_: boolean): undefined {
        return undefined;
    }

    // For debugging purposes only.  It shows up when quicktype is run with
    // with the `debugPrintGraph` option.
    stringify(isGameObject: boolean): string {
        return isGameObject.toString();
    }
}

// We need to instantiate the attribute kind class to work with it.
const gameObjectTypeAttributeKind = new GameObjectTypeAttributeKind();

/**
 * This function produces, wherever appropriate, a game object type attribute
 * for a given schema type.  We do this for all object types, whether the
 * `gameObject` property is present in the schema or not (if it's not present,
 * the attribute will be `false`).  If it's present, it must be a boolean.
 */
function gameObjectAttributeProducer(
    schema: JSONSchema,
    canonicalRef: Ref,
    types: Set<JSONSchemaType>
): JSONSchemaAttributes | undefined {
    // booleans are valid JSON Schemas, too, but we won't produce our
    // attribute for them.
    if (typeof schema !== "object") return undefined;

    // We only produce this attribute for object types.
    if (!types.has("object")) return undefined;

    let isGameObject: boolean;
    if (schema.gameObject === undefined) {
        isGameObject = false;
    } else if (typeof schema.gameObject === "boolean") {
        isGameObject = schema.gameObject;
    } else {
        throw new Error(`gameObject is not a boolean in ${canonicalRef}`);
    }

    return { forType: gameObjectTypeAttributeKind.makeAttributes(isGameObject) };
}

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
        if (!(t instanceof ClassType)) return undefined;

        // All the type's attributes
        const attributes = t.getAttributes();
        // The game object attribute, or undefined
        const isGameObject = gameObjectTypeAttributeKind.tryGetInAttributes(attributes);
        return isGameObject ? "GameObject" : undefined;
    }
}

async function main(program: string, args: string[]): Promise<void> {
    if (args.length !== 1) {
        console.error(`Usage: ${program} SCHEMA`);
        process.exit(1);
    }

    const inputData = new InputData();
    const source = { name: "Player", schema: fs.readFileSync(args[0], "utf8") };

    // We need to pass the attribute producer to the JSONSchemaInput
    await inputData.addSource("schema", source, () => new JSONSchemaInput(undefined, [gameObjectAttributeProducer]));

    const lang = new GameCSharpTargetLanguage();

    const { lines } = await quicktype({ lang, inputData });

    for (const line of lines) {
        console.log(line);
    }
}

main(process.argv[1], process.argv.slice(2));
