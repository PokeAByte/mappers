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
        throw new Error(`${path} is not defined in properties.`);}
    property.value = value;
}

function prngNext(prngSeed) {
    const newSeed = Number((0x41C64E6Dn * BigInt(prngSeed) + 0x6073n) & 0xFFFFFFFFn);
    const value = (newSeed >>> 16) & 0xFFFF;
    return { newSeed, value };
}

const blockPositions = [
    0,1,2,3,  0,1,3,2,  0,2,1,3,  0,3,1,2,  0,2,3,1,  0,3,2,1,
    1,0,2,3,  1,0,3,2,  2,0,1,3,  3,0,1,2,  2,0,3,1,  3,0,2,1,
    1,2,0,3,  1,3,0,2,  2,1,0,3,  3,1,0,2,  2,3,0,1,  3,2,0,1,
    1,2,3,0,  1,3,2,0,  2,1,3,0,  3,1,2,0,  2,3,1,0,  3,2,1,0,
    0,1,2,3,  0,1,3,2,  0,2,1,3,  0,3,1,2,  0,2,3,1,  0,3,2,1,
    1,0,2,3,  1,0,3,2,
];

const PARTY_BASE = 0x08CE1CE8;
const SLOT_SIZE = 484;
const BLOCK_SIZE = 56;
const HEADER_SIZE = 8;
const BLOCK_DATA_END = 0xE8;
const STATS_END = 0x104;
const PK6_SIZE = 260;
const READ_SIZE = 0x174;
const STATS_SRC = 0x158;
const STATS_LEN = STATS_END - BLOCK_DATA_END;

const BATTLE_FLAG = 0x08000140;
const BATTLE_OBJ_LO = 0x081FB000;
const BATTLE_OBJ_HI = 0x08209000;
const BATTLE_SLOT = 0x244;
const BATTLE_DELTA = 0xC;
const ZONE_LOC = 0x08CE2840;
const ZONE_FALLBACK = 0x08C6709E;
const CONFIG = 0x080440C4;

// Location name per zd entry (Kalos zonedata table).
const ZONE_NAMES = [
    "Vaniville Town", "Vaniville Town", "Vaniville Town", "Vaniville Town", "Vaniville Town", "Vaniville Town", "Vaniville Town", "Vaniville Town",
    "Aquacorde Town", "Aquacorde Town", "Aquacorde Town", "Aquacorde Town", "Camphrier Town", "Camphrier Town", "Shabboneau Castle", "Shabboneau Castle",
    "Shabboneau Castle", "Camphrier Town", "Camphrier Town", "Camphrier Town", "Camphrier Town", "Geosenge Town", "Geosenge Town", "Geosenge Town",
    "Geosenge Town", "Geosenge Town", "Geosenge Town", "Geosenge Town", "Geosenge Town", "Dendemille Town", "Dendemille Town", "Dendemille Gate",
    "Dendemille Gate", "Dendemille Town", "Dendemille Town", "Dendemille Town", "Dendemille Town", "Dendemille Town", "Couriway Town", "Couriway Gate",
    "Couriway Town", "Couriway Town", "Couriway Town", "Couriway Town", "Couriway Town", "Ambrette Town", "Ambrette Gate", "Ambrette Town",
    "Ambrette Aquarium", "Ambrette Town", "Ambrette Town", "Ambrette Town", "Ambrette Town", "Santalune City", "Santalune City", "Santalune City",
    "Santalune City", "Santalune City", "Santalune City", "Santalune City", "Santalune City", "Santalune City", "Santalune City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose Gate", "Lumiose Gate",
    "Lumiose Gate", "Lumiose Gate", "Lumiose Gate", "Lumiose City", "Lumiose City", "Prism Tower", "Prism Tower", "Prism Tower",
    "Prism Tower", "Prism Tower", "Prism Tower", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lysandre Labs", "Lysandre Labs",
    "Lysandre Labs", "Lysandre Labs", "Lysandre Labs", "Lysandre Labs", "Lysandre Labs", "Lysandre Labs", "Lysandre Labs", "Lysandre Labs",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose Station", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City",
    "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Lumiose City", "Cyllage City", "Cyllage City", "Cyllage City",
    "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City",
    "Cyllage City", "Cyllage City", "Cyllage City", "Cyllage City", "Shalour City", "Shalour Gate", "Shalour City", "Shalour City",
    "Shalour City", "Shalour City", "Shalour City", "Shalour City", "Shalour City", "Tower of Mastery", "Tower of Mastery", "Tower of Mastery",
    "Tower of Mastery", "Tower of Mastery", "Tower of Mastery", "Coumarine City", "Coumarine City", "Coumarine Gate", "Coumarine City", "Coumarine City",
    "Coumarine City", "Coumarine City", "Coumarine City", "Coumarine City", "Coumarine City", "Coumarine City", "Coumarine City", "Coumarine City",
    "Laverre City", "Laverre Gate", "Laverre City", "Laverre City", "Laverre City", "Laverre City", "Laverre City", "Laverre City",
    "Laverre City", "Laverre City", "Laverre City", "Anistar City", "Anistar Gate", "Anistar Gate", "Anistar City", "Anistar City",
    "Anistar City", "Anistar City", "Anistar City", "Anistar City", "Anistar City", "Anistar City", "Snowbelle City", "Snowbelle Gate",
    "Snowbelle Gate", "Snowbelle City", "Snowbelle City", "Snowbelle City", "Snowbelle City", "Snowbelle City", "Snowbelle City", "Snowbelle City",
    "Snowbelle City", "Kiloude City", "Kiloude City", "Kiloude City", "Kiloude Station", "Kiloude City", "Kiloude City", "Kiloude City",
    "Kiloude City", "Battle Maison", "Battle Maison", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Blazing Chamber",
    "Flood Chamber", "Ironworks Chamber", "Dragonmark Chamber", "Blazing Chamber", "Flood Chamber", "Ironworks Chamber", "Dragonmark Chamber", "Radiant Chamber",
    "Radiant Chamber", "Pokémon League", "Route 1", "Route 2", "Route 3", "Route 4", "Route 5", "Route 6",
    "Route 7", "Route 7", "Route 8", "Route 9", "Route 10", "Route 11", "Route 12", "Route 12",
    "Route 13", "Route 14", "Route 14", "Route 15", "Route 16", "Route 16", "Route 17", "Route 18",
    "Route 18", "Route 19", "Route 20", "Route 21", "Route 21", "Route 22", "Santalune Forest", "Parfum Palace",
    "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace",
    "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Parfum Palace", "Glittering Cave",
    "Glittering Cave", "Reflection Cave", "Reflection Cave", "Reflection Cave", "Reflection Cave", "Poké Ball Factory", "Poké Ball Factory", "Poké Ball Factory",
    "Poké Ball Factory", "Frost Cavern", "Frost Cavern", "Frost Cavern", "Frost Cavern", "Frost Cavern", "Pokémon Village", "Unknown Dungeon",
    "Victory Road", "Pokémon League Gate", "Victory Road", "Victory Road", "Victory Road", "Victory Road", "Victory Road", "Victory Road",
    "Victory Road", "Battle Chateau", "Battle Chateau", "Battle Chateau", "Battle Chateau", "Battle Chateau", "Connecting Cave", "Kalos Power Plant",
    "Kalos Power Plant", "Kalos Power Plant", "Kalos Power Plant", "Team Flare Secret HQ", "Team Flare Secret HQ", "Team Flare Secret HQ", "Team Flare Secret HQ", "Terminus Cave",
    "Terminus Cave", "Terminus Cave", "Terminus Cave", "Terminus Cave", "Terminus Cave", "Lost Hotel", "Chamber of Emptiness", "Sea Spirit’s Den",
    "Route 7", "Route 7", "Friend Safari", "Friend Safari", "Anistar City", "Azure Bay", "Battle Maison", "Lumiose City",
];

function getGamestate() {
    return battleObject() ? "Battle" : "Overworld";
}
function getMetaEnemyState() { return null; }
function getBattleMode() { return null; }
function getBattleOutcome() { return null; }
function getEncounterRate() { return null; }

function readU32Addr(address) {
    return memory.defaultNamespace.get_bytes(address, 4).get_uint32_le() >>> 0;
}
function readU16Addr(address) {
    return memory.defaultNamespace.get_bytes(address, 2).get_uint16_le();
}
function safeSet(path, value) {
    try { setValue(path, value); } catch (e) {}
}

function fillEmptyParty() {
    const empty = new Array(PK6_SIZE).fill(0x00);
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        try {
            memory.fill(`player_party_structure_${slotIndex}`, 0x00, empty);
        } catch (e) {}
    }
}

function decryptLiveParty() {
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        const decryptedData = new Array(PK6_SIZE).fill(0x00);
        const startingAddress = PARTY_BASE + (SLOT_SIZE * slotIndex);
        try {
            const encryptedData = memory.defaultNamespace.get_bytes(startingAddress, READ_SIZE);
            const ec = encryptedData.get_uint32_le();
            if (ec !== 0) {
                for (let j = 0; j < HEADER_SIZE; j++) {
                    decryptedData[j] = encryptedData.get_byte(j);
                }
                let prngSeed = ec;
                for (let j = HEADER_SIZE; j < BLOCK_DATA_END; j += 2) {
                    const prngResult = prngNext(prngSeed);
                    prngSeed = prngResult.newSeed;
                    const word = encryptedData.get_uint16_le(j) ^ prngResult.value;
                    decryptedData[j] = word & 0xFF;
                    decryptedData[j + 1] = (word >> 8) & 0xFF;
                }
                const sv = (ec >> 13) & 31;
                const dataCopy = decryptedData.slice(HEADER_SIZE, BLOCK_DATA_END);
                for (let b = 0; b < 4; b++) {
                    const srcBlock = blockPositions[sv * 4 + b];
                    decryptedData.splice(
                        HEADER_SIZE + b * BLOCK_SIZE,
                        BLOCK_SIZE,
                        ...dataCopy.slice(srcBlock * BLOCK_SIZE, srcBlock * BLOCK_SIZE + BLOCK_SIZE)
                    );
                }
                prngSeed = ec;
                for (let k = 0; k < STATS_LEN; k += 2) {
                    const prngResult = prngNext(prngSeed);
                    prngSeed = prngResult.newSeed;
                    const word = encryptedData.get_uint16_le(STATS_SRC + k) ^ prngResult.value;
                    decryptedData[BLOCK_DATA_END + k] = word & 0xFF;
                    decryptedData[BLOCK_DATA_END + k + 1] = (word >> 8) & 0xFF;
                }
            }
        } catch (e) {}
        memory.fill(`player_party_structure_${slotIndex}`, 0x00, decryptedData);
    }
}

function countPartySlots() {
    let count = 0;
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        try {
            const ec = memory.defaultNamespace.get_bytes(PARTY_BASE + (SLOT_SIZE * slotIndex), 4).get_uint32_le();
            if (ec !== 0) {
                count++;
            }
        } catch (e) {}
    }
    return count;
}

function battleObject() {
    try {
        const ptr = readU32Addr(BATTLE_FLAG);
        if (ptr >= BATTLE_OBJ_LO && ptr < BATTLE_OBJ_HI) {
            return ptr;
        }
    } catch (e) {}
    return 0;
}

function bindActive(name, addr) {
    if (variables[name] !== addr) {
        variables[name] = addr;
        variables.reload_addresses = true;
    }
}

function resolveActiveBattlers() {
    const obj = battleObject();
    let playerAddr = 0x081FB000 + BATTLE_DELTA;
    let enemyAddr = playerAddr + BATTLE_SLOT;
    if (obj) {
        try {
            const base = readU32Addr(obj + 0x160);
            if (base >= BATTLE_OBJ_LO && base < BATTLE_OBJ_HI) {
                let pFound = 0;
                let eFound = 0;
                for (let i = 0; i < 16; i++) {
                    const addr = base + BATTLE_DELTA + i * BATTLE_SLOT;
                    const species = readU16Addr(addr);
                    const slot = memory.defaultNamespace.get_bytes(addr + 13, 1).get_byte(0);
                    if (species < 1 || species > 721) {
                        continue;
                    }
                    if (slot <= 5 && !pFound) {
                        playerAddr = addr;
                        pFound = 1;
                        safeSet("battle.party_position", slot);
                        safeSet("battle.player.party_position", slot);
                    } else if (slot >= 12 && slot <= 17 && !eFound) {
                        enemyAddr = addr;
                        eFound = 1;
                        safeSet("battle.opponent.party_position", slot - 12);
                    }
                }
            }
        } catch (e) {}
    }
    bindActive("player_active", playerAddr);
    bindActive("opponent_active", enemyAddr);
}

function resolveBattle() {
    const obj = battleObject();
    const inBattle = !!obj;
    safeSet("battle.in_battle", inBattle);
    safeSet("battle.other.battle", inBattle ? 1 : 0);
    safeSet("meta.state", inBattle ? "Battle" : "Overworld");
    safeSet("meta.state_enemy", inBattle ? "Battle" : null);
    if (!inBattle) {
        safeSet("battle.other.battle_end", 0);
        safeSet("battle.other.outcome", 0);
        safeSet("battle.other.prize_money", 0);
        safeSet("battle.opponent.id", 0);
        safeSet("battle.opponent.trainer_class", 0);
        safeSet("battle.opponent.team_count", 0);
        safeSet("battle.player.team_count", 0);
        return;
    }
    try {
        safeSet("battle.opponent.id", readU16Addr(obj + 0x958));
        safeSet("battle.opponent.trainer_class", readU16Addr(obj + 0x95A));
        safeSet("battle.other.prize_money", readU32Addr(obj + 0x8D4));
        safeSet("battle.other.battle_end", readU32Addr(obj + 0x8AC));
        safeSet("battle.opponent.team_count", readU32Addr(obj + 0x194));
        safeSet("battle.player.team_count", 1);
    } catch (e) {}
}

function validZone(z) {
    return z > 0 && z < ZONE_NAMES.length;
}

function resolveOverworld() {
    try {
        const loc = readU16Addr(ZONE_LOC);
        const fallback = readU16Addr(ZONE_FALLBACK);
        const zone = validZone(loc) ? loc : fallback;
        if (!validZone(zone)) {
            return;
        }
        safeSet("overworld.map_index", zone);
        safeSet("overworld.map_name", ZONE_NAMES[zone]);
    } catch (e) {}
}

function validConfig(v) {
    return (v >>> 4) === 0 && (v & 3) <= 2;
}

function resolveOptions() {
    try {
        const v = readU32Addr(CONFIG);
        if (!validConfig(v)) {
            return;
        }
        const prev = variables.config_word;
        if (prev !== undefined && prev !== v) {
            const changed = (prev ^ v) & 0xF;
            // Accept a single field change (speed / anim / style). Bag menus
            // overwrite this word with unrelated nibbles.
            const speed = (changed & 3) !== 0;
            const anim = (changed & 4) !== 0;
            const style = (changed & 8) !== 0;
            if ((speed + anim + style) !== 1) {
                return;
            }
        }
        variables.config_word = v;
        safeSet("options.text_speed", v & 3);
        safeSet("options.animations", ((v >> 2) & 1) === 0);
        safeSet("options.battle_style", ((v >> 3) & 1) === 1);
    } catch (e) {}
}

function preprocessor() {
    if (!variables.player_active) {
        variables.player_active = 0x081FB000 + BATTLE_DELTA;
    }
    if (!variables.opponent_active) {
        variables.opponent_active = 0x081FB000 + BATTLE_DELTA + BATTLE_SLOT;
    }
    variables.reload_addresses = true;
    try {
        decryptLiveParty();
    } catch (e) {
        fillEmptyParty();
    }
    resolveActiveBattlers();
}

function postprocessor() {
    try {
        setValue("player.team_count", countPartySlots());
    } catch (e) {}
    resolveBattle();
    resolveOverworld();
    resolveOptions();
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor, postprocessor };
