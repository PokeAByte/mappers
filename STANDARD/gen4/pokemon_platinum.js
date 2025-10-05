const driver = __driver;
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
const getValue = mapper.get_property_value;
const setValue = mapper.set_property_value;

// prng function; used for decryption.
function prngNext(prngSeed) {
    // Ensure 32-bit unsigned result
    const newSeed = (0x41C64E6D * prngSeed + 0x6073) >>> 0;
    const value = (newSeed >>> 16) & 0xFFFF;
    return { newSeed, value };
}
// Block shuffling orders - used for Party structure encryption and decryption
// Once a Pokemon's data has been generated it is assigned a PID which determines the order of the blocks
// The Pokemon's PID never changes, therefore the order of the blocks remains fixed for that Pokemon
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
const hidden_power_types = {
    0 : "Fighting",
    1 : "Flying",
    2 : "Poison",
    3 : "Ground",
    4 : "Rock",
    5 : "Bug",
    6 : "Ghost",
    7 : "Steel",
    8 : "Fire",
    9 : "Water",
    10: "Grass",
    11: "Electric",
    12: "Psychic",
    13: "Ice",
    14: "Dragon",
    15: "Dark",
};
function getGamestate() {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "Battle": In battle
    // 4. "To Battle": not yet implemented //TODO: Implement the To Battle state, this requires a new property to accurately track it
    // 5. "From Battle": not yet implemented
    const team_count       = getValue('player.team_count');
    const active_pokemonPv = getValue('battle.player.active_pokemon.internals.personality_value');
    const teamPokemonPv    = getValue('player.team.0.internals.personality_value');
    const outcome_flags    = getValue('battle.other.outcome_flags');
    if (team_count === 0) {
        return 'No Pokemon';
    }
    else if (active_pokemonPv === teamPokemonPv && outcome_flags == 1) {
        return 'From Battle';
    }
    else if (active_pokemonPv === teamPokemonPv) {
        return 'Battle';
    }
    else if (active_pokemonPv !== teamPokemonPv) {
        return 'Overworld';
    }
    return 'No Pokemon';
}
function getMetaEnemyState(state, battle_outcomes, enemyBarSyncedHp) {
    // ENEMY POKEMON MID-BATTLE STATE: Allows for precise timing during battles
    if (state === "No Pokemon" || state === "Overworld")
        return 'N/A';
    else if (state === "Battle" && battle_outcomes === 1)
        return 'Battle Finished';
    else if (state === "Battle" && enemyBarSyncedHp > 0)
        return 'Pokemon In Battle';
    else if (state === "Battle" && enemyBarSyncedHp === 0)
        return 'Pokemon Fainted';
    return null;
}
function getBattleMode(state, opponentTrainer) {
    if (state === 'Battle') {
        if (opponentTrainer === null)
            return 'Wild';
        else
            return 'Trainer';
    }
    else {
        return null;
    }
}
function getBattleOutcome() {
    const outcome_flags = getValue('battle.other.outcome_flags');
    const state = getGamestate();
    switch (state) {
        case 'From Battle':
            switch (outcome_flags) {
                case 1:
                    return 'Win';
                default:
                    return null;
            }
    }
    return null;
}
/** Calculate the encounter rate based on other variables */
function getEncounterRate() {
    const walking = getValue("overworld.encounter_rates.walking");
    // Need properties to correctly determine which of these to return
    // const surfing = getValue("overworld.encounter_rates.surfing");
    // const old_rod = getValue("overworld.encounter_rates.old_rod");
    // const good_rod = getValue("overworld.encounter_rates.good_rod");
    // const super_rod = getValue("overworld.encounter_rates.super_rod");
    return walking;
}
function getPlayerPartyPosition() {
    const state = getGamestate();
    switch (state) {
        case 'Battle':
            return getValue('battle.player.party_position');
        case 'From Battle':
            return getValue('battle.player.party_position');
        default: {
            const team = [0, 1, 2, 3, 4, 5];
            for (let i = 0; i < team.length; i++) {
                if (getValue(`player.team.${i}.stats.hp`) > 0) {
                    return i;
                }
            }
            return 0;
        }
    }
}
function hiddenPower(path) {
    const hp  = getValue(`${path}.ivs.hp`);
    const atk = getValue(`${path}.ivs.attack`);
    const def = getValue(`${path}.ivs.defense`);
    const spe = getValue(`${path}.ivs.speed`);
    const spa = getValue(`${path}.ivs.special_attack`);
    const spd = getValue(`${path}.ivs.special_defense`);

    let ivHpBit   = hp % 2
    let ivAtkBit  = atk % 2
    let ivDefBit  = def % 2
    let ivSpdBit  = spe % 2
    let ivSpcABit = spa % 2
    let ivSpcDBit = spd % 2
    let type = Math.floor(((ivHpBit + (2 * ivAtkBit) + (4 * ivDefBit) + (8 * ivSpdBit) + (16 * ivSpcABit) + (32 * ivSpcDBit)) * 5)/21)
    type = hidden_power_types[type]
    
    ivHpBit   = ((hp & 2)  >> 1)
    ivAtkBit  = ((atk & 2) >> 1)
    ivDefBit  = ((def & 2) >> 1)
    ivSpdBit  = ((spe & 2) >> 1)
    ivSpcABit = ((spa & 2) >> 1)
    ivSpcDBit = ((spd & 2) >> 1)
    let power = Math.floor((((ivHpBit + (2 * ivAtkBit) + (4 * ivDefBit) + (8 * ivSpdBit) + (16 * ivSpcABit) + (32 * ivSpcDBit)) * 40)/63) + 30 )

    return {
        type: type,
        power: power
    };
}
function encrypt_pokemon(array) {
    const decryptedData = new Uint8Array(array);

    function prngNext(prngSeed) {
        const newSeed = (0x41C64E6D * prngSeed + 0x6073) >>> 0;
        const value = (newSeed >>> 16) & 0xFFFF;
        return { newSeed, value };
    }

    let encryptedData = new Uint8Array(236);
    let dataView = new DataView(encryptedData.buffer);

    let pid = (decryptedData[0] |
            (decryptedData[1] << 8) |
            (decryptedData[2] << 16) |
            (decryptedData[3] << 24)) >>> 0;

    // Copy unencrypted first 8 bytes
    for (let i = 0; i < 8; i++) {
        encryptedData[i] = decryptedData[i];
    }

    // Shuffle the blocks FORWARD
    const shuffleId = ((pid & 0x3E000) >> 0xD) % 24;
    let shuffleOrder = shuffleOrders[shuffleId];
    let dataCopy = decryptedData.slice(0x08, 0x88);
    let checksum = 0
    for (let i = 0x08; i < 0x88; i += 2) {
        checksum += (decryptedData[i] | (decryptedData[i + 1] << 8)) & 0xFFFF
    }
    checksum = checksum & 0xFFFF
    encryptedData[0x06] = checksum & 0xFF
    encryptedData[0x07] = (checksum >> 8) & 0xFF

    for (let i = 0; i < 4; i++) {
        encryptedData.set(
            dataCopy.slice(i * 0x20, i * 0x20 + 0x20),
            0x08 + shuffleOrder[i] * 0x20
        );
    }

    // Encrypt block data (XOR with PRNG seeded by checksum)
    let prngSeed = checksum
    for (let i = 0x08; i < 0x88; i += 2) {
        let prngFunction = prngNext(prngSeed);
        let key = prngFunction.value;
        prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);

        let data = (encryptedData[i] | (encryptedData[i + 1] << 8)) ^ key;
        dataView.setUint16(i, data, true);
    }

    // Encrypt battle stats (XOR with PRNG seeded by PID)
    prngSeed = pid;
    for (let i = 0x88; i < 0xEB; i += 2) {
        let prngFunction = prngNext(prngSeed);
        let key = prngFunction.value;
        prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);

        let data = (decryptedData[i] | (decryptedData[i + 1] << 8)) ^ key;
        dataView.setUint16(i, data, true);
    }
    return encryptedData;
}
function containerprocessor(container, containerBytes) {
    let address = 0;
    if (container.startsWith("player_party_structure_")) {
        const slotIndex = parseInt(container.substring(23));
        // address = 0x2271138 + 0xD094 + (236 * slotIndex);
        address = memory.defaultNamespace.get_uint32_le(0x2101D2C) + 0xD094 + (236 * slotIndex);
    } else {
        return;
    }
    driver.WriteBytes(address, encrypt_pokemon(containerBytes, true));
}
// Preprocessor runs every loop (everytime pokeabyte updates)
let original_base_ptr = 0x0;
function preprocessor() {
    variables.reload_addresses = false;
    // This is the same as the global_pointer, it is named "base_ptr" for consistency with the old C# code    
    const base_ptr = memory.defaultNamespace.get_uint32_le(0x2101D2C); // Platinum pointer (Test value: 22711B8)
    if (base_ptr === 0) {
        // Ends logic is the base_ptr is 0, this is to prevent errors during reset and getting on a bike.
        variables.global_pointer = null;
        return;
    }
    if (original_base_ptr !== base_ptr) {
        original_base_ptr = base_ptr;
        variables.reload_addresses = true;
    }
    variables.global_pointer        = base_ptr; // Variable used for mapper addresses, it is the same as "base_ptr"
    variables.dynamic_player        = base_ptr + 0x5888C;
    variables.dynamic_opponent      = base_ptr + 0x58E3C;
    variables.dynamic_ally          = base_ptr + 0x593EC;
    variables.dynamic_opponent_2    = base_ptr + 0x5999C;
    variables.current_party_indexes = base_ptr + 0x54598 + 0x3EC;
    const enemy_ptr = memory.defaultNamespace.get_uint32_le(base_ptr + 0x352F4); // Only needs to be calculated once per loop
    // Set property values
    const gamestate = getGamestate();
    const battle_outcomes = getValue('battle.outcome');
    const enemyBarSyncedHp = getValue('battle.opponent.enemy_bar_synced_hp');
    const opponentTrainer = getValue('battle.opponent.trainer');
    setValue('meta.state', gamestate);
    setValue('battle.mode', getBattleMode(gamestate, opponentTrainer));
    setValue('meta.state_enemy', getMetaEnemyState(gamestate, battle_outcomes, enemyBarSyncedHp));
    setValue('overworld.encounter_rate', getEncounterRate());
    setValue('player.party_position', getPlayerPartyPosition());
    // //Set player.active_pokemon properties
    // const party_position_overworld = getPlayerPartyPosition()
    // const party_position_battle = getValue('battle.player.party_position')
    // if (gamestate === 'Battle') {
    //     copyProperties(`player.team.${party_position_battle}`, 'player.active_pokemon')
    //     copyProperties('battle.player.active_pokemon', 'player.active_pokemon')
    // } else {
    //     setProperty('player.active_pokemon.modifiers.attack', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.defense', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.speed', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.special_attack', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.special_defense', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.accuracy', { address: null, value: 0 })
    //     setProperty('player.active_pokemon.modifiers.evasion', { address: null, value: 0 })
    //     copyProperties(`player.team.${party_position_overworld}`, 'player.active_pokemon')
    // }
    // Loop through various party-structures to decrypt the Pokemon data
    const partyStructures = [
        "player", 
        "static_wild",
        // "static_player", 
        // "static_opponent", 
        // "static_ally", 
        // "static_opponent_2",
        "dynamic_player", 
        "dynamic_opponent", 
        "dynamic_ally", 
        "dynamic_opponent_2",
    ];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        // Determine the offset from the base_ptr (global_pointer) - only run once per party-structure loop
        // Updating structures start offset from the global_pointer by 0x5888C; they are 0x5B0 bytes long
        // team_count is always offset from the start of the team structure by -0x04 and it's a 1-byte value
        const offsets = {
            player            : 0xD094,
            static_player     : 0x35514,
            static_wild       : 0x35AC4,
            static_opponent   : 0x7A0,
            static_ally       : 0x7A0 + 0x5B0,
            static_opponent_2 : 0x7A0 + 0xB60,
            dynamic_player    : 0x5888C + (0x5B0 * 0),
            dynamic_opponent  : 0x5888C + (0x5B0 * 1),
            dynamic_ally      : 0x5888C + (0x5B0 * 2),         // TODO: Requires testing
            dynamic_opponent_2: 0x5888C + (0x5B0 * 3),         // TODO: Requires testing
        };
        let baseAddress = (user === "static_opponent" || user === "static_ally" || user === "static_opponent_2") ? enemy_ptr : base_ptr;
        // Loop through each party-slot within the given party-structure
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            // Initialize an empty array to store the decrypted data
            let decryptedData = new Array(236).fill(0x00);
            // base_ptr and enemy_ptr is sometimes zero, after a game reset.
            // We don't want to process these if that's the case.
            if (baseAddress == 0 || baseAddress < 0x2000000 || baseAddress >= 1717986918) ;
            else {
                let startingAddress = baseAddress + offsets[user] + (236 * slotIndex);
                let encryptedData = memory.defaultNamespace.get_bytes(startingAddress, 236); // Read the Pokemon's data (236-bytes)
                let pid = encryptedData.get_uint32_le(); // PID = Personality Value
                let checksum = encryptedData.get_uint16_le(6); // Used to initialize the prngSeed
                // Transfer the unencrypted data to the decrypted data array
                for (let i = 0; i < 8; i++) {
                    decryptedData[i] = encryptedData.get_byte(i);
                }
                // Begin the decryption process for the block data
                // Initialized the prngSeed as the checksum
                let prngSeed = checksum;
                for (let i = 0x08; i < 0x88; i += 2) {
                    let prngFunction = prngNext(prngSeed); // Seed prng calculation
                    let key = prngFunction.value; // retrieve the upper 16-bits as the key for decryption
                    prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn); // retrieve the next seed value and write it back to the prngSeed
                    let data = encryptedData.get_uint16_le(i) ^ key; // XOR the data with the key to decrypt it
                    decryptedData[i + 0] = data & 0xFF; // isolate the lower 8-bits of the decrypted data and write it to the decryptedData array (1 byte)
                    decryptedData[i + 1] = data >> 8; // isolate the upper 8-bits of the decrypted data and write it to the decryptedData array (1 byte)
                }
                // Determine how the block data is shuffled   
                const shuffleId = ((pid & 0x3E000) >> 0xD) % 24; // Determine the shuffle order index
                let shuffleOrder = shuffleOrders[shuffleId]; // Recall the shuffle order
                if (!shuffleOrder) {
                    throw new Error("The PID returned an unknown substructure order.");
                }
                let dataCopy = decryptedData.slice(0x08, 0x88); // Initialize a copy of the decrypted data
                // Unshuffle the block data
                for (let i = 0; i < 4; i++) {
                    // Copy the shuffled blocks into the decryptedData
                    decryptedData.splice(0x08 + i * 0x20, 0x20, ...dataCopy.slice(shuffleOrder[i] * 0x20, shuffleOrder[i] * 0x20 + 0x20));
                }
                // Decrypting the battle stats
                prngSeed = pid; // The seed is the pid this time
                for (let i = 0x88; i < 0xEB; i += 2) {
                    // this covers the remainder of the 236 byte structure
                    let prngFunction = prngNext(prngSeed); // as before
                    let key = prngFunction.value;
                    // Number and BigInt are required so Javascript stores the prngSeed as an accurate value (it is very large)
                    prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);
                    let data = encryptedData.get_uint16_le(i) ^ key;
                    decryptedData[i + 0] = data & 0xFF;
                    decryptedData[i + 1] = (data >> 8) & 0xFF;
                }
            }
            // Fills the memory contains for the mapper's class to interpret
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData);
        }
    }
    // for (let i = 0; i < 6; i++) {
    //     setValue(`player.team.${i}.hidden_power.power`, hiddenPower(`player.team.${i}`).power);
    //     setValue(`player.team.${i}.hidden_power.type`, hiddenPower(`player.team.${i}`).type);
    //     setValue(`battle.player.team.${i}.hidden_power.power`, hiddenPower(`battle.player.team.${i}`).power);
    //     setValue(`battle.player.team.${i}.hidden_power.type`, hiddenPower(`battle.player.team.${i}`).type);
    //     setValue(`battle.ally.team.${i}.hidden_power.power`, hiddenPower(`battle.ally.team.${i}`).power);
    //     setValue(`battle.ally.team.${i}.hidden_power.type`, hiddenPower(`battle.ally.team.${i}`).type);
    //     setValue(`battle.opponent.team.${i}.hidden_power.power`, hiddenPower(`battle.opponent.team.${i}`).power);
    //     setValue(`battle.opponent.team.${i}.hidden_power.type`, hiddenPower(`battle.opponent.team.${i}`).type);
    //     setValue(`battle.opponent_2.team.${i}.hidden_power.power`, hiddenPower(`battle.opponent_2.team.${i}`).power);
    //     setValue(`battle.opponent_2.team.${i}.hidden_power.type`, hiddenPower(`battle.opponent_2.team.${i}`).type);
    // }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, containerprocessor, preprocessor };
