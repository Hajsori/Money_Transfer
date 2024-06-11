// ©️ 2024 DerCoderJo. All Rights Reserved.

import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"

import texts from "./texts"

let moneyObjective = "money"
let prefix = "!"
let language = "en"
let minTransfer = 1
let maxTransfer = -1


Minecraft.world.beforeEvents.chatSend.subscribe((data) => {
    if (data.message.toLowerCase().startsWith(`${prefix}pay`)) {
        data.cancel = true
        let money = Minecraft.world.scoreboard?.getObjective(moneyObjective)?.getScore(data.sender.scoreboardIdentity) ?? 0
        if (money <= 1 || !money) return data.sender.sendMessage(texts[language].needMoreMoney)

        let players = []
        for (let player of Minecraft.world.getPlayers()) {
            if (player.nameTag !== data.sender.nameTag) players.push(player.name)
        }
        if (!players[0]) return data.sender.sendMessage(texts[language].nobodyOnline)
        let player = data.sender
        player.sendMessage(texts[language].closeChat)
        Minecraft.system.run(() => openPayUi(player, players, money, data))
    }
})

Minecraft.system.run(function tick(){
    Minecraft.system.run(tick)


    try{
        for (let data of Minecraft.world.scoreboard.getObjective("moneyTransfer").getParticipants()) if(data.displayName.startsWith("objective:")) moneyObjective = data.displayName.replace("objective:", "") ?? "money"
        else if (data.displayName.startsWith("prefix:")) prefix = data.displayName.replace("prefix:", "").replace("\\\\", "\\") ?? "!"
        else if (data.displayName.startsWith("language:")) language = data.displayName.replace("language:", "") ?? "en"
        else if (data.displayName.startsWith("minTransfer:")) minTransfer = Number(data.displayName.replace("minTransfer:", "")) ?? 1
        else if (data.displayName.startsWith("maxTransfer:")) maxTransfer = Number(data.displayName.replace("maxTransfer:", "")) ?? -1
    }catch{
        Minecraft.world.getDimension("overworld").runCommandAsync(`scoreboard objectives add moneyTransfer dummy "Money Transfer - Data"`)
        Minecraft.world.getDimension("overworld").runCommandAsync(`scoreboard players set "objective:money" moneyTransfer 1`)
        Minecraft.world.getDimension("overworld").runCommandAsync(`scoreboard players set "prefix:!" moneyTransfer 1`)
    }
    
    for(let player of Minecraft.world.getPlayers()) if(player.hasTag("moneyTransfer:settings")){
        player.removeTag("moneyTransfer:settings")
        
        new MinecraftUi.ModalFormData()
        .title("§r§aMoney §eTransfer §8- §7Settings§r")
        .textField("Money Objective", "money", moneyObjective)
        .textField("Prefix", "!", prefix)
        .dropdown("Language", Object.keys(texts), Object.keys(texts).indexOf(language))
        .textField("Min. Money Transfer", "1", minTransfer.toString())
        .textField("Max. Money Transfer", "-1", maxTransfer.toString())
        .show(player).then((res) => {
            if (res.isCanceled) return

            try { player.runCommandAsync(`scoreboard players reset "objective:${moneyObjective}"`) } catch {}
            player.runCommandAsync(`scoreboard players set "objective:${res.formValues[0]}" moneyTransfer 1`)
            moneyObjective = res.formValues[0]

            try { player.runCommandAsync(`scoreboard players reset "prefix:${prefix}"`) }catch {}
            player.runCommandAsync(`scoreboard players set "prefix:${res.formValues[1].replace("\\", "\\\\")}" moneyTransfer 1`)
            prefix = res.formValues[1]

            try { player.runCommandAsync(`scoreboard players reset "language:${language}"`) }catch {}
            player.runCommandAsync(`scoreboard players set "language:${Object.keys(texts)[res.formValues[2]]}" moneyTransfer 1`)
            language = Object.keys(texts)[res.formValues[2]]

            try { player.runCommandAsync(`scoreboard players reset "minTransfer:${minTransfer}"`) }catch {}
            player.runCommandAsync(`scoreboard players set "minTransfer:${res.formValues[3]}" moneyTransfer 1`)
            minTransfer = res.formValues[3]

            try { player.runCommandAsync(`scoreboard players reset "maxTransfer:${maxTransfer}"`) }catch {}
            player.runCommandAsync(`scoreboard players set "maxTransfer:${res.formValues[4]}" moneyTransfer 1`)
            maxTransfer = res.formValues[4]
        })
    }
})

Minecraft.system.beforeEvents.watchdogTerminate.subscribe((data) => data.cancel = true)


/**
 * 
 * @param {Minecraft.Player} player 
 * @param {Array} players 
 * @param {Number} money 
 */
function openPayUi(player, players, money, data) {
    new MinecraftUi.ModalFormData()
    .title("§r§aMoney §eTransfer§r")
    .dropdown(texts[language].selectPlayer, players)
    .textField(texts[language].howMuchMoneyTransfer, texts[language].howMuchMoneyTransferPlaceholder, texts[language].howMuchMoneyTransferDefault)
    .textField(texts[language].greeting, texts[language].greetingPlaceholder, texts[language].greetingDefault)
    .show(player).then((res) => {
        if (res.cancelationReason == "UserBusy") return Minecraft.system.run(() => openPayUi(player, players, money, data))
        if (res.canceled) return

        let selectedPlayer = players[res.formValues[0]]
        money = Minecraft.world.scoreboard?.getObjective(moneyObjective)?.getScore(data.sender.scoreboardIdentity) ?? 0
        let sendMoney = Number(res.formValues[1])
        if (isNaN(sendMoney) || sendMoney <= 0) return player.sendMessage(texts[language].enterValidNumber)
        if (money < sendMoney) return player.sendMessage(texts[language].notEnoughMoney)
        let greet = "."
        if (res.formValues[2]) greet = texts[language].withGreet.replace("{greet}", res.formValues[2])
        let found = false
        if (sendMoney < minTransfer) return player.sendMessage(texts[language].notEnoughMoneyMin.replace("{money}", minTransfer))
        if (maxTransfer != -1 && sendMoney > maxTransfer) return player.sendMessage(texts[language].notEnoughMoneyMax.replace("{money}", maxTransfer))
        for (let playe of Minecraft.world.getPlayers({ name: selectedPlayer })) {
            found = true
            playe.runCommandAsync(`scoreboard players add @s ${moneyObjective} ${sendMoney}`)
            player.runCommandAsync(`scoreboard players remove @s ${moneyObjective} ${sendMoney}`)
            player.sendMessage(texts[language].transferred.replace("{player}", playe.name).replace("{money}", sendMoney).replace("{greet}", greet))
            playe.sendMessage(texts[language].transferredPlayer.replace("{player}", player.name).replace("{money}", sendMoney).replace("{greet}", greet))
        }
        if (found == false) return player.sendMessage(texts[language].leftGame.replace("{player}", selectedPlayer))
    })
}