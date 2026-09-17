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
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('proxyvote')
  .setDescription('Pick your mission')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('mission')
      .setDescription('The player whose mission you want to go through')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.options.getUser(`user`).id;

  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  if (
    !gameOngoing ||
    !['voteWait', 'pickWait','pickWaitSupermaj'].includes(gameState.currentState) ||
    !currentPlayers.includes(userId)
  ) {
    return interaction.editReply({
      content: `It's not time for you to make a vote!`,
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
      (['Mordred', 'Witch', 'Morgana', 'Assassin', 'Guinevere','Spy'].includes(
        gameState.players[puppeteerIndex]?.role,
      ) &&
        ['Mordred', 'Witch', 'Morgana', 'Assassin', 'Guinevere','Spy'].includes(
          gameState.players[playerIndex]?.role,
        )) ||
      user.isAuthorized
    )
  ) {
    return interaction.editReply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  const targetMission = interaction.options.getUser(`mission`).id;
  if (
    !gameState.missionPickers[gameState.missionIndex].includes(targetMission)
  ) {
    return interaction.editReply({
      content: `That is not one of the players who has picked a mission! You have to submit one of ${gameState.missionPickers[gameState.missionIndex].map((e) => `<@${e}>`).join(', ')}!`,
      ephemeral: true,
    });
  }

  gameState.missionVotes[gameState.missionIndex][playerIndex] = targetMission;

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${userId}> voted for <@${targetMission}>'s mission!**`,
    ),
  );
  await interaction.editReply({
    content: `You made a vote!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);

  const voteMaj =
    gameState.currentState === 'pickWaitSupermaj'
      ? Math.ceil((gameState.players.length * 2) / 3)
      : Math.floor(gameState.players.length / 2) + 1;

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
      `${gameState.passedMissions[gameState.missionIndex].team.map((e) => `<@${e}>`).join(' ')}\nIt's time to run M${gameState.missionIndex + 1}! Go decide if the mission will succeed or fail with /mission.\nThis mission needs **${gameState.failsNeeded[gameState.missionIndex]}** fail(s) to fail.`,
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
