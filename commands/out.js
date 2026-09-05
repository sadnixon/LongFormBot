'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('out')
  .setDescription('Leave the Long Form game, if it is not ongoing');

async function execute(interaction, user) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameReadying = await gameInfo.get('inReady');
  let currentPlayers = (await gameInfo.get('players')) ?? [];
  if (gameOngoing || gameReadying) {
    await interaction.reply({
      content: `The game is ongoing, nobody can leave!`,
      ephemeral: true,
    });
    return;
  }
  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  // Don't remove the user twice
  if (currentPlayers.includes(interaction.user.id)) {
    currentPlayers = currentPlayers.filter((x) => x !== interaction.user.id);
    await gameInfo.set('players', currentPlayers);

    await genChannel.send(
      `<@${interaction.user.id}> has now left the lobby! Player count is at ${currentPlayers.length}/15.`,
    );
    await interaction.reply({
      content: `You have left the lobby!`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `You can't leave the lobby if you're not in it.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
