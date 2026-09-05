'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendGameState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminkick')
  .setDescription('Kick a player from the lobby')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to kick, if you are an admin')
      .setRequired(true),
  );

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  if (gameOngoing) {
    await interaction.reply({
      content: 'The game is going, too late to kick!',
      ephemeral: true,
    });
    return;
  }

  const currentPlayers = await gameInfo.get('players');
  const targetUser = interaction.options.getUser('user');

  if (currentPlayers.includes(targetUser.id)) {
    await gameInfo.set('readyPlayers', []);
    await gameInfo.set(
      'players',
      currentPlayers.filter((x) => x !== targetUser.id),
    );
    await gameInfo.set('inReady', false);

    await interaction.reply({
      content: 'Kicked em!',
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: 'They are not in the lobby!',
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
