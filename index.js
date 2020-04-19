const EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");
const fs = require("fs");

try {
    tokens = require('./env.json');
} catch (e) {
    tokens = { main: process.env.mainToken, scraper: process.env.scraperToken, hypixel: process.env.hypixelToken };
    if (tokens.main === undefined || tokens.scraper === undefined || process.env.hypixelToken === undefined)
        throw "Tokens are missing!";
}

const api = new hypixel.Client(tokens.hypixel);
const weights = require("./weights.json");
const [bot, scraperbot] = [new Eris.CommandClient(tokens.main, {}, {
    description: "A bot.....",
    owner: "Anunay",
    prefix: "~"
}), new Eris(tokens.scraper)];

bot.connect().catch(() => { throw "Unable to connect"; });
scraperbot.connect().catch(() => { throw "Unable to connect"; });

class splashNotifier {
    constructor(channel) {
        this.channel = channel;
        this.pastMessages = {};
        this.splashSendChannels = undefined;
        this.splashReceiveChannels = undefined;
    }

    sendSplashNotification(msgList) {
        const totalmsg = msgList.reduce((total, now) => {
            return now.cleanContent + "\n" + total;
        }, "");
        if (totalmsg.match(/\d+\s?K/i) !== null) return;
        let embed = bot.createEmbed(this.channel);
        const title = totalmsg.match(/((party|p) join \w+|HUB\s?\d+)/i);
        if (title !== null) embed.title(title[0]);
        else embed.title("Splash");
        embed.description(totalmsg);
        embed.author(msgList[0].author.username, `https://cdn.discordapp.com/avatars/${msgList[0].author.id}/${msgList[0].author.avatar}.png`);
        embed.footer(`This Message was sent in ${msgList[0].channel.guild.name}`);
        for (var splashReceiveChannel of this.splashReceiveChannels) {
            embed.send(bot, splashReceiveChannel).catch(error => console.log(error));
        }
    }

    async scrapeHandler(msg) {
        if (this.splashSendChannels === undefined || this.splashReceiveChannels === undefined) {
            // Channels that send splash messages Moved here cause I do not want to spam my Memory with read requests.
            this.splashSendChannels = await JSON.parse(fs.readFileSync("splashSendChannels.json"));
            // Channels that get sent splash messages
            this.splashReceiveChannels = await JSON.parse(fs.readFileSync("splashReceiveChannels.json"));
        }
        if (this.splashSendChannels.includes(msg.channel.id)) {
            if (msg.roleMentions.length > 0 || msg.mentionEveryone) {
                const msgList = (await scraperbot.getMessages(msg.channel.id, 10)).filter((obj) => (obj.timestamp > msg.timestamp - 180000) && obj.author === msg.author);
                this.sendSplashNotification(msgList);
                this.pastMessages[msg.author.id] = msg.id;
                setTimeout((that, id) => { delete that.pastMessages[id]; }, 1000 * 300, this, msg.author.id);
            } else if (Object.keys(this.pastMessages).includes(msg.author.id)) {
                for (var splashReceiveChannel of this.splashReceiveChannels) {
                    let msgtoEdit = (await bot.getMessages(splashReceiveChannel)).filter((arr) => {
                        if (arr.embeds.length > 0 && arr.embeds[0].author !== undefined)
                            return arr.embeds[0].author.name === msg.author.username;
                    })[0];
                    msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description + "\n" + msg.cleanContent;
                    const title = msg.cleanContent.match(/((party|p) join \w+|HUB\s?\d+)/i);
                    if (title !== null) msgtoEdit.embeds[0].title = title[0];
                    await bot.editMessage(msgtoEdit.channel.id, msgtoEdit.id, { embed: msgtoEdit.embeds[0] });
                }
            } else {
                // So you don't do the bit after every time
                return;
            }
            // Channels that send splash messages Moved here cause I do not want to spam my Memory with read requests.
            this.splashSendChannels = await JSON.parse(fs.readFileSync("splashSendChannels.json"));
            // Channels that get sent splash messages
            this.splashReceiveChannels = await JSON.parse(fs.readFileSync("splashReceiveChannels.json"));
        }
    }
}

let splashHandler = new splashNotifier("562615952236085258");
scraperbot.on("messageCreate", splashHandler.scrapeHandler.bind(splashHandler));

bot.on("messageCreate", (msg) => {
    if (msg.author.bot) return;
    let content = msg.cleanContent.match(/\b(I'm|I am|I\s?m)\s(.*)/i);
    if (content !== null) bot.createMessage(msg.channel.id, `Hi ${content[2]}, I am ᴉsd∩`);

});

bot.registerCommand("ping", "Pong!", { // Make a ping command
    // Responds with "Pong!" when someone says "!ping"
    description: "Pong!",
    fullDescription: "This command could be used to check if the bot is up. Or entertainment when you're bored."
});
bot.registerCommand("req", checkRequirements, {
    description: "Check Requirements!!",
    fullDescription: "Dude that literally ^",
    argsRequired: true,
    usage: `rep <username>`,
    cooldown: 7000,
    cooldownMessage: "Chill bitch!"
});



async function checkRequirements(msg, args) {
    // if (args[0] === undefined) return "Invalid Usage! do req <username>";
    let exploit = true;
    if (args[1] == "exploit") exploit = false;
    try {
        let timeStart = Date.now();
        let embed = bot.createEmbed(msg.channel.id);
        embed.title("Requirement Checker");
        embed.author(args[0]); // TODO: Get player picture
        embed.color('#0000FF');
        embed.footer(`Working...`);
        embed.description("Minion Slots:\nChecking Slots...\nAverage Skill:\nChecking Average Skill...\nSlayer XP:\nChecking Slayer...\nWealth:\nChecking Wealth...\nTalismans:\nChecking Talismans...");
        let msg2;
        // let msg2 = await embed.send();
        // let embedid = msg2.id;
        let previousName = "";
        let player, hyplayer;
        try {
            player = await api.getPlayer(args[0]);
            if (player === undefined || player === null)
                throw "";
            hyplayer = await api.gethypixelPlayer(player.id);
            if (hyplayer === undefined || hyplayer === null)
                throw "";
        } catch (e) {
            embed.description("Invalid username!");
            timeTaken = new Date(Date.now() - timeStart);
            embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
            msg2 = await embed.send();
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            return;
        }
        embed.author(player.name, `https://crafatar.com/avatars/${player.id}?overlay`);
        let skyblock_player = hyplayer.player;
        if (skyblock_player === null || skyblock_player === undefined || !isInNext(skyblock_player, ['stats', 'SkyBlock', 'profiles'])) {
            embed.description("This user has never played SkyBlock!");
            timeTaken = new Date(Date.now() - timeStart);
            embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
            msg2 = await embed.send();
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            return;
        }
        let profileNames = [];
        for (let pf of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            profileNames.push(pf.cute_name);
        }
        if (profileNames.length == 0) {
            embed.description("This user has never played SkyBlock!");
            timeTaken = new Date(Date.now() - timeStart);
            embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
            msg2 = await embed.send();
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            return;
        }
        embed._description = "Profiles:\n" + profileNames.join(', ') + "\n\n" + embed._description;
        embed.description(embed._description);
        msg2 = await embed.send();
        let embedid = msg2.id;
        let cmdone = false,
            tsdone = false,
            slayerdone = false,
            wealthdone = false,
            talidone = false;
        let previousAttempts = {};
        for (const profile of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            let ProObj = await api.getProfile(profile.profile_id);
            if (ProObj === undefined || ProObj === null) break;
            let member = ProObj.profile.members[player.id];
            let crafted_minions = 0;
            let total_skill = 0;
            previousAttempts[profile.cute_name] = {};
            let prev = getIn(previousAttempts, [previousName], { "slots": 0, "average_skill": 0, "slayer_xp": 0, "zombie": 0, "spider": 0, "wolf": 0, "wealth": 0, "talismans": 0 });
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} with ${prev.slots} crafted minions`, `Checking Slots...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} with ${prev.average_skill} average skill`, `Checking Average Skill...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} with ${prev.slayer_xp} slayer xp (Z:${prev.zombie} S:${prev.spider} W:${prev.wolf})`, `Checking Slayer...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for slayer checks`, `Checking Slayer...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for wealth checks`, `Checking Wealth...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for talisman checks`, `Checking Talismans...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} with ${prev.wealth} wealth`, `Checking Wealth...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} with ${prev.talismans} talisman score`, `Checking Talismans...`);
            embed.description(embed._description);
            for (const pId in ProObj.profile.members) {
                member = ProObj.profile.members[pId];
                if (!('crafted_generators' in member) || cmdone) continue;
                crafted_minions += member.crafted_generators.length;
                if (!isIn(member, ['experience_skill_alchemy']) || tsdone) continue;
                total_skill =
                    member.experience_skill_alchemy +
                    member.experience_skill_combat +
                    member.experience_skill_enchanting +
                    member.experience_skill_farming +
                    member.experience_skill_fishing +
                    member.experience_skill_foraging +
                    member.experience_skill_mining;
            }
            if (!cmdone) {
                if (crafted_minions > 275) {
                    embed._description = embed._description.replace("Checking Slots...", `:green_circle: on profile ${profile.cute_name}`);
                    embed.description(embed._description);
                    cmdone = true;
                } else {
                    embed._description = embed._description.replace("Checking Slots...", `:red_circle: on profile ${profile.cute_name} with ${crafted_minions} crafted minions`);
                    embed.description(embed._description);
                    previousAttempts[profile.cute_name].slots = crafted_minions;
                }
            }
            if (!tsdone) {
                if (total_skill >= 7 * 18) {
                    embed._description = embed._description.replace("Checking Average Skill...", `:green_circle: on profile ${profile.cute_name}`);
                    embed.description(embed._description);
                    tsdone = true;
                } else {
                    embed._description = embed._description.replace("Checking Average Skill...", `:red_circle: on profile ${profile.cute_name} with ${(total_skill / 7).toFixed(2)} average skill`);
                    embed.description(embed._description);
                    previousAttempts[profile.cute_name].average_skill = (total_skill / 7).toFixed(2);
                }
            }
            if (!slayerdone) {
                if (member.slayer_bosses === undefined || member.slayer_bosses.zombie.xp === undefined) {
                    embed._description = embed._description.replace("Checking Slayer...", `:yellow_circle: API access is disabled on profile ${profile.cute_name} for slayer checks`);
                    embed.description(embed._description);
                } else {
                    const wolfxp = member.slayer_bosses.wolf.xp || 0;
                    const spidxp = member.slayer_bosses.spider.xp || 0;
                    const zombxp = member.slayer_bosses.zombie.xp || 0;
                    const slayerxp = wolfxp + zombxp + spidxp;
                    if ((slayerxp > 30000) &&
                        (member.slayer_bosses.wolf.xp > 20000 ||
                            member.slayer_bosses.zombie.xp > 20000 ||
                            member.slayer_bosses.spider.xp > 20000)) {
                        embed._description = embed._description.replace(`Checking Slayer...`, `:green_circle: on profile ${profile.cute_name} with ${slayerxp} slayer xp (Z:${zombxp} S:${spidxp} W:${wolfxp})`);
                        embed.description(embed._description);
                        slayerdone = true;
                    } else {
                        embed._description = embed._description.replace(`Checking Slayer...`, `:red_circle: on profile ${profile.cute_name} with ${slayerxp} slayer xp (Z:${zombxp} S:${spidxp} W:${wolfxp})`);
                        previousAttempts[profile.cute_name].slayer_xp = slayerxp;
                        previousAttempts[profile.cute_name].wolf = wolfxp;
                        previousAttempts[profile.cute_name].spider = spidxp;
                        previousAttempts[profile.cute_name].zombie = zombxp;
                        embed.description(embed._description);
                    }
                }
            }
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            if (!wealthdone || !talidone) {
                if (member.inv_contents !== undefined) {
                    let items = [member.talisman_bag.data, member.inv_armor.data, member.inv_contents.data, member.ender_chest_contents.data];
                    totals = await checkWealthAndTalis(items, exploit);
                    if (!wealthdone) {
                        if (totals[0] >= 20) {
                            embed._description = embed._description.replace(`Checking Wealth...`, `:green_circle: on profile ${profile.cute_name} with ${totals[0]} wealth`);
                            wealthdone = true;
                        } else {
                            embed._description = embed._description.replace(`Checking Wealth...`, `:red_circle: on profile ${profile.cute_name} with ${totals[0]} wealth`);
                            embed.description(embed._description);
                            previousAttempts[profile.cute_name].wealth = totals[0];
                        }
                    }
                    if (!talidone) {
                        if (totals[1] >= 200) {
                            embed._description = embed._description.replace(`Checking Talismans...`, `:green_circle: on profile ${profile.cute_name} with ${totals[1]} talisman score`);
                            embed.description(embed._description);
                            talidone = true;
                        } else {
                            embed._description = embed._description.replace(`Checking Talismans...`, `:red_circle: on profile ${profile.cute_name} with ${totals[1]} talisman score`);
                            embed.description(embed._description);
                            previousAttempts[profile.cute_name].talismans = totals[1];
                        }
                    }
                    await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                } else {
                    embed._description = embed._description.replace(`Checking Wealth...`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for wealth checks`);
                    embed._description = embed._description.replace(`Checking Talismans...`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for talisman checks`);
                    embed.description(embed._description);
                    await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                }
            }
            previousName = profile.cute_name;
            if (cmdone && tsdone && slayerdone && wealthdone && talidone) break;
            await new Promise(r => setTimeout(r, 1000)); //possible cooldown for rate limiting
        }
        if (embed._description.includes(":red_circle:")) {
            let prev = previousAttempts[previousName];
            embed._description = embed._description.replace(`profile ${previousName} with ${prev.slots} crafted minions`, `all profiles`);
            embed._description = embed._description.replace(`profile ${previousName} with ${prev.average_skill} average skill`, `all profiles`);
            embed._description = embed._description.replace(`profile ${previousName} with ${prev.slayer_xp} slayer xp (Z:${prev.zombie} S:${prev.spider} W:${prev.wolf})`, `all profiles`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for slayer checks`, `:red_circle: on all profiles`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for wealth checks`, `:red_circle: on all profiles`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for talisman checks`, `:red_circle: on all profiles`);
            embed._description = embed._description.replace(`profile ${previousName} with ${prev.wealth} wealth`, `all profiles`);
            embed._description = embed._description.replace(`profile ${previousName} with ${prev.talismans} talisman score`, `all profiles`);
        }
        timeTaken = new Date(Date.now() - timeStart);
        embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
        if (embed._description.includes(":red_circle:")) {
            embed.color('#FF0000');
        } else if (embed._description.includes(":yellow_circle:")) {
            embed.color('#FFFF00');
        } else {
            embed.color('#00FF00');
        }
        embed.description(embed._description);
        await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
        return;
    } catch (e) {
        console.log(e);
        return "Some unknown error occured, please try again.";
    }
}

async function checkWealthAndTalis(items, exploit) {
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
}

function getTalismanValue(item) {
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
}

function* itr(inv) {
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

}

function getIn(json, fromJson, defaultVal) {
    for (var from of fromJson) {
        if (isIn(json, [from])) {
            json = json[from];
        } else {
            return defaultVal;
        }
    }
    return json;
}

function isIn(json, fromJson) {
    for (var from of fromJson) {
        if (!(from in json)) {
            return false;
        }
    }
    return true;
}

function isInNext(json, fromJson) {
    for (var from of fromJson) {
        if (isIn(json, [from])) {
            json = json[from];
        } else {
            return false;
        }
    }
    return true;
}