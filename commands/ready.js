'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, startGame } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('ready')
  .setDescription('Ready up for the Long Form game')
  .addBooleanOption((option) =>
    option
      .setName('in')
      .setDescription(
        'Whether or not you want to be in the game that is starting',
      )
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to in for, if you are an admin')
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
  const gameReadying = await gameInfo.get('inReady');
  const currentPlayers = await gameInfo.get('players');

  const targetUser = interaction.options.getUser('user');
  let newUser = interaction.user;
  if (user.isAuthorized && targetUser) {
    newUser = targetUser;
  }

  if (
    gameOngoing ||
    (!gameOngoing && !gameReadying) ||
    !currentPlayers.includes(newUser.id)
  ) {
    await interaction.reply({
      content: `It's not time for you to ready up!`,
      ephemeral: true,
    });
    return;
  }
  const readyPlayers = await gameInfo.get('readyPlayers');

  const userReady = interaction.options.getBoolean('in');

  if (userReady) {
    if (!readyPlayers.includes(newUser.id)) {
      readyPlayers.push(newUser.id);
    }
    await interaction.reply({
      content: `You have now readied up!`,
      ephemeral: true,
    });
    if (readyPlayers.length === 13) {
      await startGame(interaction);
    }
  } else {
    await gameInfo.set('readyPlayers', []);
    await gameInfo.set(
      'players',
      currentPlayers.filter((x) => x !== newUser.id),
    );
    await gameInfo.set('inReady', false);
  }
}

module.exports = {
  data,
  execute,
};
