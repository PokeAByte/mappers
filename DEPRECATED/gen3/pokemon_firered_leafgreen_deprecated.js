// @ts-ignore
const variables = __variables;
// @ts-ignore
__state;
// @ts-ignore
const memory = __memory;
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

function DATA32_LE(data, offset) {
    let val = (data[offset] << 0)
        | (data[offset + 1] << 8)
        | (data[offset + 2] << 16)
        | (data[offset + 3] << 24);
    return val >>> 0;
}
function getGamestate() {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "To Battle": Battle has started but player hasn't sent their Pokemon in yet
    // 4. "From Battle": Battle result has been decided but the battle has not transition to the overworld yet
    // 5. "Battle": In battle
    const team_0_level = getValue('player.team.0.level');
    const callback_1 = getValue('pointers.callback1');
    const callback_2 = getValue('pointers.callback2');
    const battle_outcomes = getValue('battle.outcome');
    if (team_0_level == 0)
        return "No Pokemon";
    else if (callback_1 == null)
        return "No Pokemon";
    else if (callback_2 == "Battle Animation") //! CURRENTLY NOT WORKING, Need a better property to track
        return "To Battle";
    else if (callback_1 == "Overworld")
        return "Overworld";
    else if (callback_1 == "Battle") {
        if (battle_outcomes != null) {
            return "From Battle";
        }
        return "Battle";
    }
    return "Error";
}
// Block shuffling orders - used for Party structure encryption and decryption
// Once a Pokemon's data has been generated it is assigned a PID which determines the order of the blocks
// As the Pokemon's PID never changes, the order of the blocks always remains the same for that Pokemon
// Each individial Pokemon receives its own unique shuffle order
const shuffleOrders = {
    0:  [0, 1, 2, 3],
    1:  [0, 1, 3, 2],
    2:  [0, 2, 1, 3],
    3:  [0, 3, 1, 2],
    4:  [0, 2, 3, 1],
    5:  [0, 3, 2, 1],
    6:  [1, 0, 2, 3],
    7:  [1, 0, 3, 2],
    8:  [2, 0, 1, 3],
    9:  [3, 0, 1, 2],
    10: [2, 0, 3, 1],
    11: [3, 0, 2, 1],
    12: [1, 2, 0, 3],
    13: [1, 3, 0, 2],
    14: [2, 1, 0, 3],
    15: [3, 1, 0, 2],
    16: [2, 3, 0, 1],
    17: [3, 2, 0, 1],
    18: [1, 2, 3, 0],
    19: [1, 3, 2, 0],
    20: [2, 1, 3, 0],
    21: [3, 1, 2, 0],
    22: [2, 3, 1, 0],
    23: [3, 2, 1, 0]
};
function preprocessor() {
    variables.reload_addresses = true;
    const gamestate = getGamestate();
    setValue('meta.state', gamestate);
    variables.dma_a = memory.defaultNamespace.get_uint32_le(0x3005008);
    variables.dma_b = memory.defaultNamespace.get_uint32_le(0x300500C);
    variables.dma_c = memory.defaultNamespace.get_uint32_le(0x3005010);
    variables.callback1 = memory.defaultNamespace.get_uint32_le(0x30030F0);
    variables.callback2 = memory.defaultNamespace.get_uint32_le(0x30030F4);
    // DECRYPTION OF THE PARTY POKEMON
    // This process applies to all the the Player's Pokemon as well as to Pokemon loaded NPCs parties
    // All Pokemon have a data structure of 100-bytes
    // Only 48-bytes of data are encrypted and shuffled in generation 3
    const partyStructures = ["player", "opponent"];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            // Determine the starting address for the party we are decrypting
            let startingAddress = 0;
            if (user == "player") {
                startingAddress = 0x2024284 + (100 * slotIndex);
            }
            if (user == "opponent") {
                startingAddress = 0x202402C + (100 * slotIndex);
            }
            let pokemonData = memory.defaultNamespace.get_bytes(startingAddress, 100);
            let pid = pokemonData.get_uint32_le();
            let otid = pokemonData.get_uint32_le(4);
            let decryptedData = [];
            for (let i = 0; i < 100; i++) {
                // Transfer the first 32-bytes of unencrypted data to the decrypted data array
                decryptedData[i] = pokemonData.data[i];
            }
            // Begin the decryption process for the block data
            let key = otid ^ pid;
            // Calculate the encryption key using the Oritinal Trainer ID XODed with the PID
            for (let i = 32; i < 80; i += 4) {
                let data = DATA32_LE(pokemonData.data, i) ^ key; // XOR the data with the key
                decryptedData[i + 0] = data & 0xFF; // Isolates the least significant byte
                decryptedData[i + 1] = (data >> 8) & 0xFF; // Isolates the 2nd least significant byte
                decryptedData[i + 2] = (data >> 16) & 0xFF; // Isolates the 3rd least significant byte
                decryptedData[i + 3] = (data >> 24) & 0xFF; // Isolates the most significant byte
            }
            // Determine how the block data is shuffled
            const shuffleId = pid % 24;
            // Determine the shuffle order index
            let shuffleOrder = shuffleOrders[shuffleId];
            if (!shuffleOrder) {
                throw new Error("The PID returned an unknown substructure order.");
            }
            // Initialize a copy of the decrypted data (48-bytes only)
            let dataCopy = Array.from(decryptedData);
            decryptedData = Array.from(decryptedData);
            dataCopy = dataCopy.splice(32, 48);
            // Unshuffle the block data
            for (let i = 0; i < 4; i++) {
                // Copy the shuffled blocks into the decryptedData
                decryptedData.splice(32 + i * 12, 12, ...dataCopy.slice(shuffleOrder[i] * 12, shuffleOrder[i] * 12 + 12));
            }
            // Transfer the remaining 20-bytes of unencrypted data to the decrypted data array
            for (let i = 80; i < 100; i++) {
                decryptedData[i] = pokemonData.data[i];
            }
            // Fills the memory contains for the mapper's class to interpret
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData);
        }
    }
}

export { preprocessor };
