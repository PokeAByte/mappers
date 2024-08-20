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
function readPlayerDataFunction(obj) {
    //Due to how the player data works for emerald, a pointer is stored in 0x03005D90 (IWRAM) which tells us
    //where the player data is located in EWRAM. I could be wrong, however, I believe the data in the EWRAM is
    //swapped out during transitions and then reinserted at different locations which is why we need to first
    //grab the pointer
    const addr = obj.pointerAddress;
    const offset = obj.pointerAddressOffset;
    if(addr != null) {
        const memoryAddress = memory.defaultNamespace.get_uint32_le(addr)
        if(memoryAddress === 0x00)
            return;
        obj.address = memoryAddress+offset;
    }
}

export function preprocessor() {
    variables.reload_addresses = false;
    const base_ptr = memory.defaultNamespace.get_uint32_le(0x3005D8C); 
    if (base_ptr == 0) {
        return;
    }
    variables.dma_a = memory.defaultNamespace.get_uint32_le(0x3005D8C);
    variables.dma_b = memory.defaultNamespace.get_uint32_le(0x3005D90);
    variables.dma_c = memory.defaultNamespace.get_uint32_le(0x3005D94);
    // if (variables.dma_a == 0 || variables.dma_b == 0 || variables.dma_c == 0) {
    //     variables.dma_a = 
    //     variables.dma_b = 
    //     variables.dma_c = 
    // }
    variables.quantity_decryption_key = memory.defaultNamespace.get_uint16_le(variables.dma_b + 172);
    variables.player_id = memory.defaultNamespace.get_uint16_le(variables.dma_b + 10);
    variables.first_item_type = memory.defaultNamespace.get_uint16_le(variables.dma_a + 1376);
    variables.second_item_type = memory.defaultNamespace.get_uint16_le(variables.dma_a + 1380);
}

export { };