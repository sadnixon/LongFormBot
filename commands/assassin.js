'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');
const { clearTasks } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('assassin')
  .setDescription('Pick your assassination target')
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
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  let gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  if (
    !gameOngoing ||
    gameState.currentState !== 'assassinWait' ||
    !currentPlayers.includes(interaction.user.id) ||
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
    ['Assassin', 'Morgana', 'Mordred', 'Witch', 'Guinevere', 'Oberon'].includes(
      gameState.players[targetPlayerIndex].role,
    ) ||
    (targetPlayer2 &&
      ['Assassin', 'Morgana', 'Mordred', 'Witch', 'Guinevere', 'Oberon'].includes(
        gameState.players[targetPlayer2Index].role,
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
    const correctShot =
      ['Tristan', 'Isolde'].includes(
        gameState.players[targetPlayerIndex].role,
      ) &&
      ['Tristan', 'Isolde'].includes(
        gameState.players[targetPlayer2Index].role,
      );
    const actualLovers = gameState.players
      .filter((e) => ['Tristan', 'Isolde'].includes(e.role))
      .map((e) => e.id);
    if (correctShot) {
      await announceChannel.send(
        standardEmbed(
          'An assassination was made!',
          `**<@${interaction.user.id}> assassinated <@${gameState.assassinShot[0]}> and <@${gameState.assassinShot[1]}> as the Lovers!**\nTheir roles were indeed ${gameState.players[targetPlayerIndex].role} and ${gameState.players[targetPlayer2Index].role}!`,
        ),
      );
    } else {
      await announceChannel.send(
        standardEmbed(
          'An assassination was made!',
          `**<@${interaction.user.id}> assassinated <@${gameState.assassinShot[0]}> and <@${gameState.assassinShot[1]}> as the Lovers!**\nBut their roles were ${gameState.players[targetPlayerIndex].role} and ${gameState.players[targetPlayer2Index].role}.\n\nThe real Lovers were ${actualLovers.map((e) => `<@${e}>`).join(' and ')}.`,
        ),
      );
    }
  } else {
    const correctShot = gameState.players[targetPlayerIndex].role === 'Merlin';
    const actualMerlin = gameState.players.filter((e) => e.role === 'Merlin')[0]
      .id;
    if (correctShot) {
      await announceChannel.send(
        standardEmbed(
          'An assassination was made!',
          `**<@${interaction.user.id}> assassinated <@${gameState.assassinShot[0]}> as Merlin!**\nTheir role was indeed ${gameState.players[targetPlayerIndex].role}!`,
        ),
      );
    } else {
      await announceChannel.send(
        standardEmbed(
          'An assassination was made!',
          `**<@${interaction.user.id}> assassinated <@${gameState.assassinShot[0]}> as Merlin!**\nBut their role was ${gameState.players[targetPlayerIndex].role}.\n\nThe real Merlin was <@${actualMerlin}>.`,
        ),
      );
    }
  }
  await endGame(interaction.client);
}

module.exports = {
  data,
  execute,
};
