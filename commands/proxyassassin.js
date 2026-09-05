'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');
const { clearTasks } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('proxyassassin')
  .setDescription('Pick your assassination target')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player1')
      .setDescription('The player who you want to assassinate')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('player2')
      .setDescription(
        'The second player who you want to assassinate, if you are assassinating Lovers',
      )
      .setRequired(false),
  );

async function execute(interaction, user) {
  const userId = interaction.options.getUser(`user`).id;

  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  let gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');

  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  const puppeteerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);

  if (
    !currentPlayers.includes(userId) ||
    !(
      ['Mordred', 'Witch', 'Morgana'].includes(
        gameState.players[puppeteerIndex].role,
      ) || user.isAuthorized
    )
  ) {
    return interaction.reply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  if (
    !gameOngoing ||
    gameState.currentState !== 'assassinWait' ||
    !currentPlayers.includes(userId) ||
    gameState.players[playerIndex].role !== 'Assassin'
  ) {
    return interaction.reply({
      content: `It's not time for you to make an assassination!`,
      ephemeral: true,
    });
  }

  const targetPlayer = interaction.options.getUser(`player1`);
  const targetPlayer2 = interaction.options.getUser(`player2`);
  const targetPlayerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer.id);
  let targetPlayer2Index;
  if (targetPlayer2) {
    targetPlayer2Index = gameState.players
      .map((e) => e.id)
      .indexOf(targetPlayer2.id);
  }
  if (
    !currentPlayers.includes(targetPlayer.id) ||
    (targetPlayer2 && !currentPlayers.includes(targetPlayer2.id)) ||
    ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
      gameState.players[targetPlayerIndex]?.role,
    ) ||
    (targetPlayer2 &&
      ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
        gameState.players[targetPlayer2Index]?.role,
      ))
  ) {
    return interaction.reply({
      content: `This is not a valid assassination! You must choose a non-spy player in the current game (or two non-spy players, if you are shooting for Lovers).`,
      ephemeral: true,
    });
  }

  await clearTasks();
  gameState = await gameInfo.get('gameState');
  gameState.assassinShot.push(targetPlayer.id);
  if (targetPlayer2) {
    gameState.assassinShot.push(targetPlayer2.id);
  }
  gameState.currentState = 'gameEnd';
  await gameInfo.set('gameState', gameState);

  await interaction.reply({
    content: `You made an assassination!`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const announceChannel = await interaction.guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );

  if (gameState.assassinShot.length === 2) {
    await announceChannel.send(
      standardEmbed(
        'An assassination was made!',
        `<@${userId}> assassinated <@${gameState.assassinShot[0]}> and <@${gameState.assassinShot[1]}> as the Lovers!\nTheir roles were ${gameState.players[targetPlayerIndex].role} and ${gameState.players[targetPlayer2Index].role}.`,
      ),
    );
  } else {
    await announceChannel.send(
      standardEmbed(
        'An assassination was made!',
        `<@${userId}> assassinated <@${gameState.assassinShot[0]}> as Merlin!\nTheir role was ${gameState.players[targetPlayerIndex].role}.`,
      ),
    );
  }
  await endGame(interaction.client);
}

module.exports = {
  data,
  execute,
};
