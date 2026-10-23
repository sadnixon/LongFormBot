'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('joined')
  .setDescription('See users in game')
  .addBooleanOption((option) =>
    option
      .setName('check')
      .setDescription('Whether to check for players with no channels')
      .setRequired(false),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  const currentPlayers = (await gameInfo.get('players')) ?? [];
  const readyPlayers = (await gameInfo.get('readyPlayers')) ?? [];
  await interaction.editReply({
    content: `Here you go!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    standardEmbed(
      'Users In Current Lobby:',
      `${currentPlayers.map((e) => `<@${e}>`).join(', ')}`,
    ),
  );
  if (readyPlayers.length > 0) {
    await interaction.channel.send(
      standardEmbed(
        'Users Who Have Readied Up:',
        `${readyPlayers.map((e) => `<@${e}>`).join(', ')}`,
      ),
    );
  }
  const check = interaction.options.getBoolean('check');

  if (check && user.isAuthorized) {
    const playerChannels = await gameInfo.get('player_channels');

    for (const id of currentPlayers) {
      if (!(id in playerChannels)) {
        await interaction.channel.send(`<@${id}> needs a channel!`);
      }
    }
  }
}

module.exports = {
  data,
  execute,
};
