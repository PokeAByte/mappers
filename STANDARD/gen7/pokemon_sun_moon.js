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

// PRNG function used for PK7 decryption (Gen 6/7 CryptArray)
function prngNext(prngSeed) {
    // BigInt: the product needs up to 62 bits, more than a double holds exactly.
    const newSeed = Number((0x41C64E6Dn * BigInt(prngSeed) + 0x6073n) & 0xFFFFFFFFn);
    const value = (newSeed >>> 16) & 0xFFFF;
    return { newSeed, value };
}

// Gen 6/7 block-position table: 32 shuffle patterns × 4 block positions
// From PKHeX PokeCrypto.cs BlockPosition
// sv = (EC >> 13) & 31 selects a row; each row tells which source block goes to each output position
const blockPositions = [
    0,1,2,3,  0,1,3,2,  0,2,1,3,  0,3,1,2,  0,2,3,1,  0,3,2,1,
    1,0,2,3,  1,0,3,2,  2,0,1,3,  3,0,1,2,  2,0,3,1,  3,0,2,1,
    1,2,0,3,  1,3,0,2,  2,1,0,3,  3,1,0,2,  2,3,0,1,  3,2,0,1,
    1,2,3,0,  1,3,2,0,  2,1,3,0,  3,1,2,0,  2,3,1,0,  3,2,1,0,
    // patterns 24–31 duplicate 0–7
    0,1,2,3,  0,1,3,2,  0,2,1,3,  0,3,1,2,  0,2,3,1,  0,3,2,1,
    1,0,2,3,  1,0,3,2,
];

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
    try {
        const species = getValue("battle.opponent_active.species");
        if (species) {
            return "Battle";
        }
    } catch (e) {}
    return "Overworld";
}

function getMetaEnemyState(state, battle_outcomes, enemyBarSyncedHp) {
    return null;
}

function getBattleMode(state, opponentTrainer) {
    return null;
}

function getBattleOutcome() {
    return null;
}

function getEncounterRate() {
    return null;
}

function getPlayerPartyPosition() {
    try {
        return getValue("battle.party_position") || 0;
    } catch (e) {
        return 0;
    }
}

const SAVE_SCAN_START = 0x330C0000;
const SAVE_SCAN_SIZE = 0x30000;
const MONEY_FROM_TID = 0x27F0; // Misc money is +0x27F0 from MyStatus TID
const ITEMS_FROM_TID = -0xE9C; // Items pouch; medicine is +0xB48 from here (PKHeX SM)
const MEDICINE_FROM_TID = ITEMS_FROM_TID + 0xB48;
const MAX_MONEY = 9999999;

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
    // SM: Sun=30, Moon=31. Allow USUM 32/33 in case this image is shared.
    if (game < 30 || game > 33 || gender > 1) {
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

const PARTY_BASE = 0x34195E10;
const SLOT_SIZE = 484;
const BLOCK_SIZE = 56;
const HEADER_SIZE = 8;
const BLOCK_DATA_END = 0xE8;
const STATS_END = 0x104;
const PK7_SIZE = 260;
const READ_SIZE = 0x174;
const STATS_SRC = 0x158;
const STATS_LEN = STATS_END - BLOCK_DATA_END;

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

function bindSaveDerived(found) {
    variables.save_block = found;
    variables.heap_money = found + MONEY_FROM_TID;
    variables.heap_items = found + ITEMS_FROM_TID;
    variables.heap_medicine = found + MEDICINE_FROM_TID;
}

function resolveSaveBlock() {
    const previous = variables.save_block | 0;
    if (!previous) {
        bindSaveDerived(0x330D67D0);
    }

    if (!saveBlockStillValid(variables.save_block)) {
        const found = findSaveBlock();
        if (found) {
            bindSaveDerived(found);
        }
    } else if (!variables.heap_items || !variables.heap_medicine) {
        bindSaveDerived(variables.save_block);
    }

    const current = variables.save_block | 0;
    const money = variables.heap_money | 0;
    const items = variables.heap_items | 0;
    variables.reload_addresses = !previous || previous !== current || !money || !items;
}

const BATTLE_PLAYER = 0x30002774;
const BATTLE_SLOT = 0x330;
const BATTLE_ACTIVE_PTR = 0x30000404;
const BATTLE_OBJ_DELTA = 0xC;

function findPlayerFieldIndex() {
    try {
        const ptr = memory.defaultNamespace.get_bytes(BATTLE_ACTIVE_PTR, 4).get_uint32_le();
        const rel = (ptr - (BATTLE_PLAYER - BATTLE_OBJ_DELTA)) >>> 0;
        if (rel % BATTLE_SLOT === 0) {
            const idx = rel / BATTLE_SLOT;
            if (idx >= 0 && idx <= 5) {
                return idx;
            }
        }
    } catch (e) {}
    return 0;
}

function resolvePlayerActive() {
    const idx = findPlayerFieldIndex();
    const addr = BATTLE_PLAYER + (idx * BATTLE_SLOT);
    try { setValue("battle.party_position", idx); } catch (e) {}
    if (variables.player_active !== addr) {
        variables.player_active = addr;
        variables.reload_addresses = true;
    }
}

function preprocessor() {
    try {
        decryptLiveParty();
    } catch (e) {
        fillEmptyParty();
    }
    try {
        resolveSaveBlock();
    } catch (e) {
        if (!variables.save_block) {
            bindSaveDerived(0x330D67D0);
        }
        variables.reload_addresses = false;
    }
    resolvePlayerActive();
}

function postprocessor() {
    try {
        const species = getValue("battle.opponent_active.species");
        const inBattle = !!species;
        setValue("battle.in_battle", inBattle);
        setValue("meta.state", inBattle ? "Battle" : "Overworld");
        setValue("meta.state_enemy", inBattle ? "Battle" : null);
    } catch (e) {
        try { setValue("battle.in_battle", false); } catch (err) {}
        try { setValue("meta.state", "Overworld"); } catch (err) {}
    }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor, postprocessor };
