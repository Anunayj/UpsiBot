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
        let embed = bot.createEmbed(this.channel);
        embed.title('Splash!');
        embed.description(msgList.reduce((total,now) => {
            return now.cleanContent + "\n" + total ;
        },""));
        embed.author(msgList[0].author.username,`https://cdn.discordapp.com/avatars/${msgList[0].author.id}/${msgList[0].author.avatar}.png`);
        embed.footer(`This Message was sent in ${msgList[0].channel.guild.name}` );
        embed.send();
    }

    async scrapeHandler(msg){

        const splashChannels = ['697514114314010684','693040475795357697','691764401878859816','688825369322586112','685965920883048523','688118738213666940','676139359216336935','675381164990529546','696195049737945108','693735172889116682','697250453863530546','696976351982256178','689625805600325705','697184943100657804'];
        if(splashChannels.includes(msg.channel.id)){

            if(msg.roleMentions.length>0 || msg.mentionEveryone){
                const msgList = (await scraperbot.getMessages(msg.channel.id,10)).filter((obj) => (obj.timestamp > msg.timestamp-60000) && obj.author === msg.author);
                this.sendSplashNotification(msgList);
                this.pastMessages[msg.author.id] = msg.id;
                setTimeout((that,id) =>{delete that.pastMessages[id];},1000*300,this,msg.author.id);
            }else if(Object.keys(this.pastMessages).includes(msg.author.id)){
                let msgtoEdit = (await bot.getMessages(this.channel)).filter((arr) => {
                    if(arr.embeds.length > 0 && arr.embeds[0].author !== undefined) 
                        return arr.embeds[0].author.name === msg.author.username;
                })[0]; 
                msgtoEdit.embeds[0].description = msgtoEdit.embeds[0].description +"\n"+ msg.cleanContent;
                bot.editMessage(msgtoEdit.channel.id,msgtoEdit.id,{embed:msgtoEdit.embeds[0]});
                
            }


        }
    }  

    
}

let splashHandler = new splashNotifier('697783449909461012');


//bot.on("messageCreate",(msg) => console.log(msg));
scraperbot.on("messageCreate", splashHandler.scrapeHandler.bind(splashHandler));

