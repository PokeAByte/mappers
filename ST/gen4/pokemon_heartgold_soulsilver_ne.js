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
    const global_pointer   = getValue('meta.global_pointer');
    const team_count       = getValue('player.team_count');
    const active_pokemonPv = getValue('battle.player.active_pokemon.internals.personality_value');
    const teamPokemonPv    = getValue('player.team.0.internals.personality_value');
    const teamNickname     = getValue('player.team.0.nickname');                                    //TODO: remove these once all properties are mapped - HGSS and Plat should have the same state functions
    const battleNickname   = getValue('battle.player.active_pokemon.nickname');                     //TODO: remove these once all properties are mapped - HGSS and Plat should have the same state functions
    const outcome_flags    = getValue('battle.other.outcome_flags');
    // if (team_count === 0 || global_pointer === 0 || global_pointer === -451145720) {
    if (team_count === 0 || (global_pointer <= 0 && team_count === 0)) {
        return 'No Pokemon';
    }
    else if (active_pokemonPv === teamPokemonPv && outcome_flags == 1) {
        return 'From Battle';
    }
    else if (active_pokemonPv === teamPokemonPv) {
        return 'Battle';
    }
    else if (teamNickname !== battleNickname) {
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
// Preprocessor runs every loop (everytime pokeabyte updates)
let original_base_ptr = 0x0;
function preprocessor() {
    
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    // This block of code is used to solve the issue of patch differences as I have continued to modify the game. 
    // Patch1: 2024 to 2025.06.22 (all runs before Rhyperior use this setting)
    // Offset: 0x00
    //
    // Patch2: 2024.06.23 (Rhyperior uses this setting; this patch implements changes to evolution mechanics (Rhyperior patch has an issue with HM08))
    // Offset: 0x24
    //
    // Patch3: Planned (After Rhyperior, fixes spinners and changes how the starters and rival mons are assigned)
    // Offset: Unknown (currently unreleased)
    //
    let patch_update = true;
    let address_offset = 0x0; // Patch1
    // if (patch_update) {
    //     address_offset = 0x24 // Patch2
    // }
    if (patch_update) {
        address_offset = 0x48 // Patch3
    }
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////

    variables.reload_addresses = false;
    // This is the same as the global_pointer, it is named "base_ptr" for consistency with the old C# code    
    // const base_ptr = memory.defaultNamespace.get_uint32_le(0x211186C); //HGSS pointer (Test value: 226F234)
    // const base_ptr = memory.defaultNamespace.get_uint32_le(0x21117CC); //HGSS pointer prior to 2025-08-07
    // const base_ptr = memory.defaultNamespace.get_uint32_le(0x211182C); //HGSS pointer after 2025-08-07
    // const base_ptr = memory.defaultNamespace.get_uint32_le(0x2111800 + 12); //HGSS pointer after 2025-12-27 v0.2.0

    // To find the global pointer, search from 'main' in the 'main.elf.xMAP' file produced by the disassembly.
    const base_ptr = memory.defaultNamespace.get_uint32_le(0x2111B20 + 12); //HGSS pointer after 2025-12-27
    // const base_ptr = memory.defaultNamespace.get_uint32_le(0x2111800 + 0x40 + 12); //HGSS pointer after 2025-12-27
    
    const sSaveData_pointer = memory.defaultNamespace.get_uint32_le(0x21D24E8);
    // const sSaveData_pointer = memory.defaultNamespace.get_uint32_le(0x21D2208);
    
    if (base_ptr === 0 || base_ptr >= 38438215) {
        // Ends logic is the base_ptr is 0, this is to prevent errors during reset and getting on a bike.
        variables.global_pointer = null;
        return;
    }
    if (original_base_ptr !== base_ptr) {
        original_base_ptr          = base_ptr;
        variables.reload_addresses = true;
    }
    variables.global_pointer        = base_ptr;          // Variable used for mapper addresses, it is the same as "base_ptr"
    variables.saves_pointer         = sSaveData_pointer + 0x23010; // Variable used for mapper addresses, it is the same as "base_ptr"
    variables.player_party          = base_ptr + 0xD088;
    variables.dynamic_player        = base_ptr + 0x5BA78 + (0x5D0 * 0) + address_offset;
    variables.dynamic_opponent      = base_ptr + 0x5BA78 + (0x5D0 * 1) + address_offset;
    variables.dynamic_ally          = base_ptr + 0x5BA78 + (0x5D0 * 2) + address_offset;
    variables.dynamic_opponent_2    = base_ptr + 0x5BA78 + (0x5D0 * 3) + address_offset;
    variables.current_party_indexes = base_ptr + 0x571E0;
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
    for (let i = 0; i < 6; i++) {
        setValue(`player.team.${i}.hidden_power.power`, hiddenPower(`player.team.${i}`).power);
        setValue(`player.team.${i}.hidden_power.type`, hiddenPower(`player.team.${i}`).type);
        setValue(`battle.player.team.${i}.hidden_power.power`, hiddenPower(`battle.player.team.${i}`).power);
        setValue(`battle.player.team.${i}.hidden_power.type`, hiddenPower(`battle.player.team.${i}`).type);
        setValue(`battle.ally.team.${i}.hidden_power.power`, hiddenPower(`battle.ally.team.${i}`).power);
        setValue(`battle.ally.team.${i}.hidden_power.type`, hiddenPower(`battle.ally.team.${i}`).type);
        setValue(`battle.opponent.team.${i}.hidden_power.power`, hiddenPower(`battle.opponent.team.${i}`).power);
        setValue(`battle.opponent.team.${i}.hidden_power.type`, hiddenPower(`battle.opponent.team.${i}`).type);
        setValue(`battle.opponent_2.team.${i}.hidden_power.power`, hiddenPower(`battle.opponent_2.team.${i}`).power);
        setValue(`battle.opponent_2.team.${i}.hidden_power.type`, hiddenPower(`battle.opponent_2.team.${i}`).type);
    }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor };
