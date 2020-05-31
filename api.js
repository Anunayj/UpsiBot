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
    async getBazaar(){
        let res = await c(baseURL).path("skyblock/bazaar").query({key:this.#key}).send();
        if(res.statusCode===200){
            let _bazaar = (await res.json()).products;    
            _bazaar["OAK_LOG"] = _bazaar["LOG"];
            delete _bazaar["LOG"];
            _bazaar["SPRUCE_LOG"] = _bazaar["LOG:1"];
            delete _bazaar["LOG:1"];
            _bazaar["BIRCH_LOG"] = _bazaar["LOG:2"];
            delete _bazaar["LOG:2"];
            _bazaar["DARK_OAK_LOG"] = _bazaar["LOG_2:1"];
            delete _bazaar["LOG_2:1"];
            _bazaar["ACACIA_LOG"] = _bazaar["LOG_2"];
            delete _bazaar["LOG_2"];
            _bazaar["JUNGLE_LOG"] = _bazaar["LOG:3"];
            delete _bazaar["LOG_:3"];
            _bazaar["BROWN_MUSHROOM_BLOCK"] = _bazaar["HUGE_MUSHROOM_1"];
            delete _bazaar["HUGE_MUSHROOM_1"];
            _bazaar["RED_MUSHROOM_BLOCK"] = _bazaar["HUGE_MUSHROOM_2"];
            delete _bazaar["HUGE_MUSHROOM_2"];
            _bazaar["ENCHANTED_BROWN_MUSHROOM_BLOCK"] = _bazaar["ENCHANTED_HUGE_MUSHROOM_1"];
            delete _bazaar["ENCHANTED_HUGE_MUSHROOM_1"];
            _bazaar["ENCHANTED_RED_MUSHROOM_BLOCK"] = _bazaar["ENCHANTED_HUGE_MUSHROOM_2"];
            delete _bazaar["ENCHANTED_HUGE_MUSHROOM_2"];
            _bazaar["RAW_SALMON"] = _bazaar["RAW_FISH:1"];
            delete _bazaar["RAW_FISH:1"];
            _bazaar["PUFFERFISH"] = _bazaar["RAW_FISH:3"];
            delete _bazaar["RAW_FISH:3"];
            _bazaar["COCOA_BEANS"] = _bazaar["INK_SACK:3"];
            delete _bazaar["INK_SACK:3"];
            _bazaar["LAPIS_LAZULI"] = _bazaar["INK_SACK:4"];
            delete _bazaar["INK_SACK:4"];
            return _bazaar;
        }
        else throw "Ummmm something bad happened";
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

