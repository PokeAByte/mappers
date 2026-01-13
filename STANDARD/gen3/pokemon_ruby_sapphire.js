import { pokemon } from "game_functions";
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
const copyProperties = mapper.copy_properties;

function getProperty(path) {
    // @ts-ignore
    const property = mapper.properties[path];
    if (!property) {
        throw new Error(`${path} is not defined in properties.`);
    }
    return property;
}
function setProperty(path, values) {
    const property = getProperty(path);
    if (values.memoryContainer !== undefined)
        property.memoryContainer = values.memoryContainer;
    if (values.address !== undefined)
        property.address = values.address;
    if (values.length !== undefined)
        property.length = values.length;
    if (values.size !== undefined)
        property.size = values.size;
    if (values.bits !== undefined)
        property.bits = values.bits;
    if (values.reference !== undefined)
        property.reference = values.reference;
    if (values.bytes !== undefined)
        property.bytes = values.bytes;
    if (values.value !== undefined)
        property.value = values.value;
}

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
    // 3. "To Battle": Battle has started but player hasn't sent their Pokemon in yet
    // 4. "From Battle": Battle result has been decided but the battle has not transition to the overworld yet
    // 5. "Battle": In battle
    const team_0_level    = getValue('player.team.0.level');
    const callback_1      = getValue('pointers.callback_1');
    const callback_2      = getValue('pointers.callback_2');
    const battle_outcomes = getValue('battle.other.battle_outcomes');
    // const battle_dialogue: string = getValue('battle.other.battle_dialogue')
    // const state: string = getValue('meta.state') ?? "No Pokemon"
    if (team_0_level == 0)
        return "No Pokemon";
    else if (callback_1 == null)
        return "No Pokemon";
    else if (callback_2 == "Battle Animation") //TODO: this state flashes back to overworld for a few frames
        return "To Battle";
    else if (callback_1 == "Overworld")
        return "Overworld";
    else if (callback_1 == "Battle") {
        if (battle_outcomes != null) {
            return "From Battle";
        }
        return "Battle";
    }
    return "Error";
}
function getBattleOutcome() {
    const outcome_flags = getValue('battle.other.battle_outcomes');
    const gamestate = getGamestate();
    switch (gamestate) {
        case 'From Battle':
            switch (outcome_flags) {
                case "WON":
                    return 'Win';
                case "LOST":
                    return 'Lose';
                case "DRAW":
                    return 'Flee';
                case "RAN":
                    return 'Flee';
                case "PLAYER_TELEPORTED":
                    return 'Flee';
                case "POKEMON_FLED":
                    return 'Flee';
                case "CAUGHT":
                    return 'Caught';
                case "NO_SAFARI_BALLS":
                    return 'Flee';
                case "FORFEITED":
                    return 'Flee';
                case "POKEMON_TELEPORTED":
                    return 'Flee';
                default:
                    return null;
            }
    }
    return null;
}
function getPlayerPartyPosition() {
    const gamestate = getGamestate();
    switch (gamestate) {
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
function preprocessor() {
    variables.reload_addresses = true;
    const gamestate = getGamestate();
    variables.callback1 = memory.defaultNamespace.get_uint32_le(0x03001770);
    variables.callback2 = memory.defaultNamespace.get_uint32_le(0x03001774);
    setValue('meta.state', getGamestate());
    setValue('battle.outcome', getBattleOutcome());
    //Set player.active_pokemon properties
    const party_position_overworld = getPlayerPartyPosition();
    const party_position_battle = getValue('battle.player.party_position');
    setValue('player.party_position', getPlayerPartyPosition());
    if (gamestate === 'Battle') {
        copyProperties(`player.team.${party_position_battle}`, 'player.active_pokemon');
        copyProperties('battle.player.active_pokemon', 'player.active_pokemon');
    }
    else {
        setProperty('player.active_pokemon.modifiers.attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.speed', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_attack', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.special_defense', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.accuracy', { address: null, value: 0 });
        setProperty('player.active_pokemon.modifiers.evasion', { address: null, value: 0 });
        copyProperties(`player.team.${party_position_overworld}`, 'player.active_pokemon');
    }
    //DECRYPTION OF THE PARTY POKEMON
    //This process applies to all the the Player's Pokemon as well as to Pokemon loaded NPCs parties
    //All Pokemon have a data structure of 100-bytes
    //Only 48-bytes of data are encrypted and shuffled in generation 3
    const partyStructures = ["player", "opponent"];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            //Determine the starting address for the party we are decrypting
            let startingAddress = 0;
            if (user == "player") {
                startingAddress = 0x3004360 + (100 * slotIndex);
            }
            if (user == "opponent") {
                startingAddress = 0x30045C0 + (100 * slotIndex);
            }
            let pokemonData = memory.defaultNamespace.get_bytes(startingAddress, 100);
            let decryptedData = pokemon.Decrypt(3, pokemonData.data);    
            //Fills the memory contains for the mapper's class to interpret
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData);
        }
    }
}

export { getBattleOutcome, getGamestate, preprocessor };
