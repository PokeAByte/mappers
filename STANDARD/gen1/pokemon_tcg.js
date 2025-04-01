// @ts-ignore
__variables;
// @ts-ignore
__state;
// @ts-ignore
__memory;
// @ts-ignore
const mapper = __mapper;
// @ts-ignore
__console;
function getValue(path) {
    // @ts-ignore
    const property = mapper.properties[path];
    if (!property) {
        throw new Error(`${path} is not defined in properties.`);
    }
    return property.value;
}
function setValue(path, value) {
    // @ts-ignore
    const property = mapper.properties[path];
    if (!property) {
        throw new Error(`${path} is not defined in properties.`);
    }
    property.value = value;
}
function getProperty(path) {
    // @ts-ignore
    const property = mapper.properties[path];
    if (!property) {
        throw new Error(`${path} is not defined in properties.`);
    }
    return property;
}
function setProperty(path, values) {
    const property = getProperty(path);
    if (values.memoryContainer !== undefined)
        property.memoryContainer = values.memoryContainer;
    if (values.address !== undefined)
        property.address = values.address;
    if (values.length !== undefined)
        property.length = values.length;
    if (values.size !== undefined)
        property.size = values.size;
    if (values.bits !== undefined)
        property.bits = values.bits;
    if (values.reference !== undefined)
        property.reference = values.reference;
    if (values.bytes !== undefined)
        property.bytes = values.bytes;
    if (values.value !== undefined)
        property.value = values.value;
}

function getHandCard() {
    // Get the number of cards in the player's hand.
    const numCards = getValue("player.wPlayerNumberOfCardsInHand");
    
    // Collect the card values from player.hand.0 to player.hand.(numCards - 1)
    const handCards = [];
    for (let i = 0; i < numCards; i++) {
        handCards.push(getValue(`player.hand_raw.${i}`));
    }

    // Reverse the order of the cards.
    const reversedHandCards = handCards.reverse();

    // Store the reversed array in the destination path.
    for (let i = 0; i < numCards; i++) {
        setValue(`player.hand.${i}`, getValue(`player.deck_1.${reversedHandCards[i]}`));
    }
}
function setIndirectReference(set_location, indirect_reference_path, value_path) {
    setValue(set_location, getValue(`${value_path}.${getValue(indirect_reference_path)}`));
}

function postprocessor() {
    getHandCard()
    if (getValue(`player.wPlayerArenaCard`) != 0) { setIndirectReference(`player.arena_pokemon`, `player.wPlayerArenaCard`, `player.deck_1`); }
    if (getValue(`player.bench_raw.0`) != 255) { setIndirectReference(`player.bench.0`, `player.bench_raw.0`, `player.deck_1`); }
    if (getValue(`player.bench_raw.1`) != 255) { setIndirectReference(`player.bench.1`, `player.bench_raw.1`, `player.deck_1`); }
    if (getValue(`player.bench_raw.2`) != 255) { setIndirectReference(`player.bench.2`, `player.bench_raw.2`, `player.deck_1`); }
    if (getValue(`player.bench_raw.3`) != 255) { setIndirectReference(`player.bench.3`, `player.bench_raw.3`, `player.deck_1`); }
    if (getValue(`player.bench_raw.4`) != 255) { setIndirectReference(`player.bench.4`, `player.bench_raw.4`, `player.deck_1`); }
    if (getValue(`player.bench_raw.5`) != 255) { setIndirectReference(`player.bench.5`, `player.bench_raw.5`, `player.deck_1`); }
}

export { postprocessor };
