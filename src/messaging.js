const SIGNATURE = "this-is-a-message";

export function validateMessage(data) {
    if (
        !(
            typeof data === "object" &&
            data !== null &&
            "type" in data &&
            "value" in data &&
            (data)["signature"] === SIGNATURE
        )
    ) {
        throw new TypeError(`data is not an ExampleMessage (got ${data})`);
    }

    // Check if the "type" field contains known message types

    const type = (data).type;
    switch (type) {
        case "Layer":
        case "MainImageData":
        case "ParseData":
        case "EndParsing":
            // These are valid, so pass
            return;
        default:
            // Will fail type check if switch statement is non-exhaustive
            ((value) => {
                throw new TypeError(`Unexpected ExampleMessage type: ${value}`);
            })(type);
    }
}

export function createMessage(
    type,
    value
) {
    return { type, value, signature: SIGNATURE, timestamp: Date.now() };
}