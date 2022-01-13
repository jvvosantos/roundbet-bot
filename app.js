import { Telegraf, Markup } from 'telegraf'

const bot = new Telegraf(process.env.TOKEN)

const gamePattern = /\w* x \w*/

var lastMessage;
var isListening = false;

var interacting = []

var games = []

var players = {}

bot.start((ctx) => ctx.reply('Hi, My name is Roundbet Bot, I\'m here to assist you to make any type of bets with your friends! Start by using /creategame'))

bot.command('creategame', (ctx) => {

    let talkingTo = ctx.message.from.id

    if (interacting.includes(talkingTo)) {
        ctx.reply(`Calm down, @${ctx.from.username}! You are already doing something else.`)
    }
    else {
        interacting.push(talkingTo)
        ctx.reply(`OK @${ctx.from.username}. Send me the participants like this:\n\nTeam1 x Team2`)

        waitUserMessage(talkingTo)
            .then(gameStr => {
                console.log(gameStr);
                if (gamePattern.test(gameStr)) {
                    let game = gameStr.split('x')
                    let team1 = game[0].trim()
                    let team2 = game[1].trim()

                    let foundGames = games.filter(g => g.gameStr.includes(team1) || g.gameStr.includes(team2))
                    if (foundGames.length > 0) {
                        ctx.reply('Hey, one of those teams is already in another game!')
                        removeFromList(interacting, talkingTo)
                        return
                    }

                    let bets = {}
                    games.push({ team1, team2, gameStr, bets })

                    ctx.reply('Your game was created!')
                }
                else {
                    ctx.reply('Sorry, I didn\'t understand, please try again /creategame')
                }
                removeFromList(interacting, talkingTo)
            })
            .catch(() => {
                ctx.reply(`Sorry, @${ctx.from.username}. Your operation timed out`)
                removeFromList(interacting, talkingTo)
            });
    }
})

bot.command('listgames', (ctx) => {
    let reply;
    if (games.length > 0) {
        reply = `Open games are: \n\n`

        let game;
        for (let i = 0; i < games.length; i++) {
            game = games[i]
            reply += `${i + 1}. ${game.gameStr}\n`
        }

        reply += `\nuse /placebet to place your bet!`

    }
    else {
        reply = "Oh no! There no games!\n\nCreate a game using /creategame"
    }

    ctx.reply(reply)
})

bot.command('mybets', (ctx) => {
    let talkingTo = ctx.from.username

    let reply;
    if (games.length > 0) {
        reply = `@${talkingTo} bets are: \n\n`

        let game;
        for (let i = 0; i < games.length; i++) {
            game = games[i]
            reply += `${i + 1}. ${game.gameStr}: ${game.bets[ctx.from.id] ? game.bets[ctx.from.id].bet : `Didn't bet!`}\n`
        }

    }
    else {
        reply = "Oh no! There no games!\n\nCreate a game using /creategame"
    }

    ctx.reply(reply)
})

bot.command('scoreboard', (ctx) => {
    let talkingTo = ctx.from.username

    let reply;

    if (Object.entries(players).length == 0) {
        reply = 'Hey, there\'s no one here!!'
    }
    else {
        let sortedPlayers = Object.entries(players).sort((e1, e2) => {
            if (e1[1] > e2[1]) {
                return 1
            }
            else if (e1[1] < e2[1]) {
                return -1
            }
            else {
                return 0
            }
        })

        reply = `The scoreboard: `

        for (let i = 0; i < sortedPlayers.length; i++){
            reply += `${i+1}. @${sortedPlayers[0]}: ${sortedPlayers[1]}`
        }
    }

    ctx.reply(reply)
})

bot.command('endgame', (ctx) => {
    let talkingTo = ctx.message.from.id

    let reply;
    if (games.length > 0) {
        reply = `Which game has ended? \n\n`

        let game;
        for (let i = 0; i < games.length; i++) {
            game = games[i]
            reply += `${i + 1}. ${game.gameStr}\n`
        }

        waitUserMessage(talkingTo)
            .then(res => {
                console.log(res)
                let game = games[Number.parseInt(res) - 1]

                if (!game) {
                    ctx.reply(`Invalid option`)
                    removeFromList(interacting, talkingTo)
                    return
                }

                ctx.deleteMessage()
                ctx.reply('Who won?', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        Markup.button.callback(game.team1, 'won:' + game.team1),
                        Markup.button.callback(game.team2, 'won:' + game.team2)
                    ])
                })
            })
            .catch(() => {
                ctx.reply(`Sorry, @${ctx.from.username}. Your operation timed out`)
            });

    }
    else {
        reply = "Oh no! There no games!\n\nCreate a game using /creategame"
    }

    ctx.reply(reply)
})

bot.command('placebet', (ctx) => {

    let talkingTo = ctx.message.from.id

    if (interacting.includes(talkingTo)) {
        ctx.reply(`Calm down, @${ctx.from.username}! You are already doing something else.`)
    }
    else {
        interacting.push(talkingTo)
        let reply;
        if (games.length > 0) {

            reply = `Let's go! Select a game: \n\n`

            let game;
            for (let i = 0; i < games.length; i++) {
                game = games[i]
                reply += `${i + 1}. ${game.gameStr}\n`
            }

            waitUserMessage(talkingTo)
                .then(res => {
                    console.log(res)
                    let game = games[Number.parseInt(res) - 1]

                    if (!game) {
                        ctx.reply(`Invalid option`)
                        removeFromList(interacting, talkingTo)
                        return
                    }

                    ctx.deleteMessage()
                    ctx.reply('Who will win?', {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            Markup.button.callback(game.team1, 'bet:' + game.team1),
                            Markup.button.callback(game.team2, 'bet:' + game.team2)
                        ])
                    })
                })
                .catch(() => {
                    ctx.reply(`Sorry, @${ctx.from.username}. Your operation timed out`)
                });

        }
        else {
            reply = "Oh no! There no games!\n\nCreate a game using /creategame"
        }

        ctx.reply(reply)
    }
})

bot.action(/won:.+/, (ctx) => {
    ctx.deleteMessage()

    let from = ctx.from

    let winningTeam = ctx.match[0].substr(ctx.match[0].lastIndexOf(':') + 1)

    let selectedGame = games.filter(game => game.team1 == winningTeam || game.team2 == winningTeam)[0]

    let reply = `Game ${selectedGame.gameStr} has ended! `

    console.log(Object.entries(selectedGame.bets));

    let winners = Object.entries(selectedGame.bets).filter(e => e[1].bet == winningTeam)

    if (winners.length > 0) {
        reply += `Congratulations to\n\n`

        for (let i = 0; i < winners.length; i++) {
            if (players[winners[i][1].username]) {
                players[winners[i][1].username] = players[winners[i][1].username]++
            }
            else {
                players[winners[i][1].username] = 1
            }
            reply += `@${winners[i][1].username}\n`
        }

        reply += `to the others better luck next time!`
    }
    else {
        reply += `No one got this game right! 😱`
    }

    ctx.reply(reply)
})

bot.action(/bet:.+/, (ctx) => {
    let from = ctx.from

    let myBet = ctx.match[0].substr(ctx.match[0].lastIndexOf(':') + 1)

    let selectedGame = games.filter(game => game.team1 == myBet || game.team2 == myBet)[0]
    selectedGame.bets[from.id] = {
        bet: myBet,
        username: from.username
    }

    removeFromList(interacting, from.id)

    ctx.answerCbQuery(`You voted for ${myBet}!`)
    ctx.deleteMessage()
})

function removeFromList(list, toRemove) {
    list.splice(list.indexOf(toRemove), 1)
}

async function waitUserMessage(talkingTo) {
    return new Promise(function (resolve, reject) {
        isListening = true;
        let waiting = setInterval(() => {
            if (lastMessage && lastMessage.from.id == talkingTo) {
                clearInterval(waiting)
                isListening = false

                resolve(lastMessage.text)
                lastMessage = undefined
            }
        }, 1000)

        setTimeout(() => {
            clearInterval(waiting)
            isListening = false

            reject()
        }, 25000)
    })
}

bot.on('text', (ctx) => {
    if (isListening) {
        lastMessage = ctx.message
    }
})

bot.launch()


console.log('running');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))