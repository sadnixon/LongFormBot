'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('joined')
  .setDescription('See users in game');

async function execute(interaction, user) {
  const currentPlayers = (await gameInfo.get('players')) ?? [];
  const readyPlayers = (await gameInfo.get('readyPlayers')) ?? [];
  await interaction.reply({
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
}

module.exports = {
  data,
  execute,
};
