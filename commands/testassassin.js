'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');
const { clearTasks } = require('../scheduler');

const idChoice = (id) => {
  return {
    name: id,
    value: id,
  };
};

const data = new SlashCommandBuilder()
  .setName('testassassin')
  .setDescription('Pick your assassination target')
  .addStringOption((option) =>
    option
      .setName('playerid')
      .setDescription('Player ID')
      .setRequired(true)
      .addChoices(
        idChoice('0'),
        idChoice('100'),
        idChoice('200'),
        idChoice('300'),
        idChoice('400'),
        idChoice('500'),
        idChoice('600'),
        idChoice('700'),
        idChoice('800'),
        idChoice('900'),
        idChoice('1000'),
        idChoice('1100'),
        idChoice('1200'),
      ),
  )
  .addStringOption((option) =>
    option
      .setName('player1')
      .setDescription('The player who you want to assassinate')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('player2')
      .setDescription(
        'The second player who you want to assassinate, if you are assassinating Lovers',
      )
      .setRequired(false),
  );

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const userId = interaction.options.getString('playerid');
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

  const targetPlayer = interaction.options.getString(`player1`);
  const targetPlayer2 = interaction.options.getString(`player2`);
  const targetPlayerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer);
  const targetPlayer2Index = gameState.players
    .map((e) => e.id)
    .indexOf(targetPlayer2);
  if (
    !currentPlayers.includes(targetPlayer) ||
    (targetPlayer2 && !currentPlayers.includes(targetPlayer2)) ||
    ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
      gameState.players[targetPlayerIndex].role,
    ) ||
    (targetPlayer2 &&
      ['Assassin', 'Morgana', 'Mordred', 'Witch'].includes(
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
  gameState.assassinShot.push(targetPlayer);
  if (targetPlayer2) {
    gameState.assassinShot.push(targetPlayer2);
  }
  gameState.currentState = 'gameEnd';
  await gameInfo.set('gameState', gameState);

  await interaction.reply({
    content: `You made an assassination!`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  if (gameState.assassinShot.length === 2) {
    await genChannel.send(
      standardEmbed(
        'An assassination was made!',
        `<@${userId}> assassinated <@${gameState.assassinShot[0]}> and <@${gameState.assassinShot[1]}> as the Lovers!\nTheir roles were ${gameState.players[targetPlayerIndex].role} and ${gameState.players[targetPlayer2Index].role}.`,
      ),
    );
  } else {
    await genChannel.send(
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
