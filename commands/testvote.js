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
const { clearTasks, scheduleInXHours } = require('../scheduler')

const idChoice = (id) => {
  return {
    name: id,
    value: id,
  };
};

const data = new SlashCommandBuilder()
  .setName('testvote')
  .setDescription('Pick your mission')
  .addStringOption((option) =>
    option
      .setName('playerid')
      .setDescription('Player ID')
      .setRequired(true)
      .addChoices(
        idChoice('0'),
        idChoice('100'),
        idChoice('200'),
        idChoice('300'),
        idChoice('400'),
        idChoice('500'),
        idChoice('600'),
        idChoice('700'),
        idChoice('800'),
        idChoice('900'),
        idChoice('1000'),
        idChoice('1100'),
        idChoice('1200'),
      ),
  )
  .addStringOption((option) =>
    option
      .setName('mission')
      .setDescription('The player whose mission you want to go through')
      .setRequired(true),
  );

const missionSizes = [4, 5, 6, 7, 6, 7, 7];

async function execute(interaction, user) {
  if (!user.isAuthorized) {
    return interaction.reply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const userId = interaction.options.getString('playerid');
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
      content: `It's not time for you to make a vote!`,
      ephemeral: true,
    });
  }

  const targetMission = interaction.options.getString(`mission`);
  if (
    !gameState.missionPickers[gameState.missionIndex].includes(targetMission)
  ) {
    return interaction.reply({
      content: `That is not one of the players who has picked a mission! You have to submit one of ${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  const playerIndex = gameState.players.map((e) => e.id).indexOf(userId);
  gameState.missionVotes[gameState.missionIndex][playerIndex] = targetMission;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${userId}> voted for <@${targetMission}>'s mission!**`,
    ),
  );
  await interaction.reply({
    content: `You made a vote!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);

  if (
    gameState.missionVotes[gameState.missionIndex].filter(
      (e) => e === targetMission,
    ).length >= 7 &&
    Object.keys(gameState.missionPicks[gameState.missionIndex]).length ===
      gameState.missionPickers[gameState.missionIndex].length
  ) {
    await clearTasks();
    const gameState = await gameInfo.get('gameState');
    gameState.currentState = 'missionWait';
    gameState.passedMissions.push(
      gameState.missionPicks[gameState.missionIndex][targetMission],
    );
    await gameInfo.set('gameState', gameState);
    await pickChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by ${targetMission} has passed!`,
    );
    await sendGameState(interaction.client);
    await genChannel.send(
      `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.`,
    );

    if (
      gameState.passedMissions[gameState.missionIndex] &&
      Object.keys(gameState.missionSFs[gameState.missionIndex]).filter((e) =>
        gameState.passedMissions[gameState.missionIndex].team.includes(e),
      ).length >= missionSizes[gameState.missionIndex]
    ) {
      await missionCompletion(interaction.client);
    } else {
      await scheduleInXHours('end_mission', {}, 6);
    }
  }
}

module.exports = {
  data,
  execute,
};
