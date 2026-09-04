'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('proxyclaim')
  .setDescription('Claim what Ref card showed you')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The player you are acting for')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('claim')
      .setDescription('The team that you are claiming to have seen')
      .setRequired(true),
  )
  .addChoices(
    {
      name: 'Resistance',
      value: 'resistance',
    },
    {
      name: 'Spy',
      value: 'spy',
    },
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
    !currentPlayers.includes(userId) ||
    !gameState.refChain.slice(0, -1).includes(userId) ||
    gameState.refChain[refChain.indexOf(userId) + 1] in
      gameState.refClaims
  ) {
    return interaction.reply({
      content: `It's not time for you to make a claim!`,
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

  const targetClaim = interaction.options.getString(`claim`);
  const reffedIndex = gameState.players
    .map((e) => e.id)
    .indexOf(gameState.refChain[refChain.indexOf(userId) + 1]);
  if (
    (gameState.players[playerIndex].team === 'Resistance' &&
      gameState.players[reffedIndex].team === 'Resistance' &&
      targetClaim === 'spy') ||
    (gameState.players[playerIndex].team === 'Resistance' &&
      gameState.players[reffedIndex].team === 'Spy' &&
      targetClaim === 'resistance')
  ) {
    return interaction.reply({
      content: `Don't throw! You shouldn't lie if you are Resistance.`,
      ephemeral: true,
    });
  }

  gameState.refClaims[
    gameState.refChain[refChain.indexOf(userId) + 1]
  ] = targetClaim;

  await gameInfo.set('gameState', gameState);

  const gameChannels = await gameInfo.get('game_channels');
  const announceChannel = await interaction.guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );

  await announceChannel.send(
    standardEmbed(
      'A claim has been made!',
      `**<@${userId}> claims the Ref of the Rain has revealed that <@${gameState.refChain[refChain.indexOf(userId) + 1]}> is on the ${targetClaim.toUpperCase()} team!**`,
    ),
  );
  await interaction.reply({
    content: `You made a claim!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
