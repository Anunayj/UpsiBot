const weights = require("./weights.json");
const vals = require("./config.json");

module.exports = {
    gameList:{
            "QUAKECRAFT": "Quake",
            "WALLS": "Walls",
            "PAINTBALL": "Paintball",
            "SURVIVAL_GAMES": "Blitz Survival Games",
            "TNTGAMES": "TNT Games",
            "VAMPIREZ": "VampireZ",
            "WALLS3": "Mega Walls",
            "ARCADE": "Arcade",
            "ARENA": "Arena",
            "UHC": "UHC Champions",
            "MCGO": "Cops and Crims",
            "BATTLEGROUND": "Warlords",
            "SUPER_SMASH": "Smash Heroes",
            "GINGERBREAD": "Turbo Kart Racers",
            "HOUSING": "Housing",
            "SKYWARS": "SkyWars",
            "TRUE_COMBAT": "Crazy Walls",
            "SPEED_UHC": "Speed UHC",
            "SKYCLASH": "SkyClash",
            "LEGACY": "Classic Games",
            "PROTOTYPE": "Prototype",
            "BEDWARS": "Bed Wars",
            "MURDER_MYSTERY": "Murder Mystery",
            "BUILD_BATTLE": "Build Battle",
            "DUELS": "Duels",
            "SKYBLOCK": "SkyBlock",
            "PIT": "Pit"
        
    },
    deepCopy: function(inObject){
        let outObject, value, key
      
        if (typeof inObject !== "object" || inObject === null) {
          return inObject // Return the value if inObject is not an object
        }
      
        // Create an array or object to hold the values
        outObject = Array.isArray(inObject) ? [] : {}
      
        for (key in inObject) {
          value = inObject[key]
      
          // Recursively (deep) copy for nested objects, including arrays
          outObject[key] = this.deepCopy(value)
        }
      
        return outObject
      },
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
    replaceEmbed: function(embed, name, value) {
        for (let field of embed._fields) {
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
                if (item.ExtraAttributes.id == "SCORPION_FOIL") totalWorth += 5 + (item.ExtraAttributes.wood_singularity_count ? 2 : 0);
                if (item.ExtraAttributes.id == "TACTICIAN_SWORD") totalWorth += (item.ExtraAttributes.wood_singularity_count ? 2 : 0);
                if ((!duplicates.includes(item.ExtraAttributes.id)) || exploit) {
                    totalTalisman += this.getTalismanValue(item);
                    duplicates.push(item.ExtraAttributes.id);
                }
                const PerfectReg = item.ExtraAttributes.id.match(/PERFECT_(.*)_(\d*)/);
                if (PerfectReg!==null){
                    switch(PerfectReg[1]){
                        case "BOOTS":
                            totalWorth += 0.8196;
                            break;
                        case "CHESTPLATE":
                            totalWorth += 1.6392;
                            break;
                        case "LEGGINGS":
                            totalWorth += 1.4343;
                            break;
                        case "HELMET":
                            totalWorth += 1.0245;
                            break;
                    }
                    totalWorth+=(parseInt(PerfectReg[2])-1)*0.8196;
                }
                
                // Uncomment this if it becomes too laggy
                // if (totalWorth >= vals.wealth && totalTalisman >= vals.talismans) break;
            }
        }
        return Array.of(totalWorth, totalTalisman);
    },
    getTalismanValue: function(item) {
        try {
            const regex = item.display.Lore[item.display.Lore.length - 1].match(/(§.§.§.a§. )?(§.§.){1,2}(.*) (HAT|A)CCESSORY( §.§.§.a )?/);
            if (regex === null) return 0;
            else if (regex[3] === "COMMON") return 3;
            else if (regex[3] === "UNCOMMON") return 5;
            else if (regex[3] === "RARE") return 8;
            else if (regex[3] === "EPIC") return 12;
            else if (regex[3] === "LEGENDARY") return 15;
            else if (regex[3] === "MYTHIC") return 15;
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
                if (item.tag.ExtraAttributes[id.toLowerCase() + "_data"] === undefined) continue;
                const back = this.itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase() + "_data"]));
                for (let j of back) {
                    yield j;
                }
            } else yield item.tag;
        }
    },
    getIn: function(json, fromJson, defaultVal) {
        for (let from of fromJson) {
            if (this.isIn(json, [from])) {
                json = json[from];
            } else {
                return defaultVal;
            }
        }
        return json;
    },
    isIn: function(json, fromJson) {
        for (let from of fromJson) {
            if (!(from in json)) {
                return false;
            }
        }
        return true;
    },
    isInNext: function(json, fromJson) {
        for (let from of fromJson) {
            if (this.isIn(json, [from])) {
                json = json[from];
            } else {
                return false;
            }
        }
        return true;
    },
    color: function(check, val, fail, success) {
        if (check >= val) {
            return success || "green";
        } else {
            return fail;
        }
    },
    circle: function(val) {
        if (typeof(val) == typeof(true)) {
            return val ? ":green_circle:" : ":red_circle:";
        } else {
            switch (val) {
                case -1:
                    return ":yellow_circle:";
                case 0:
                    return ":green_circle:";
                default:
                case 1:
                    return ":red_circle:";
                case 2:
                    return ":blue_circle:";
            }
        }
    },
    fromExp: function(exp) {
        if (exp >= this.leveling_xp[50])
            return { a: 50, b: 50, c: exp };
        for (const i in Object.values(this.leveling_xp)) {
            let xp = this.leveling_xp[i];
            if (exp < xp) {
                return {
                    a: (i - 1),
                    b: (i - 1) + Math.max(0, Math.min((exp - this.leveling_xp[i - 1]) / (xp - this.leveling_xp[i - 1]), 1)),
                    c: exp
                };
            }
        }
        return { a: 0, b: 0, c: exp };
    },
    minion_crafts:{
        5:0,
        6:5,
        7:15,
        8:30,
        9:50,
        10:75,
        11:100,
        12:125,
        13:150,	
        14:175,
        15:200,
        16:225,
        17:250,
        18:275,
        19:300,
        20:350,
        21:400,
        22:450,
        23:500,
        24:550,
        25:Infinity 
    },
    getSlots: function(crafts) {
        if (crafts >= this.minion_crafts[24])
            return { a: 25, b: 25, c: crafts };
        for (const i of Object.keys(this.minion_crafts)) {
            let slots = this.minion_crafts[i];
            if (crafts < slots) {
                return {
                    a: (i - 1),
                    b: (i - 1) + Math.max(0, Math.min((crafts - this.minion_crafts[i - 1]) / (slots - this.minion_crafts[i - 1]), 1)),
                    c: crafts
                };
            }
        }
        return { a: 0, b: 0, c: crafts };
    },
    //STOLEN FROM STACKOVERFLOW
    genuuid: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
        });
    }
};
