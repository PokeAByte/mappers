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
function copyProperties(sourcePath, destinationPath) {
    if (mapper.copy_properties) {
        mapper.copy_properties(sourcePath, destinationPath);
        return;
    }
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

//notable addresses:
// 0x22349B4 - likely the player's key items
// 0x2234786 - medicine pocket starting address
// 0x223CDAC - player money (4 bytes)
// 0x226D790 - player battle structure (around here)
// 0x226D9B0 - opponent battle structure (around here)
// 0x24400 - Box offset (likely not in primary RAM)
// battle header: 0x226A200 (header)
// battle static: 0x226A234
// battle dynamic: 0x226A794

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
    const active_mon_species = getValue('battle.player.active_pokemon.species');
    const outcome_flags = getValue('battle.other.outcome_flags');
    const battle_end = getValue('battle.other.battle_end');
    const to_battle_pointer = getValue('battle.other.to_battle_pointer_1');
    const battle_state_ready = getValue('battle.other.battle_state_ready');
    const battle = getValue('battle.other.battle');
    const player_lock = getValue('battle.other.player_lock');
    const trainer = getValue('battle.opponent.trainer');
    var return_state = '';
    // const outcome_flags: number = getValue<number>('battle.other.outcome_flags')
    if (team_count === 0) {
        return_state = 'No Pokemon';
    }
    else if (battle != 21828) {
        return_state = 'Overworld';
    }
    else if (state == 'To Battle' && battle_state_ready == 3) {
        return_state = 'Battle';
    }
    else if ((state != 'Battle' && return_state != 'Battle' && state != 'From Battle') && to_battle_pointer == 0 && player_lock == 1) {
        return_state = 'To Battle'
    }
    else if (trainer == "--" && battle_end == 1 && battle == 21828) {
        return_state = 'From Battle'
    }
    else if (outcome_flags == 1 && battle == 21828) {
        return_state = 'From Battle'
    }
    else if (state != 'To Battle' && header == 87 && active_mon_species != null && (generic_1 > 0 || generic_2 > 0 || generic_3 > 0 || generic_4 > 0 )) {
        return_state = 'Battle';
    }
    return return_state
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
function encrypt_pokemon(array) {
    const decryptedData = new Uint8Array(array);

    function prngNext(prngSeed) {
        const newSeed = (0x41C64E6D * prngSeed + 0x6073) >>> 0;
        const value = (newSeed >>> 16) & 0xFFFF;
        return { newSeed, value };
    }

    let encryptedData = new Uint8Array(220);
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
    for (let i = 0x88; i < 0xDB; i += 2) {
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
        address = 0x22349B4 + (220 * slotIndex);
    } else {
        return;
    }
    driver.WriteBytes(address, encrypt_pokemon(containerBytes, true));
}
// Preprocessor runs every loop (everytime pokeabyte updates)
function preprocessor() {
    const white_version_offset = 0x00

    variables.reload_addresses = true;
    const gamestate = getGamestate();
    setValue('meta.state', gamestate);
    // We need to assign the start of the battle RAM for the enemy because it is dynamically allocated 
    // based on the number of Pokemon in the player's party
    const player_team_count           = getValue('player.team_count');
    const opponent_team_count         = getValue('battle.opponent.team_count');
    const ally_team_count             = getValue('battle.ally.team_count');
    const opponent_2_team_count       = getValue('battle.opponent_2.team_count');
    const pkmn_ram_allocation         = 0x224
    const battle_ram_starting_address = 0x226D670 + white_version_offset
    const null_data_address           = 0x226D290 + white_version_offset
    const player_structure_size       = player_team_count * pkmn_ram_allocation
    const enemy_battle_ram_start      = battle_ram_starting_address + player_structure_size
    variables.battle_ram_player_0     = battle_ram_starting_address
    variables.battle_ram_opponent_0   = enemy_battle_ram_start
    
    let additional_offset = 0;
    if (ally_team_count && opponent_2_team_count) {
        additional_offset = 0x158
    }
    let outcome_flags_address = battle_ram_starting_address + (((player_team_count + opponent_team_count + ally_team_count + opponent_2_team_count) * 2) * 0x224) + additional_offset
    variables.outcome_flags_offset = outcome_flags_address


    const enemy_party_position_address = getValue('battle.TESTING.opponent_indirect_1')
    const indirect_offset = 0x34
    const enemy_party_position = (enemy_party_position_address - (enemy_battle_ram_start + indirect_offset)) / 548
    setValue('battle.opponent.party_position', enemy_party_position);
    // 226D670 - player pokemon 1 (0x224 allocation)
    // 226D894 - 2
    // 226DAB8 - 3
    // 226DCDC - 4
    // 226DF00 - 5
    // 226E124 - 6
    // 226E348 - 7
    // 226E56C - 8
    // 226E790 - 9
    // 226E9B4 - 10
    // 226EBD8 - 11 - this isn't Pokemon data
    // 226EDFC - no data at this location

    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_player_${i}`] = player_team_count > i ? battle_ram_starting_address + (pkmn_ram_allocation * i) : null_data_address
    }
    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_opponent_${i}`] = opponent_team_count > i ? enemy_battle_ram_start + (pkmn_ram_allocation * i) : null_data_address
    }

    const partyStructures = [
        "player", 
        "dynamic_player", 
        "dynamic_opponent", 
        "dynamic_ally", 
        "dynamic_opponent_2",
        // "player1",
        // "player2",
        // "player3",
        // "player4",
        // "player5",
        // "player6",
        // "player7",
        // "player8",
    ];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        // Determine the offset from the base_ptr (global_pointer) - only run once per party-structure loop
        // Updating structures start offset from the global_pointer by 0x5888C; they are 0x5B0 bytes long
        // team_count is always offset from the start of the team structure by -0x04 and it's a 1-byte value
        const offsets = {
            // An extremely long block of party structures starts at address 0x221BFB0
            player            : 0x22349B4 + white_version_offset, //party

            dynamic_player    : 0x226A220 + (0x560 * 1) + 0x14 + white_version_offset, // 0x226A794,
            dynamic_opponent  : 0x226A220 + (0x560 * 3) + 0x14 + white_version_offset,
            dynamic_ally      : 0x226A220 + (0x560 * 5) + 0x14 + white_version_offset, // TODO: Requires testing
            dynamic_opponent_2: 0x226A220 + (0x560 * 7) + 0x14 + white_version_offset, // TODO: Requires testing
            unknown_1         : 0x226BD14 + white_version_offset, // TODO: Requires testing
            unknown_2         : 0x226C274 + white_version_offset, // TODO: Requires testing

            player1    : 0x226A220 + (0x560 * 1) + 0x14 + white_version_offset, // player
            player2    : 0x226A220 + (0x560 * 1) + 0x14 + white_version_offset, // player
            player3    : 0x226A220 + (0x560 * 2) + 0x14 + white_version_offset, // opponent_1
            player4    : 0x226A220 + (0x560 * 3) + 0x14 + white_version_offset, // opponent_1
            player5    : 0x226A220 + (0x560 * 4) + 0x14 + white_version_offset, // ally
            player6    : 0x226A220 + (0x560 * 5) + 0x14 + white_version_offset, // ally
            player7    : 0x226A220 + (0x560 * 6) + 0x14 + white_version_offset, // opponent_2
            player8    : 0x226A220 + (0x560 * 7) + 0x14 + white_version_offset, // opponent_2
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
            if (slotIndex == 0 && user == "player") {
                setValue(`player.decrypted_mon_0`, memory[`player_party_structure_0`]);
            }
        }
    }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, containerprocessor, preprocessor };
