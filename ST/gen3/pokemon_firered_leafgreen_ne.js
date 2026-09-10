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

// This block is rewritten by tools/mapper_export/export_mapper_addresses.py
// (in the stp-pokefirered repo) every time the ROM is rebuilt. Entries
// accumulate so old patch versions remain replayable. Bump
// STP_PATCH_VERSION in include/stp_version.h before releasing a patch whose
// RAM layout has shifted.
// === BEGIN PATCH_VERSIONS (auto-generated; do not edit) ===
const PATCH_VERSIONS = {
  "patch_magic": "0x46505453",
  "anchor_addr": "0x0203FFF8",
  "by_version": {
    "10601": {
      "anchored": false,
      "lookups": {
        "stp_vars": "0x0203F468",
        "stp_callback1": "0x0203F478",
        "stp_callback2": "0x0203F47C",
        "stp_tracking": "0x0203F480",
        "stp_textbox_open": "0x0203F484"
      },
      "fingerprint": [
        {
          "addr": "0x03003540",
          "value": "0x08000835"
        },
        {
          "addr": "0x03003544",
          "value": "0x0800086D"
        },
        {
          "addr": "0x03003548",
          "value": "0x0800B7CD"
        },
        {
          "addr": "0x0300354C",
          "value": "0x08000805"
        }
      ],
      "legacy_checks": [
        {
          "addr": "0x0203F47C",
          "min": 1,
          "max": 190,
          "_comment": "sStpCallback2: written every frame"
        },
        {
          "addr": "0x0203F478",
          "min": 0,
          "max": 6,
          "_comment": "sStpCallback1"
        },
        {
          "addr": "0x0203F484",
          "min": 0,
          "max": 1,
          "_comment": "sStpTextBoxOpen"
        }
      ]
    },
    "10602": {
      "anchored": true,
      "lookups": {
        "stp_vars": "0x0203F468",
        "stp_callback1": "0x0203F478",
        "stp_callback2": "0x0203F47C",
        "stp_tracking": "0x0203F480",
        "stp_textbox_open": "0x0203F484"
      }
    }
  }
};
const PATCH_MAGIC = 0x46505453;
const ANCHOR_ADDR = 0x0203FFF8;
// === END PATCH_VERSIONS ===

// Variables the XML references as {stp_*}. When a lookup is missing from
// the identified entry (older builds lack some symbols) the variable points
// at the start of EWRAM instead: the property reads junk, but stays inside
// the readable range so it doesn't poison the connection.
const STP_LOOKUP_NAMES = [
    "stp_vars",
    "stp_callback1",
    "stp_callback2",
    "stp_tracking",
    "stp_textbox_open",
];
const MISSING_LOOKUP_SENTINEL = 0x02000000;

let _identify_logged = false;

function readU32(addr) {
    return memory.defaultNamespace.get_uint32_le(addr);
}

// A legacy (pre-anchor) entry matches when its boot-stable gIntrTable
// fingerprint holds AND its hand-crafted legacy_checks pass. Checks are
// range tests on cells the build writes every frame (sStpCallback2 etc.);
// a NEWER build's check cells sit past an older build's data end and are
// permanently zero there, so testing newest-first is unambiguous.
function checkLegacyEntry(entry) {
    const fp = entry.fingerprint || [];
    for (const f of fp) {
        if (readU32(parseInt(f.addr, 16)) !== parseInt(f.value, 16))
            return false;
    }
    const checks = entry.legacy_checks || [];
    for (const c of checks) {
        const v = readU32(parseInt(c.addr, 16));
        if (v < c.min || v > c.max)
            return false;
    }
    return fp.length > 0 || checks.length > 0;
}

function identifyPatch() {
    const versions = (PATCH_VERSIONS && PATCH_VERSIONS.by_version) || {};
    // Anchored builds write { PATCH_MAGIC, version } at ANCHOR_ADDR (pinned
    // at the top of EWRAM by the linker scripts; never shifts).
    const magic = readU32(ANCHOR_ADDR);
    if (magic === PATCH_MAGIC) {
        const v = readU32(ANCHOR_ADDR + 4);
        const entry = versions[String(v)];
        if (entry && entry.anchored) {
            if (!_identify_logged) {
                console.log("firered_ne mapper: identified patch " + v + " (anchor)");
                _identify_logged = true;
            }
            return { version: v, entry: entry };
        }
        if (!_identify_logged) {
            console.log(
                "firered_ne mapper: ROM reports patch version " + v +
                " but PATCH_VERSIONS has no anchored entry for it. Rebuild " +
                "the ROM (the exporter runs automatically after `make`) or " +
                "copy the updated mapper files."
            );
            _identify_logged = true;
        }
        return null;
    }
    // Legacy builds, newest first.
    const legacyVersions = Object.keys(versions)
        .filter(function (k) { return !versions[k].anchored; })
        .map(Number)
        .sort(function (a, b) { return b - a; });
    for (const v of legacyVersions) {
        const entry = versions[String(v)];
        if (checkLegacyEntry(entry)) {
            if (!_identify_logged) {
                console.log("firered_ne mapper: identified patch " + v + " (legacy)");
                _identify_logged = true;
            }
            return { version: v, entry: entry };
        }
    }
    return null;
}

function revalidateCachedPatch() {
    const cached = variables.detected_patch_entry;
    if (cached == null)
        return;
    let stillValid;
    if (cached.anchored) {
        stillValid = readU32(ANCHOR_ADDR) === PATCH_MAGIC
            && readU32(ANCHOR_ADDR + 4) === variables.detected_patch_version;
    } else {
        // The fingerprint is boot-stable (gIntrTable is filled once by
        // InitIntrHandlers); legacy_checks are gameplay-dependent so they
        // are only used for the initial identification.
        const fp = cached.fingerprint || [];
        stillValid = fp.every(function (f) {
            return readU32(parseInt(f.addr, 16)) === parseInt(f.value, 16);
        });
    }
    if (!stillValid) {
        variables.detected_patch_entry = null;
        variables.detected_patch_version = null;
    }
}

export function preprocessor() {
    variables.reload_addresses = false;

    // Identify the running patch once; drop the cache if the anchor or
    // fingerprint stops matching (ROM swap / cart reset mid-session).
    revalidateCachedPatch();
    if (variables.detected_patch_entry == null) {
        const found = identifyPatch();
        if (found) {
            variables.detected_patch_entry = found.entry;
            variables.detected_patch_version = found.version;
            variables.reload_addresses = true;
        }
    }
    const entry = variables.detected_patch_entry;
    const lookups = entry != null ? entry.lookups : {};
    for (const name of STP_LOOKUP_NAMES) {
        variables[name] = lookups[name]
            ? parseInt(lookups[name], 16)
            : MISSING_LOOKUP_SENTINEL;
    }

    // A pointer stored in IWRAM tells us where the (DMA-shuffled) save data
    // is located in EWRAM, so we grab the pointers every loop.
    const base_ptr = memory.defaultNamespace.get_uint32_le(0x3005008);
    if (base_ptr == 0) {
        return;
    }
    variables.dma_a = memory.defaultNamespace.get_uint32_le(0x3005008);
    variables.dma_b = memory.defaultNamespace.get_uint32_le(0x300500C);
    variables.dma_c = memory.defaultNamespace.get_uint32_le(0x3005010);
    variables.quantity_decryption_key = memory.defaultNamespace.get_uint16_le(variables.dma_b + 172);
    variables.player_id = memory.defaultNamespace.get_uint16_le(variables.dma_b + 10);
    variables.first_item_type = memory.defaultNamespace.get_uint16_le(variables.dma_a + 1376);
    variables.second_item_type = memory.defaultNamespace.get_uint16_le(variables.dma_a + 1380);
}

export { };
