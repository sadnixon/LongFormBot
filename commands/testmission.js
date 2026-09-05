'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const _ = require('lodash');

const {
  standardEmbed,
  sendGameState,
  missionCompletion,
} = require('../message-helpers');

const idChoice = (id) => {
  return {
    name: id,
    value: id,
  };
};

const data = new SlashCommandBuilder()
  .setName('testmission')
  .setDescription('Succeed or fail mission')
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
      .setName('outcome')
      .setDescription('Outcome choice')
      .setRequired(true)
      .addChoices(
        {
          name: 'Succeed',
          value: 'succeed',
        },
        {
          name: 'Fail',
          value: 'fail',
        },
      ),
  );

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const userId = interaction.options.getString('playerid');
  const playerChannels = await gameInfo.get('player_channels');
  const playerChannelId = playerChannels[userId].channelId;
  if (!interaction.guildId || interaction.channel.id !== playerChannelId) {
    return interaction.reply({
      content: "This command can only be used in a player's private channel.",
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  if (
    !gameOngoing ||
    !['pickWait', 'missionWait', 'voteWait'].includes(gameState.currentState) ||
    !currentPlayers.includes(userId)
  ) {
    return interaction.reply({
      content: `It's not time for you to Succeed/Fail!`,
      ephemeral: true,
    });
  }

  const targetOutcome = interaction.options.getString(`outcome`);
  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  if (
    (gameState.players[playerIndex].team === 'Resistance' ||
      gameState.players[playerIndex].role === 'Guinevere') &&
    targetOutcome === 'fail'
  ) {
    return interaction.reply({
      content: `You are a Resistance member, so you have to Succeed!`,
      ephemeral: true,
    });
  }

  gameState.missionSFs[gameState.missionIndex][userId] = targetOutcome;

  await gameInfo.set('gameState', gameState);

  await interaction.reply({
    content: `You made a mission outcome choice to ${targetOutcome.toUpperCase()}!`,
    ephemeral: false,
  });

  if (
    gameState.passedMissions[gameState.missionIndex] &&
    Object.keys(gameState.missionSFs[gameState.missionIndex]).filter((e) =>
      gameState.passedMissions[gameState.missionIndex].team.includes(e),
    ).length >= gameState.missionSizes[gameState.missionIndex]
  ) {
    await missionCompletion(interaction.client);
  }
}

module.exports = {
  data,
  execute,
};
