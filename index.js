const EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");
const fs = require("fs");
const checks = require("./checks");
const utils = require("./utils");
const { NodeVM } = require('vm2');

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
}), new Eris(tokens.scraper)];

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
    output = await bot.createMessage(msg.channel.id, "Output:");
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
    cooldown: 7000,
    cooldownMessage: "Chill b*tch!"
});



async function checkRequirements(msg, args) {
    // if (args[0] === undefined) return "Invalid Usage! do req <username>";
    let exploit = true;
    let showAll = false;
    let simple = false;
    if (args.join(" ").includes("exploit")) exploit = false;
    if (args.join(" ").includes("all")) showAll = true;
    if (args.join(" ").includes("simple")) simple = true;
    try {
        bot.sendChannelTyping(msg.channel.id);
        let timeStart = Date.now();
        let embed = bot.createEmbed(msg.channel.id);
        embed.title("Requirement Checker");
        embed.author(args[0]); // TODO: Get player picture
        //embed.color('#0000FF');
        //embed.footer(`Working...`);
        // embed
        //     .field("Profiles:", "Getting Profiles...")
        //     .field("Minion Slots:", "Checking Slots...")
        //     .field("Average Skill:", "Checking Average Skill...")
        //     .field("Slayer XP:", "Checking Slayer...")
        //     .field("Wealth:", "Checking Wealth...")
        //     .field("Talismans:", "Checking Talismans...");
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
        if (skyblock_player === null || skyblock_player === undefined || !utils.isInNext(skyblock_player, ['stats', 'SkyBlock', 'profiles'])) {
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
        pfChecks[""] = { minions: utils.Failed, skills: utils.Failed, slayer: utils.Failed, wealth: utils.Failed, talismans: utils.Failed };
        for (let pf of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            profileNames.push(pf.cute_name);
            pfChecks[pf.cute_name] = { minions: utils.Failed, skills: utils.Failed, slayer: utils.Failed, wealth: utils.Failed, talismans: utils.Failed };
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
        //utils.replaceEmbed(embed, "Profiles:", profileNames.join(', '));
        //msg2 = await embed.send();
        //let embedid = msg2.id;
        let previousAttempts = {};
        for (const profile of Object.values(skyblock_player.stats.SkyBlock.profiles)) {
            // utils.replaceEmbed(embed, "Minion Slots:", `Checking Slots...`);
            // utils.replaceEmbed(embed, "Average Skill:", `Checking Average Skill...`);
            // utils.replaceEmbed(embed, "Slayer XP:", `Checking Slayer...`);
            // utils.replaceEmbed(embed, "Wealth:", `Checking Wealth...`);
            // utils.replaceEmbed(embed, "Talismans:", `Checking Talismans...`);
            //await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            //await new Promise(r => setTimeout(r, 1000));
            let ProObj = await api.getProfile(profile.profile_id);
            previousAttempts[profile.cute_name] = { minions: 0, skills: 0, slayer: { xp: 0, z: 0, s: 0, w: 0 }, wealth: 0, talismans: 0 };
            if (ProObj === undefined || ProObj === null) break;
            let member = ProObj.profile.members[player.id];
            check = checks.minions(embed, ProObj.profile.members, profile);
            previousAttempts[profile.cute_name].minions = check.val;
            pfChecks[profile.cute_name].minions = check.done;
            check = checks.skills(embed, member, profile);
            previousAttempts[profile.cute_name].skills = check.val;
            pfChecks[profile.cute_name].skills = check.done;
            check = checks.slayer(embed, member, profile);
            previousAttempts[profile.cute_name].slayer = check.val;
            pfChecks[profile.cute_name].slayer = check.done;
            if (member.inv_contents !== undefined) {
                let items = [member.talisman_bag.data, member.inv_armor.data, member.inv_contents.data, member.ender_chest_contents.data];
                totals = await utils.checkWealthAndTalis(items, exploit, api);
                // await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
                check = checks.wealth(embed, totals[0], profile);
                previousAttempts[profile.cute_name].wealth = check.val;
                pfChecks[profile.cute_name].wealth = check.done;
                check = checks.talismans(embed, totals[1], profile);
                previousAttempts[profile.cute_name].talismans = check.val;
                pfChecks[profile.cute_name].talismans = check.done;
            } else {
                // utils.replaceEmbed(embed, `Wealth:`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for wealth checks`);
                // utils.replaceEmbed(embed, `Talismans:`, `:yellow_circle: API access is disabled on profile ${profile.cute_name} for talisman checks`);
                previousAttempts[profile.cute_name].wealth = 0;
                pfChecks[profile.cute_name].wealth = utils.Unable;
                previousAttempts[profile.cute_name].talismans = 0;
                pfChecks[profile.cute_name].talismans = utils.Unable;
            }
            //await bot.editMessage(msg.channel.id, embedid, { embed: embed.sendable });
            previousName = profile.cute_name;
            if (utils.check(pfChecks[profile.cute_name]) == utils.Success && !showAll) break;
            //await new Promise(r => setTimeout(r, 2000)); //possible cooldown for rate limiting
        }
        delete pfChecks[""];
        embed._fields = [];
        embed._description = "";
	if (simple) {
	    for (var profId in previousAttempts) {
		let prof = pfChecks[profId];
		let vals = previousAttempts[profId];
		embed.field(profId, `${utils.colorC(prof.minions)} - Minions: ${vals.minions}/275 ${(vals.minions<275 ? "Craft them ~~slaves~~minions" : "")}\n${utils.colorC(prof.skills)} - Skill Average: ${parseFloat(vals.skills).toFixed(2)}/18 ${(vals.skills<18 ? "Less talky talky, more grindy grindy" : (parseFloat(vals.skills - 18).toFixed(2)) + " higher skill average")}\n${utils.colorC(prof.slayer, vals.slayer.xp == 0)} - Slayer XP: ${vals.slayer.xp}/30k ${vals.slayer.xp < 30000 ? "Noob, do " + (30000-vals.slayer.xp)/500 + " more t4s" : ""}\n${utils.colorC(prof.wealth)} - Wealth: ${vals.wealth}/19 ${vals.wealth < 19 ? "Haha u broke kid" : ""}\n${utils.colorC(prof.talismans)} - Talismans: ${vals.talismans}/239 ${vals.talismans < 239 ? "Talismans. Now. U bot." : ""}`);
	    }
	    embed.color("#FFFFFF");
	    timeTaken = new Date(Date.now() - timeStart);
	    embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
	    await embed.send();
	    return;
	}
        let mainColor = "#FF0000";
        for (var profId in previousAttempts) {
            let prof = pfChecks[profId];
            embed.field(`${profId}`, utils.colorC(prof.minions) + utils.colorC(prof.skills) + utils.colorC(prof.slayer, previousAttempts[profId].slayer.xp == 0) + utils.colorC(prof.wealth) + utils.colorC(prof.talismans));
            color = utils.colorFromProf(prof);
            if (color == "green") {
                mainColor = "#00FF00";
                if (!showAll) break;
            } else if (color == "yellow" && mainColor != "#00FF00") {
                mainColor = "#FFFF00";
            } else if (color == "red") {
                mainColor = "#FF0000";
            } else if (color == "blue") {
                mainColor == "#0000FF";
            }
            let todo = utils.todo(pfChecks[profId], previousAttempts[profId]);
            if (color == "yellow") {
		if (todo=="")
		    todo = "Enable API"
		else
		    todo += ", Enable API"
                embed.field("TODO:", todo);
            } else if (color == "red") {
                embed.field("TODO:", todo);
            } else if (color == "blue") {
                embed.field("TODO:", "Slayer (Current: 0 | 0/0/0)");
            }
        }
        if(mainColor==="#FFFF00" || showAll){ //If API is disabled
            const skill = (hyplayer.player.achievements.skyblock_combat+
                hyplayer.player.achievements.skyblock_angler+
                hyplayer.player.achievements.skyblock_gatherer+
                hyplayer.player.achievements.skyblock_excavator+
                hyplayer.player.achievements.skyblock_harvester+
                hyplayer.player.achievements.skyblock_augmentation+
                hyplayer.player.achievements.skyblock_concoctor)/7;
            const crafts = hyplayer.player.achievements.skyblock_minion_lover;
            embed.field("Achievements API:",
            `Skills: ${skill.toFixed(2)} ${skill>=18 ? ":green_circle:" : ":red_circle:"}`+
            `, Minions: ${crafts} ${crafts>=275 ? ":green_circle:" : ":red_circle:"}`)
        }
        timeTaken = new Date(Date.now() - timeStart);
        embed.footer(`Done in ${parseFloat(timeTaken.getSeconds() + (timeTaken.getMilliseconds() / 1000)).toFixed(2)}s!`);
        embed.color(mainColor);
        embed.send();
        return;
    } catch (e) {
        console.log(e);
        return "Some unknown error occured, please try again.";
    }
}
