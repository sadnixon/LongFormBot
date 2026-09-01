'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('reg')
  .setDescription(
    'Register the channel you are in as your private game channel',
  );

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  const playerChannels = await gameInfo.get('player_channels');

  const newUser = interaction.user;
  const id = newUser.id;
  const displayName = newUser.globalName ?? newUser.username;

  playerChannels[id] = {
    id: id,
    displayName: displayName,
    channelId: interaction.channel.id,
  };

  await gameInfo.set('player_channels', playerChannels);

  await interaction.reply({
    content: `You have now registered this channel as your private channel for games!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
