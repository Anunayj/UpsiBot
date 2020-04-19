const weights = require("./weights.json");

module.exports = {
    Success: Objects.freeze(1),
    Unable: Objects.freeze(0),
    Failed: Objects.freeze(-1),
    checkWealthAndTalis: async function(items, exploit) {
        let totalWorth = 0;
        let totalTalisman = 0;
        let duplicates = [];
        for (const inv of items) {
            for (const item of itr(api.parseInventory(inv))) {
                if (weights[item.ExtraAttributes.id] !== undefined) totalWorth += weights[item.ExtraAttributes.id];
                if (item.ExtraAttributes.id == "MIDAS_SWORD") totalWorth += item.ExtraAttributes.winning_bid / 1000000;
                if (item.ExtraAttributes.id == "SCORPION_FOIL") totalWorth += 5 + item.ExtraAttributes.wood_singularity_count * 2;
                if (item.ExtraAttributes.id == "TACTICIAN_SWORD") totalWorth += item.ExtraAttributes.wood_singularity_count * 2;
                if ((!duplicates.includes(item.ExtraAttributes.id)) || exploit) {
                    totalTalisman += getTalismanValue(item);
                    duplicates.push(item.ExtraAttributes.id);
                }
            }
        }
        return Array.of(totalWorth, totalTalisman);
    },
    getTalismanValue: function(item) {
        try {
            const regex = item.display.Lore[item.display.Lore.length - 1].match(/§.§.(.*) ACCESSORY/);
            if (regex === null) return 0;
            else if (regex[1] === "COMMON") return 3;
            else if (regex[1] === "UNCOMMON") return 5;
            else if (regex[1] === "RARE") return 8;
            else if (regex[1] === "EPIC") return 12;
            else if (regex[1] === "LEGENDARY") return 15;
        } catch (e) {}
        return 0;
    },
    itr: function*(inv) {
        const backpackid = ["GREATER_BACKPACK", "LARGE_BACKPACK", "MEDIUM_BACKPACK", "SMALL_BACKPACK"];
        for (const item of inv) {
            if (item.tag === undefined || item.tag.ExtraAttributes === undefined) continue;
            const id = item.tag.ExtraAttributes.id;
            // Or do you like:if(backpacks.includes(id)) for (let j of itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase()+"_data"]))) yield j;
            if (backpackid.includes(id)) {
                const back = itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase() + "_data"]));
                for (let j of back) {
                    yield j;
                }
            } else yield item.tag;
        }
    },
    getIn: function(json, fromJson, defaultVal) {
        for (var from of fromJson) {
            if (isIn(json, [from])) {
                json = json[from];
            } else {
                return defaultVal;
            }
        }
        return json;
    },
    isIn: function(json, fromJson) {
        for (var from of fromJson) {
            if (!(from in json)) {
                return false;
            }
        }
        return true;
    },
    isInNext: function(json, fromJson) {
        for (var from of fromJson) {
            if (isIn(json, [from])) {
                json = json[from];
            } else {
                return false;
            }
        }
        return true;
    },
    check: function(pfChecks) {
        let res = Success;
        for (let val of pfChecks) {
            if (val == 0 && res != Failed) {
                res = Unable;
            } else if (val == -1) {
                return Failed;
            }
        }
    }
}