EmbedBuilder = require('eris-embed-builder');
const Eris = require("eris");



let tokens;
try{
    tokens = require('./env.json'); //Don't change the var to smth else: https://stackoverflow.com/a/40925135/6011878
}catch(e){
    tokens = {main:process.env.mainToken,scraper:process.env.scraperToken};
    if(tokens.main === undefined || tokens.scraper == undefined)
    throw "Tokens are missing!";
}

const [bot,scraperbot] = [new Eris(tokens.main), new Eris(tokens.scraper)];
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
   content = msg.cleanContent.match(/(I'm|I am|I\s?m)(.*)/i);
   if(content!==null) bot.createMessage(msg.channel.id, `Hi${content[2]}, I am ᴉsd∩`);
   
});

