const weights = require("./weights.json");

module.exports = {
    leveling_xp: {
        0: 0,
        1: 50,
        2: 175,
        3: 375,
        4: 675,
        5: 1175,
        6: 1925,
        7: 2925,
        8: 4425,
        9: 6425,
        10: 9925,
        11: 14925,
        12: 22425,
        13: 32425,
        14: 47425,
        15: 67425,
        16: 97425,
        17: 147425,
        18: 222425,
        19: 322425,
        20: 522425,
        21: 822425,
        22: 1222425,
        23: 1722425,
        24: 2322425,
        25: 3022425,
        26: 3822425,
        27: 4722425,
        28: 5722425,
        29: 6822425,
        30: 8022425,
        31: 9322425,
        32: 10722425,
        33: 12222425,
        34: 13822425,
        35: 15522425,
        36: 17322425,
        37: 19222425,
        38: 21222425,
        39: 23322425,
        40: 25522425,
        41: 27822425,
        42: 30222425,
        43: 32722425,
        44: 35322425,
        45: 38072425,
        46: 40972425,
        47: 44072425,
        48: 47472425,
        49: 51172425,
        50: 55172425,
        100: Number.MAX_VALUE
    },
    Success: Object.freeze(1),
    Unable: Object.freeze(0),
    Failed: Object.freeze(-1),
    replaceEmbed: function(embed, name, value) {
        for (var field of embed._fields) {
            if (field.name == name) {
                field.value = value;
            }
        }
    },
    checkWealthAndTalis: async function(items, exploit, api) {
        let totalWorth = 0;
        let totalTalisman = 0;
        let duplicates = [];
        for (const inv of items) {
            for (const item of this.itr(api.parseInventory(inv), api)) {
                if (weights[item.ExtraAttributes.id] !== undefined) totalWorth += weights[item.ExtraAttributes.id];
                if (item.ExtraAttributes.id == "MIDAS_SWORD") totalWorth += item.ExtraAttributes.winning_bid / 1000000;
                if (item.ExtraAttributes.id == "SCORPION_FOIL") totalWorth += 5 + item.ExtraAttributes.wood_singularity_count * 2;
                if (item.ExtraAttributes.id == "TACTICIAN_SWORD") totalWorth += item.ExtraAttributes.wood_singularity_count * 2;
                if ((!duplicates.includes(item.ExtraAttributes.id)) || exploit) {
                    totalTalisman += this.getTalismanValue(item);
                    duplicates.push(item.ExtraAttributes.id);
                }
                if (totalWorth >= 20 && totalTalisman >= 200) break;
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
    itr: function*(inv, api) {
        const backpackid = ["GREATER_BACKPACK", "LARGE_BACKPACK", "MEDIUM_BACKPACK", "SMALL_BACKPACK"];
        for (const item of inv) {
            if (item.tag === undefined || item.tag.ExtraAttributes === undefined) continue;
            const id = item.tag.ExtraAttributes.id;
            // Or do you like:if(backpacks.includes(id)) for (let j of itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase()+"_data"]))) yield j;
            if (backpackid.includes(id)) {
                const back = this.itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase() + "_data"]));
                for (let j of back) {
                    yield j;
                }
            } else yield item.tag;
        }
    },
    getIn: function(json, fromJson, defaultVal) {
        for (var from of fromJson) {
            if (this.isIn(json, [from])) {
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
            if (this.isIn(json, [from])) {
                json = json[from];
            } else {
                return false;
            }
        }
        return true;
    },
    check: function(pfChecks) {
        let res = this.Success;
        for (let key in Object.keys(pfChecks)) {
            val = pfChecks[key];
            if (val == 0 && res != this.Failed) {
                res = this.Unable;
            } else if (val == -1) {
                return this.Failed;
            }
        }
        return res;
    },
    color: function(success) {
        switch (success) {
            case this.Success:
                return "green";
            case this.Unable:
                return "yellow";
            case this.Failed:
                return "red";
        }
    },
    colorC: function(col) {
        return `:${this.color(col)}_circle:`;
    },
    colorFromProf: function(prof) {
        num = prof.minions + prof.skills + prof.slayer + prof.wealth + prof.talismans;
        if (prof.minions == 0 || prof.skills == 0 || prof.slayer == 0 || prof.wealth == 0 || prof.talismans == 0) {
            return "yellow";
        } else if (prof.minions == -1 || prof.skills == -1 || prof.slayer == -1 || prof.wealth == -1 || prof.talismans == -1) {
            return "red";
        } else {
            return "green";
        }
    },
    isSame: function(oldE, newE) {
        if (oldE._fields.length == newE._fields.length) {
            for (var i in oldE._fields) {
                var oF = oldE._fields[i];
                var nF = newE._fields[i];
                if (oF.name != nF.name || oF.value != nF.value || oF.inline != nF.inline) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },
    fromExp: function(exp) {
        var i = 0;
        for (var xp of Object.values(this.leveling_xp)) {
            if (exp < xp) {
                return i;
            }
            i++;
        }
        return 0;
    },
    todo: function(pfChecks, prevAtt) {
        var res = [];
        for (var attId in pfChecks) {
            for (var key in pfChecks[attId]) {
                val = pfChecks[attId][key];
                if (val == -1) {
                    if (key == "slayer")
                        current = `${prevAtt[attId][key].xp} | ${prevAtt[attId][key].z}/${prevAtt[attId][key].s}/${prevAtt[attId][key].w}`;
                    else
                        current = prevAtt[attId][key];
                    res.push(key.substring(0, 1).toUpperCase() + key.substring(1) + ` (Current: ${current})`);
                }
            }
        }
        return (res == [] ? "Something..." : res.join(', '));
    }
};