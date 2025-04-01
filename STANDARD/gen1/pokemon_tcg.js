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
function getGameState() {
    const music_track = getValue(`audio.current_song`)
    switch (music_track) {
        case "MUSIC_MATCH_START_1": return "To Battle";
        case "MUSIC_MATCH_START_2": return "To Battle";
        case "MUSIC_MATCH_START_3": return "To Battle";
        case "MUSIC_DUEL_THEME_1" : return "Battle";
        case "MUSIC_DUEL_THEME_2" : return "Battle";
        case "MUSIC_DUEL_THEME_3" : return "Battle";
        case "MUSIC_MATCH_VICTORY": return "From Battle";
        case "MUSIC_MATCH_LOSS"   : return "From Battle";
        case "MUSIC_MATCH_DRAW"   : return "From Battle";
        default:
            return "Overworld";
    }
}
function getHand(cards_in_hand, raw_hand, hand_path, deck_path) {
    // Get the number of cards in the player's hand.
    const numCards = getValue(cards_in_hand);
    
    // Collect the card values from player.hand.0 to player.hand.(numCards - 1)
    const handCards = [];
    for (let i = 0; i < numCards; i++) {
        handCards.push(getValue(`${raw_hand}.${i}`));
    }

    // Reverse the order of the cards.
    const reversedHandCards = handCards.reverse();

    // Store the reversed array in the destination path.
    for (let i = 0; i < numCards; i++) {
        setValue(`${hand_path}.${i}`, getValue(`${deck_path}.${reversedHandCards[i]}`));
    }
}
function setIndirectReference(set_location, indirect_reference_path, value_path) {
    if (getValue(indirect_reference_path) == 255) { return }
    setValue(set_location, getValue(`${value_path}.${getValue(indirect_reference_path)}`));
}

// Post Processor
function postprocessor() {
    // Set both Arena Pokemon
    if (getValue(`player.wPlayerArenaCard`) != 0) { setIndirectReference(`player.arena_pokemon`, `player.wPlayerArenaCard`, `player.deck`); }
    if (getValue(`player.wPlayerArenaCard`) != 0) { setIndirectReference(`opponent.arena_pokemon`, `opponent.wOpponentArenaCard`, `opponent.deck`); }
    
    // Populate hands with the correct values
    getHand("player.wPlayerNumberOfCardsInHand", "player.hand_raw", "player.hand", "player.deck")
    getHand("opponent.wOpponentNumberOfCardsInHand", "opponent.hand_raw", "opponent.hand", "opponent.deck")

    // Set player bench Pokemon
    if (getValue(`player.bench_raw.0`) != 255) { setIndirectReference(`player.bench.0`, `player.bench_raw.0`, `player.deck`); }
    if (getValue(`player.bench_raw.1`) != 255) { setIndirectReference(`player.bench.1`, `player.bench_raw.1`, `player.deck`); }
    if (getValue(`player.bench_raw.2`) != 255) { setIndirectReference(`player.bench.2`, `player.bench_raw.2`, `player.deck`); }
    if (getValue(`player.bench_raw.3`) != 255) { setIndirectReference(`player.bench.3`, `player.bench_raw.3`, `player.deck`); }
    if (getValue(`player.bench_raw.4`) != 255) { setIndirectReference(`player.bench.4`, `player.bench_raw.4`, `player.deck`); }
    if (getValue(`player.bench_raw.5`) != 255) { setIndirectReference(`player.bench.5`, `player.bench_raw.5`, `player.deck`); }

    // Set opponent bench Pokemon
    if (getValue(`opponent.bench_raw.0`) != 255) { setIndirectReference(`opponent.bench.0`, `opponent.bench_raw.0`, `opponent.deck`); }
    if (getValue(`opponent.bench_raw.1`) != 255) { setIndirectReference(`opponent.bench.1`, `opponent.bench_raw.1`, `opponent.deck`); }
    if (getValue(`opponent.bench_raw.2`) != 255) { setIndirectReference(`opponent.bench.2`, `opponent.bench_raw.2`, `opponent.deck`); }
    if (getValue(`opponent.bench_raw.3`) != 255) { setIndirectReference(`opponent.bench.3`, `opponent.bench_raw.3`, `opponent.deck`); }
    if (getValue(`opponent.bench_raw.4`) != 255) { setIndirectReference(`opponent.bench.4`, `opponent.bench_raw.4`, `opponent.deck`); }
    if (getValue(`opponent.bench_raw.5`) != 255) { setIndirectReference(`opponent.bench.5`, `opponent.bench_raw.5`, `opponent.deck`); }

    // Update the game state
    setValue(`meta.state`, getGameState());
}

export { postprocessor };
