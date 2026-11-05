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

const PARTY_BASE = 0x08CF727C;
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
const ZONE_LOC = 0x08CF7DD4;
const OPTIONS_MENU = 0x080440C4;
const OPTIONS_MENU_CLOSED = 0x09;
const OPTIONS_MENU_OPEN = 0x0A;
const CONFIG_SAVE = 0x08C7F914;

// Location name per zd entry (ORAS map-matrix / zonedata table).
const ZONE_NAMES = [
    "Littleroot Town", "Littleroot Town", "Littleroot Town", "Littleroot Town", "Littleroot Town", "Littleroot Town", "Littleroot Town", "Oldale Town",
    "Dewford Town", "Lavaridge Town", "Fallarbor Town", "Verdanturf Town", "Pacifidlog Town", "Petalburg City", "Slateport City", "Mauville City",
    "Rustboro City", "Fortree City", "Lilycove City", "Mossdeep City", "Sootopolis City", "Ever Grande City", "Pokémon League", "Route 101",
    "Route 102", "Route 103", "Route 104", "Route 104", "Route 105", "Route 106", "Route 107", "Route 108",
    "Route 109", "Route 110", "Route 110", "Route 111", "Route 111", "Route 111", "Route 112", "Route 112",
    "Route 113", "Route 114", "Route 115", "Route 116", "Route 117", "Route 118", "Route 119", "Route 119",
    "Route 120", "Route 120", "Route 121", "Route 122", "Route 123", "Route 124", "Route 125", "Route 126",
    "Route 127", "Route 128", "Route 129", "Route 130", "Route 131", "Route 132", "Route 133", "Route 134",
    "Route 107", "Route 124", "Route 126", "Route 127", "Route 128", "Route 129", "Route 130", "Meteor Falls",
    "Meteor Falls", "Meteor Falls", "Meteor Falls", "Rusturf Tunnel", "Sootopolis City", "Desert Ruins", "Granite Cave", "Granite Cave",
    "Granite Cave", "Granite Cave", "Petalburg Woods", "Mt. Chimney", "Jagged Pass", "Fiery Path", "Mt. Pyre", "Mt. Pyre",
    "Mt. Pyre", "Mt. Pyre", "Mt. Pyre", "Mt. Pyre", "Team Aqua Hideout", "Team Aqua Hideout", "Team Aqua Hideout", "Team Aqua Hideout",
    "Team Aqua Hideout", "Team Aqua Hideout", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern",
    "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern", "Seafloor Cavern",
    "Cave of Origin", "Cave of Origin", "Cave of Origin", "Cave of Origin", "Cave of Origin", "Cave of Origin", "Cave of Origin", "Cave of Origin",
    "Cave of Origin", "Cave of Origin", "Cave of Origin", "Victory Road", "Victory Road", "Victory Road", "Victory Road", "Victory Road",
    "Shoal Cave", "Shoal Cave", "Shoal Cave", "Shoal Cave", "Shoal Cave", "Shoal Cave", "Shoal Cave", "Shoal Cave",
    "Shoal Cave", "Shoal Cave", "Shoal Cave", "New Mauville", "New Mauville", "New Mauville", "New Mauville", "New Mauville",
    "New Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville",
    "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Sea Mauville", "Island Cave", "Ancient Tomb",
    "Route 134", "Route 134", "Sealed Chamber", "Sealed Chamber", "Scorched Slab", "Scorched Slab", "Scorched Slab", "Scorched Slab",
    "Scorched Slab", "Team Magma Hideout", "Team Magma Hideout", "Team Magma Hideout", "Team Magma Hideout", "Team Magma Hideout", "Team Magma Hideout", "Sky Pillar",
    "Sky Pillar", "Sky Pillar", "Sky Pillar", "Sky Pillar", "Sky Pillar", "Sky Pillar", "Secret Islet", "Secret Shore",
    "Mirage Forest", "Mirage Forest", "Mirage Forest", "Mirage Forest", "Mirage Forest", "Mirage Forest", "Mirage Forest", "Mirage Forest",
    "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave",
    "Mirage Island", "Mirage Island", "Mirage Island", "Mirage Island", "Mirage Island", "Mirage Island", "Mirage Island", "Mirage Island",
    "Mirage Mountain", "Battle Resort", "Battle Resort", "Battle Resort", "Battle Resort", "Battle Resort", "Southern Island", "Southern Island",
    "S.S. Tidal", "S.S. Tidal", "S.S. Tidal", "Safari Zone", "Safari Zone", "Safari Zone", "Safari Zone", "Littleroot Town",
    "Littleroot Town", "Littleroot Town", "Littleroot Town", "Littleroot Town", "Oldale Town", "Oldale Town", "Oldale Town", "Oldale Town",
    "Dewford Town", "Dewford Town", "Dewford Town", "Dewford Town", "Lavaridge Town", "Lavaridge Town", "Lavaridge Town", "Lavaridge Town",
    "Fallarbor Town", "Fallarbor Town", "Fallarbor Town", "Fallarbor Town", "Fallarbor Town", "Fallarbor Town", "Verdanturf Town", "Verdanturf Town",
    "Verdanturf Town", "Verdanturf Town", "Verdanturf Town", "Verdanturf Town", "Verdanturf Town", "Pacifidlog Town", "Pacifidlog Town", "Pacifidlog Town",
    "Pacifidlog Town", "Pacifidlog Town", "Pacifidlog Town", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City",
    "Petalburg City", "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Slateport City",
    "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Slateport City", "Mauville City", "Mauville City",
    "Mauville City", "Mauville City", "Mauville City", "Mauville City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City",
    "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City",
    "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Rustboro City", "Fortree City", "Fortree City", "Fortree City",
    "Fortree City", "Fortree City", "Fortree City", "Fortree City", "Fortree City", "Lilycove City", "Lilycove City", "Lilycove City",
    "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City",
    "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City", "Lilycove City",
    "Lilycove City", "Lilycove City", "Mossdeep City", "Mossdeep City", "Mossdeep City", "Mossdeep City", "Mossdeep City", "Mossdeep City",
    "Mossdeep City", "Mossdeep City", "Mossdeep City", "Mossdeep City", "Mossdeep City", "Sootopolis City", "Sootopolis City", "Sootopolis City",
    "Sootopolis City", "Sootopolis City", "Sootopolis City", "Sootopolis City", "Sootopolis City", "Sootopolis City", "Sootopolis City", "Sootopolis City",
    "Sootopolis City", "Ever Grande City", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League",
    "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Pokémon League", "Route 104", "Route 104",
    "Route 109", "Route 110", "Route 110", "Route 110", "Route 110", "Route 110", "Route 110", "Route 110",
    "Route 110", "Route 110", "Route 110", "Route 110", "Route 110", "Route 110", "Route 111", "Route 111",
    "Route 112", "Route 112", "Route 113", "Route 114", "Route 114", "Route 114", "Route 116", "Route 117",
    "Route 119", "Route 119", "Route 119", "Route 121", "Route 123", "Route 124", "Safari Zone", "Unknown",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Dewford Town", "Lavaridge Town", "Lavaridge Town", "Petalburg City",
    "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City", "Petalburg City",
    "Mauville City", "Rustboro City", "Fortree City", "Mossdeep City", "Sootopolis City", "Mauville City", "Mauville City", "Mauville City",
    "Mauville City", "Mauville City", "Mauville City", "Mauville City", "Cave of Origin", "Mossdeep City", "Sootopolis City", "Sootopolis City",
    "Fallarbor Town", "Verdanturf Town", "Slateport City", "Lilycove City", "Mirage Mountain", "Mirage Mountain", "Mirage Mountain", "Mirage Mountain",
    "Mirage Mountain", "Mirage Mountain", "Mirage Mountain", "Crescent Isle", "Trackless Forest", "Pathless Plain", "Nameless Cavern", "Fabled Cave",
    "Gnarled Den", "Unknown", "Unknown", "Secret Meadow", "Route 123", "Route 123", "S.S. Tidal", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base",
    "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Secret Base", "Mauville City",
    "Mauville City", "Mauville City", "Mauville City", "Mauville City", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave",
    "Mirage Cave", "Mirage Cave", "Mirage Cave", "Mirage Cave", "Battle Resort", "Battle Resort", "Battle Resort", "Battle Resort",
    "Battle Resort", "Battle Resort", "Battle Resort", "Battle Resort", "Battle Resort", "Lilycove City", "Nameless Cavern", "Fabled Cave",
    "Gnarled Den", "Route 123", "Route 123", "Route 123", "Granite Cave", "Mt. Pyre", "Sootopolis City", "Soaring in the sky",
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
        const zone = readU16Addr(ZONE_LOC);
        if (!validZone(zone)) {
            return;
        }
        safeSet("overworld.map_index", zone);
        safeSet("overworld.map_name", ZONE_NAMES[zone] || ("Zone " + zone));
    } catch (e) {}
}

function resolveOptionsMenu() {
    try {
        const v = readU32Addr(OPTIONS_MENU) >>> 0;
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
        const v = readU32Addr(CONFIG_SAVE) >>> 0;
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
        variables.player_active = 0x081FB000 + BATTLE_DELTA;
    }
    if (!variables.opponent_active) {
        variables.opponent_active = 0x081FB000 + BATTLE_DELTA + BATTLE_SLOT;
    }
    variables.reload_addresses = true;
    try {
        resolveOptionsMenu();
        resolveOptions();
    } catch (e) {}
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
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor, postprocessor };
