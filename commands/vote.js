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
  randomNumber,
} = require('../message-helpers');
const { clearTasks, scheduleInXHours, scheduleInXSeconds } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Pick your mission')
  .addUserOption((option) =>
    option
      .setName('mission')
      .setDescription('The player whose mission you want to go through')
      .setRequired(true),
  );

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
      content: `It's not time for you to make a vote!`,
      ephemeral: true,
    });
  }

  const targetMission = interaction.options.getUser(`mission`).id;
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

  const playerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  gameState.missionVotes[gameState.missionIndex][playerIndex] = targetMission;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${interaction.user.id}> voted for <@${targetMission}>'s mission!**`,
    ),
  );
  await interaction.reply({
    content: `You made a vote!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);

  const voteMaj = gameState.players.length === 13 ? 7 : 8;

  if (
    gameState.missionVotes[gameState.missionIndex].filter(
      (e) => e === targetMission,
    ).length >= voteMaj &&
      targetMission in gameState.missionPicks[gameState.missionIndex]
  ) {
    await clearTasks();
    const gameState = await gameInfo.get('gameState');
    gameState.currentState = 'missionWait';
    gameState.passedMissions.push(
      gameState.missionPicks[gameState.missionIndex][targetMission],
    );
    await gameInfo.set('gameState', gameState);
    await pickChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nThe mission chosen by <@${targetMission}> has passed!`,
    );
    await sendGameState(interaction.client);
    await genChannel.send(
      `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.`,
    );

    //Final mission check
    if (gameState.missionIndex === 6) {
      for (let i = 0; i < gameState.players.length; i++) {
        if (
          gameState.players[i].team === 'Resistance' ||
          gameState.players[i].role === 'Guinevere'
        ) {
          gameState.missionSFs[gameState.missionIndex][
            gameState.players[i].id
          ] = 'succeed';
        } else {
          gameState.missionSFs[gameState.missionIndex][
            gameState.players[i].id
          ] = 'fail';
        }
      }
      await gameInfo.set('gameState', gameState);
      await missionCompletion(interaction.client);
    } else {
      await scheduleInXHours('end_mission', {}, 6);
      const randomWait = randomNumber(300, 540);
      await scheduleInXSeconds('wait_mission', {}, randomWait);
    }
  }
}

module.exports = {
  data,
  execute,
};
