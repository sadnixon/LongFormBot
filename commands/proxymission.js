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

const data = new SlashCommandBuilder()
  .setName('proxymission')
  .setDescription('Succeed or fail mission')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
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
  const userId = interaction.options.getUser(`user`).id;

  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
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

  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  const puppeteerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  if (
    !currentPlayers.includes(userId) ||
    !(
      (['Mordred', 'Witch', 'Morgana', 'Assassin'].includes(
        gameState.players[puppeteerIndex]?.role,
      ) &&
        ['Mordred', 'Witch', 'Morgana', 'Assassin'].includes(
          gameState.players[playerIndex]?.role,
        )) ||
      user.isAuthorized
    )
  ) {
    return interaction.reply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  const targetOutcome = interaction.options.getString(`outcome`);
  if (
    gameState.players[playerIndex].team === 'Resistance' &&
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
    content: `You made a mission outcome choice!`,
    ephemeral: true,
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
