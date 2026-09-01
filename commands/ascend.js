'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('ascend')
  .setDescription('Ascend to Res Heaven');

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');
  const gameState = await gameInfo.get('gameState');
  if (
    !gameOngoing ||
    !currentPlayers.includes(interaction.user.id) ||
    !['assassinWait', 'gameEnd'].includes(gameState.currentState) ||
    gameState.players.filter((e) => e.id === interaction.user.id)[0].team !==
      'Resistance'
  ) {
    await interaction.reply({
      content: `What if YOU tried to ascend to HEAVEN but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `You're ascending to Heaven!"`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const picksChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const heavenChannel = await interaction.guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );

  await genChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await picksChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await heavenChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
}

module.exports = {
  data,
  execute,
};
