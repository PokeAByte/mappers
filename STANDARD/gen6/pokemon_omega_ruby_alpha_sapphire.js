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
    const newSeed = (0x41C64E6D * prngSeed + 0x6073) >>> 0;
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
    return 'Overworld';
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
    return 0;
}

// Preprocessor runs every loop (every time PokeAByte updates)
function preprocessor() {
    variables.reload_addresses = true;

    const partyStructures = [
        "player",
        "party_pokemon_live",
    ];

    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];

        // Confirmed party base addresses for USUM (verified via PKHeX LiveHeX)
        const offsets = {
            player: 0x8CFB26C - 16,
            // party_pokemon_live: 0x33F7FA44,
        };

        const SLOT_SIZE      = 484;    // live party slot stride
        const BLOCK_SIZE     = 56;     // Gen 6/7 block size = 0x38
        const HEADER_SIZE    = 8;      // Unencrypted header (EC + sanity + checksum)
        const BLOCK_DATA_END = 0xE8;   // 4 blocks × 56 bytes + 8-byte header
        const STATS_END      = 0x104;  // End of party stats section

        const PK7_SIZE  = 260;   // always decrypt into a 260-byte container
        const READ_SIZE = 0x174; // must reach live party stats block at 0x158
        const STATS_SRC = 0x158; // live party stats offset within slot

        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            const decryptedData = new Array(PK7_SIZE).fill(0x00);
            const startingAddress = offsets[user] + (SLOT_SIZE * slotIndex);
            try {
                // Read enough bytes: 0x174 for live (stats at 0x158), 260 for save
                const encryptedData = memory.defaultNamespace.get_bytes(startingAddress, READ_SIZE);

                // Bytes 0–3: Encryption Constant (EC) — used as PRNG seed for all decryption
                const ec = encryptedData.get_uint32_le();

                // Copy unencrypted header (bytes 0–7: EC, sanity, checksum) verbatim
                for (let j = 0; j < HEADER_SIZE; j++) {
                    decryptedData[j] = encryptedData.get_byte(j);
                }

                // ── Step 1: Decrypt block data (bytes 0x08–0xE7) using EC as PRNG seed ──
                // Mirrors PKHeX CryptArray(data[8..232], ec)
                let prngSeed = ec;
                for (let j = HEADER_SIZE; j < BLOCK_DATA_END; j += 2) {
                    const prngResult = prngNext(prngSeed);
                    const key = prngResult.value;
                    // Use BigInt to keep full 32-bit precision for the next seed
                    prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);
                    const word = encryptedData.get_uint16_le(j) ^ key;
                    decryptedData[j]     = word & 0xFF;
                    decryptedData[j + 1] = (word >> 8) & 0xFF;
                }

                // ── Step 2: Unshuffle the four 56-byte blocks ──
                // sv = (EC >> 13) & 31 selects the shuffle pattern
                // Mirrors PKHeX ShuffleArray(ekm, sv, 56)
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

                // ── Step 3: Decrypt party stats with a fresh EC seed ──
                // Save format: stats at 0xE8–0x103 in the read buffer, output at 0xE8
                // Live format: stats at 0x158–0x173 in the read buffer, output at 0xE8
                prngSeed = ec;
                const STATS_LEN = STATS_END - BLOCK_DATA_END; // 28 bytes
                for (let k = 0; k < STATS_LEN; k += 2) {
                    const prngResult = prngNext(prngSeed);
                    const key = prngResult.value;
                    prngSeed = Number((0x41c64e6dn * BigInt(prngSeed) + 0x6073n) & 0xffffffffn);
                    const word = encryptedData.get_uint16_le(STATS_SRC + k) ^ key;
                    decryptedData[BLOCK_DATA_END + k]     = word & 0xFF;
                    decryptedData[BLOCK_DATA_END + k + 1] = (word >> 8) & 0xFF;
                }
            } catch (e) {
                // Slot unreadable or empty — container filled with zeros above
            }

            // Always write the container (zeros for empty/failed slots)
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData);
        }
    }
}

export { getBattleMode, getBattleOutcome, getEncounterRate, getGamestate, getMetaEnemyState, preprocessor };
