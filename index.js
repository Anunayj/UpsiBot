EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");
const hypixel = require("./api");

try{
    tokens = require('./env.json'); //Don't change the var to smth else: https://stackoverflow.com/a/40925135/6011878
}catch(e){
    tokens = {main:process.env.mainToken,scraper:process.env.scraperToken,hypixel:process.env.hypixelToken};
    if(tokens.main === undefined || tokens.scraper === undefined || process.env.hypixelToken === undefined)
    throw "Tokens are missing!";
}
const api = new hypixel.Client(tokens.hypixel);


const [bot,scraperbot] = [new Eris.CommandClient(tokens.main,{},{
    description: "A bot.....",
    owner: "Anunay",
    prefix: "~"
}), new Eris(tokens.scraper)];
bot.connect().catch(() => {throw "Unable to connect";});
scraperbot.connect().catch(() => {throw "Unable to connect";});

class splashNotifier{
    constructor(channel){
        this.channel = channel;
        this.pastMessages = {};
    }

    sendSplashNotification(msgList){


        const totalmsg = msgList.reduce((total,now) => {
            return now.cleanContent + "\n" + total ;
        },"");
        if(totalmsg.match(/\d+\s?K/i)!==null) return;

        let embed = bot.createEmbed(this.channel);
        const title = totalmsg.match(/((party|p) join \w+|HUB\s?\d+)/i);
        if(title!==null) embed.title(title[0]);
        else embed.title("Splash");
        embed.description(totalmsg);
        embed.author(msgList[0].author.username,`https://cdn.discordapp.com/avatars/${msgList[0].author.id}/${msgList[0].author.avatar}.png`);
        embed.footer(`This Message was sent in ${msgList[0].channel.guild.name}` );
        embed.send();
        embed.send(bot,'682665951002755164');
    }

    async scrapeHandler(msg){

        const splashChannels = ['697514114314010684','693040475795357697','691764401878859816','688825369322586112','685965920883048523','688118738213666940','676139359216336935','675381164990529546','696195049737945108','693735172889116682','697250453863530546','696976351982256178','689625805600325705','697184943100657804'];
        if(splashChannels.includes(msg.channel.id)){

            if(msg.roleMentions.length>0 || msg.mentionEveryone){
                const msgList = (await scraperbot.getMessages(msg.channel.id,10)).filter((obj) => (obj.timestamp > msg.timestamp-180000) && obj.author === msg.author);
                this.sendSplashNotification(msgList);
                this.pastMessages[msg.author.id] = msg.id;
                setTimeout((that,id) =>{delete that.pastMessages[id];},1000*300,this,msg.author.id);
            }else if(Object.keys(this.pastMessages).includes(msg.author.id)){
                let msgtoEdit = (await bot.getMessages(this.channel)).filter((arr) => {
                    if(arr.embeds.length > 0 && arr.embeds[0].author !== undefined) 
                        return arr.embeds[0].author.name === msg.author.username;
                })[0]; 
                msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description +"\n"+ msg.cleanContent;
                const title = msg.cleanContent.match(/((party|p) join \w+|HUB\s?\d+)/i);
                if(title!==null) msgtoEdit.embeds[0].title = title[0];
                bot.editMessage(msgtoEdit.channel.id,msgtoEdit.id,{embed:msgtoEdit.embeds[0]});
                
                // TODO FIX THIS
                let othermsgtoEdit = (await bot.getMessages("682665951002755164")).filter((arr) => {
                    if(arr.embeds.length > 0 && arr.embeds[0].author !== undefined) 
                        return arr.embeds[0].author.name === msg.author.username;
                })[0]; 
                othermsgtoEdit.embeds[0].description = othermsgtoEdit.embeds[0].description +"\n"+ msg.cleanContent;
                if(title!==null) othermsgtoEdit.embeds[0].title = title[0];
                bot.editMessage(othermsgtoEdit.channel.id,othermsgtoEdit.id,{embed:othermsgtoEdit.embeds[0]});



            }


        }
    }  

    
}

let splashHandler = new splashNotifier('697783449909461012');
scraperbot.on("messageCreate", splashHandler.scrapeHandler.bind(splashHandler));

bot.on("messageCreate",(msg) => {
    if(msg.author.bot) return;
    content = msg.cleanContent.match(/\b(I'm|I am|I\s?m)\s(.*)/i);
    if(content!==null) bot.createMessage(msg.channel.id, `Hi ${content[2]}, I am ᴉsd∩`);
   
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
    },{argsRequired:true,usage:"rep <username>"});



async function checkRequirements(msg,args){
    let last = await bot.createMessage(msg.channel.id,"Checking Minion Slots... ");
    let player,hyplayer;
    try{
        player = await api.getPlayer(args[0]);
        hyplayer = await api.gethypixelPlayer(player.id);
    }catch{
        return("Invalid username!");
    }
    if(hyplayer.player.achievements.skyblock_minion_lover>275) bot.editMessage(last.channel.id,last.id,last.content+=":green_circle:");
    else bot.editMessage(last.channel.id,last.id,last.content+=`:red_circle: Unique Crafts = ${skyblock_minion_lover}`);
    last = await bot.createMessage(msg.channel.id,"Checking Skills... ");

    total = hyplayer.player.achievements.skyblock_combat+hyplayer.player.achievements.skyblock_angler+hyplayer.player.achievements.skyblock_gatherer+hyplayer.player.achievements.skyblock_excavator+hyplayer.player.achievements.skyblock_harvester+hyplayer.player.achievements.skyblock_augmentation+hyplayer.player.achievements.skyblock_concoctor;
    if(total>=7*18) bot.editMessage(last.channel.id,last.id,last.content+=":green_circle:");
    else bot.editMessage(last.channel.id,last.id,last.content+=`:red_circle: Average Skill = ${total/7}`);
    // profile_ids = Object.values(hyplayer.player.stats.SkyBlock.profiles)[0].profile_id;
    // res = await api.getProfile(proid);
    for(const profile of Object.values(hyplayer.player.stats.SkyBlock.profiles)){
        let fail = false;
        last = await bot.createMessage(msg.channel.id,`Checking Slayer on Profile ${profile.cute_name} ... `);
        let ProObj = await api.getProfile(profile.profile_id);
        const slayerxp = ProObj.profile.members[player.id].slayer_bosses.wolf.xp + 
        ProObj.profile.members[player.id].slayer_bosses.wolf.xp + 
        ProObj.profile.members[player.id].slayer_bosses.spider.xp;
        if( (slayerxp > 30000) && 
            (ProObj.profile.members[player.id].slayer_bosses.wolf.xp > 20000 || 
            ProObj.profile.members[player.id].slayer_bosses.wolf.xp > 20000 || 
            ProObj.profile.members[player.id].slayer_bosses.spider.xp > 20000))
            bot.editMessage(last.channel.id,last.id,last.content+=":green_circle:");
        else {bot.editMessage(last.channel.id,last.id,last.content+=`:red_circle: Slayer XP  = ${slayerxp}`); fail = true;}
        
        // const weights = {"REAPER_SWORD":9001};
    
        // let totalWorth=0;
        // for(const inv of [res.profile.members[player.id].inv_contents.data,res.profile.members[player.id].ender_chest_contents.data]){
        //     for(const name of itr(api.parseInventory(inv))){
        //         if(weights[name]!==undefined) totalWorth+=weights[name];
        //     }
        // }
        // if(totalWorth>=100)
        if(!fail) break;
    }

}
function* itr(inv){
    const backpackid = ["GREATER_BACKPACK","LARGE_BACKPACK","MEDIUM_BACKPACK","SMALL_BACKPACK"];
    for(const item of inv){
        if(item.tag === undefined || item.tag.ExtraAttributes === undefined) continue;
        const id = item.tag.ExtraAttributes.id;
        // Or do you like: if(backpacks.includes(id)) for (let j of itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase()+"_data"]))) yield j;
        if(backpackid.includes(id)){
            const back = itr(api.parseInventory(item.tag.ExtraAttributes[id.toLowerCase()+"_data"]));
            for (let j of back){
                yield j;
            }
        }else yield id;
    }

}
