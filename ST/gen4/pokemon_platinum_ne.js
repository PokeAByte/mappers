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
// remain replayable. Bump POKEPLATINUM_PATCH_VERSION in
// include/global/pm_version.h before releasing a patch whose RAM layout
// has shifted.
// === BEGIN PATCH_VERSIONS (auto-generated; do not edit) ===
const PATCH_VERSIONS = {
  "patch_magic": "0x504C5450",
  "by_version": {
    "-1": {
      "anchor_addr": null,
      "lookups": {
        "global_pointer_var": "0x0210200C",
        "save_data_pointer": "0x021C0A74"
      },
      "base_offsets": {
        "player_party": 53396,
        "dynamic_player_base": 362636,
        "dynamic_party_stride": 1456,
        "current_party_indexes": 346500,
        "saves_pointer_offset": 131096,
        "address_offset": 36
      }
    },
    "5": {
      "anchor_addr": "0x020E5014",
      "lookups": {
        "global_pointer_var": "0x0210214C",
        "save_data_pointer": "0x021C0BB4",
        "stp_vars": "0x021C3E58"
      },
      "base_offsets": {
        "player_party": 53396,
        "dynamic_player_base": 362636,
        "dynamic_party_stride": 1456,
        "current_party_indexes": 346500,
        "saves_pointer_offset": 131096,
        "address_offset": 36
      }
    },
    "6": {
      "anchor_addr": "0x020E5014",
      "lookups": {
        "global_pointer_var": "0x0210214C",
        "save_data_pointer": "0x021C0BB4",
        "stp_vars": "0x021C3E58"
      },
      "base_offsets": {
        "player_party": 53396,
        "dynamic_player_base": 362636,
        "dynamic_party_stride": 1456,
        "current_party_indexes": 346500,
        "saves_pointer_offset": 131096,
        "address_offset": 36
      }
    }
  }
};
const PATCH_MAGIC = 0x504C5450;
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
    const team_count                = getValue('player.team_count');
    const active_pokemonPv          = getValue('battle.player.active_pokemon.internals.personality_value');
    const teamPokemonPv             = getValue('player.team.0.internals.personality_value');
    const outcome_flags             = getValue('battle.other.outcome_flags');
    const choosing_starter_variable = getValue('flags.choosing_starter');
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
let _layout_diag_logged = false;
function _hex(n, width) {
    let s = (n >>> 0).toString(16).toUpperCase();
    while (s.length < (width || 8)) s = "0" + s;
    return "0x" + s;
}
function _dumpRange(label, addr, byteLen) {
    const words = [];
    for (let i = 0; i < byteLen; i += 4) {
        words.push(_hex(memory.defaultNamespace.get_uint32_le(addr + i), 8));
    }
    return label + " @ " + _hex(addr, 8) + ": " + words.join(" ");
}
function logLayoutDiag(base_ptr, sSaveData_pointer, entry) {
    if (_layout_diag_logged) return;
    _layout_diag_logged = true;
    const off = entry.base_offsets;
    const lines = [];
    lines.push("platinum_ne mapper: LAYOUT DIAGNOSTIC for patch " + (entry.anchor_addr ? "anchor" : "legacy"));
    lines.push("  base_ptr           = " + _hex(base_ptr, 8));
    lines.push("  sSaveData_pointer  = " + _hex(sSaveData_pointer, 8));
    lines.push("  off.player_party   = " + _hex(off.player_party, 8) + "  -> " + _hex(base_ptr + off.player_party, 8));
    lines.push("  off.dynamic_player = " + _hex(off.dynamic_player_base, 8) + "  -> " + _hex(base_ptr + off.dynamic_player_base + off.address_offset, 8));
    lines.push("  off.cur_party_idx  = " + _hex(off.current_party_indexes, 8) + "  -> " + _hex(base_ptr + off.current_party_indexes, 8));
    lines.push("  saves_pointer_off  = " + _hex(off.saves_pointer_offset, 8) + "  -> " + _hex(sSaveData_pointer + off.saves_pointer_offset, 8));
    lines.push(_dumpRange("  SaveData[+0..32]   ", sSaveData_pointer, 32));
    const vfLoc = memory.defaultNamespace.get_uint32_le(sSaveData_pointer + 0x2006C);
    lines.push("  pageInfo[VARS_FLAGS].location @ +0x2006C = " + _hex(vfLoc, 8) + "  (expect small offset within body)");
    lines.push(_dumpRange("  base_ptr[+0..32]   ", base_ptr, 32));
    lines.push(_dumpRange("  party[+0..32]      ", base_ptr + off.player_party, 32));
    lines.push(_dumpRange("  party[+0x80..0xA0] ", base_ptr + off.player_party + 0x80, 32));
    lines.push(_dumpRange("  saves[+0..32]      ", sSaveData_pointer + off.saves_pointer_offset, 32));
    console.log(lines.join("\n"));
}
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
        if (diag) { console.log("platinum_ne mapper: identified patch " + vStr + " (anchor)"); _identify_diag_logged = true; }
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
        if (diag) { console.log("platinum_ne mapper: identified patch " + legacyMatches[0].version + " (legacy):\n" + diag.join("\n")); _identify_diag_logged = true; }
        return legacyMatches[0];
    }
    if (legacyMatches.length > 1) {
        const versionList = legacyMatches.map(m => m.version).join(", ");
        console.log(
            "platinum_ne mapper: refusing to dispatch -- multiple legacy " +
            "patch_versions.json entries match the running ROM (versions: " +
            versionList + "). Remove the stale entries from patch_versions.json " +
            "so only one matches."
        );
    }
    if (diag) { console.log("platinum_ne mapper: NO patch identified. Diagnostics:\n" + diag.join("\n")); _identify_diag_logged = true; }
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
    if (base_ptr === 0) {
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
    logLayoutDiag(base_ptr, sSaveData_pointer, entry);

    // Vars/Flags region inside SaveData. SaveData layout:
    //   +0x14                                  body[]
    //   +0x2006C                               pageInfo[VARS_FLAGS].location  (u32; runtime-computed)
    //   +0x14 + location + 0x240               start of VarsFlags.flags[]
    // Reading pageInfo.location from RAM avoids hand-tracking struct sizes
    // for System+Player+Party+Bag entries that precede it.
    const SAVEDATA_PAGEINFO_VARS_FLAGS_LOCATION = 0x2006C;
    const SAVEDATA_BODY_OFFSET = 0x14;
    const VARSFLAGS_FLAGS_OFFSET = 0x240;
    const vars_flags_location = memory.defaultNamespace.get_uint32_le(sSaveData_pointer + SAVEDATA_PAGEINFO_VARS_FLAGS_LOCATION);
    variables.vars_base  = sSaveData_pointer + SAVEDATA_BODY_OFFSET + vars_flags_location;                          // u16 vars[288]
    variables.flags_base = sSaveData_pointer + SAVEDATA_BODY_OFFSET + vars_flags_location + VARSFLAGS_FLAGS_OFFSET; // u8  flags[364]

    // stpVars is the address of the stpStarterSpecies block; it shifts per
    // patch so the exporter writes it into entry.lookups.stp_vars. Older
    // patch_versions.json entries may lack this field -- leave the variable
    // null in that case so XML properties referencing {stpVars} fail loudly
    // rather than silently dereferencing a stale address.
    // For legacy patches that predate the stpVars block, point at a benign
    // in-range sentinel (start of main RAM). The 5 stp* XML properties will
    // read junk, but the reads stay inside the XML <memory> range so they
    // don't poison neighboring properties or fail the connection.
    variables.stpVars = entry.lookups.stp_vars
        ? parseInt(entry.lookups.stp_vars, 16)
        : 0x02000000;

    variables.player_party          = base_ptr + off.player_party;
    variables.dynamic_player        = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 0) + address_offset;
    variables.dynamic_opponent      = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 1) + address_offset;
    variables.dynamic_ally          = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 2) + address_offset;
    variables.dynamic_opponent_2    = base_ptr + off.dynamic_player_base + (off.dynamic_party_stride * 3) + address_offset;
    variables.current_party_indexes = base_ptr + off.current_party_indexes;
    // Set property values
    const gamestate        = getGamestate();
    const battle_outcomes  = getValue('battle.outcome');
    const enemyBarSyncedHp = getValue('battle.opponent.enemy_bar_synced_hp');
    const opponentTrainer  = getValue('battle.opponent.trainer');
    setValue('meta.state', gamestate);
    setValue('battle.mode', getBattleMode(gamestate, opponentTrainer));
    setValue('meta.state_enemy', getMetaEnemyState(gamestate, battle_outcomes, enemyBarSyncedHp));
    setValue('overworld.encounter_rate', getEncounterRate());
    setValue('player.party_position', getPlayerPartyPosition());
    const party_size = Math.min(6, getValue("player.team_count"));
    for (let i = 0; i < party_size; i++) {
        const team_hidden_power = hiddenPower(`battle.player.team.${i}`)
        setValue(`player.team.${i}.hidden_power.power`, team_hidden_power.power);
        setValue(`player.team.${i}.hidden_power.type`, team_hidden_power.type);

        const battle_team_hidden_power = hiddenPower(`battle.player.team.${i}`)
        setValue(`battle.player.team.${i}.hidden_power.power`, battle_team_hidden_power.power);
        setValue(`battle.player.team.${i}.hidden_power.type`, battle_team_hidden_power.type);
    }
    if (getValue("battle.mode") != null) {
        for (let i = 0; i < 6; i++) {
            const ally_team_hidden_power = hiddenPower(`battle.opponent.team.${i}`);
            setValue(`battle.ally.team.${i}.hidden_power.power`, ally_team_hidden_power.power);
            setValue(`battle.ally.team.${i}.hidden_power.type`, ally_team_hidden_power.type);

            const opponent_team_hidden_power = hiddenPower(`battle.opponent.team.${i}`);
            setValue(`battle.opponent.team.${i}.hidden_power.power`, opponent_team_hidden_power.power);
            setValue(`battle.opponent.team.${i}.hidden_power.type`, opponent_team_hidden_power.type);

            const opponent_2_hidden_power = hiddenPower(`battle.opponent_2.team.${i}`);
            setValue(`battle.opponent_2.team.${i}.hidden_power.power`, opponent_2_hidden_power.power);
            setValue(`battle.opponent_2.team.${i}.hidden_power.type`, opponent_2_hidden_power.type);
        }
    }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor };
