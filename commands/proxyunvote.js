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
  .setName('proxyunvote')
  .setDescription('Unpick your mission')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
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
    !['voteWait', 'pickWait'].includes(gameState.currentState) ||
    !currentPlayers.includes(userId)
  ) {
    return interaction.reply({
      content: `It's not time for you to unvote!`,
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

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );

  gameState.missionVotes[gameState.missionIndex][playerIndex] = null;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been retracted!',
      `**<@${userId}> has unvoted!**`,
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
