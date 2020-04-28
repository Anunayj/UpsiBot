const c = require('centra');
const zlib = require('zlib');
const baseURL = 'https://api.hypixel.net/';
const nbt = require('prismarine-nbt');


class Client{
    #key;
    constructor(key){
        this.#key = key;
    }
    async getPlayer(username){
        let res = await c("https://api.mojang.com").path(`/users/profiles/minecraft/${username}`).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Invalid Username";
    }
    async getPlayerByUUID(uuid){
        let res = await c("https://api.mojang.com").path(`/user/profiles/${uuid}/names`).send();
        const response = await res.json();
        if(res.statusCode===200) return {id:uuid,name:response[response.length-1].name};
        else throw "Invalid Username";
    }
    async gethypixelPlayer(uuid){
        let res = await c(baseURL).path("/player").query({key:this.#key,uuid}).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Something bad";
    }
    async getProfile(profile){
        let res = await c(baseURL).path("skyblock/profile").query({key:this.#key,profile}).send();
        if(res.statusCode===200) return (await res.json());
        else throw "Invalid Username";
    }
    async getGuild(uuid){
        let res = await c(baseURL).path("guild").query({key:this.#key,id:uuid}).send();
        if(res.statusCode===200) return (await res.json()).guild;
        else throw "Invalid UUID";
    }
    async getStatus(uuid){
        let res = await c(baseURL).path("status").query({key:this.#key,uuid}).send();
        if(res.statusCode===200) return (await res.json()).session;
        else throw "Invalid UUID";
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

