// @ts-ignore
const variables = __variables;
// @ts-ignore
const state = __state;
// @ts-ignore
const memory = __memory;
// @ts-ignore
const mapper = __mapper;
// @ts-ignore
const console = __console;

const getValue = mapper.get_property_value
    ? mapper.get_property_value
    : (path) => {
        const property = mapper.properties[path];
        if (!property) {
            throw new Error(`${path} is not defined in properties.`);
        }
        return property.value;
    }

const setValue = mapper.set_property_value
    ? mapper.set_property_value
    : (path) => {
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


const copyProperties = mapper.copy_properties
    ? mapper.copy_properties
    : (sourcePath, destinationPath) => {
        const destPathLength = destinationPath.length;
        Object.keys(mapper.properties)
            .filter(key => key.startsWith(destinationPath))
            .forEach((key) => {
                const source = mapper.properties[`${sourcePath}${key.slice(destPathLength)}`];
                if (source) {
                    setProperty(key, source);
                }
            });
    }


//Decryption Functions
//16-bit and 32-bit data access functions
function DATA16_LE(data, offset) {
    const val = (data[offset] << 0) | (data[offset + 1] << 8);
    return val & 0xFFFF;
}

function getTotalgame_time() {
    return ((216000 * memory.defaultNamespace.get_byte(variables.dma_b + 14)) +
        (3600 * memory.defaultNamespace.get_byte(variables.dma_b + 16)) +
        (60 * memory.defaultNamespace.get_byte(variables.dma_b + 17)) +
        memory.defaultNamespace.get_byte(variables.dma_b + 18));
}

function decryptItemQuantity(x) {
    const quantity_key = memory.defaultNamespace.get_uint16_le(variables.dma_b + 0xAC);
    return x ^ quantity_key;
}

function encryptItemQuantity(property) {
    const quantity_key = memory.defaultNamespace.get_uint16_le(variables.dma_b + 0xAC);
    return property.value ^ quantity_key;
}

function equalArrays(a1, a2) {
    if (a1 === undefined || a2 === undefined)
        return a1 == a2;
    if (a1.length != a2.length)
        return false;
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i])
            return false;
    }
    return true;
}

const partyStructures = ["player", "opponent"];
// Block shuffling orders - used for Party structure encryption and decryption
// Once a Pokemon's data has been generated it is assigned a PID which determines the order of the blocks
// As the Pokemon's PID never changes, the order of the blocks always remains the same for that Pokemon
// Each individial Pokemon receives its own unique shuffle order
const shuffleOrders = {
    0: [0, 1, 2, 3],
    1: [0, 1, 3, 2],
    2: [0, 2, 1, 3],
    3: [0, 3, 1, 2],
    4: [0, 2, 3, 1],
    5: [0, 3, 2, 1],
    6: [1, 0, 2, 3],
    7: [1, 0, 3, 2],
    8: [2, 0, 1, 3],
    9: [3, 0, 1, 2],
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

function getGamestate() {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "To Battle": Battle has started but player hasn't sent their Pokemon in yet
    // 4. "From Battle": Battle result has been decided but the battle has not transition to the overworld yet
    // 5. "Battle": In battle
    const callback_1 = getValue('pointers.callback_1');

    // const battle_dialogue: string = getValue('battle.other.battle_dialogue')
    // const state: string = getValue('meta.state') ?? "No Pokemon"
    if (getValue('player.team.0.level') == 0)
        return "No Pokemon";

    if (callback_1 == null)
        return "No Pokemon";

    if (getValue('pointers.callback_2') == "Battle Animation")
        return "To Battle";

    if (callback_1 == "Overworld")
        return "Overworld";

    if (callback_1 == "Battle") {
        return getValue('battle.other.battle_outcomes') != null
            ? "From Battle"
            : "Battle";
    }
    return "Error";
}

function getBattleOutcome(state) {
    switch (state) {
        case 'From Battle':
            switch (getValue('battle.other.battle_outcomes')) {
                case "WON":
                    return 'Win';
                case "LOST":
                    return 'Lose';
                case "DRAW":
                    return 'Flee';
                case "RAN":
                    return 'Flee';
                case "PLAYER_TELEPORTED":
                    return 'Flee';
                case "POKEMON_FLED":
                    return 'Flee';
                case "CAUGHT":
                    return 'Caught';
                case "NO_SAFARI_BALLS":
                    return 'Flee';
                case "FORFEITED":
                    return 'Flee';
                case "POKEMON_TELEPORTED":
                    return 'Flee';
                default:
                    return null;
            }
    }
    return null;
}

function getPlayerPartyPosition(state) {
    switch (state) {
        case 'Battle':
            return getValue('battle.player.party_position');
        case 'From Battle':
            return getValue('battle.player.party_position');
        default: {
            for (let i = 0; i < 6; i++) {
                if (getValue(`player.team.${i}.stats.hp`) > 0) {
                    return i;
                }
            }
            return 0;
        }
    }
}


function decryptPartyPokemon() {
    // DECRYPTION OF THE PARTY POKEMON
    // This process applies to all the the Player's Pokemon as well as to Pokemon loaded NPCs parties
    // All Pokemon have a data structure of 100-bytes
    // Only 48-bytes of data are encrypted and shuffled in generation 3
    if (state.cached_pokemon === undefined) {
        state.cached_pokemon = {
            "player": { 0: { raw_data: ""}, 1: { raw_data: ""}, 2: { raw_data: ""}, 3: { raw_data: ""}, 4: { raw_data: ""}, 5: { raw_data: ""} },
            "opponent": { 0: { raw_data: ""}, 1: { raw_data: ""}, 2: { raw_data: ""}, 3: { raw_data: ""}, 4: { raw_data: ""}, 5: { raw_data: ""} },
        };
    
        const blankData = Array(100).fill(0);
        for (let i = 0; i < partyStructures.length; i++) {
            const user = partyStructures[i];
            for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
                memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, blankData);
            }
        }

    }
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        let baseAddress;
        let teamSize;
        if (user === "player") {
            baseAddress = 0x20244EC;
            teamSize = getValue("battle.player.team_count");
        } else {
            baseAddress = 0x2024744;
            teamSize = getValue("battle.opponent.team_count");
        }
        for (let slotIndex = 0; slotIndex < teamSize; slotIndex++) {
            //Determine the starting address for the party we are decrypting
            const startingAddress = baseAddress + (100 * slotIndex);
            const pokemonData = memory.defaultNamespace.get_bytes(startingAddress, 100);
            // Compare the raw data against the cached raw data. Skip decryption and rely on cache if identical
            if (equalArrays(state.cached_pokemon[user][slotIndex]["raw_data"], pokemonData.data)) {
                continue;
            }
            const pid = pokemonData.get_uint32_le();
            const ot_id = pokemonData.get_uint32_le(4);
            const decrypted_data = Array.from(pokemonData.data);
            // Begin the decryption process for the block data
            const key = ot_id ^ pid; // Calculate the encryption key using the Oritinal Trainer ID XODed with the PID
            for (let i = 32; i < 80; i += 4) { // The first 32 and last 20 bytes don't need to be decrypted.
                const data = pokemonData.get_uint32_le(i) ^ key; //XOR the data with the key
                decrypted_data[i + 0] = data & 0xFF; // Isolates the least significant byte
                decrypted_data[i + 1] = (data >> 8) & 0xFF; // Isolates the 2nd least significant byte
                decrypted_data[i + 2] = (data >> 16) & 0xFF; // Isolates the 3rd least significant byte
                decrypted_data[i + 3] = (data >> 24) & 0xFF; // Isolates the most significant byte
            }
            // Determine how the block data is shuffled   
            const shuffleOrder = shuffleOrders[pid % 24]; //Recall the shuffle order
            if (!shuffleOrder) {
                throw new Error("The PID returned an unknown substructure order.");
            }
            // const dataCopy = Array.from(decrypted_data).splice(32, 48);
            const dataCopy = decrypted_data.slice(32, 80);
            // Unshuffle the block data
            for (let i = 0; i < 4; i++) { // Copy the shuffled blocks into the decrypted_data
                decrypted_data.splice(32 + i * 12, 12, ...dataCopy.slice(shuffleOrder[i] * 12, shuffleOrder[i] * 12 + 12));
            }
            // special case: if the solo mon species gets set to an invalid id, we probably don't want this update
            // 2 bytes at 32 offset are the species value, and there are only 414 pokemon
            // NOTE: this can still fail if the player's species gets randomly set to a value under 414. However, this should be very rare
            if (user === "player" && slotIndex === 0 && DATA16_LE(decrypted_data, 32) > 415) {
                console.log("Junk solo mon data detected. Delaying update...");
                state.blocked_last_frame = true;
                return false;
            }
            state.cached_pokemon[user][slotIndex]["raw_data"] = pokemonData.data;
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decrypted_data);
        }
    }
}

function preprocessor() {
    // Deals with the DMA and player party decryption.
    const dma_a = memory.defaultNamespace.get_uint32_le(0x3005D8C);
    variables.dma_a = dma_a;
    const dma_b = memory.defaultNamespace.get_uint32_le(0x3005D90);
    variables.dma_b = dma_b;
    const dma_c = memory.defaultNamespace.get_uint32_le(0x3005D94);
    variables.dma_c = dma_c;
    if (variables.dma_a == 0 || variables.dma_b == 0 || variables.dma_c == 0) {
        return false;
    }
    variables.quantity_decryption_key = memory.defaultNamespace.get_uint16_le(dma_b + 172);
    variables.player_id = memory.defaultNamespace.get_uint16_le(dma_b + 10);
    variables.first_item_type = memory.defaultNamespace.get_uint16_le(dma_a + 1376);
    variables.second_item_type = memory.defaultNamespace.get_uint16_le(dma_a + 1380);
    if (state.cached_dma_a === undefined) {
        state.dma_update_delay = 0;
        state.blocked_last_frame = false;
    }
    else if (state.cached_dma_a == 0 || state.cached_dma_b == 0 || state.cached_dma_c == 0) {
        // If any of the new values are 0, that indicates the player is resetting. Allow updates
        // Additionally, if any of the cahed values are 0, that indicates the file is loading after a reset. Allow updates
        if (state.dma_update_delay != 0) {
            console.log("reset detected, allowing messy updates");
        }
        // forcibly disable dma updates, to be sure
        state.dma_update_delay = 0;
    }
    else if (
        // Don't refresh the block if it's already active
        state.dma_update_delay == 0 &&
        // Once we know we aren't resetting, check to see if the dma values are shifting. If so, block updates
        (state.cached_dma_a != dma_a || state.cached_dma_b != dma_b || state.cached_dma_c != dma_c
            || state.cached_quantity_decryption_key != variables.quantity_decryption_key)) {
        // DMA is actually changing, and not due to a reset. Begin blocking
        state.dma_delay_init = getTotalgame_time();
        state.dma_update_delay = getTotalgame_time() + 60;
        state.dma_safety_delay = getTotalgame_time() + 300;
        state.cached_quantity_decryption_key = variables.quantity_decryption_key;
        console.log("DMA change detected, enabling block until changes are complete");
        console.log("DMA init time: " + state.dma_delay_init + ", dma_update_delay: " + state.dma_update_delay + ", dma_safet_delay: " + state.dma_safety_delay);
    }
    state.cached_dma_a = dma_a;
    state.cached_dma_b = dma_b;
    state.cached_dma_c = dma_c;

    if (state.dma_update_delay != 0) {
        const game_time = getTotalgame_time();
        if (state.dma_delay_init > game_time) {
            console.log("Impossible game_time detected. Assuming player reset or loaded a save state. Lifting block");
            state.dma_update_delay = 0;
        }
        else if (state.dma_update_delay > game_time) {
            state.blocked_last_frame = true;
            return false;
        }
        else {
            // grab the raw value of the new items. If either is correct, then we can safely assume that the DMA block has been moved successfully
            // using 2 values safeguards against weird cases where the player is somehow able to make a change to the actual data before pokeabyte detects the new changes
            // if BOTH new values fail to meet the cache, then assume the DMA is still not updated properly, and continue to block
            if (state.cached_first_item_sanity_check !== undefined &&
                state.cached_second_item_sanity_check !== undefined &&
                state.cached_first_item_sanity_check != variables.first_item_type &&
                state.cached_second_item_sanity_check != variables.second_item_type) {
                if (state.dma_safety_delay > game_time) {
                    state.blocked_last_frame = true;
                    return false;
                } else {
                    console.log("New item values disagree with cache for first item: " + state.cached_first_item_sanity_check + " vs. " + variables.first_item_type);
                    console.log("New item values disagree with cache for second item: " + state.cached_second_item_sanity_check + " vs. " + variables.second_item_type);
                    console.log("DMA safety delay timed out. Allowing updates despite mismatching data logged above");
                }
            }
            else if (state.cached_player_id !== undefined && state.cached_player_id != variables.player_id) {
                if (state.dma_safety_delay > game_time) {
                    state.blocked_last_frame = true;
                    return false;
                }
                else {
                    console.log("Cached player id disagrees with new player ID: " + state.cached_player_id + " vs. " + variables.player_id);
                    console.log("DMA safety delay timed out. Allowing updates despite mismatching data logged above");
                }
            }
            console.log("DMA should be ready now, lifting block on updates");
            state.dma_update_delay = 0;
        }
    }
    // when we know we have good data
    // cache 3 pieces of data to guarantee integrity. Player ID, plus 
    // cache 2 separate items to sanity check for cases where DMA update takes longer than expected
    state.cached_player_id = variables.player_id;
    state.cached_first_item_sanity_check = variables.first_item_type;
    state.cached_second_item_sanity_check = variables.second_item_type;
    if (state.blocked_last_frame) {
        console.log("Block fully lifted until further notice");
        state.blocked_last_frame = false;
        // Only reload addressed after the block lifted. It's reset again in the postprocessor.
        variables.reload_addresses = true;
    }
    decryptPartyPokemon();    
    return true;
}

function postprocessor() {
    // Set gamestate, battle outcome and player.active_pokemon properties
    const gamestate = getGamestate();
    setValue('meta.state', gamestate);
    setValue('battle.outcome', getBattleOutcome(gamestate));
    const party_position_overworld = getPlayerPartyPosition(gamestate);
    setValue('player.party_position', party_position_overworld);
    if (gamestate === 'Battle' && gamestate != state.old_gamestate) {
        if (party_position_overworld != state.old_position) {
            mapper.copy_properties(`player.team.${party_position_overworld}`, 'player.active_pokemon');
            mapper.copy_properties('battle.player.active_pokemon', 'player.active_pokemon');
        }
        state.old_position = party_position_overworld;
        state.old_gamestate = gamestate;
    } else if (gamestate != state.old_gamestate || state.old_position != party_position_overworld) {
        setProperty('player.active_pokemon.modifiers.attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.speed', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.accuracy', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.evasion', { address: null, value: 0 });
        copyProperties(`player.team.${party_position_overworld}`, 'player.active_pokemon');
        state.old_position = party_position_overworld;
        state.old_gamestate = gamestate;
    }
    variables.reload_addresses = false;
}

globalThis.decryptItemQuantity = decryptItemQuantity;
globalThis.encryptItemQuantity = encryptItemQuantity;
export { decryptItemQuantity, preprocessor, postprocessor, encryptItemQuantity };
