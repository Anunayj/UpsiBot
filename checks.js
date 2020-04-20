const utils = require("./utils");

module.exports = {
    minions: function(embed, members, profile) {
        let crafted_minions = 0;
        for (const pId in members) {
            member = members[pId];
            if (!('crafted_generators' in member)) continue;
            crafted_minions += member.crafted_generators.length;
        }
        if (crafted_minions > 275) {
            utils.replaceEmbed(embed, "Minion Slots:", `:green_circle: on profile ${profile.cute_name} (${crafted_minions} crafted minions)`);
            return {
                val: crafted_minions,
                done: utils.Success
            };
        } else {
            utils.replaceEmbed(embed, "Minion Slots:", `:red_circle: on profile ${profile.cute_name} (${crafted_minions} crafted minions)`);
            return {
                val: crafted_minions,
                done: utils.Failed
            };
        }
    },
    skills: function(embed, member, profile) {
        let total_skill = 0;
        if (utils.isIn(member, ['experience_skill_alchemy'])) {
            total_skill =
                utils.fromExp(member.experience_skill_alchemy) +
                utils.fromExp(member.experience_skill_combat) +
                utils.fromExp(member.experience_skill_enchanting) +
                utils.fromExp(member.experience_skill_farming) +
                utils.fromExp(member.experience_skill_fishing) +
                utils.fromExp(member.experience_skill_foraging) +
                utils.fromExp(member.experience_skill_mining);
        }
        if (total_skill >= 7 * 18) {
            utils.replaceEmbed(embed, "Average Skill:", `:green_circle: on profile ${profile.cute_name} (${(total_skill / 7).toFixed(2)} average skill)`);
            return {
                val: (total_skill / 7).toFixed(2),
                done: utils.Success
            };
        } else {
            utils.replaceEmbed(embed, "Average Skill:", `:red_circle: on profile ${profile.cute_name} (${(total_skill / 7).toFixed(2)} average skill)`);
            return {
                val: (total_skill / 7).toFixed(2),
                done: utils.Failed
            };
        }
    },
    slayer: function(embed, member, profile) {
        if (member.slayer_bosses === undefined || member.slayer_bosses.zombie.xp === undefined) {
            utils.replaceEmbed(embed, "Slayer XP:", `:red_circle: No slayers done on profile ${profile.cute_name} for slayer checks`);
            return {
                val: { xp: 0, z: 0, s: 0, w: 0 },
                done: utils.Unable
            };
        } else {
            const wolfxp = member.slayer_bosses.wolf.xp || 0;
            const spidxp = member.slayer_bosses.spider.xp || 0;
            const zombxp = member.slayer_bosses.zombie.xp || 0;
            const slayerxp = wolfxp + zombxp + spidxp;
            if ((slayerxp > 30000) &&
                (member.slayer_bosses.wolf.xp > 20000 ||
                    member.slayer_bosses.zombie.xp > 20000 ||
                    member.slayer_bosses.spider.xp > 20000)) {
                utils.replaceEmbed(embed, `Slayer XP:`, `:green_circle: on profile ${profile.cute_name} (${slayerxp} | ${zombxp}/${spidxp}/${wolfxp})`);
                return {
                    val: { xp: slayerxp, z: zombxp, s: spidxp, w: wolfxp },
                    done: utils.Success
                };
            } else {
                utils.replaceEmbed(embed, `Slayer XP:`, `:red_circle: on profile ${profile.cute_name} (${slayerxp} | ${zombxp}/${spidxp}/${wolfxp})`);
                return {
                    val: { xp: slayerxp, z: zombxp, s: spidxp, w: wolfxp },
                    done: utils.Failed
                };
            }
        }
    },
    wealth: function(embed, total, profile) {
        if (total >= 20) {
            utils.replaceEmbed(embed, `Wealth:`, `:green_circle: on profile ${profile.cute_name} (${total} wealth)`);
            return {
                val: total,
                done: utils.Success
            };
        } else {
            utils.replaceEmbed(embed, `Wealth:`, `:red_circle: on profile ${profile.cute_name} (${total} wealth)`);
            return {
                val: total,
                done: utils.Failed
            };
        }
    },
    talismans: function(embed, total, profile) {
        if (total >= 200) {
            utils.replaceEmbed(embed, `Talismans:`, `:green_circle: on profile ${profile.cute_name} (${total} talisman score)`);
            return {
                val: total,
                done: utils.Success
            };
        } else {
            utils.replaceEmbed(embed, `Talismans:`, `:red_circle: on profile ${profile.cute_name} (${total} talisman score)`);
            return {
                val: total,
                done: utils.Failed
            };
        }
    }
};