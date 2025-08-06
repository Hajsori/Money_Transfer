// ©️ 2025 Hajsori. All Rights Reserved.

import * as Minecraft from "@minecraft/server"
import * as MinecraftUi from "@minecraft/server-ui"

import texts from "./texts"

let moneyObjective = "money"
let language = "en"
let minTransfer = 1
let maxTransfer = -1


Minecraft.system.runInterval(() => {
    try {
        for (let data of Minecraft.world.scoreboard.getObjective("moneyTransfer").getParticipants()) if(data.displayName.startsWith("objective:")) moneyObjective = data.displayName.replace("objective:", "") ?? "money"
        else if (data.displayName.startsWith("language:")) language = data.displayName.replace("language:", "") ?? "en"
        else if (data.displayName.startsWith("minTransfer:")) minTransfer = Number(data.displayName.replace("minTransfer:", "")) ?? 1
        else if (data.displayName.startsWith("maxTransfer:")) maxTransfer = Number(data.displayName.replace("maxTransfer:", "")) ?? -1
    } catch {
        Minecraft.world.getDimension("overworld").runCommand(`scoreboard objectives add moneyTransfer dummy "Money Transfer - Data"`)
        Minecraft.world.getDimension("overworld").runCommand(`scoreboard players set "objective:money" moneyTransfer 1`)
    }
})

Minecraft.system.beforeEvents.startup.subscribe((event) => {
    event.customCommandRegistry.registerCommand(
        {
            name: "money:pay",
            description: "Give money to another player",
            permissionLevel: Minecraft.CommandPermissionLevel.Any,
            mandatoryParameters: [
                {
                    name: "player",
                    type: Minecraft.CustomCommandParamType.PlayerSelector
                },
                {
                    name: "amount",
                    type: Minecraft.CustomCommandParamType.Integer
                }
            ],
            optionalParameters: [
                {
                    name: "greeting",
                    type: Minecraft.CustomCommandParamType.String
                }
            ]
        },
        /**
         * 
         * @param {Minecraft.Player[]} targets
         * @param {number} amount
         * @param {string} greeting
         * @returns {void}
         */
        (origin, targets, amount, greeting) => {
            targets = targets.filter((target) => target.id !== origin.sourceEntity.id && target.isValid)
            Minecraft.system.run(() => {
                if (!targets.length) {
                    origin.sourceEntity.sendMessage(texts[language].notOnline)
                    return
                }
                if (isNaN(amount) || amount < minTransfer || (maxTransfer != -1 && amount > maxTransfer)) {
                    origin.sourceEntity.sendMessage(texts[language].enterValidNumber)
                    return
                }
                const moneyScoreboard = Minecraft.world.scoreboard?.getObjective(moneyObjective)
                const playerMoney = moneyScoreboard?.getScore(origin.sourceEntity) ?? 0
                if (playerMoney < amount) {
                    origin.sourceEntity.sendMessage(texts[language].notEnoughMoney)
                    return
                }

                let greet = "."
                if (greeting) {
                    greet = texts[language].withGreet.replace("{greet}", greeting)
                }

                for (const target of targets) {
                    moneyScoreboard.addScore(target, amount)
                    target.sendMessage(texts[language].transferredPlayer.replace("{player}", origin.sourceEntity.name).replace("{money}", amount).replace("{greet}", greet))
                }
                moneyScoreboard.addScore(origin.sourceEntity.scoreboardIdentity, -amount * targets.length)
                
                origin.sourceEntity.sendMessage(texts[language].transferred.replace("{player}", targets.map(target => target.name).join(", ")).replace("{money}", amount).replace("{greet}", greet))
            })
        }
    )

    event.customCommandRegistry.registerCommand(
        {
            name: "money:settings",
            description: "Open the Money Transfer settings",
            permissionLevel: Minecraft.CommandPermissionLevel.GameDirectors
        },
        (origin) => {
            Minecraft.system.run(() => {
                if (origin.sourceType == Minecraft.CustomCommandSource.Entity && origin.sourceEntity.typeId == "minecraft:player") {
                    showSettingsMenu(origin.sourceEntity)
                } else if (origin.sourceType == Minecraft.CustomCommandSource.NPCDialogue && origin.initiator.typeId == "minecraft:player") {
                    showSettingsMenu(origin.initiator)
                }
            })
        }
    )
})

Minecraft.world.afterEvents.worldLoad.subscribe(() => {
    console.warn("[§r§aMoney §eTransfer§r] Loaded Addon")
})


function showSettingsMenu(player) {console.warn(Object.keys(texts).indexOf(language), language)
    new MinecraftUi.ModalFormData()
        .title("§r§aMoney §eTransfer §8- §7Settings§r")
        .textField("Money Objective", "money", { defaultValue: moneyObjective })
        .dropdown("Language", Object.keys(texts), { defaultValueIndex: Object.keys(texts).indexOf(language) })
        .textField("Min. Money Transfer", "1", { defaultValue: minTransfer.toString() })
        .textField("Max. Money Transfer", "-1", { defaultValue: maxTransfer.toString() })
        .show(player).then((res) => {
            if (res.canceled) {
                return
            }

            try { player.runCommand(`scoreboard players reset "objective:${moneyObjective}"`) } catch {}
            player.runCommand(`scoreboard players set "objective:${res.formValues[0]}" moneyTransfer 1`)
            moneyObjective = res.formValues[0]

            try { player.runCommand(`scoreboard players reset "language:${language}"`) }catch {}
            player.runCommand(`scoreboard players set "language:${Object.keys(texts)[res.formValues[1]]}" moneyTransfer 1`)
            language = Object.keys(texts)[res.formValues[1]]

            try { player.runCommand(`scoreboard players reset "minTransfer:${minTransfer}"`) }catch {}
            player.runCommand(`scoreboard players set "minTransfer:${res.formValues[2]}" moneyTransfer 1`)
            minTransfer = res.formValues[2]

            try { player.runCommand(`scoreboard players reset "maxTransfer:${maxTransfer}"`) }catch {}
            player.runCommand(`scoreboard players set "maxTransfer:${res.formValues[3]}" moneyTransfer 1`)
            maxTransfer = res.formValues[3]
        })
}
