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

//notable addresses:
// 0x22349B4 - likely the player's key items
// 0x2234786 - medicine pocket starting address
// 0x223CDAC - player money (4 bytes)
// 0x225B310 - player battle
// 0x226D790 - player battle structure (around here) (there are two copies)
// 0x226D9B0 - opponent battle structure (around here)
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
    // 4. "To Battle": not yet implemented //TODO: Implement the 'To Battle' state, this requires a new property to accurately track it
    // 5. "From Battle": not yet implemented
    const state         = getValue('meta.state');
    const team_count    = getValue('player.team_count');
    const header        = getValue('battle.other.battle_header');
    const generic_1     = getValue('battle.other.battle_header_generic_1');
    const generic_2     = getValue('battle.other.battle_header_generic_2');
    const generic_3     = getValue('battle.other.battle_header_generic_3');
    const generic_4     = getValue('battle.other.battle_header_generic_4');
    const outcome_flags = getValue('battle.other.outcome_flags');
    // const outcome_flags: number = getValue<number>('battle.other.outcome_flags')
    if (team_count === 0) {
        return 'No Pokemon';
    }
    else if (header == 87 && (generic_1 > 0 || generic_2 > 0 || generic_3 > 0 || generic_4 > 0 )) {
        return 'Battle';
    }
    else if (outcome_flags > 0 && (state == 'Battle' || state == 'From Battle')) {
        return 'From Battle';
    }
    else {
        return 'Overworld';
    }
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
// Preprocessor runs every loop (everytime pokeabyte updates)
function preprocessor() {
    variables.reload_addresses = true;
    const gamestate = getGamestate();
    setValue('meta.state', gamestate);
    // We need to assign the start of the battle RAM for the enemy because it is dynamically allocated 
    // based on the number of Pokemon in the player's party
    const player_team_count           = getValue('player.team_count');
    const opponent_team_count         = getValue('battle.opponent.team_count');
    const pkmn_ram_allocation         = 0x224
    const battle_ram_starting_address = 0x225B1F0
    const null_data_address           = 0x225AE10
    const player_structure_size       = player_team_count * pkmn_ram_allocation
    const enemy_battle_ram_start      = battle_ram_starting_address + player_structure_size
    variables.battle_ram_player_0     = battle_ram_starting_address
    variables.battle_ram_opponent_0   = enemy_battle_ram_start
    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_player_${i}`] = player_team_count >= (i + 1) ? battle_ram_starting_address + (pkmn_ram_allocation * (i + 1)) : null_data_address
    }
    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_opponent_${i}`] = opponent_team_count >= (i + 1) ? enemy_battle_ram_start + (pkmn_ram_allocation * (i + 1)) : null_data_address
    }

    const partyStructures = [
        "player", 
        "dynamic_player", 
        "dynamic_opponent", 
        // "dynamic_ally", 
        // "dynamic_opponent_2",
    ];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        // Determine the offset from the base_ptr (global_pointer) - only run once per party-structure loop
        // Updating structures start offset from the global_pointer by 0x5888C; they are 0x5B0 bytes long
        // team_count is always offset from the start of the team structure by -0x04 and it's a 1-byte value
        const offsets = {
            // An extremely long block of party structures starts at address 0x221BFB0
            player          : 0x221E42C,
            // player           : 0xD094,
            // static_player    : 0x35514,
            // static_wild      : 0x35AC4,
            // static_opponent  : 0x7A0,
            // static_ally      : 0x7A0 + 0x5B0,
            // static_opponent_2: 0x7A0 + 0xB60,
            dynamic_player   : 0x2258314, // Confirmed as White2 address (party structure length is 0x560)
            dynamic_opponent : 0x2258874, // Confirmed as White2 address
            dynamic_unknown_1: 0x2258DD4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_unknown_2: 0x2259334, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_unknown_3: 0x2259894, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_unknown_4: 0x2259DF4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_unknown_5: 0x225A354, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_unknown_6: 0x225A8B4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
        };
        // Loop through each party-slot within the given party-structure
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            // Initialize an empty array to store the decrypted data
            let decryptedData = new Array(220).fill(0x00);
            let startingAddress = offsets[user] + (220 * slotIndex);
            let encryptedData = memory.defaultNamespace.get_bytes(startingAddress, 220); // Read the Pokemon's data (220-bytes)
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
            for (let i = 0x88; i < 0xDB; i += 2) {
                // this covers the remainder of the 236 byte structure
                let prngFunction = prngNext(prngSeed); // as before
                let key = prngFunction.value;
                // Number and BigInt are required so Javascript stores the prngSeed as an accurate value (it is very large)
                prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);
                let data = encryptedData.get_uint16_le(i) ^ key;
                decryptedData[i + 0] = data & 0xFF;
                decryptedData[i + 1] = (data >> 8) & 0xFF;
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

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor };
