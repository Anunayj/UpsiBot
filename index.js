const EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");
const fs = require("fs");
const utils = require("./utils");
const vals = require("./check_values.json");
const { NodeVM } = require('vm2');
let tokens = {};
try {
    tokens = require('./env.json');
    console.log("Got tokens");
} catch (e) {
    tokens = { main: process.env.mainToken, scraper: process.env.scraperToken, hypixel: process.env.hypixelToken };
    if (tokens.main === undefined || tokens.scraper === undefined || process.env.hypixelToken === undefined)
        throw "Tokens are missing!";
}

const api = new hypixel.Client(tokens.hypixel);
const [bot, scraperbot] = [new Eris.CommandClient(tokens.main, {}, {
    description: "A bot.....",
    owner: "Anunay (and Refusings for those lovely embeds)",
    prefix: "~"
}), Eris(tokens.scraper)];

bot.connect().then(() => { console.log("Logged in!"); }).catch(() => { throw "Unable to connect"; });
scraperbot.connect().catch(() => { throw "Unable to connect"; });

async function runInVm(msg) {
    // TODO Ask refusings to make this look better.
    let reg = msg.content.match(/```(.*?)```/s);
    if (reg === null) reg = msg.content.match(`${msg.prefix}run (.*)`);
    if (reg === null) return "Cannot Read Code";
    const vm = new NodeVM({
        console: 'redirect',
        timeout: 30000,
        sandbox: {}
    });
    vm.freeze(api, 'api');
    let output = await bot.createMessage(msg.channel.id, "Output:");
    vm.on('console.log', (data) => {
        output.edit(output.content += `\n${JSON.stringify(data)}`);
    });
    try {
        vm.run(reg[1]);
    } catch (err) {
        output.edit(output.content += `\nERROR: ${JSON.stringify(err)}`);
    }

}

bot.registerCommand("run", runInVm, {
    description: "Run code, badly..",
    fullDescription: "Arbitary Code execution hehehe",
    requirements: {
        userIDs: ["213612539483914240", "260470661732892672"]
    },
    permissionMessage: "BOOOOOO!",
    argsRequired: true,
    usage: "run <code>"
});

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

//SAD You will be missed
// bot.on("messageCreate", (msg) => {
//     if (msg.author.bot) return;
//     let content = msg.cleanContent.match(/\b(I'm|I am|I\s?m)\s(.*)/i);
//     if (content !== null) bot.createMessage(msg.channel.id, `Hi ${content[2]}, I am ᴉsd∩`);

// });

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
    cooldown: 1000,
    cooldownMessage: "Try using ~stats instead!"
});



async function checkRequirements(msg, args) {
    // if (args[0] === undefined) return "Invalid Usage! do req <username>";
    bot.sendChannelTyping(msg.channel.id);
    let timeStart = Date.now();
    let exploit = !args.join("").includes("explot");
    let showAll = args.join("").includes("all");
    let simple = args.join("").includes("simple");

    let embed = bot.createEmbed(msg.channel.id);
    let res = await getStats(args[0], exploit);
    if (typeof(res) !== typeof({})) {
        let timeTaken = new Date(Date.now() - timeStart);
        await bot.createEmbed(msg.channel.id).title("Stats").author(args[0]).description(res).footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`).send();
        return;
    }
    if (simple) {
        for (var profId in res.stats) {
            let prof = res.stats[profId];
            embed.field(profId, 
                `${prof.minions >= vals.minions ? ":green_circle:" : ":red_circle:"} - Minions: ${prof.minions}/${vals.minions}\n`+
                `${prof.skills >= vals.skills ? ":green_circle:" : ":red_circle:"} - Skill Average: ${prof.skills.toFixed(2)}/${vals.skills}\n` +
                `${prof.slayer.xp >= vals.slayer.xp ? ":green_circle:" : (prof.slayer.xp == 0 ? ":blue_circle:" : ":red_circle:")} - Slayer XP: ${parseInt(prof.slayer.xp).toLocaleString()}/${parseInt(vals.slayer.xp).toLocaleString()} \n`+
                 (prof.wealth===-1 ? ":yellow_circle: Enable API\n" : (`${prof.wealth >= vals.wealth ? ":green_circle:" : ":red_circle:"} - Wealth: ${prof.wealth.toFixed(2)} points/${vals.wealth} \n`))+
                 (prof.wealth===-1 ? ":yellow_circle: Enable API" : (`${prof.talismans >= vals.talismans ? ":green_circle:" : ":red_circle:"} - Talismans: ${prof.talismans}/${vals.talismans}`)));
        }
        embed.color("#FFA500");
        let timeTaken = new Date(Date.now() - timeStart);
        embed.footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
        await embed.send();
        return;
    } else {
        let mainColor = "#FF0000";
        for (var profId in res.stats) {
            let prof = res.stats[profId];
            let text = utils.circle(prof.minions >= vals.minions) + utils.circle(prof.skills >= vals.skills) + utils.circle(prof.slayer.xp >= vals.slayer.xp && ((prof.slayer.z >= vals.slayer.minimumHighestSlayer) || (prof.slayer.s >= vals.slayer.minimumHighestSlayer) || (prof.slayer.w >= vals.slayer.minimumHighestSlayer)) ? 0 : prof.slayer.xp == 0 ? 2 : 1) + (prof.wealth === -1 ? utils.circle(-1) : utils.circle(prof.wealth >= vals.wealth)) + (prof.wealth === -1 ? utils.circle(-1) : utils.circle(prof.talismans >= vals.talismans));
            embed.field(`${profId}`, text);
            if (mainColor != "#00FF00") {
                if (text.includes("yellow")) {
                    mainColor = "#FFFF00";
                } else if (text.includes("red")) {
                    mainColor = "#FF0000";
                } else if (text.includes("blue")) {
                    mainColor = "#0000FF";
                } else {
                    mainColor = "#00FF00";
                }
            }
            if (mainColor == "#00FF00" && !showAll) {
                break;
            }
            let todo = [];
            if (text.includes("yellow")) {
                todo.push("Enable API");
            }
            let types = ["Minions", "Skills", "Slayer", "Wealth", "Talismans"];
            let colors = text.replace(/_circle:/g, ",").replace(/:/g, '').split(",");
            for (var i = 0; i < colors.length; i++) {
                if (colors[i] == "red" || colors[i] == "blue") {
                    if (types[i] == "Slayer") {
                        todo.push(`${types[i]} (${prof.slayer.xp} | ${prof.slayer.z}/${prof.slayer.s}/${prof.slayer.w})`);
                    } else if(["Skills","Wealth"].includes(types[i])) {
                        todo.push(`${types[i]} (${prof[types[i].toLowerCase()].toFixed(2)})`);
                    } else {
                        todo.push(`${types[i]} (${prof[types[i].toLowerCase()]})`);
                    }
                }
            }
            if (todo.length != 0) {
                embed.field(`TODO:`, todo.join(", "));
            }
        }
        if (mainColor === "#FFFF00" || showAll) { //If API is disabled
            const skill = (res.hyplayer.player.achievements.skyblock_combat +
                res.hyplayer.player.achievements.skyblock_angler +
                res.hyplayer.player.achievements.skyblock_gatherer +
                res.hyplayer.player.achievements.skyblock_excavator +
                res.hyplayer.player.achievements.skyblock_harvester +
                res.hyplayer.player.achievements.skyblock_augmentation +
                res.hyplayer.player.achievements.skyblock_concoctor) / 7;
            const crafts = res.hyplayer.player.achievements.skyblock_minion_lover;
            embed.field("Achievements API:",
                `Skills: ${skill.toFixed(2)} ${skill >= vals.skills ? ":green_circle:" : ":red_circle:"}` +
                `, Minions: ${crafts} ${crafts >= vals.minions ? ":green_circle:" : ":red_circle:"}`);
        }
        // embed.field("Requirements:","")
        embed.author(res.player.name, `https://crafatar.com/avatars/${res.player.id}?overlay`);
        embed.color(mainColor);
        let timeTaken = new Date(Date.now() - timeStart);
        embed.footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
        embed.color(mainColor);
        embed.send();
    }
}

bot.registerCommand("stats", stats, {
    description: "Get Player Stats!!",
    fullDescription: "Dude that literally ^",
    argsRequired: true,
    usage: `stats <username>`,
    cooldown: 3000,
    cooldownMessage: "Chill b*tch!"
});

bot.registerCommand("online", isOnline, {
    description: "Check Player online!",
    fullDescription: "Chck whether a person is online",
    argsRequired: true,
    usage: `online <username>`,
    cooldown: 3000,
    cooldownMessage: "... Let me fish in Peace"
});

async function isOnline(msg,args) {
    let player;
    try{
        player = await api.getPlayer(args[0]);
    }catch{
        return("Player not Found");
    }
    const status = await api.getStatus(player.id);
    return status.online ? `:green_circle: ${args[0]} is online playing ${status.gameType.charAt(0).toUpperCase() + status.gameType.slice(1).toLowerCase()}  ` : `:red_circle: ${args[0]} is offline`;
}


async function stats(msg, args) {
    bot.sendChannelTyping(msg.channel.id);
    let timeStart = Date.now();
    let timeTaken = new Date();
    let res = await getStats(args[0]);
    if (typeof(res) !== typeof({})) {
        await bot.createEmbed(msg.channel.id).title("Stats").author(args[0]).description(res).footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`).send();
        return;
    }
    let embed = bot.createEmbed(msg.channel.id);
    embed.title("Stats");
    embed.author(res.player.name, `https://crafatar.com/avatars/${res.player.id}?overlay`);
    for (var profile in res.stats) {
        let pf = res.stats[profile];
        embed.field(profile, `**Minions:**\n${pf.minions}\n**Skill Average:**\n${pf.skills.toFixed(2)}\n**Slayer XP:**\n${pf.slayer.xp} | ${pf.slayer.z}/${pf.slayer.s}/${pf.slayer.w}\n**Wealth:**\n${pf.wealth.toFixed(2)}\n**Talismans:**\n${pf.talismans}`);
    }
    timeTaken = new Date(Date.now() - timeStart);
    embed.footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
    await embed.send();
    return;
}

async function getStats(username, exploit = true) {
    let player = null,
        hyplayer = null,
        sbp = null;
    try {
        player = await api.getPlayer(username);
        hyplayer = await api.gethypixelPlayer(player.id);
        sbp = hyplayer.player;
    } catch (err) {
        return "Invalid username!";
    }
    let res = { player: player, hyplayer: hyplayer, sbp: sbp };
    if (sbp === null || sbp === undefined || !utils.isInNext(sbp, ['stats', 'SkyBlock', 'profiles'])) {
        return "This user has never played SkyBlock!";
    }
    let profiles = {};
    for (const pf of Object.values(sbp.stats.SkyBlock.profiles)) {
        let prof = await api.getProfile(pf.profile_id);
        if (prof === undefined || prof === null) break;
        let member = prof.profile.members[player.id];
        let minions = 0;
        let skill = 0;
        let slayer = { xp: 0, z: 0, s: 0, w: 0 };
        for (const member of Object.values(prof.profile.members)) {
            if (!('crafted_generators' in member)) continue;
            minions += member.crafted_generators.length;
        }
        if (utils.isIn(member, ['experience_skill_alchemy'])) {
            skill =
                (utils.fromExp(member.experience_skill_alchemy) +
                    utils.fromExp(member.experience_skill_combat) +
                    utils.fromExp(member.experience_skill_enchanting) +
                    utils.fromExp(member.experience_skill_farming) +
                    utils.fromExp(member.experience_skill_fishing) +
                    utils.fromExp(member.experience_skill_foraging) +
                    utils.fromExp(member.experience_skill_mining)) / 7;
        }
        if (member.slayer_bosses !== undefined && member.slayer_bosses.zombie.xp !== undefined) {
            slayer.w = member.slayer_bosses.wolf.xp || 0;
            slayer.s = member.slayer_bosses.spider.xp || 0;
            slayer.z = member.slayer_bosses.zombie.xp || 0;
            slayer.xp = slayer.z + slayer.s + slayer.w;
        }
        profiles[pf.cute_name] = { minions: minions, skills: skill, slayer: slayer };
        if (member.inv_contents !== undefined) {
            let items = [member.inv_armor.data, member.inv_contents.data, member.ender_chest_contents.data];
            if(member.talisman_bag!==undefined) items.push(member.talisman_bag.data);
            let totals = await utils.checkWealthAndTalis(items, exploit, api);
            profiles[pf.cute_name].wealth = totals[0]+(prof.profile.banking ? (prof.profile.banking.balance)/1000000 : 0 ) + member.coin_purse/1000000;
            profiles[pf.cute_name].talismans = totals[1];
        } else {
            profiles[pf.cute_name].wealth = -1;
            profiles[pf.cute_name].talismans = -1;
        }
    }
    res.stats = profiles;
    return res;
}
setInterval(updateOnlineStatus, 1000 * 60 * 5);
async function updateOnlineStatus() {
    const guild = await api.getGuild("5e7761818ea8c93927ad570a");
    const guildMembers = guild.members.map(members => members.uuid);
    let embed = bot.createEmbed();
    embed._description = "";
    embed.title("Online Status");
    embed.color("#00FF00");
    let statusArray = [];
    for (let member of guildMembers) {
        const status = await api.getStatus(member);
        const player = await api.getPlayerByUUID(member);
        // embed._description += `:${status.online ? "green" : "red"}_circle: - ${player.name} ${status.gameType === undefined ? "" : "(" + status.gameType + ")"}\n`;
        statusArray.push({
            uuid: player.id,
            name: player.name,
            online: status.online,
            game: status.gameType
        });
    }
    statusArray.sort((a,b) => !(a.online^b.online) ? (a.name>b.name ? 1 : -1) : (a.online ? -1 : 1));
    for (status of statusArray)
        embed._description += `:${status.online ? "green" : "red"}_circle: - ${status.name} ${status.game === undefined ? "" : "(" + status.game + ")"}\n`;
    embed.description(embed._description);
    bot.editMessage("703971841643118593", "703972163224338532", { content: "", embed: embed.sendable });
}
