'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('testin')
  .setDescription('Fill long form game with test accs');

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameReadying = await gameInfo.get('inReady');
  const currentPlayers = (await gameInfo.get('players')) ?? [];
  if (gameOngoing || gameReadying || currentPlayers.length >= 15) {
    await interaction.reply({
      content: `The game is ongoing/full, nobody can join!`,
      ephemeral: true,
    });
    return;
  }
  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  // Don't add the user twice
  if (!currentPlayers.includes(interaction.user.id)) {
    for (let i = 0; i < currentPlayers.length; i++) {
      currentPlayers.push(String(i * 100));
    }

    await gameInfo.set('players', currentPlayers);
    await genChannel.send(
      `<@${interaction.user.id}> has now joined the lobby! Player count is at ${currentPlayers.length}/15.`,
    );
    await interaction.reply({
      content: `You have joined the lobby!`,
      ephemeral: true,
    });

    if (currentPlayers.length === 15) {
      await gameInfo.set('inReady', true);

      await genChannel.send(
        `**The game is about to start with the following players:**\n${currentPlayers.map((e) => `<@${e}>`).join(', ')}\nEverybody ready up!`,
      );

      const playerChannels = await gameInfo.get('player_channels');

      for (const id of currentPlayers) {
        const channel = await interaction.guild.channels.fetch(
          playerChannels[interaction.user.id].channelId,
        );
        await channel.send(
          `**The game is starting!**\n<@${id}>, Please ready up using /ready!`,
        );
        playerChannels[id] = {
          id: id,
          displayName: id,
          channelId: channel.id,
        };
      }
      await gameInfo.set('player_channels', playerChannels);
    }
  } else {
    await interaction.reply({
      content: `You can't add the lobby if you're already in it.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
