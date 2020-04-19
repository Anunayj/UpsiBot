const utils = require("./utils");

module.exports = {
    minions: function(embed, members, profile) {
        let crafted_minions = 0;
        for (const pId in members) {
            member = ProObj.profile.members[pId];
            if (!('crafted_generators' in member) || cmdone) continue;
            crafted_minions += member.crafted_generators.length;
        }
        if (crafted_minions > 275) {
            embed._description(embed._description.replace("Checking Slots...", `:green_circle: on profile ${profile.cute_name} (${crafted_minions})`));
            return {
                val: crafted_minions,
                done: utils.Success
            };
        } else {
            embed.description(embed._description.replace("Checking Slots...", `:red_circle: on profile ${profile.cute_name} (${crafted_minions})`));
            previousAttempts[profile.cute_name].slots = crafted_minions;
            return {
                val: crafted_minions,
                done: utils.Failed
            };
        }
    },
    skills: function(embed, members, profile) {
        let total_skill = 0;
        for (const pId in members) {
            member = ProObj.profile.members[pId];
            if (!isIn(member, ['experience_skill_alchemy']) || asdone) continue;
            total_skill =
                member.experience_skill_alchemy +
                member.experience_skill_combat +
                member.experience_skill_enchanting +
                member.experience_skill_farming +
                member.experience_skill_fishing +
                member.experience_skill_foraging +
                member.experience_skill_mining;
        }
        if (total_skill >= 7 * 18) {
            embed._description = embed._description.replace("Checking Average Skill...", `:green_circle: on profile ${profile.cute_name} (${(total_skill / 7).toFixed(2)})`);
            embed.description(embed._description);
            return {
                val: (total_skill / 7).toFixed(2),
                done: utils.Success
            };
        } else {
            embed._description = embed._description.replace("Checking Average Skill...", `:red_circle: on profile ${profile.cute_name} (${(total_skill / 7).toFixed(2)})`);
            embed.description(embed._description);
            return {
                val: (total_skill / 7).toFixed(2),
                done: utils.Failed
            };
        }
    },
    slayer: function(embed, member, profile) {
        if (member.slayer_bosses === undefined || member.slayer_bosses.zombie.xp === undefined) {
            embed._description = embed._description.replace("Checking Slayer...", `:yellow_circle: API access is disabled on profile ${profile.cute_name} for slayer checks`);
            embed.description(embed._description);
            return {
                val: 0,
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
                embed._description = embed._description.replace(`Checking Slayer...`, `:green_circle: on profile ${profile.cute_name} (${slayerxp} | ${zombxp}/${spidxp}/${wolfxp})`);
                embed.description(embed._description);
                slayerdone = true;
                return {
                    val: { xp: slayer_xp, z: zombxp, s: spidxp, w: wolfxp },
                    done: utils.Success
                };
            } else {
                embed._description = embed._description.replace(`Checking Slayer...`, `:red_circle: on profile ${profile.cute_name} (${slayerxp} | ${zombxp}/${spidxp}/${wolfxp})`);
                previousAttempts[profile.cute_name].slayer_xp = slayerxp;
                previousAttempts[profile.cute_name].wolf = wolfxp;
                previousAttempts[profile.cute_name].spider = spidxp;
                previousAttempts[profile.cute_name].zombie = zombxp;
                embed.description(embed._description);
                return {
                    val: { xp: slayer_xp, z: zombxp, s: spidxp, w: wolfxp },
                    done: utils.Failed
                };
            }
        }
    },
    wealth: function(embed, total, profile) {
        if (total >= 20) {
            embed._description = embed._description.replace(`Checking Wealth...`, `:green_circle: on profile ${profile.cute_name} (${total})`);
            wealthdone = true;
            return {
                val: total,
                done: utils.Success
            };
        } else {
            embed._description = embed._description.replace(`Checking Wealth...`, `:red_circle: on profile ${profile.cute_name} (${total})`);
            embed.description(embed._description);
            return {
                val: total,
                done: utils.Failed
            };
        }
    },
    talisan: function(embed, total, profile) {
        if (total >= 200) {
            embed._description = embed._description.replace(`Checking Talismans...`, `:green_circle: on profile ${profile.cute_name} (${total})`);
            embed.description(embed._description);
            return {
                val: total,
                done: utils.Success
            };
        } else {
            embed._description = embed._description.replace(`Checking Talismans...`, `:red_circle: on profile ${profile.cute_name} (${total})`);
            embed.description(embed._description);
            return {
                val: total,
                done: utils.Failed
            };
        }
    }
};