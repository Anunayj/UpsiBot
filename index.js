const EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");
const fs = require("fs");
const utils = require("./utils");
const vals = require("./config.json");
const leechserver = require("./leechserver")
const http = require('http');

const {
    NodeVM
} = require('vm2');
//Hmmmmm
const {
    JsonDB
} = require('node-json-db');
const {
    Config
} = require('node-json-db/dist/lib/JsonDBConfig');
const stringCompare = require("fast-levenshtein");
const {
    listenerCount
} = require('process');
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
const db = new JsonDB(new Config("upsiDatabase", true, true, '/'));


let tokens = {};
let guildMemberList = null;
let bazaar = {};
try {
    tokens = require('./env.json');
    console.log("Got tokens");
} catch (e) {
    tokens = {
        main: process.env.mainToken,
        scraper: process.env.scraperToken,
        hypixel: process.env.hypixelToken
    };
    if (tokens.main === undefined || tokens.scraper === undefined || tokens.hypixel === undefined)
        throw "Tokens are missing!";
}
console.log(`Using tokens\nMain: ${tokens.main.slice(0,5)}* \nScraper: ${tokens.scraper.slice(0,5)}* \nhypixel: ${tokens.hypixel.slice(0,5)}*`)
const api = new hypixel.Client(tokens.hypixel);
const [bot, scraperbot] = [new Eris.CommandClient(tokens.main, {}, {
    description: "A bot.",
    owner: "Anunay (and Refusings for those lovely embeds)",
    prefix: "~"
}), Eris(tokens.scraper)];

bot.connect().then(() => {
    console.log("Logged in!");
}).catch(() => {
    throw "Unable to connect";
});
scraperbot.connect().catch(() => {
    throw "Unable to connect";
});


http.createServer(leechserver.queryHandler).listen(42069);
console.log('Server running on port 42069');


async function genAPIKey(msg,args){
    bot.sendChannelTyping(msg.channel.id);
    let player = null,
        hyplayer = null,
        sbp = null;
        guild = null;
    try {
        player = await api.getplayer(args[0]);
        hyplayer = await api.gethypixelPlayer(player.id);
        guild = await api.getGuildByUserID(player.id);
        sbp = hyplayer.player;
    } catch (err) {
        console.log(err)
        return "Invalid username!";
    }
    if(guild.guild._id!==vals.guildID && !vals.modWhitelist.includes(player.id)) return("You are not whitelisted or a member of the guild");
    if(hyplayer.player.socialMedia.links == undefined || hyplayer.player.socialMedia.links.DISCORD !== `${msg.author.username}#${msg.author.discriminator}`) return("Please connect your Hypixel account to discord.")
    const apiKey = utils.genuuid();
    bot.createMessage((await bot.getDMChannel(msg.author.id)), `Here is your API key, Remember to keep it safe and do not share it with anyone.\n \`${apiKey}\``);
    db.push("/apikeys[]", {
        id:player.id,
        key:apiKey
    }); // MAKE SURE TO DELETE THE OLD ONE THIS IS JUST A TEST

}



bot.registerCommand("api", genAPIKey, {
    description: "Genenrate Api key for upsimod",
    argsRequired: true,
    usage: "<username>"
});



async function runInVm(msg) {
    if (msg.author.id !== "213612539483914240" && msg.author.id !== "260470661732892672" && msg.author.id !== "314197872209821699") return "No.";
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
    let output = await bot.createMessage(msg.channel.id, "Output:").catch(e => console.log(e));
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


bot.registerCommand("say", say, {
    description: "Say...",
    fullDescription: "Lets hope this does not destroy the server",
    argsRequired: true,
    usage: "<What to say>"
});

function say(msg) {
    if (msg.author.bot === true) return;
    // replace(/<(:\w+:)[0-9]+>/g, "$1")
    return (msg.cleanContent.replace(msg.prefix + msg.command.label, ""));
}

class splashNotifier {
    constructor() {
        this.pastMessages = {};
        this.splashSendChannels = require("./splashSendChannels.json");
        this.splashReceiveChannels = require("./splashReceiveChannels.json");
    }

    sendSplashNotification(msgList) {
        // const totalmsg = msgList.reduce((total, now) => {
        //     if(now.embeds.length>0) 
        //     return now.cleanContent + "\n" + total;
        // }, "");
        let totalmsg = "";
        let embed = bot.createEmbed();
        let hasEmbed = null;
        for (let msg of msgList) {
            if (msg.embeds.length > 0 && msg.embeds[0].type !== "image" && msg.embeds[0].type !== "gifv") {
                hasEmbed = msg.embeds[0];
            } else if (msg.embeds.length > 0 && msg.embeds[0].type === "image") {
                totalmsg = msg.cleanContent + "\n" + totalmsg;
                embed.image(msg.embeds[0].url);
            } else {
                totalmsg = msg.cleanContent + "\n" + totalmsg;
            }
        }
        if (hasEmbed !== null) {
            hasEmbed.author = {
                name: msgList[0].author.username,
                icon_url: `https://cdn.discordapp.com/avatars/${msgList[0].author.id}/${msgList[0].author.avatar}.png`
            };
            hasEmbed.footer = {
                text: `This Message was sent in ${msgList[0].channel.guild.name}`
            };
            hasEmbed.timestamp = new Date();
            hasEmbed.color = 0x00ffff;
            hasEmbed.description = totalmsg;
            let isDemi = false;
            for (let field of hasEmbed.fields){
                let title = (field.name + " " + field.value).match(/((party|p) join \w+|HUB\s?\d+)/i);
                isDemi = isDemi || (field.name + " " + field.value).toLowerCase().includes("demi");
                if (title !== null) {
                    hasEmbed.title = title[0];
                }
            }
            let title = hasEmbed.description.match(/((party|p) join \w+|HUB\s?\d+)/i);
            if (title !== null) {
                hasEmbed.title = title[0];
            }
            if (hasEmbed.title.match(/((party|p) join \w+|HUB\s?\d+)/i) !== null){
                leechserver.publish({
                    type: (hasEmbed.title.match(/(party|p) join \w+/i) ? "party" : "hub"),
                    place: hasEmbed.title
                })
            }
            isDemi = isDemi || hasEmbed.description.toLowerCase().includes("demi");
            hasEmbed.title += (isDemi ? " - DEMI" : "");
            if(isDemi) hasEmbed.color = 0xC0C0C0;
            for (let splashReceiveChannel of this.splashReceiveChannels) {
                bot.createMessage(splashReceiveChannel, {
                    embed: hasEmbed
                });
            }
            return;
        }

        if (totalmsg.match(/\d+\s?K/i) !== null) return;
        const isDemi = totalmsg.toLowerCase().includes("demi");
        const title = totalmsg.match(/((party|p) join \w+|HUB\s?\d+)/i);
        if (title !== null) {
            embed.title(title[0] + (isDemi ? " - DEMI" : ""));

            leechserver.publish({
                type: (totalmsg.match(/(party|p) join \w+/i) ? "party" : "hub"),
                place: title[0]
            })
        } else 
            embed.title((isDemi ? "DEMI " : "") + "Splash");
        embed.description(totalmsg);
        embed.color(isDemi ? "#C0C0C0" : "#00FFFF");
        embed.timestamp(new Date());
        embed.author(msgList[0].author.username, `https://cdn.discordapp.com/avatars/${msgList[0].author.id}/${msgList[0].author.avatar}.png`);
        embed.footer(`This Message was sent in ${msgList[0].channel.guild.name}`);
        for (let splashReceiveChannel of this.splashReceiveChannels) {
            embed.send(bot, splashReceiveChannel).catch(error => console.log(error));
        }
    }

    async scrapeHandler(msg) {
        if (this.splashSendChannels.includes(msg.channel.id)) {
            if (msg.roleMentions.length > 0 || msg.mentionEveryone) {
                const msgList = (await scraperbot.getMessages(msg.channel.id, 10)).filter((obj) => (obj.timestamp > msg.timestamp - 180000) && obj.author === msg.author);
                this.sendSplashNotification(msgList);
                this.pastMessages[msg.author.id] = msg.id;
                setTimeout((that, id) => {
                    delete that.pastMessages[id];
                }, 1000 * 300, this, msg.author.id);
            } else if (Object.keys(this.pastMessages).includes(msg.author.id)) {
                for (let splashReceiveChannel of this.splashReceiveChannels) {
                    let msgtoEdit = (await bot.getMessages(splashReceiveChannel)).filter((arr) => {
                        if (arr.embeds.length > 0 && arr.embeds[0].author !== undefined)
                            return arr.embeds[0].author.name === msg.author.username;
                    })[0];
                    if (msg.embeds.length > 0 && msg.embeds[0].type !== "image" && msg.embeds[0].type !== "gifv") {
                        msg.embeds[0].description = msgtoEdit.embeds[0].description;
                        msgtoEdit.embeds[0] = msg.embeds[0];
                    } else if (msg.embeds.length > 0 && msg.embeds[0].type === "image") {
                        msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description + "\n" + msg.cleanContent;
                        msgtoEdit.embeds[0].image = {
                            url: msg.embeds[0].url
                        };
                        const title = msg.cleanContent.match(/((party|p) join \w+|HUB\s?\d+)/i);
                        if (title !== null) msgtoEdit.embeds[0].title = title[0];
                    } else {
                        msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description + "\n" + msg.cleanContent;
                        const title = msg.cleanContent.match(/((party|p) join \w+|HUB\s?\d+)/i);
                        if (title !== null) msgtoEdit.embeds[0].title = title[0];
                    }



                    try {
                        await bot.editMessage(msgtoEdit.channel.id, msgtoEdit.id, {
                            embed: msgtoEdit.embeds[0]
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
            } else {
                // So you don't do the bit after every time
                return;
            }

        }
    }
}

let splashHandler = new splashNotifier();
scraperbot.on("messageCreate", splashHandler.scrapeHandler.bind(splashHandler));
scraperbot.on("messageCreate", (msg) => {
    if(["720642093181042690","720602273461567509","736220160616038471","728287548321038346"].includes(msg.channel.id)){
        bot.createMessage("736211540772126780",{
            content:msg.cleanContent,
            embed:msg.embeds[0]
        });
    }
});

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
    usage: `<username>`,
    cooldown: 1000,
    cooldownMessage: "Slow down!!"
});

async function checkRequirements(msg, args) {
    // if (args[0] === undefined) return "Invalid Usage! do req <username>";
    bot.sendChannelTyping(msg.channel.id);
    let timeStart = Date.now();
    let newReqs = args.join("").includes("new");
    let current = args.join("").includes("current");

    let embed = bot.createEmbed(msg.channel.id);
    let res = await getStats(args[0]);
    if (typeof (res) !== typeof ({})) {
        let timeTaken = new Date(Date.now() - timeStart);
        await bot.createEmbed(msg.channel.id).title("Stats").author(args[0]).description(res).color("#FF0000").footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`).send();
        return;
    }
    let values = utils.deepCopy(vals);
    if (current || newReqs) {
        if (current) {
            values.slayer = values.slayerOld;
            values.skills = values.skillsOld;
        }
        for (let profId in res.stats) {
            let prof = res.stats[profId];
            let slayerCheck = false;
            if (values.slayer.minimumAsAll) slayerCheck = (prof.slayer.z >= values.slayer.minimumHighestSlayer && prof.slayer.s >= values.slayer.minimumHighestSlayer && prof.slayer.w >= values.slayer.minimumHighestSlayer);
            else slayerCheck = (prof.slayer.z >= values.slayer.minimumHighestSlayer || prof.slayer.s >= values.slayer.minimumHighestSlayer || prof.slayer.w >= values.slayer.minimumHighestSlayer);
            if (values.slayer.xpAndMinimum) slayerCheck = (slayerCheck && prof.slayer.xp >= values.slayer.xp);
            else slayerCheck = (slayerCheck || prof.slayer.xp >= values.slayer.xp);
            embed = createRequirementField(embed, profId, prof, values, slayerCheck, newReqs);
        }
        embed.color("#FFA500");
        let timeTaken = new Date(Date.now() - timeStart);
        embed.footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
        await embed.send();
        return;
    } else {
        let mainColor = "#FF0000";
        for (let profId in res.stats) {
            let prof = res.stats[profId];
            let slayerCheck = false;
            if (vals.slayerOld.minimumAsAll) slayerCheck = (prof.slayer.z >= vals.slayerOld.minimumHighestSlayer && prof.slayer.s >= vals.slayerOld.minimumHighestSlayer && prof.slayer.w >= vals.slayerOld.minimumHighestSlayer);
            else slayerCheck = (prof.slayer.z >= vals.slayerOld.minimumHighestSlayer || prof.slayer.s >= vals.slayerOld.minimumHighestSlayer || prof.slayer.w >= vals.slayerOld.minimumHighestSlayer);
            if (vals.slayerOld.xpAndMinimum) slayerCheck = (slayerCheck && prof.slayer.xp >= vals.slayerOld.xp);
            else slayerCheck = (slayerCheck || prof.slayer.xp >= vals.slayerOld.xp);
            let text = utils.circle(prof.minions >= vals.minions) + (prof.skills === -1 ? utils.circle(-1) : utils.circle(prof.skills >= vals.skillsOld)) + utils.circle(slayerCheck) + (prof.wealth === -1 ? utils.circle(-1) : utils.circle(prof.wealth >= vals.wealth)) + (prof.wealth === -1 ? utils.circle(-1) : utils.circle(prof.talismans >= vals.talismans));
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
            if (mainColor == "#00FF00") {
                break;
            }
            let todo = [];
            if (text.includes("yellow")) {
                todo.push("Enable API");
            }
            let types = ["Minions", "Skills", "Slayer", "Wealth", "Talismans"];
            let colors = text.replace(/_circle:/g, ",").replace(/:/g, '').split(",");
            for (let i = 0; i < colors.length; i++) {
                if (colors[i] == "red" || colors[i] == "blue") {
                    if (types[i] == "Slayer") {
                        todo.push(`${types[i]} (${prof.slayer.xp} | ${prof.slayer.z}/${prof.slayer.s}/${prof.slayer.w})`);
                    } else if (["Skills", "Wealth"].includes(types[i])) {
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
        if (mainColor === "#FFFF00") { //If API is disabled
            let ach = res.hyplayer.player.achievements;
            let skill = 0;
            for (let name of ["combat", "angler", "gatherer", "excavator", "harvester", "augmentation", "concoctor", "domesticator"]) {
                skill += ach["skyblock_" + name];
            }
            skill /= 8;
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
        embed.send().catch(e => console.error(e));
    }
}

function createRequirementField(embed, profId, prof, vals, slayerCheck, newReqs = false) {
    embed.field(profId,
        (!newReqs ? `${prof.minions >= vals.minions ? ":green_circle:" : ":red_circle:"} - Minions: ${prof.minions}/${vals.minions}\n` : "") +
        (prof.skills === -1 ? ":yellow_circle: Enable API\n" : (`${prof.skills >= vals.skills ? ":green_circle:" : ":red_circle:"} - Skill Average: ${prof.skills.toFixed(2)}/${vals.skills}\n`)) +
        `${slayerCheck ? ":green_circle:" : (prof.slayer.xp == 0 ? ":blue_circle:" : ":red_circle:")} - Slayer XP: ${parseInt(prof.slayer.xp).toLocaleString()}/${parseInt(vals.slayer.xp).toLocaleString()} \n` +
        (!newReqs ? (prof.wealth === -1 ? ":yellow_circle: Enable API\n" : (`${prof.wealth >= vals.wealth ? ":green_circle:" : ":red_circle:"} - Wealth: ${prof.wealth.toFixed(2)} points/${vals.wealth} \n`)) : "") +
        (!newReqs ? (prof.wealth === -1 ? ":yellow_circle: Enable API" : (`${prof.talismans >= vals.talismans ? ":green_circle:" : ":red_circle:"} - Talismans: ${prof.talismans}/${vals.talismans}`)) : ""));
    return embed;
}

bot.registerCommand("stats", stats, {
    description: "Get Player Stats!!",
    fullDescription: "Dude that literally ^",
    argsRequired: true,
    usage: `<username>`,
    cooldown: 3000,
    cooldownMessage: "Chill b*tch!",
});

bot.registerCommand("online", isOnline, {
    description: "Check Player online!",
    fullDescription: "Chck whether a person is online",
    argsRequired: true,
    usage: `<username>`,
    cooldown: 3000,
    cooldownMessage: "... Let me fish in Peace"
});

async function isOnline(msg, args) {
    bot.sendChannelTyping(msg.channel);
    let player;
    try {
        player = await api.getPlayer(args[0]);
    } catch {
        return ("Player not Found");
    }
    const status = await api.getStatus(player.id);
    return status.online ? `:green_circle: ${args[0]} is online playing ${utils.gameList[status.gameType]}  ` : `:red_circle: ${args[0]} is offline`;
}


async function stats(msg, args) {
    bot.sendChannelTyping(msg.channel.id);
    let timeStart = Date.now();
    let timeTaken = new Date();
    let res = await getStats(args[0]);
    if (typeof (res) !== typeof ({})) {
        await bot.createEmbed(msg.channel.id).title("Stats").author(args[0]).description(res).color("#FF0000").footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`).send();
        return;
    }
    let embed = bot.createEmbed(msg.channel.id);
    embed.title("Stats");
    embed.author(res.player.name, `https://crafatar.com/avatars/${res.player.id}?overlay`);
    for (let profile in res.stats) {
        let pf = res.stats[profile];
        embed.field(profile, `**Minions:**\n${pf.minions}\n**Skill Average:**\n${pf.skills === -1 ? "Enable API" : (`${pf.skills.toFixed(2)}\n With Progress:\n${pf.skills2.toFixed(2)}`)} \n**Slayer XP:**\n${pf.slayer.xp} | ${pf.slayer.z}/${pf.slayer.s}/${pf.slayer.w}\n**Wealth:**\n${pf.wealth === -1 ? "Enable API" : pf.wealth.toFixed(2)}\n**Talismans:**\n${pf.wealth === -1 ? "Enable API" : pf.talismans}\n**Score:**\n${pf.score === -1 ? "Enable API" : pf.score}`);
    }

    timeTaken = new Date(Date.now() - timeStart);
    embed.footer(`Done in ${(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
    await embed.send();
    return;
}

async function getStats(username, exploit = false) {
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
    let res = {
        player: player,
        hyplayer: hyplayer,
        sbp: sbp
    };
    if (sbp === null || sbp === undefined || !utils.isInNext(sbp, ['stats', 'SkyBlock', 'profiles'])) {
        return "This user has never played SkyBlock!";
    }
    let profiles = {};
    for (const pf of Object.values(sbp.stats.SkyBlock.profiles)) {
        let prof = await api.getProfile(pf.profile_id);
        if (prof === undefined || prof === null || prof.profile === null) break;
        let member = prof.profile.members[player.id];
        let minions = 0;
        let skill = -1;
        let pskill = -1;
        let score = -1;
        let slayer = {
            xp: 0,
            z: 0,
            s: 0,
            w: 0
        };
        for (const member of Object.values(prof.profile.members)) {
            if (!('crafted_generators' in member)) continue;
            minions += member.crafted_generators.length;
        }
        if (member.slayer_bosses !== undefined && member.slayer_bosses.zombie.xp !== undefined) {
            slayer.w = member.slayer_bosses.wolf.xp || 0;
            slayer.s = member.slayer_bosses.spider.xp || 0;
            slayer.z = member.slayer_bosses.zombie.xp || 0;
            slayer.xp = slayer.z + slayer.s + slayer.w;
        }
        if (utils.isIn(member, ['experience_skill_alchemy'])) {
            let combat = utils.fromExp(member.experience_skill_combat),
                farming = utils.fromExp(member.experience_skill_farming),
                fishing = utils.fromExp(member.experience_skill_fishing),
                foraging = utils.fromExp(member.experience_skill_foraging),
                mining = utils.fromExp(member.experience_skill_mining),
                alchemy = utils.fromExp(member.experience_skill_alchemy),
                enchanting = utils.fromExp(member.experience_skill_enchanting),
                taming = utils.fromExp(member.experience_skill_taming);
            skill = combat.a + farming.a + fishing.a + foraging.a + mining.a + alchemy.a + enchanting.a + taming.a;
            skill = skill / 8;
            pskill = combat.b + farming.b + fishing.b + foraging.b + mining.b + alchemy.b + enchanting.b + taming.b;
            pskill = pskill / 8;
            score = parseFloat(((pskill**4)*(1+(slayer.xp/100000))/10000).toFixed(2))
        }

        profiles[pf.cute_name] = {
            minions: minions,
            skills: skill,
            skills2: pskill,
            slayer: slayer,
            score
        };
        if (member.inv_contents !== undefined) {
            let items = [member.inv_armor.data, member.inv_contents.data];
            if (member.talisman_bag !== undefined) items.push(member.talisman_bag.data);
            if (member.ender_chest_contents !== undefined) items.push(member.ender_chest_contents.data);
            if (member.wardrobe_contents !== undefined) items.push(member.wardrobe_contents.data);
            let totals = await utils.checkWealthAndTalis(items, exploit, api);
            profiles[pf.cute_name].wealth = totals[0] + (prof.profile.banking ? (prof.profile.banking.balance) / 1000000 : 0) + member.coin_purse / 1000000;
            profiles[pf.cute_name].talismans = totals[1];
        } else {
            profiles[pf.cute_name].wealth = -1;
            profiles[pf.cute_name].talismans = -1;
        }
    }
    if (Object.keys(profiles).length === 0) {
        return "I am guesssing this idiot got wiped.";
    }
    res.stats = profiles;
    return res;
}
updateBazaarPrices();
bot.registerCommand("price", price, {
    description: "Check Price",
    fullDescription: "",
    argsRequired: true,
    usage: `<item_name>`,
    cooldown: 2500,
    cooldownMessage: "Just sell your stuff to the merchant dood!"
});
setInterval(updateBazaarPrices, 1000 * 10);
async function updateBazaarPrices() {
    bazaar = await api.getBazaar();
}

async function price(msg, args) {
    const search = args.join(" ").toUpperCase();
    let closest = [Infinity, null];
    for (item of Object.keys(bazaar)) {
        const score = stringCompare.get(search, item.replace("_", " "));
        if (score < closest[0]) {
            closest = [score, item];
        }
    }
    if (closest[1] === null || closest[0] > closest[1].length * 0.5) {
        return (`Ummm Are you sure that is an item? Did you mean ${closest[1]}`);
    }
    let embed = bot.createEmbed();
    embed.title(closest[1]);
    embed.color("#00AF00");
    embed.field("Sell Price: ", bazaar[closest[1]].quick_status.sellPrice.toFixed(2));
    embed.field("Buy Price: ", bazaar[closest[1]].quick_status.buyPrice.toFixed(2));


    // console.log(bazaar[closest[1]].quick_status.buyPrice);
    return ({
        embed: embed.sendable
    });
}

setInterval(updateOnlineStatus, 1000 * 60 * 5);
async function updateOnlineStatus() {
    const guild = await api.getGuild(vals.guildID);
    const guildMembers = guild.members.map(members => members.uuid);

    let statusArray = [];
    for (let i=0;i<guildMembers.length;i++) {
        let member = guildMembers[i];
        try{
            var status = await api.getStatus(member);
            var player = await api.getPlayerByUUID(member);
        }catch(e){
            i=i-1;
            continue
        }
        // embed._description += `:${status.online ? "green" : "red"}_circle: - ${player.name} ${status.gameType === undefined ? "" : "(" + status.gameType + ")"}\n`;
        statusArray.push({
            uuid: player.id,
            name: player.name,
            online: status.online,
            game: status.gameType
        });
    }
    guildMemberList = utils.deepCopy(statusArray);
    statusArray.sort((a, b) => !(a.online ^ b.online) ? (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1) : (a.online ? -1 : 1));
    let i = 0;
    let description = "";

    for (const status of statusArray) {
        if ((description + `:${status.online ? "green" : "red"}_circle: - ${status.name} ${status.game === undefined ? "" : "(" + utils.gameList[status.game] + ")"}\n`).length > 2048) {
            let embed = bot.createEmbed();
            embed.title("Online Status");
            embed.color("#00FF00");
            embed.description(description);
            bot.editMessage(vals.onlineStatus.channel, vals.onlineStatus.message[i], {
                content: "",
                embed: embed.sendable
            }).catch(e => console.error(e));
            i++;
            description = "";
        } else {
            description += `:${status.online ? "green" : "red"}_circle: - ${status.name} ${status.game === undefined ? "" : "(" + utils.gameList[status.game] + ")"}\n`;
        }

    }
    for (; i < 2; i++) {
        bot.editMessage(vals.onlineStatus.channel, vals.onlineStatus.message[i], "** **").catch(e => console.error(e));

    }

}

updateLeaderboards();
setInterval(updateLeaderboards, 1000 * 60 * 60 * 3);

bot.registerCommand("updateleaderboard", updateLeaderboardsCheck, {
    description: "Updates Leaderboard",
    fullDescription: "",
    argsRequired: false,
    usage: ``,
    cooldown: 8*60*1000,
    cooldownMessage: "Slow down!!"
});
async function updateLeaderboardsCheck(msg) {
    if (!["314197872209821699","213612539483914240","260470661732892672"].includes(msg.author.id)) return "I am afraid you don't have the permession to do that.";
    bot.createMessage(msg.channel.id,"Updating...");
    await updateLeaderboards();
    bot.createMessage(msg.channel.id,`@${msg.author.username} Updated leaderboards`);
}

async function updateLeaderboards() {
    if (guildMemberList === null) {
        try {
            await updateOnlineStatus();
        } catch (e) {
            console.error(e);
            return;
        }
    }
    let guildMemberListlocal = utils.deepCopy(guildMemberList);
    for(let i = 0;i < guildMemberListlocal.length; i++){
        await new Promise(r => setTimeout(r, 5000));
        let hyplayer;
        try {
            hyplayer = await api.gethypixelPlayer(guildMemberListlocal[i].uuid);
        } catch (e) {
            i = i - 1;
            continue;
        }
        if (hyplayer.player.achievements === undefined) {
            hyplayer.player.achievements = {};
        }

        guildMemberListlocal[i].minions = utils.getSlots(hyplayer.player.achievements.skyblock_minion_lover).b;
        guildMemberListlocal[i].fishing = hyplayer.player.achievements.skyblock_angler || 0;
        guildMemberListlocal[i].foraging = hyplayer.player.achievements.skyblock_gatherer || 0;
        guildMemberListlocal[i].mining = hyplayer.player.achievements.skyblock_excavator || 0;
        guildMemberListlocal[i].farming = hyplayer.player.achievements.skyblock_harvester || 0;
        guildMemberListlocal[i].enchanting = hyplayer.player.achievements.skyblock_augmentation || 0;
        guildMemberListlocal[i].alchemy = hyplayer.player.achievements.skyblock_concoctor || 0;
        guildMemberListlocal[i].combat = hyplayer.player.achievements.skyblock_combat || 0;
        guildMemberListlocal[i].taming = hyplayer.player.achievements.skyblock_domesticator || 0;
        guildMemberListlocal[i].average = parseFloat(((guildMemberListlocal[i].fishing + guildMemberListlocal[i].foraging + guildMemberListlocal[i].mining + guildMemberListlocal[i].farming + guildMemberListlocal[i].enchanting + guildMemberListlocal[i].alchemy + guildMemberListlocal[i].combat + guildMemberListlocal[i].taming) / 8).toFixed(2));
        guildMemberListlocal[i].sven = 0;
        guildMemberListlocal[i].spider = 0;
        guildMemberListlocal[i].revenant = 0;
        guildMemberListlocal[i].slayer = 0;
        guildMemberListlocal[i].profile = hyplayer.player;
        guildMemberListlocal[i].score = 0;
        if (hyplayer.player === null || hyplayer.player === undefined || !utils.isInNext(hyplayer.player, ['stats', 'SkyBlock', 'profiles'])) {
            continue;
        }

        for (const pf of Object.values(hyplayer.player.stats.SkyBlock.profiles)) {
            let prof;
            try {
                prof = await api.getProfile(pf.profile_id);
            } catch {
                continue;
            }

            if (prof === undefined || prof === null) continue;
            let member = prof.profile.members[guildMemberListlocal[i].uuid];
            if (utils.isIn(member, ['experience_skill_alchemy'])) {
                guildMemberListlocal[i].combat = (utils.fromExp(member.experience_skill_combat).b > guildMemberListlocal[i].combat ? utils.fromExp(member.experience_skill_combat).b : guildMemberListlocal[i].combat);
                guildMemberListlocal[i].farming = (utils.fromExp(member.experience_skill_farming).b > guildMemberListlocal[i].farming ? utils.fromExp(member.experience_skill_farming).b : guildMemberListlocal[i].farming);
                guildMemberListlocal[i].fishing = (utils.fromExp(member.experience_skill_fishing).b > guildMemberListlocal[i].fishing ? utils.fromExp(member.experience_skill_fishing).b : guildMemberListlocal[i].fishing);
                guildMemberListlocal[i].foraging = (utils.fromExp(member.experience_skill_foraging).b > guildMemberListlocal[i].foraging ? utils.fromExp(member.experience_skill_foraging).b : guildMemberListlocal[i].foraging);
                guildMemberListlocal[i].mining = (utils.fromExp(member.experience_skill_mining).b > guildMemberListlocal[i].mining ? utils.fromExp(member.experience_skill_mining).b : guildMemberListlocal[i].mining);
                guildMemberListlocal[i].alchemy = (utils.fromExp(member.experience_skill_alchemy).b > guildMemberListlocal[i].alchemy ? utils.fromExp(member.experience_skill_alchemy).b : guildMemberListlocal[i].alchemy);
                guildMemberListlocal[i].enchanting = (utils.fromExp(member.experience_skill_enchanting).b > guildMemberListlocal[i].enchanting ? utils.fromExp(member.experience_skill_enchanting).b : guildMemberListlocal[i].enchanting);
                guildMemberListlocal[i].taming = (utils.fromExp(member.experience_skill_taming).b > guildMemberListlocal[i].taming ? utils.fromExp(member.experience_skill_taming).b : guildMemberListlocal[i].taming);
                guildMemberListlocal[i].average = parseFloat(((guildMemberListlocal[i].fishing + guildMemberListlocal[i].foraging + guildMemberListlocal[i].mining + guildMemberListlocal[i].farming + guildMemberListlocal[i].enchanting + guildMemberListlocal[i].alchemy + guildMemberListlocal[i].combat + guildMemberListlocal[i].taming) / 8).toFixed(2));
               
            }
            guildMemberListlocal[i].sven = (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.wolf.xp || 0) > guildMemberListlocal[i].sven ? (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.wolf.xp || 0) : guildMemberListlocal[i].sven;
            guildMemberListlocal[i].spider = (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.spider.xp || 0) > guildMemberListlocal[i].spider ? (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.spider.xp || 0) : guildMemberListlocal[i].spider;
            guildMemberListlocal[i].revenant = (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.zombie.xp || 0) > guildMemberListlocal[i].revenant ? (member.slayer_bosses === undefined ? 0 : member.slayer_bosses.zombie.xp || 0) : guildMemberListlocal[i].revenant;
            guildMemberListlocal[i].slayer = (guildMemberListlocal[i].sven + guildMemberListlocal[i].spider + guildMemberListlocal[i].revenant) > guildMemberListlocal[i].slayer ? (guildMemberListlocal[i].sven + guildMemberListlocal[i].spider + guildMemberListlocal[i].revenant) : guildMemberListlocal[i].slayer;
    
        }
        guildMemberListlocal[i].score = (guildMemberListlocal[i].average**4)*(1+(guildMemberListlocal[i].slayer/100000))/10000
    }
    let createEmbeds = (array, sortSkill) => {
        let embedlist = [];
        array.sort((a, b) => b[sortSkill] - a[sortSkill]);
        let description = "```css\n";
        for (let index in array) {
            index = parseInt(index); //fuck you javadscript
            let text;
            if (["slayer", "revenant", "spider", "sven"].includes(sortSkill))
                text = `#${index + 1} ${array[index].name} [${array[index][sortSkill]} xp]` + (vals.og.includes(array[index].uuid) ? " (OG)\n" : "\n");
            else
                text = `#${index + 1} ${array[index].name} [${array[index][sortSkill].toFixed(2)}]` + (vals.og.includes(array[index].uuid) ? " (OG)\n" : "\n");
            if (((description + text).length > 2048-3)) {
                description += "```";
                let embed = bot.createEmbed();
                if(embedlist.length===0){
                    embed.title(sortSkill.charAt(0).toUpperCase() + sortSkill.slice(1));
                    embed.author("Upsi", "https://cdn.discordapp.com/icons/682608242932842559/661d3017a432d1b378fbc4e38d5adf84.png");
                }
                embed.description(description);
                embed.color("#00AAFF");
                embedlist.push(embed.sendable);
                description = "```css\n";
             }
            description = description + text;
            if(index + 1 === array.length){
                description += "```";
                embed = bot.createEmbed();
                embed.description(description);
                embed.color("#00AAFF");
                if(embedlist.length===0){
                    embed.author("Upsi", "https://cdn.discordapp.com/icons/682608242932842559/661d3017a432d1b378fbc4e38d5adf84.png");
                    embed.title(sortSkill.charAt(0).toUpperCase() + sortSkill.slice(1));
                }
                embedlist.push(embed.sendable);
            }
        }
        return embedlist;


    };
    for (skillName of Object.keys(vals.skillMessage)) {
        const embeds = createEmbeds(guildMemberListlocal, skillName);
        for (index = 0; index < 2; index++) {
            if (embeds[index] === undefined)
                bot.editMessage(vals.skillChannel, vals.skillMessage[skillName][index], {
                    content: "** **",
                    embed: {
                        description:"End of List",
                        color: 0x00AAFF,
                    }
                }).catch(e => console.error(e));
            else
                bot.editMessage(vals.skillChannel, vals.skillMessage[skillName][index], {
                    content: "** **",
                    embed: embeds[index]
                }).catch(e => console.error(e));
        }

    }
    let skillLastUpdatedembed = bot.createEmbed();
    skillLastUpdatedembed.color("#00AAFF");
    skillLastUpdatedembed.footer("Leaderboards were last updated ");
    skillLastUpdatedembed.timestamp(new Date());
    bot.editMessage(vals.skillChannel, vals.skillLastUpdated,{content:"** **",embed:skillLastUpdatedembed.sendable})

    // guildMembers = getRESTGuildMembers(682608242932842559);
    // for(member of guildMemberListlocal){
    //     if(member.average>=30 && member.slayer>=1200000){
    //         if(member.profile.socialMedia!== undefined && member.profile.socialMedia.links!== undefined && member.profile.socialMedia.links.DISCORD!== undefined){

    //         }
    //     }else if(member.average>=25 && member.slayer>=300000){

    //     }else if{

    //     }
    // }




    }
