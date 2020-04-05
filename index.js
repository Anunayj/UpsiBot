// I have no idea how to handle error :P, anyway use this for lethal error 
function error(reason){
    console.log(reason);
    process.exit(1);
}


const { Client } = require('discord.js');
try{
    var { disToken } = require('env.json'); //Don't change the var to smth else: https://stackoverflow.com/a/40925135/6011878
}catch(e){
    //HOLY SHIT THIS IS BAD, No I didn't learn programming from chipmunks.
    try{
        var disToken = process.env.disToken;
    }catch(e){
        error("env.json/(disToken env variable) is missing!");
    }
}
// 
const client = new Client();

client.on('ready', () => console.log('Ready!'));

client.on('message', (msg) => {
    if (msg.author.bot) return;

    if (msg.content.startsWith('!ping')) {
        msg.channel.send('!gnip');
    }
});

client.login(disToken).catch(() => error("Error logging in!"));