EmbedBuilder = require('eris-embed-builder');
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
        embed.send();
        embed.send(bot, '682665951002755164');
    }

    async scrapeHandler(msg) {

        const splashChannels = await JSON.parse(fs.readFileSync("file.json"));
        if (splashChannels.includes(msg.channel.id)) {

            if (msg.roleMentions.length > 0 || msg.mentionEveryone) {
                const msgList = (await scraperbot.getMessages(msg.channel.id, 10)).filter((obj) => (obj.timestamp > msg.timestamp - 180000) && obj.author === msg.author);
                this.sendSplashNotification(msgList);
                this.pastMessages[msg.author.id] = msg.id;
                setTimeout((that, id) => { delete that.pastMessages[id]; }, 1000 * 300, this, msg.author.id);
            } else if (Object.keys(this.pastMessages).includes(msg.author.id)) {
                let msgtoEdit = (await bot.getMessages(this.channel)).filter((arr) => {
                    if (arr.embeds.length > 0 && arr.embeds[0].author !== undefined)
                        return arr.embeds[0].author.name === msg.author.username;
                })[0];
                msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description + "\n" + msg.cleanContent;
                const title = msg.cleanContent.match(/((party|p) join \w+|HUB\s?\d+)/i);
                if (title !== null) msgtoEdit.embeds[0].title = title[0];
                bot.editMessage(msgtoEdit.channel.id, msgtoEdit.id, { embed: msgtoEdit.embeds[0] });

                // TODO FIX THIS
                let othermsgtoEdit = (await bot.getMessages("682665951002755164")).filter((arr) => {
                    if (arr.embeds.length > 0 && arr.embeds[0].author !== undefined)
                        return arr.embeds[0].author.name === msg.author.username;
                })[0];
                othermsgtoEdit.embeds[0].description = othermsgtoEdit.embeds[0].description + "\n" + msg.cleanContent;
                if (title !== null) othermsgtoEdit.embeds[0].title = title[0];
                bot.editMessage(othermsgtoEdit.channel.id, othermsgtoEdit.id, { embed: othermsgtoEdit.embeds[0] });



            }


        }
    }


}

let splashHandler = new splashNotifier('697783449909461012');
scraperbot.on("messageCreate", splashHandler.scrapeHandler.bind(splashHandler));

bot.on("messageCreate", (msg) => {
    if (msg.author.bot) return;
    content = msg.cleanContent.match(/\b(I'm|I am|I\s?m)\s(.*)/i);
    if (content !== null) bot.createMessage(msg.channel.id, `Hi ${content[2]}, I am ᴉsd∩`);

});


bot.registerCommand("ping", "Pong!", { // Make a ping command
    // Responds with "Pong!" when someone says "!ping"
    description: "Pong!",
    fullDescription: "This command could be used to check if the bot is up. Or entertainment when you're bored."
});
bot.registerCommand("req", checkRequirements, { // Make a ping command
    // Responds with "Pong!" when someone says "!ping"
    description: "Check Requirements!!",
    fullDescription: "Dude that literally ^"
}, { argsRequired: true, usage: `rep <username>`, cooldown: 7000 });



async function checkRequirements(msg, args) {
    if (args[0] === undefined) return "Invalid Usage! do req <username>";
    exploit = true;
    if (args[1] == "exploit") exploit = false;
    try {
        let last = await bot.createMessage(msg.channel.id, "Checking Minion Slots... ");
        let player, hyplayer;
        try {
            player = await api.getPlayer(args[0]);
            hyplayer = await api.gethypixelPlayer(player.id);
        } catch (e) {
            return ("Invalid username!");
        }
        try {
            if (hyplayer.player.achievements.skyblock_minion_lover > 275) await bot.editMessage(last.channel.id, last.id, last.content += ":green_circle:");
            else await last.edit(last.content += `:red_circle: Unique Crafts = ${hyplayer.player.achievements.skyblock_minion_lover}`);
            last = await bot.createMessage(msg.channel.id, "Checking Skills... ");

            total = hyplayer.player.achievements.skyblock_combat + hyplayer.player.achievements.skyblock_angler + hyplayer.player.achievements.skyblock_gatherer + hyplayer.player.achievements.skyblock_excavator + hyplayer.player.achievements.skyblock_harvester + hyplayer.player.achievements.skyblock_augmentation + hyplayer.player.achievements.skyblock_concoctor;
            if (total >= 7 * 18) await last.edit(last.content += ":green_circle:");
            else await last.edit(last.content += `:red_circle: Average Skill = ${(total/7).toFixed(2)}`);

        } catch (e) {
            await last.edit(last.content += "Has this dude even played SkyBlock ever?");

            return;
        }
        // profile_ids = Object.values(hyplayer.player.stats.SkyBlock.profiles)[0].profile_id;
        // res = await api.getProfile(proid);
        for (const profile of Object.values(hyplayer.player.stats.SkyBlock.profiles)) {
            let fail = false;
            last = await bot.createMessage(msg.channel.id, `Checking Slayer on Profile ${profile.cute_name} ... `);
            let ProObj = await api.getProfile(profile.profile_id);
            if (ProObj.profile.members[player.id].slayer_bosses === undefined) {
                await last.edit(last.content += `:yellow_circle: API access is disabled.`);
                continue;
            }
            const slayerxp = ProObj.profile.members[player.id].slayer_bosses.wolf.xp +
                ProObj.profile.members[player.id].slayer_bosses.zombie.xp +
                ProObj.profile.members[player.id].slayer_bosses.spider.xp;
            if ((slayerxp > 30000) &&
                (ProObj.profile.members[player.id].slayer_bosses.wolf.xp > 20000 ||
                    ProObj.profile.members[player.id].slayer_bosses.zombie.xp > 20000 ||
                    ProObj.profile.members[player.id].slayer_bosses.spider.xp > 20000))
                await last.edit(last.content += ":green_circle:");
            else {
                await last.edit(last.content += `:red_circle: Slayer XP  = ${slayerxp}`);
                fail = true;
            }

            last = await bot.createMessage(msg.channel.id, `Checking Wealth on Profile ${profile.cute_name} ... `);


            if (ProObj.profile.members[player.id].inv_contents !== undefined) {

                let totalWorth = 0;
                let totalTalisman = 0;
                let duplicates = [];
                outside: //HOLY SHIT
                    for (const inv of[ProObj.profile.members[player.id].talisman_bag.data, ProObj.profile.members[player.id].inv_armor.data, ProObj.profile.members[player.id].inv_contents.data, ProObj.profile.members[player.id].ender_chest_contents.data]) {
                        for (const item of itr(api.parseInventory(inv))) {
                            if (weights[item.ExtraAttributes.id] !== undefined) totalWorth += weights[item.ExtraAttributes.id];
                            if (item.ExtraAttributes.id == "MIDAS_SWORD") totalWorth += item.ExtraAttributes.winning_bid / 1000000;
                            if (item.ExtraAttributes.id == "SCORPION_FOIL") totalWorth += 5 + item.ExtraAttributes.wood_singularity_count * 2;
                            if (item.ExtraAttributes.id == "TACTICIAN_SWORD") totalWorth += item.ExtraAttributes.wood_singularity_count * 2;
                            if ((!duplicates.includes(item.ExtraAttributes.id)) || exploit) {
                                totalTalisman += getTalismanValue(item);
                                duplicates.push(item.ExtraAttributes.id);
                            }
                            if (totalWorth >= 20 && totalTalisman >= 200) break outside;
                        }
                    }

                if (totalWorth >= 20) await last.edit(last.content += ":green_circle:");
                else {
                    await last.edit(last.content += `:red_circle: Worth = ${totalWorth}, if you did not have stuff in inevntory, try again.`);
                    fail = true;
                }
                if (totalTalisman >= 200) await bot.createMessage(msg.channel.id, `Checking Talisman on Profile ${profile.cute_name} ... :green_circle: `);
                else {
                    await bot.createMessage(msg.channel.id, `Checking Talisman on Profile ${profile.cute_name} ... :red_circle: Talisman score: ${totalTalisman} `);
                    fail = true;
                }
            } else {
                await last.edit(last.content += `:yellow_circle: API access is disabled.`);
                fail = true;
            }
            if (!fail) break;
            // await new Promise(r => setTimeout(r, 1000)); //possible cooldown for rate limiting
        }
    } catch (e) {
        console.log(e);
        return "Some unknown error occured, please try again.";
    }
}

function getTalismanValue(item) {
    try {
        const regex = item.display.Lore[item.display.Lore.length - 1].match(/§.§.(.*) ACCESSORY/);
        if (regex === undefined) return 0;
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
        // Or do you like: if(backpacks.includes(id)) for (let j of itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase()+"_data"]))) yield j;
        if (backpackid.includes(id)) {
            const back = itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase() + "_data"]));
            for (let j of back) {
                yield j;
            }
        } else yield item.tag;
    }

}