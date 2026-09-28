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

const SAVE_SCAN_START = 0x33000000;
const SAVE_SCAN_SIZE = 0x180000;
const MONEY_FROM_TID = 0x29F8;
const ITEMS_FROM_TID = -0xEE4;
const MAX_MONEY = 9999999;
const CONFIG_FROM_TID = 0x2C44;
const OPTIONS_MENU = 0x301025AA;
const OPTIONS_MENU_CLOSED = 0x09;
const OPTIONS_MENU_OPEN = 0x0A;

const PARTY_BASE = 0x33F7FA44;
const SLOT_SIZE = 484;
const BLOCK_SIZE = 56;
const HEADER_SIZE = 8;
const BLOCK_DATA_END = 0xE8;
const STATS_END = 0x104;
const PK7_SIZE = 260;
const READ_SIZE = 0x174;
const STATS_SRC = 0x158;
const STATS_LEN = STATS_END - BLOCK_DATA_END;

const BATTLE_FLAG = 0x30000400;
const BATTLE_OBJ_LO = 0x32580000;
const BATTLE_OBJ_HI = 0x32584000;
const BATTLE_PLAYER = 0x30002774;
const BATTLE_ENEMY = 0x30004DB4;
const BATTLE_SLOT = 0x330;
const BATTLE_PLAYER_PTR = 0x30000404;
const BATTLE_ENEMY_PTR = 0x30000420;
const BATTLE_PLAYER_COUNT = 0x3000041C;
const BATTLE_ENEMY_COUNT = 0x30000438;
const BATTLE_OBJ_DELTA = 0xC;
const ZONE = 0x303A4568;

// Location name per zone: same ParentMap bank as Sun/Moon for shared Alola fields.
const ZONE_NAMES = [
    "Route 1", "Route 1", "Route 3", "Route 2", "Kala’e Bay", "Melemele Sea", "Melemele Sea", "Hau’oli City",
    "Hau’oli City", "Hau’oli City", "Iki Town", "Iki Town", "Iki Town", "Mahalo Trail", "Mahalo Trail", "Ruins of Conflict",
    "Ruins of Conflict", "Ruins of Conflict", "Ten Carat Hill", "Ten Carat Hill", "Hau’oli Cemetery", "Melemele Meadow", "Seaward Cave", "Berry Fields",
    "Verdant Cavern", "Verdant Cavern", "Route 1", "Route 1", "Route 1", "Route 1", "Iki Town", "Iki Town",
    "Iki Town", "Iki Town", "Iki Town", "Iki Town", "Iki Town", "Route 1", "Route 1", "Hau’oli City",
    "Route 2", "Route 2", "Hau’oli City", "Hau’oli City", "Hau’oli City", "Berry Fields", "Route 1", "Route 1",
    "Route 1", "Route 1", "Route 1", "Route 1", "Route 1", "Route 1", "Hau’oli City", "Hau’oli City",
    "Hau’oli City", "Hau’oli City", "Hau’oli City", "Hau’oli City", "Hau’oli City", "Hau’oli City", "Route 2", "Route 2",
    "Hau’oli City", "Route 1", "Hau’oli City", "Route 2", "Route 4", "Route 5", "Route 6", "Route 7",
    "Route 8", "Route 9", "Hano Grand Resort", "Hano Beach", "Paniola Town", "Heahea City", "Konikoni City", "Royal Avenue",
    "Ruins of Life", "Ruins of Life", "Ruins of Life", "Memorial Hill", "Akala Outskirts", "Diglett’s Tunnel", "Wela Volcano Park", "Wela Volcano Park",
    "Brooklet Hill", "Brooklet Hill", "Brooklet Hill", "Lush Jungle", "Lush Jungle", "Lush Jungle", "Lush Jungle", "Lush Jungle",
    "Paniola Town", "Paniola Town", "Paniola Town", "Paniola Town", "Konikoni City", "Konikoni City", "Konikoni City", "Konikoni City",
    "Konikoni City", "Konikoni City", "Konikoni City", "Konikoni City", "Konikoni City", "Heahea City", "Heahea City", "Heahea City",
    "Heahea City", "Heahea City", "Heahea City", "Heahea City", "Heahea City", "Heahea City", "Heahea City", "Route 8",
    "Hano Grand Resort", "Royal Avenue", "Route 8", "Route 8", "Royal Avenue", "Konikoni City", "Konikoni City", "Route 9",
    "Battle Royal Dome", "Route 8", "Paniola Ranch", "Paniola Ranch", "Paniola Ranch", "Heahea City", "Heahea City", "Royal Avenue",
    "Route 8", "Konikoni City", "Paniola Town", "Route 5", "Route 10", "Route 11", "Ula’ula Beach", "Route 13",
    "Tapu Village", "Route 14", "Route 15", "Route 16", "Route 17", "Route 12", "Malie City", "Malie City",
    "Po Town", "Haina Desert", "Haina Desert", "Haina Desert", "Haina Desert", "Haina Desert", "Haina Desert", "Haina Desert",
    "Haina Desert", "Ula’ula Meadow", "Malie Garden", "Mount Hokulani", "Blush Mountain", "Ruins of Abundance", "Ruins of Abundance", "Ruins of Abundance",
    "Lake of the Sunne", "Lake of the Sunne", "Lake of the Sunne", "Lake of the Sunne", "Lake of the Moone", "Lake of the Moone", "Lake of the Moone", "Lake of the Moone",
    "Mount Lanakila", "Mount Lanakila", "Mount Lanakila", "Mount Lanakila", "Mount Lanakila", "Shady House", "Shady House", "Shady House",
    "Shady House", "Shady House", "Shady House", "Shady House", "Shady House", "Shady House", "Shady House", "Shady House",
    "Thrifty Megamart", "Thrifty Megamart", "Thrifty Megamart", "Malie City", "Malie City", "Malie City", "Malie City", "Malie City",
    "Malie City", "Malie City", "Malie City", "Malie City", "Malie City", "Malie City", "Route 15", "Route 15",
    "Route 15", "Route 13", "Route 13", "Route 17", "Route 16", "Hokulani Observatory", "Hokulani Observatory", "Hokulani Observatory",
    "Blush Mountain", "Route 13", "Route 13", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League",
    "Pokémon League", "Malie City", "Tapu Village", "Po Town", "Route 16", "Mount Lanakila", "Mount Hokulani", "Poni Wilds",
    "Ancient Poni Path", "Poni Breaker Coast", "Poni Grove", "Poni Plains", "Poni Coast", "Poni Gauntlet", "Seafolk Village", "Poni Meadow",
    "Vast Poni Canyon", "Vast Poni Canyon", "Vast Poni Canyon", "Vast Poni Canyon", "Vast Poni Canyon", "Vast Poni Canyon", "Altar of the Sunne", "Altar of the Sunne",
    "Altar of the Moone", "Altar of the Moone", "Ruins of Hope", "Ruins of Hope", "Ruins of Hope", "Resolution Cave", "Resolution Cave", "Exeggutor Island",
    "Seafolk Village", "Seafolk Village", "Seafolk Village", "Seafolk Village", "Seafolk Village", "Ancient Poni Path", "Ancient Poni Path", "Seafolk Village",
    "Battle Tree", "Battle Tree", "Battle Tree", "Battle Tree", "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise",
    "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise", "Aether Paradise",
    "Aether Paradise", "Route 1", "Route 1", "Ultra Deep Sea", "Route 1", "Route 1", "Route 1", "Route 1",
    "Route 1", "Route 1", "Route 1", "Route 1", "Route 1", "Route 1", "Route 1",
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
function readU8Addr(address) {
    return memory.defaultNamespace.get_bytes(address, 1).get_byte(0);
}
function safeSet(path, value) {
    try { setValue(path, value); } catch (e) {}
}

function readU32(data, offset) {
    return (
        data.get_byte(offset) |
        (data.get_byte(offset + 1) << 8) |
        (data.get_byte(offset + 2) << 16) |
        (data.get_byte(offset + 3) << 24)
    ) >>> 0;
}

function isTrainerHeader(data, offset) {
    const id32 = readU32(data, offset);
    if (id32 === 0) {
        return false;
    }
    const game = data.get_byte(offset + 4);
    const gender = data.get_byte(offset + 5);
    if (game < 32 || game > 33 || gender > 1) {
        return false;
    }
    const nameUnit = data.get_byte(offset + 0x38) | (data.get_byte(offset + 0x39) << 8);
    return nameUnit >= 0x20 && nameUnit <= 0xFF;
}

function isTrainerBlock(data, offset) {
    if (!isTrainerHeader(data, offset)) {
        return false;
    }
    const money = readU32(data, offset + MONEY_FROM_TID);
    return money > 0 && money <= MAX_MONEY;
}

function findSaveBlock() {
    try {
        const data = memory.defaultNamespace.get_bytes(SAVE_SCAN_START, SAVE_SCAN_SIZE);
        for (let i = 0; i + MONEY_FROM_TID + 4 <= SAVE_SCAN_SIZE; i += 4) {
            if (isTrainerBlock(data, i)) {
                return SAVE_SCAN_START + i;
            }
        }
    } catch (e) {}
    return 0;
}

function saveBlockStillValid(address) {
    if (!address) {
        return false;
    }
    try {
        const data = memory.defaultNamespace.get_bytes(address, 0x3A);
        return isTrainerHeader(data, 0);
    } catch (e) {
        return false;
    }
}

function fillEmptyParty() {
    const empty = new Array(PK7_SIZE).fill(0x00);
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        try {
            memory.fill(`player_party_structure_${slotIndex}`, 0x00, empty);
        } catch (e) {}
    }
}

function decryptLiveParty() {
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        const decryptedData = new Array(PK7_SIZE).fill(0x00);
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

function bindSaveDerived(found) {
    variables.save_block = found;
    variables.heap_money = found ? found + MONEY_FROM_TID : 0;
    variables.heap_items = found ? found + ITEMS_FROM_TID : 0;
}

function resolveSaveBlock() {
    const previous = variables.save_block | 0;
    if (!previous) {
        bindSaveDerived(0x33012818);
    }
    if (!saveBlockStillValid(variables.save_block)) {
        const found = findSaveBlock();
        if (found) {
            bindSaveDerived(found);
        }
    } else if (!variables.heap_items) {
        bindSaveDerived(variables.save_block);
    }
    const current = variables.save_block | 0;
    variables.reload_addresses = !previous || previous !== current || !variables.heap_money || !variables.heap_items;
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

function fieldIndex(ptrAddr, slotBase) {
    try {
        const ptr = readU32Addr(ptrAddr);
        const rel = (ptr - (slotBase - BATTLE_OBJ_DELTA)) >>> 0;
        if (rel % BATTLE_SLOT === 0) {
            const idx = rel / BATTLE_SLOT;
            if (idx >= 0 && idx <= 5) {
                return idx;
            }
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
    const pIdx = fieldIndex(BATTLE_PLAYER_PTR, BATTLE_PLAYER);
    const eIdx = fieldIndex(BATTLE_ENEMY_PTR, BATTLE_ENEMY);
    bindActive("player_active", BATTLE_PLAYER + (pIdx * BATTLE_SLOT));
    bindActive("opponent_active", BATTLE_ENEMY + (eIdx * BATTLE_SLOT));
    safeSet("battle.party_position", pIdx);
    safeSet("battle.player.party_position", pIdx);
    safeSet("battle.opponent.party_position", eIdx);
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
        safeSet("battle.opponent_2.id", 0);
        safeSet("battle.player.team_count", 0);
        return;
    }
    try {
        safeSet("battle.other.prize_money", readU16Addr(obj + 0xA6C));
        // +0xA54 goes 0→1 when the last enemy HP hits 0, before the party/money write.
        safeSet("battle.other.battle_end", readU32Addr(obj + 0xA54));
        // +0xA80 is 7 in a live fight and 1 after a win; whiteout settles to 0.
        safeSet("battle.other.outcome", readU8Addr(obj + 0xA80));
        // SM uses +0xB00/+0xB02; USUM is +4: 459/3 then 25/2, 0 in the wild catch.
        safeSet("battle.opponent.id", readU16Addr(obj + 0xB04));
        safeSet("battle.opponent.trainer_class", readU16Addr(obj + 0xB06));
    } catch (e) {}
    try { safeSet("battle.player.team_count", readU32Addr(BATTLE_PLAYER_COUNT)); } catch (e) {}
    try { safeSet("battle.opponent.team_count", readU32Addr(BATTLE_ENEMY_COUNT)); } catch (e) {}
}

function validZone(z) {
    return z > 0 && z < ZONE_NAMES.length;
}

function resolveOverworld() {
    if (battleObject()) {
        return;
    }
    try {
        const zone = readU32Addr(ZONE);
        if (!validZone(zone)) {
            return;
        }
        safeSet("overworld.map_index", zone);
        safeSet("overworld.map_name", ZONE_NAMES[zone]);
    } catch (e) {}
}

function resolveOptionsMenu() {
    try {
        const v = readU8Addr(OPTIONS_MENU);
        if (v === OPTIONS_MENU_OPEN) {
            variables.options_menu_open = 1;
        } else if (v === OPTIONS_MENU_CLOSED) {
            variables.options_menu_open = 0;
        }
        if (variables.options_menu_open === undefined) {
            return;
        }
        memory.fill("options_menu", 0x00, [variables.options_menu_open]);
    } catch (e) {}
}

function validConfigSave(v) {
    if ((v & 3) > 2) {
        return false;
    }
    if (((v >>> 8) & 0x1F) > 14) {
        return false;
    }
    if (((v >>> 13) & 3) > 2) {
        return false;
    }
    return (v >>> 19) === 0 && v !== 0;
}

function resolveOptions() {
    try {
        const save = variables.save_block | 0;
        if (!save) {
            return;
        }
        const v = readU32Addr(save + CONFIG_FROM_TID) >>> 0;
        if (!validConfigSave(v)) {
            return;
        }
        const bits = v & 0xF;
        memory.fill("options_config", 0x00, [
            bits & 3,
            ((bits >> 2) & 1) === 0 ? 1 : 0,
            (bits >> 3) & 1,
        ]);
    } catch (e) {}
}

function preprocessor() {
    if (!variables.player_active) {
        variables.player_active = BATTLE_PLAYER;
    }
    if (!variables.opponent_active) {
        variables.opponent_active = BATTLE_ENEMY;
    }
    try {
        decryptLiveParty();
    } catch (e) {
        fillEmptyParty();
    }
    try {
        resolveSaveBlock();
    } catch (e) {
        if (!variables.save_block) {
            bindSaveDerived(0x33012818);
        }
        variables.reload_addresses = false;
    }
    try {
        resolveOptionsMenu();
        resolveOptions();
    } catch (e) {}
    resolveActiveBattlers();
}

function postprocessor() {
    try {
        setValue("player.team_count", countPartySlots());
    } catch (e) {}
    resolveBattle();
    resolveOverworld();
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor, postprocessor };
