const c = require('centra');
const zlib = require('zlib');
const baseURL = 'https://api.hypixel.net/';
const nbt = require('prismarine-nbt');

class Client{
    constructor(key){
        this.key = key;
    }
    async getPlayer(username){
        let res = await c("https://api.mojang.com").path(`/users/profiles/minecraft/${username}`).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Invalid Username";
    }
    async gethypixelPlayer(uuid){
        let res = await c(baseURL).path("/player").query({key:this.key,uuid}).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Something bad";
    }
    async getProfile(profile){
        let res = await c(baseURL).path("skyblock/profile").query({key:this.key,profile}).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Invalid Username";
    }
    parseInventory(data){
        if(typeof(data) === "string") data = Buffer.from(data, 'base64');
        else data = Buffer.from(data);
        data = zlib.gunzipSync(data);
        data = nbt.parseUncompressed(data);
        return nbt.simplify(data).i;
    }
    

}






module.exports.Client = Client;

