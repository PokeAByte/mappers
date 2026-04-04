import { pokemon } from "game_functions";
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

//white2 notable addresses:
// 0x22349B4 - likely the player's key items
// 0x2234786 - medicine pocket starting address
// 0x223CDAC - player money (4 bytes)
// 0x225B310 - player battle
// 0x226D790 - player battle structure (around here) (there are two copies)
// 0x226D9B0 - opponent battle structure (around here)

function getGamestate() {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "Battle": In battle
    // 4. "To Battle": not yet implemented //TODO: Implement the 'To Battle' state, this requires a new property to accurately track it
    // 5. "From Battle": not yet implemented
    // !TODO: ERROR HERE when entering trainer battle in White2, state does not progress from To Battle to Battle
    // Only in some locations?
    
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

function containerprocessor(container, containerBytes) {
    let address = 0;
    if (container.startsWith("player_party_structure_")) {
        const slotIndex = parseInt(container.substring(23));
        address = 0x22349B4 + (220 * slotIndex);
    } else {
        return;
    }

    // pokemon.Encrypt() does not recalculate the checksum, so we have to do it here:
    let checksum = 0 
    for (let i = 0x08; i < 0x88; i += 2) {
        checksum += (containerBytes[i] | (containerBytes[i + 1] << 8)) & 0xFFFF
    }
    checksum = checksum & 0xFFFF
    containerBytes[0x06] = checksum & 0xFF
    containerBytes[0x07] = (checksum >> 8) & 0xFF
    driver.WriteBytes(address, pokemon.Encrypt(5, containerBytes));
}

const partyStructures = [
    "player", 
    "dynamic_player", 
    "dynamic_opponent", 
    "dynamic_ally", 
    "dynamic_opponent_2",
    "unk1",
    "unk2",
    "unk3",
    "unk4",
    "unk5",
    "unk6",
    "unk7",
    "unk8",
    "unk9",
    // "player1",
    // "player2",
    // "player3",
    // "player4",
    // "player5",
    // "player6",
    // "player7",
    // "player8",
];

const initializeContainers = () => {
    if (__state.initialized === true) {
        return;
    }
    // pre-fill all the slots 
    const blankData = new Array(220).fill(0x00);
    for (let i = 0; i < partyStructures.length; i++) {
        const user = partyStructures[i];
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, blankData);
        }
    }
    __state.initialized = true;
}

// Preprocessor runs every loop (everytime pokeabyte updates)
function preprocessor() {
    initializeContainers();
    const black2_version_offset = 0x00

    variables.reload_addresses = true;
    const gamestate = getGamestate();
    setValue('meta.state', gamestate);
    // We need to assign the start of the battle RAM for the enemy because it is dynamically allocated 
    // based on the number of Pokemon in the player's party
    const player_team_count           = getValue('player.team_count');
    const opponent_team_count         = getValue('battle.opponent.team_count');
    let ally_team_count               = getValue('battle.ally.team_count');
    let opponent_2_team_count         = getValue('battle.opponent_2.team_count');
    const pkmn_ram_allocation         = 0x224
    const battle_ram_starting_address = 0x225B1F0 - black2_version_offset
    const null_data_address           = 0x225AE10 - black2_version_offset
    const player_structure_size       = player_team_count * pkmn_ram_allocation
    const enemy_battle_ram_start      = battle_ram_starting_address + player_structure_size
            
    let additional_offset = 0;
    if (ally_team_count > 6) {
        ally_team_count = 0
    }
    if (opponent_2_team_count > 6) {
        opponent_2_team_count = 0
    }
    if (ally_team_count && opponent_2_team_count) {
        additional_offset = 0x158
    }
    let outcome_flags_address = battle_ram_starting_address + (((player_team_count + opponent_team_count + ally_team_count + opponent_2_team_count) * 2) * 0x224) + additional_offset;
    
    variables.reload_addresses = variables.battle_ram_player_0 != battle_ram_starting_address
        || variables.battle_ram_opponent_0 != enemy_battle_ram_start
        || variables.outcome_flags_offset   != outcome_flags_address;
    
    variables.battle_ram_player_0    = battle_ram_starting_address;
    variables.battle_ram_opponent_0  = enemy_battle_ram_start;
    variables.outcome_flags_offset   = outcome_flags_address;


    const enemy_party_position_address = getValue('battle.TESTING.opponent_indirect_1')
    const indirect_offset = 0x34
    const enemy_party_position = (enemy_party_position_address - (enemy_battle_ram_start + indirect_offset)) / 548
    setValue('battle.opponent.party_position', enemy_party_position);
    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_player_${i}`] = player_team_count > i ? battle_ram_starting_address + (pkmn_ram_allocation * i) : null_data_address
    }
    for (let i = 1; i < 6; i++) {
        variables[`battle_ram_opponent_${i}`] = opponent_team_count > i ? enemy_battle_ram_start + (pkmn_ram_allocation * i) : null_data_address
    }

    const structureSlots = {
        player: player_team_count,
        dynamic_player: player_team_count,
        dynamic_opponent: opponent_team_count,
        dynamic_ally: ally_team_count,
        dynamic_opponent_2: opponent_2_team_count,    
    }
    // const partyStructures = [
    //     "player", 
    //     "dynamic_player", 
    //     "dynamic_opponent", 
    //     "dynamic_ally", 
    //     "dynamic_opponent_2",
    //     // "player1",
    //     // "player2",
    //     // "player3",
    //     // "player4",
    //     // "player5",
    //     // "player6",
    //     // "player7",
    //     // "player8",
    //     "unk1",
    //     "unk2",
    //     "unk3",
    //     "unk4",
    //     "unk5",
    //     "unk6",
    //     "unk7",
    //     "unk8",
    //     "unk9",
    // ];
        // Determine the offset from the base_ptr (global_pointer) - only run once per party-structure loop
        // Updating structures start offset from the global_pointer by 0x5888C; they are 0x5B0 bytes long
        // team_count is always offset from the start of the team structure by -0x04 and it's a 1-byte value
        const offsets = {
            // An extremely long block of party structures starts at address 0x221BFB0
            player          : 0x221E42C - black2_version_offset,

            dynamic_player    : 0x2257DA0 + (0x560 * 1) + 0x14 - black2_version_offset, // Confirmed as White2 address (party structure length is 0x560)
            dynamic_opponent  : 0x2257DA0 + (0x560 * 3) + 0x14 - black2_version_offset, // Confirmed as White2 address
            dynamic_ally      : 0x2257DA0 + (0x560 * 5) + 0x14 - black2_version_offset, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            dynamic_opponent_2: 0x2257DA0 + (0x560 * 7) + 0x14 - black2_version_offset, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // unknown_1         : 0x2257DA0 + (0x560 * 4) + 0x14 - black2_version_offset, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // unknown_2         : 0x2257DA0 + (0x560 * 5) + 0x14 - black2_version_offset, // Confirmed as White2 address // TODO: what does this party structure correspond to?

            player1    : 0x2257DA0 + (0x560 * 0) + 0x14 - black2_version_offset, // player
            player2    : 0x2257DA0 + (0x560 * 1) + 0x14 - black2_version_offset, // player
            player3    : 0x2257DA0 + (0x560 * 2) + 0x14 - black2_version_offset, // opponent_1
            player4    : 0x2257DA0 + (0x560 * 3) + 0x14 - black2_version_offset, // opponent_1
            player5    : 0x2257DA0 + (0x560 * 4) + 0x14 - black2_version_offset, // ally
            player6    : 0x2257DA0 + (0x560 * 5) + 0x14 - black2_version_offset, // ally
            player7    : 0x2257DA0 + (0x560 * 6) + 0x14 - black2_version_offset, // opponent_2
            player8    : 0x2257DA0 + (0x560 * 7) + 0x14 - black2_version_offset, // opponent_2

            // Starting addresses for these structures are variable - I don't know how to determine them yet
            // They need to be mapped because following these structures is where the trainer ID gets stored
            unk1: 0x224B688 + (0x560 * 0) + 0x14,
            unk2: 0x224B688 + (0x560 * 1) + 0x14,
            unk3: 0x224B688 + (0x560 * 2) + 0x14,
            unk4: 0x224B688 + (0x560 * 3) + 0x14,
            unk5: 0x224B688 + (0x560 * 4) + 0x14,
            unk6: 0x224B688 + (0x560 * 5) + 0x14,
            unk7: 0x224B688 + (0x560 * 6) + 0x14,
            unk8: 0x224B688 + (0x560 * 7) + 0x14,
            unk9: 0x224B688 + (0x560 * 8) + 0x14,
        };

        for (let i = 0; i < partyStructures.length; i++) {
            let user = partyStructures[i];
            // Loop through each party-slot within the given party-structure
            for (let slotIndex = 0; slotIndex < structureSlots[user]; slotIndex++) {
                // Initialize an empty array to store the decrypted data
                const startingAddress = offsets[user] + (220 * slotIndex);
                const encryptedData = memory.defaultNamespace.get_bytes(startingAddress, 220); // Read the Pokemon's data (220-bytes)
                const decryptedData = pokemon.Decrypt(5, encryptedData.data);
                // Fills the memory contains for the mapper's class to interpret
                memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData);
                if (slotIndex == 0 && user == "player") {
                    setValue(`player.decrypted_mon_0`, memory[`player_party_structure_0`]);
                }
            }
        }
    }
    
    export { containerprocessor, preprocessor };
