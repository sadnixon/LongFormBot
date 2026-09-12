'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed, sendGameState, endGame } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('proxyunwitch')
  .setDescription('Undo your last Witch guess')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )

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
  const playerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(userId);
  const untriggeredWitches = Object.values(gameState.witchCurses).filter(
    (e) => !e.triggered,
  );
  if (
    !gameOngoing ||
    !currentPlayers.includes(userId) ||
    gameState.players[playerIndex].role !== 'Witch' ||
    gameState.missionFails > 2 ||
    untriggeredWitches.length === 0
  ) {
    return interaction.reply({
      content: `It's not time for you to undo a witch guess!`,
      ephemeral: true,
    });
  }

  const puppeteerIndex = gameState.players
    .map((e) => e.id)
    .indexOf(interaction.user.id);
  if (
    !currentPlayers.includes(userId) ||
    !(
      ['Mordred', 'Assassin', 'Morgana', 'Guinevere'].includes(
        gameState.players[puppeteerIndex]?.role,
      ) || user.isAuthorized
    )
  ) {
    return interaction.reply({
      content: `You can't proxy act like that!`,
      ephemeral: true,
    });
  }

  const targetWitch = untriggeredWitches.at(-1);

  delete gameState.witchCurses[targetWitch.id];

  await gameInfo.set('gameState', gameState);

  await interaction.reply({
    content: `You undid a witch guess!`,
    ephemeral: true,
  });

  const gameChannels = await gameInfo.get('game_channels');
  const spyChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  await spyChannel.send(
    standardEmbed(
      'A Witch guess was unmade!',
      `<@${userId}> removed the Witch guess on <@${targetWitch.id}> as ${targetWitch.role.toUpperCase()}!`,
    ),
  );
}

module.exports = {
  data,
  execute,
};
