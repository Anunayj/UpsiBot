const Eris = require("eris");
const hypixel = require("./api");
const {
    JsonDB
} = require('node-json-db');
const {
    Config
} = require('node-json-db/dist/lib/JsonDBConfig');
require('dotenv').config()


roles = {
    "746132425125527643":"746164327911784468",
    "746716479021514754":"746715456747864066"
}


class EggSi extends Eris.CommandClient{
    constructor(db = new JsonDB(new Config("eggsiDatabase", true, true, '/')),
    api = new hypixel.Client(process.env.hypixelToken),
    ...args){

        super(...args);
        this.db = db;
        this.api = api;
        this.registerCommand("ping", "pong!", {
            description: "PONG!",
        });
        this.on("messageCreate",function (msg){
            if(Object.keys(roles).includes(msg.channel.id)){
                this.deleteMessage(msg.channel.id, msg.id);
            }
            if(msg.cleanContent.startsWith("-verify") || msg.cleanContent.startsWith("~verify")){
                if(!Object.keys(roles).includes(msg.channel.id)) return;
                this.verify(msg,msg.cleanContent.split(" ").slice(1));
                return;
            }
        }.bind(this))
    }

    async verify(msg,args){
        // this.sendChannelTyping(msg.channel.id);
        let dm = this.getDMChannel(msg.author.id);
        dm.then((dm) => dm.createMessage("Trying to Verify Your Discord"))
        let player = null,
            hyplayer = null
        try {
            player = await this.api.getPlayer(args[0]);
            hyplayer = await this.api.gethypixelPlayer(player.id);
        } catch (err) {
            (await dm).createMessage(err)
            return;
        }
        if(hyplayer.player.socialMedia == undefined || hyplayer.player.socialMedia.links == undefined || hyplayer.player.socialMedia.links.DISCORD.toLowerCase().replace(" ","_") !== `${msg.author.username.toLowerCase().replace(" ","_")}#${msg.author.discriminator}`){
            dm = (await dm);
            dm.createMessage("Please connect your Hypixel account to discord.")
            dm.createMessage("https://gyazo.com/3a2358687dae9b4333fd2fef932e0a17");
            try{
                dm.createMessage(`Current username set to: \`${hyplayer.player.socialMedia.links.DISCORD.toLowerCase().replace(" ","_")}\``)
            }catch(e){
                dm.createMessage("You do not seem to have a Discord Username set")
            }
            return;
        }
        this.db.push(`/ign/${msg.author.id}`, {discord:msg.author.username+"#"+msg.author.discriminator, uuid: player.id, username: player.name}); // TEST
        await this.addGuildMemberRole(msg.channel.guild.id, msg.author.id, roles[msg.channel.id] , "Verified");
        this.editGuildMember(msg.channel.guild.id, msg.author.id ,{nick:player.name}, "Changed nickname to IGN");
        (await dm).createMessage("Successfully Verified");
    }
}


if (module.parent) {
    module.exports = EggSi;
}else{
    // console.log(process.env.eggsiToken)
    let bot = new EggSi(undefined,undefined,process.env.eggsiToken, {},{
        description: "Totally not Upsi with a mask",
        owner: "Anunay",
        prefix: "-"
    })
    bot.connect().then(() => {
        console.log("Logged in!");
    }).catch(() => {
        throw "Unable to connect";
    });
}
