// @ts-ignore
const variables = __variables;
// @ts-ignore
__state;
// @ts-ignore
const memory = __memory;
// @ts-ignore
const mapper = __mapper;
// @ts-ignore
const console = __console;
const getValue = mapper.get_property_value;
const setValue = mapper.set_property_value;

// This block is rewritten by tools/mapper_export/export_mapper_addresses.py
// every time the ROM is rebuilt. Entries accumulate so old patch versions
// remain replayable. Bump HEARTGOLD_PATCH_VERSION in include/pm_version.h
// before releasing a patch whose RAM layout has shifted.
// === BEGIN PATCH_VERSIONS (auto-generated; do not edit) ===
const PATCH_VERSIONS = {
  "patch_magic": "0x48475450",
  "by_version": {
    "-1": {
      "anchor_addr": null,
      "lookups": {
        "global_pointer_var": "0x02111B8C",
        "save_data_pointer": "0x021D2548",
        "stp_vars": "0x021D46D8"
      },
      "base_offsets": {
        "player_party": 53384,
        "dynamic_player_base": 375416,
        "dynamic_party_stride": 1488,
        "current_party_indexes": 356832,
        "saves_pointer_offset": 143376,
        "address_offset": 72
      }
    },
    "2": {
      "anchor_addr": "0x020F59FC",
      "lookups": {
        "global_pointer_var": "0x02111B8C",
        "save_data_pointer": "0x021D2548",
        "stp_vars": "0x021D46D8"
      },
      "base_offsets": {
        "player_party": 53384,
        "dynamic_player_base": 375416,
        "dynamic_party_stride": 1488,
        "current_party_indexes": 356832,
        "saves_pointer_offset": 143376,
        "address_offset": 72
      }
    },
    "3": {
      "anchor_addr": "0x020F5ADC",
      "lookups": {
        "global_pointer_var": "0x02111D0C",
        "save_data_pointer": "0x021D26C8",
        "stp_vars": "0x021D4858"
      },
      "base_offsets": {
        "player_party": 53384,
        "dynamic_player_base": 375416,
        "dynamic_party_stride": 1488,
        "current_party_indexes": 356832,
        "saves_pointer_offset": 143376,
        "address_offset": 72
      }
    },
    "4": {
      "anchor_addr": "0x020F5B00",
      "lookups": {
        "global_pointer_var": "0x02111D2C",
        "save_data_pointer": "0x021D26E8",
        "stp_vars": "0x021D4878"
      },
      "base_offsets": {
        "player_party": 53384,
        "dynamic_player_base": 375416,
        "dynamic_party_stride": 1488,
        "current_party_indexes": 356832,
        "saves_pointer_offset": 143376,
        "address_offset": 72
      }
    },
    "5": {
      "anchor_addr": "0x020F5BC8",
      "lookups": {
        "global_pointer_var": "0x02111DEC",
        "save_data_pointer": "0x021D27A8",
        "stp_vars": "0x021D4938"
      },
      "base_offsets": {
        "player_party": 53384,
        "dynamic_player_base": 375416,
        "dynamic_party_stride": 1488,
        "current_party_indexes": 356832,
        "saves_pointer_offset": 143376,
        "address_offset": 72
      }
    }
  }
};
const PATCH_MAGIC = 0x48475450;
// === END PATCH_VERSIONS ===

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
// Main-RAM heap range used to validate that a u32 read looks like a live
// pointer for legacy (pre-anchor) identification.
const HEAP_LO = 0x02100000;
const HEAP_HI = 0x02400000;
function looksLikeHeapPtr(value) {
    return value >= HEAP_LO && value < HEAP_HI;
}
let _identify_diag_logged = false;
function identifyPatch() {
    // First pass: entries with an anchor_addr are identified exactly via the
    // gPatchVersion magic+version. This is the preferred path for any build
    // produced after the patch-version system was added.
    const versions = (PATCH_VERSIONS && PATCH_VERSIONS.by_version) || {};
    const diag = !_identify_diag_logged ? [] : null;
    for (const vStr of Object.keys(versions)) {
        const entry = versions[vStr];
        if (!entry.anchor_addr) continue;
        const anchor = parseInt(entry.anchor_addr, 16);
        const magicSeen = memory.defaultNamespace.get_uint32_le(anchor);
        const versionSeen = memory.defaultNamespace.get_uint32_le(anchor + 4);
        if (diag) diag.push("  anchor " + vStr + " @ " + entry.anchor_addr + " magic=0x" + magicSeen.toString(16) + " version=" + versionSeen);
        if (magicSeen !== PATCH_MAGIC) continue;
        if (versionSeen !== parseInt(vStr)) continue;
        if (diag) { console.log("heartgold_soulsilver_ne mapper: identified patch " + vStr + " (anchor)"); _identify_diag_logged = true; }
        return { version: parseInt(vStr), entry: entry };
    }
    // Second pass: legacy entries (pre-gPatchVersion). Accept only when BOTH
    // lookups dereference into the main-RAM heap range. If multiple legacy
    // entries match, refuse to dispatch and log all candidates -- the user
    // must disambiguate manually (e.g., by deleting the stale entry).
    const legacyMatches = [];
    for (const vStr of Object.keys(versions)) {
        const entry = versions[vStr];
        if (entry.anchor_addr) continue;
        const gpAddr = parseInt(entry.lookups.global_pointer_var, 16);
        const svAddr = parseInt(entry.lookups.save_data_pointer, 16);
        const gpVal = memory.defaultNamespace.get_uint32_le(gpAddr);
        const svVal = memory.defaultNamespace.get_uint32_le(svAddr);
        const gpOk = looksLikeHeapPtr(gpVal);
        const svOk = looksLikeHeapPtr(svVal);
        if (diag) diag.push("  legacy " + vStr + ": gp@" + entry.lookups.global_pointer_var + "=0x" + gpVal.toString(16) + (gpOk?" OK":" FAIL") + ", sv@" + entry.lookups.save_data_pointer + "=0x" + svVal.toString(16) + (svOk?" OK":" FAIL"));
        if (gpOk && svOk) {
            legacyMatches.push({ version: parseInt(vStr), entry: entry });
        }
    }
    if (legacyMatches.length === 1) {
        if (diag) { console.log("heartgold_soulsilver_ne mapper: identified patch " + legacyMatches[0].version + " (legacy):\n" + diag.join("\n")); _identify_diag_logged = true; }
        return legacyMatches[0];
    }
    if (legacyMatches.length > 1) {
        const versionList = legacyMatches.map(m => m.version).join(", ");
        console.log(
            "heartgold_soulsilver_ne mapper: refusing to dispatch -- multiple legacy " +
            "patch_versions.json entries match the running ROM (versions: " +
            versionList + "). Remove the stale entries from patch_versions.json " +
            "so only one matches."
        );
    }
    if (diag) { console.log("heartgold_soulsilver_ne mapper: NO patch identified. Diagnostics:\n" + diag.join("\n")); _identify_diag_logged = true; }
    return null;
}
function preprocessor() {
    variables.reload_addresses = false;

    // Identify the running patch once; invalidate if the anchor stops matching
    // (handles ROM swap or cart reset mid-session). For legacy entries
    // (anchor_addr=null) we re-validate by re-checking the lookups still point
    // into the heap range.
    if (variables.detected_patch_entry != null) {
        const cached = variables.detected_patch_entry;
        let stillValid;
        if (cached.anchor_addr) {
            const a = parseInt(cached.anchor_addr, 16);
            stillValid = memory.defaultNamespace.get_uint32_le(a) === PATCH_MAGIC;
        } else {
            const gpAddr = parseInt(cached.lookups.global_pointer_var, 16);
            const svAddr = parseInt(cached.lookups.save_data_pointer, 16);
            stillValid =
                looksLikeHeapPtr(memory.defaultNamespace.get_uint32_le(gpAddr))
                && looksLikeHeapPtr(memory.defaultNamespace.get_uint32_le(svAddr));
        }
        if (!stillValid) {
            variables.detected_patch_entry = null;
            variables.detected_patch_version = null;
        }
    }
    if (variables.detected_patch_entry == null) {
        const found = identifyPatch();
        if (!found) {
            variables.global_pointer = null;
            variables.saves_pointer = null;
            return;
        }
        variables.detected_patch_entry = found.entry;
        variables.detected_patch_version = found.version;
        original_base_ptr = 0x0;
    }
    const entry = variables.detected_patch_entry;
    const off = entry.base_offsets;
    const address_offset = off.address_offset | 0;

    const base_ptr = memory.defaultNamespace.get_uint32_le(parseInt(entry.lookups.global_pointer_var, 16));
    const sSaveData_pointer = memory.defaultNamespace.get_uint32_le(parseInt(entry.lookups.save_data_pointer, 16));
    if (base_ptr === 0 || !looksLikeHeapPtr(base_ptr)) {
        // Ends logic if the base_ptr is 0/invalid -- prevents errors during
        // reset and getting on a bike.
        variables.global_pointer = null;
        return;
    }
    if (sSaveData_pointer === 0) {
        variables.saves_pointer = null;
        return;
    }
    if (original_base_ptr !== base_ptr) {
        original_base_ptr          = base_ptr;
        variables.reload_addresses = true;
    }
    variables.global_pointer        = base_ptr;
    variables.saves_pointer         = sSaveData_pointer + off.saves_pointer_offset;

    // stpVars is the address of the stpStarterSpecies block; it shifts per
    // patch so the exporter writes it into entry.lookups.stp_vars. Older
    // patch_versions.json entries may lack this field -- leave the variable
    // null in that case so XML properties referencing {stpVars} fail loudly
    // rather than silently dereferencing a stale address.
    variables.stpVars = entry.lookups.stp_vars
        ? parseInt(entry.lookups.stp_vars, 16)
        : null;

    // Vars/Flags region inside SaveData. HG layout:
    //   +0x10                                 SaveData.dynamic_region[]
    //   +0x23054 + 8                          SaveData.arrayHeaders[SAVE_FLAGS=4].offset (u32)
    //   dynamic_region + offset               start of SaveVarsFlags
    //   + 0x2E0                               SaveVarsFlags.flags[]   (0x2E0 = NUM_VARS * sizeof(u16))
    const SAVEDATA_PAGEINFO_VARS_FLAGS_OFFSET = 0x2305C;
    const SAVEDATA_BODY_OFFSET = 0x10;
    const VARSFLAGS_FLAGS_OFFSET = 0x2E0;
    const vars_flags_location = memory.defaultNamespace.get_uint32_le(sSaveData_pointer + SAVEDATA_PAGEINFO_VARS_FLAGS_OFFSET);
    variables.vars_base  = sSaveData_pointer + SAVEDATA_BODY_OFFSET + vars_flags_location;
    variables.flags_base = sSaveData_pointer + SAVEDATA_BODY_OFFSET + vars_flags_location + VARSFLAGS_FLAGS_OFFSET;

    variables.player_party          = base_ptr + off.player_party;
    variables.dynamic_player        = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 0) + address_offset;
    variables.dynamic_opponent      = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 1) + address_offset;
    variables.dynamic_ally          = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 2) + address_offset;
    variables.dynamic_opponent_2    = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 3) + address_offset;
    variables.current_party_indexes = base_ptr + off.current_party_indexes;
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
