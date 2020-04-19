const EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");
const fs = require("fs");
const checks = require("./checks");
const utils = require("./utils");

try {
    tokens = require('./env.json');
} catch (e) {
    tokens = { main: process.env.mainToken, scraper: process.env.scraperToken, hypixel: process.env.hypixelToken };
    if (tokens.main === undefined || tokens.scraper === undefined || process.env.hypixelToken === undefined)
        throw "Tokens are missing!";
}

const api = new hypixel.Client(tokens.hypixel);
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
        embed
            .field("Profiles:", "Getting Profiles...")
            .field("Minion Slots:", "Checking Slots...")
            .field("Average Skill:", "Checking Average Skill...")
            .field("Slayer XP:", "Checking Slayer...")
            .field("Wealth:", "Checking Wealth...")
            .field("Talismans:", "Checking Talismans...");
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
            embed._fields = [];
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
            embed._fields = [];
            embed.description("This user has never played SkyBlock!");
            timeTaken = new Date(Date.now() - timeStart);
            embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
            msg2 = await embed.send();
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            return;
        }
        let pfChecks = {};
        let profileNames = [];
        pfChecks[""] = { minions: Failed, skills: Failed, slayer: Failed, wealth: Failed, talismans: Failed };
        for (let pf of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            profileNames.push(pf.cute_name);
            pfChecks[pf.cute_name] = { minions: Failed, skills: Failed, slayer: Failed, wealth: Failed, talismans: Failed };
        }
        if (profileNames.length == 0) {
            embed._fields = [];
            embed.description("This user has never played SkyBlock!");
            timeTaken = new Date(Date.now() - timeStart);
            embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}!`);
            msg2 = await embed.send();
            // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            return;
        }
        //embed._description = "**Profiles:**;\n" + profileNames.join(', ') + "\n\n" + embed._description;
        embed.description(embed._description);
        msg2 = await embed.send();
        let embedid = msg2.id;
        let completed = [];
        let previousAttempts = {};
        for (const profile of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            let ProObj = await api.getProfile(profile.profile_id);
            if (ProObj === undefined || ProObj === null) break;
            let member = ProObj.profile.members[player.id];
            previousAttempts[profile.cute_name] = {};
            let prev = getIn(previousAttempts, [previousName], { "slots": 0, "average_skill": 0, "slayer_xp": 0, "zombie": 0, "spider": 0, "wolf": 0, "wealth": 0, "talismans": 0 });
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} (${prev.slots})`, `Checking Slots...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} (${prev.average_skill})`, `Checking Average Skill...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} (${prev.slayer_xp} | ${prev.zombie}/${prev.spider}/${prev.wolf})`, `Checking Slayer...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for slayer checks`, `Checking Slayer...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for wealth checks`, `Checking Wealth...`);
            embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for talisman checks`, `Checking Talismans...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} (${prev.wealth})`, `Checking Wealth...`);
            embed._description = embed._description.replace(`:red_circle: on profile ${previousName} (${prev.talismans})`, `Checking Talismans...`);
            embed.description(embed._description);
            if (pfChecks[previousName].minions != 1) {
                check = checks.minions(embed, ProObj.profile.members, profile);
                previousAttempts[profile.cute_name].minions = check.val;
                pfChecks[profile.cute_name].minions = check.done;
            }
            if (pfChecks[previousName].skill != 1) {
                check = checks.skills(embed, ProObj.profile.members, profile);
                previousAttempts[profile.cute_name].skill = check.val;
                pfChecks[profile.cute_name].skills = check.done;
            }
            if (pfChecks[previousName].slayer != 1) {
                pfChecks[profile.cute_name].slayer = checks.slayer(embed, member, profile);
            }
            if (pfChecks[previousName].wealth != 1 || pfChecks[previousName].talismans != 1) {
                if (member.inv_contents !== undefined) {
                    let items = [member.talisman_bag.data, member.inv_armor.data, member.inv_contents.data, member.ender_chest_contents.data];
                    totals = await utils.checkWealthAndTalis(items, exploit);
                    // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                    if (!wealthdone) {
                        check = checks.wealth(embed, totals[0], profile);
                        previousAttempts[previousName].wealth = check.val;
                        pfChecks[profile.cute_name].wealth = check.done;
                    }
                    if (!talidone) {
                        check = checks.talismans(embed, totals[1], profile);
                        previousAttempts[previousName].talismans = check.val;
                        pfChecks[profile.cute_name].talismans = check.done;
                    }
                    await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                } else {
                    embed._description = embed._description.replace(`Checking Wealth...`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for wealth checks`);
                    embed._description = embed._description.replace(`Checking Talismans...`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for talisman checks`);
                    embed.description(embed._description);
                    await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                    previousAttempts[previousName].wealth = 0;
                    pfChecks[profile.cute_name].wealth = Unable;
                    previousAttempts[previousName].talismans = 0;
                    pfChecks[profile.cute_name].talismans = Unable;
                }
            }
            previousName = profile.cute_name;
            if (check(pfChecks[profile.cute_name]) == Success) break;
            await new Promise(r => setTimeout(r, 1000)); //possible cooldown for rate limiting
        }
        // if (embed._description.includes(":red_circle:") || embed._description.includes(":yellow_circle:")) {
        //     let prev = previousAttempts[previousName];
        //     embed._description = embed._description.replace(`profile ${previousName} with ${prev.slots} crafted minions`, `all profiles`);
        //     embed._description = embed._description.replace(`profile ${previousName} with ${prev.average_skill} average skill`, `all profiles`);
        //     embed._description = embed._description.replace(`profile ${previousName} with ${prev.slayer_xp} slayer xp (Z:${prev.zombie} S:${prev.spider} W:${prev.wolf})`, `all profiles`);
        //     embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for slayer checks`, `:red_circle: on all profiles`);
        //     embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for wealth checks`, `:red_circle: on all profiles`);
        //     embed._description = embed._description.replace(`:yellow_circle: API access is disabled on profile ${previousName} for talisman checks`, `:red_circle: on all profiles`);
        //     embed._description = embed._description.replace(`profile ${previousName} with ${prev.wealth} wealth`, `all profiles`);
        //     embed._description = embed._description.replace(`profile ${previousName} with ${prev.talismans} talisman score`, `all profiles`);
        // }
        embed._description = "";
        let profiles = [];
        for (var prof of previousAttempts) {
            embed.description = utils.color(prof.minions) +
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