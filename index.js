// I have no idea how to handle error :P, anyway use this for lethal error 
function error(reason){
    console.log(reason);
    process.exit(1);
}


const { Client } = require('discord.js');
if (process.argv.length===3){
    disToken = process.argv[2];
}else{
    try{
        var { disToken } = require('./env.json'); //Don't change the var to smth else: https://stackoverflow.com/a/40925135/6011878
    }catch(e){
        error("env.json/(disToken argument) is missing!");
    }
}
const client = new Client();

client.on('ready', () => console.log('Ready!'));

client.on('message', (msg) => {
    if (msg.author.bot) return;

    if (msg.content.startsWith('!ping')) {
        msg.channel.send('!gnip');
    }
});
console.log(disToken);
client.login(disToken).catch(() => error("Error logging in!"));