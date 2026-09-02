'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const {
  standardEmbed,
  sendGameState,
  sendVoteState,
  missionCompletion,
} = require('../message-helpers');
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('unvote')
  .setDescription('Unpick your mission');

const missionSizes = [4, 5, 6, 7, 6, 7, 7];

async function execute(interaction, user) {
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
    !['voteWait', 'pickWait'].includes(gameState.currentState) ||
    !currentPlayers.includes(interaction.user.id)
  ) {
    return interaction.reply({
      content: `It's not time for you to unvote!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );

  const playerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  gameState.missionVotes[gameState.missionIndex][playerIndex] = null;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been retracted!',
      `**<@${interaction.user.id}> has unvoted!**`,
    ),
  );
  await interaction.reply({
    content: `You unvoted!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);
}

module.exports = {
  data,
  execute,
};
